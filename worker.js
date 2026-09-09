export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/api/register" && request.method === "POST") {
        return await register(request, env);
      }

      if (path === "/api/login" && request.method === "POST") {
        return await login(request, env);
      }

      if (path === "/api/logout" && request.method === "POST") {
        return await logout(request, env);
      }

      if (path === "/api/me" && request.method === "GET") {
        return await me(request, env);
      }

      return await env.ASSETS.fetch(request);

    } catch (error) {
      console.error("Worker error:", error);

      return json({
        success: false,
        error: "حدث خطأ داخلي في الخادم",
        details: error?.message || "Unknown error"
      }, 500);
    }
  }
};


// =====================================================
// REGISTER
// =====================================================

async function register(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "بيانات الطلب غير صحيحة"
    }, 400);
  }

  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "").trim();

  if (!fullName) {
    return json({
      success: false,
      error: "يرجى إدخال الاسم الكامل"
    }, 400);
  }

  if (!email || !isValidEmail(email)) {
    return json({
      success: false,
      error: "يرجى إدخال بريد إلكتروني صحيح"
    }, 400);
  }

  if (password.length < 6) {
    return json({
      success: false,
      error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    }, 400);
  }

  if (role !== "client" && role !== "freelancer") {
    return json({
      success: false,
      error: "نوع الحساب غير صحيح"
    }, 400);
  }

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
    `)
    .bind(email)
    .first();

  if (existing) {
    return json({
      success: false,
      error: "هذا البريد الإلكتروني مستخدم مسبقا"
    }, 409);
  }

  const { hash, salt } = await hashPassword(password);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await env.DB
      .prepare(`
        INSERT INTO users (
          id,
          full_name,
          email,
          password_hash,
          password_salt,
          role,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        fullName,
        email,
        hash,
        salt,
        role,
        now
      )
      .run();

  } catch (error) {
    console.error("Register database error:", error);

    return json({
      success: false,
      error: "تعذر إنشاء الحساب",
      details: error?.message || "Database error"
    }, 500);
  }

  return json({
    success: true,
    message: "تم إنشاء الحساب بنجاح",
    user: {
      id,
      full_name: fullName,
      email,
      role
    }
  }, 201);
}


// =====================================================
// LOGIN
// =====================================================

async function login(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "بيانات الطلب غير صحيحة"
    }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return json({
      success: false,
      error: "يرجى إدخال البريد الإلكتروني وكلمة المرور"
    }, 400);
  }

  const user = await env.DB
    .prepare(`
      SELECT *
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
    `)
    .bind(email)
    .first();

  if (!user) {
    return json({
      success: false,
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    }, 401);
  }

  if (!user.password_hash || !user.password_salt) {
    return json({
      success: false,
      error: "بيانات كلمة المرور لهذا الحساب غير مكتملة"
    }, 500);
  }

  const passwordHash = await hashPasswordWithSalt(
    password,
    user.password_salt
  );

  const valid = constantTimeEqual(
    passwordHash,
    user.password_hash
  );

  if (!valid) {
    return json({
      success: false,
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    }, 401);
  }

  const sessionId = randomToken(48);
  const createdAt = new Date();

  const expiresAt = new Date(
    createdAt.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  try {
    await env.DB
      .prepare(`
        INSERT INTO sessions (
          id,
          user_id,
          expires_at,
          created_at
        )
        VALUES (?, ?, ?, ?)
      `)
      .bind(
        sessionId,
        user.id,
        expiresAt.toISOString(),
        createdAt.toISOString()
      )
      .run();

  } catch (error) {
    console.error("Session database error:", error);

    return json({
      success: false,
      error: "تعذر إنشاء جلسة الدخول",
      details: error?.message || "Database error"
    }, 500);
  }

  const cookie = [
    `session=${sessionId}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${30 * 24 * 60 * 60}`
  ].join("; ");

  return new Response(
    JSON.stringify({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": cookie
      }
    }
  );
}


