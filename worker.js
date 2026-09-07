const encoder = new TextEncoder();

const SESSION_DAYS = 7;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // تسجيل حساب جديد
    if (url.pathname === "/api/register" && request.method === "POST") {
      return register(request, env);
    }

    // تسجيل الدخول
    if (url.pathname === "/api/login" && request.method === "POST") {
      return login(request, env);
    }

    // معرفة المستخدم المسجل دخوله
    if (url.pathname === "/api/me" && request.method === "GET") {
      return getCurrentUser(request, env);
    }

    // تسجيل الخروج
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return logout(request, env);
    }

    // اختبار قاعدة البيانات
    if (url.pathname === "/api/test" && request.method === "GET") {
      try {
        const result = await env.DB
          .prepare("SELECT COUNT(*) AS count FROM users")
          .first();

        return Response.json({
          success: true,
          database: true,
          users: result.count
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: "Database error"
          },
          { status: 500 }
        );
      }
    }

    // باقي صفحات الموقع
    return env.ASSETS.fetch(request);
  }
};


// ================================
// تسجيل حساب جديد
// ================================

async function register(request, env) {
  try {
    const data = await request.json();

    const fullName = String(data.full_name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const role = String(data.role || "");

    if (!fullName || !email || !password || !role) {
      return Response.json(
        {
          success: false,
          message: "جميع الحقول مطلوبة"
        },
        { status: 400 }
      );
    }

    if (!["client", "freelancer"].includes(role)) {
      return Response.json(
        {
          success: false,
          message: "نوع الحساب غير صحيح"
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        {
          success: false,
          message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        {
          success: false,
          message: "البريد الإلكتروني غير صحيح"
        },
        { status: 400 }
      );
    }

    const existing = await env.DB
      .prepare(
        "SELECT id FROM users WHERE email = ? COLLATE NOCASE"
      )
      .bind(email)
      .first();

    if (existing) {
      return Response.json(
        {
          success: false,
          message: "هذا البريد الإلكتروني مستخدم بالفعل"
        },
        { status: 409 }
      );
    }

    const salt = randomBytes(16);
    const passwordHash = await hashPassword(password, salt);

    const result = await env.DB
      .prepare(`
        INSERT INTO users
        (full_name, email, password_hash, password_salt, role)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        fullName,
        email,
        passwordHash,
        bytesToHex(salt),
        role
      )
      .run();

    return Response.json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      user_id: result.meta.last_row_id
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: "حدث خطأ أثناء إنشاء الحساب"
      },
      { status: 500 }
    );
  }
}


// ================================
// تسجيل الدخول
// ================================

async function login(request, env) {
  try {
    const data = await request.json();

    const email = String(data.email || "")
      .trim()
      .toLowerCase();

    const password = String(data.password || "");

    if (!email || !password) {
      return Response.json(
        {
          success: false,
          message: "البريد الإلكتروني وكلمة المرور مطلوبان"
        },
        { status: 400 }
      );
    }

    // البحث عن المستخدم
    const user = await env.DB
      .prepare(`
        SELECT
          id,
          full_name,
          email,
          password_hash,
          password_salt,
          role
        FROM users
        WHERE email = ? COLLATE NOCASE
        LIMIT 1
      `)
      .bind(email)
      .first();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        },
        { status: 401 }
      );
    }

    // تحويل salt من Hex إلى Bytes
    const salt = hexToBytes(user.password_salt);

    // حساب هاش كلمة المرور المدخلة
    const passwordHash = await hashPassword(
      password,
      salt
    );

    // مقارنة الهاش
    if (!constantTimeEqual(passwordHash, user.password_hash)) {
      return Response.json(
        {
          success: false,
          message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        },
        { status: 401 }
      );
    }

    // إنشاء Session Token
    const sessionToken = randomToken(32);

    // لا نخزن التوكن نفسه في قاعدة البيانات
    const sessionTokenHash =
      await sha256Hex(sessionToken);

    // تاريخ انتهاء الجلسة
    const expiresAt = new Date(
      Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // حذف الجلسات القديمة لهذا المستخدم
    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `)
      .bind(user.id)
      .run();

    // إنشاء الجلسة الجديدة
    await env.DB
      .prepare(`
        INSERT INTO sessions
        (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
      `)
      .bind(
        user.id,
        sessionTokenHash,
        expiresAt
      )
      .run();

    // Cookie آمنة
    const cookie =
      `mihraf_session=${sessionToken}; ` +
      `HttpOnly; ` +
      `Secure; ` +
      `SameSite=Lax; ` +
      `Path=/; ` +
      `Max-Age=${SESSION_MAX_AGE}`;

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
          "Content-Type": "application/json; charset=UTF-8",
          "Set-Cookie": cookie
        }
      }
    );

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: "حدث خطأ أثناء تسجيل الدخول"
      },
      { status: 500 }
    );
  }
}