// =====================================================
// ME
// =====================================================

async function me(request, env) {
  const cookies = parseCookies(
    request.headers.get("Cookie") || ""
  );

  const sessionId = cookies.session;

  if (!sessionId) {
    return json({
      success: true,
      authenticated: false,
      user: null
    });
  }

  const session = await env.DB
    .prepare(`
      SELECT
        sessions.id AS session_id,
        sessions.user_id,
        sessions.expires_at,
        users.id,
        users.full_name,
        users.email,
        users.role
      FROM sessions
      INNER JOIN users
        ON users.id = sessions.user_id
      WHERE sessions.id = ?
      LIMIT 1
    `)
    .bind(sessionId)
    .first();

  if (!session) {
    return json({
      success: true,
      authenticated: false,
      user: null
    });
  }

  const expiresTime = new Date(
    session.expires_at
  ).getTime();

  if (!Number.isFinite(expiresTime) || expiresTime <= Date.now()) {
    try {
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE id = ?
        `)
        .bind(sessionId)
        .run();
    } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        authenticated: false,
        user: null
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Set-Cookie":
            "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
        }
      }
    );
  }

  return json({
    success: true,
    authenticated: true,
    user: {
      id: session.id,
      full_name: session.full_name,
      email: session.email,
      role: session.role
    }
  });
}


// =====================================================
// LOGOUT
// =====================================================

async function logout(request, env) {
  const cookies = parseCookies(
    request.headers.get("Cookie") || ""
  );

  const sessionId = cookies.session;

  if (sessionId) {
    try {
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE id = ?
        `)
        .bind(sessionId)
        .run();
    } catch (error) {
      console.error("Logout database error:", error);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "تم تسجيل الخروج"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie":
          "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
      }
    }
  );
}


// =====================================================
// PASSWORD HASHING
// =====================================================

async function hashPassword(password) {
  const salt = randomBytes(16);

  const hash = await derivePasswordHash(
    password,
    salt
  );

  return {
    hash: bytesToHex(hash),
    salt: bytesToHex(salt)
  };
}


async function hashPasswordWithSalt(password, saltHex) {
  const salt = hexToBytes(saltHex);

  const hash = await derivePasswordHash(
    password,
    salt
  );

  return bytesToHex(hash);
}


async function derivePasswordHash(password, salt) {
  const encoder = new TextEncoder();

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {
      name: "PBKDF2"
    },
    false,
    [
      "deriveBits"
    ]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    256
  );

  return new Uint8Array(bits);
}


// =====================================================
// RANDOM BYTES
// =====================================================

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}


// =====================================================
// HEX
// =====================================================

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}


function hexToBytes(hex) {
  if (
    typeof hex !== "string" ||
    hex.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(hex)
  ) {
    throw new Error("Invalid hexadecimal value");
  }

  const bytes = new Uint8Array(
    hex.length / 2
  );

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(
      hex.substring(i * 2, i * 2 + 2),
      16
    );
  }

  return bytes;
}


// =====================================================
// CONSTANT TIME COMPARE
// =====================================================

function constantTimeEqual(a, b) {
  if (
    typeof a !== "string" ||
    typeof b !== "string"
  ) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
}


// =====================================================
// TOKEN
// =====================================================

function randomToken(bytesLength = 32) {
  return bytesToHex(
    randomBytes(bytesLength)
  );
}


// =====================================================
// COOKIES
// =====================================================

function parseCookies(cookieHeader) {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const index = part.indexOf("=");

    if (index === -1) {
      continue;
    }

    const name = part
      .slice(0, index)
      .trim();

    const value = part
      .slice(index + 1)
      .trim();

    if (name) {
      cookies[name] = value;
    }
  }

  return cookies;
}


// =====================================================
// EMAIL
// =====================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}


// =====================================================
// JSON RESPONSE
// =====================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