// ================================
// معرفة المستخدم الحالي
// ================================

async function getCurrentUser(request, env) {
  try {
    const cookies = parseCookies(
      request.headers.get("Cookie") || ""
    );

    const sessionToken =
      cookies.mihraf_session;

    if (!sessionToken) {
      return Response.json(
        {
          success: false,
          logged_in: false
        },
        { status: 401 }
      );
    }

    const tokenHash =
      await sha256Hex(sessionToken);

    const session = await env.DB
      .prepare(`
        SELECT
          sessions.user_id,
          sessions.expires_at,
          users.id,
          users.full_name,
          users.email,
          users.role
        FROM sessions
        INNER JOIN users
          ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
        LIMIT 1
      `)
      .bind(tokenHash)
      .first();

    if (!session) {
      return Response.json(
        {
          success: false,
          logged_in: false
        },
        { status: 401 }
      );
    }

    // التأكد من أن الجلسة لم تنته
    if (
      new Date(session.expires_at).getTime() <=
      Date.now()
    ) {
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE token_hash = ?
        `)
        .bind(tokenHash)
        .run();

      return Response.json(
        {
          success: false,
          logged_in: false,
          message: "انتهت الجلسة"
        },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      logged_in: true,
      user: {
        id: session.id,
        full_name: session.full_name,
        email: session.email,
        role: session.role
      }
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: "حدث خطأ أثناء التحقق من الجلسة"
      },
      { status: 500 }
    );
  }
}


// ================================
// تسجيل الخروج
// ================================

async function logout(request, env) {
  try {
    const cookies = parseCookies(
      request.headers.get("Cookie") || ""
    );

    const sessionToken =
      cookies.mihraf_session;

    if (sessionToken) {
      const tokenHash =
        await sha256Hex(sessionToken);

      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE token_hash = ?
        `)
        .bind(tokenHash)
        .run();
    }

    // حذف Cookie
    const cookie =
      "mihraf_session=; " +
      "HttpOnly; " +
      "Secure; " +
      "SameSite=Lax; " +
      "Path=/; " +
      "Max-Age=0";

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم تسجيل الخروج"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "Set-Cookie": cookie
        }
      }
    );

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: "حدث خطأ أثناء تسجيل الخروج"
      },
      { status: 500 }
    );
  }
}


// ================================
// تشفير كلمة المرور PBKDF2
// ================================

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return bytesToHex(
    new Uint8Array(bits)
  );
}


// ================================
// SHA-256
// ================================

async function sha256Hex(value) {
  const data =
    typeof value === "string"
      ? encoder.encode(value)
      : value;

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return bytesToHex(
    new Uint8Array(hash)
  );
}


// ================================
// إنشاء Token عشوائي
// ================================

function randomToken(length) {
  return bytesToHex(
    randomBytes(length)
  );
}


// ================================
// Random Bytes
// ================================

function randomBytes(length) {
  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return bytes;
}


// ================================
// Hex → Bytes
// ================================

function hexToBytes(hex) {
  const bytes =
    new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(
      hex.substring(i * 2, i * 2 + 2),
      16
    );
  }

  return bytes;
}


// ================================
// Bytes → Hex
// ================================

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}


// ================================
// مقارنة آمنة
// ================================

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


// ================================
// قراءة Cookies
// ================================

function parseCookies(cookieHeader) {
  const cookies = {};

  cookieHeader
    .split(";")
    .forEach(cookie => {
      const index = cookie.indexOf("=");

      if (index === -1) {
        return;
      }

      const name =
        cookie.substring(0, index).trim();

      const value =
        cookie.substring(index + 1).trim();

      cookies[name] = value;
    });

  return cookies;
}
