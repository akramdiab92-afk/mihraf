const COOKIE_NAME = "mihraf_session";
const SESSION_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      /* =========================
         AUTH
         ========================= */

      if (url.pathname === "/api/register" && request.method === "POST") {
        return await register(request, env);
      }

      if (url.pathname === "/api/login" && request.method === "POST") {
        return await login(request, env);
      }

      if (url.pathname === "/api/logout" && request.method === "POST") {
        return await logout(request, env);
      }

      if (url.pathname === "/api/me" && request.method === "GET") {
        return await me(request, env);
      }

      /* =========================
         PROJECTS
         ========================= */

      if (url.pathname === "/api/projects" && request.method === "GET") {
        return await getProjects(request, env);
      }

      if (url.pathname === "/api/projects" && request.method === "POST") {
        return await createProject(request, env);
      }

      if (url.pathname === "/api/projects/" && request.method === "GET") {
        return json({
          success: false,
          error: "معرف المشروع غير موجود"
        }, 400);
      }

      /* =========================
         HEALTH
         ========================= */

      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({
          success: true,
          message: "MIHRAF Worker يعمل",
          database: !!env.DB
        });
      }

      /* =========================
         STATIC FILES
         ========================= */

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      });

    } catch (error) {
      console.error("Worker error:", error);

      return json({
        success: false,
        error: "حدث خطأ داخلي في الخادم",
        details: error?.message || String(error)
      }, 500);
    }
  }
};


/* =========================================================
   REGISTER
   ========================================================= */

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

  const fullName = cleanText(body.full_name);
  const email = cleanEmail(body.email);
  const password = String(body.password || "");

  const role =
    body.role === "freelancer"
      ? "freelancer"
      : "client";

  if (!fullName) {
    return json({
      success: false,
      error: "يرجى إدخال الاسم الكامل"
    }, 400);
  }

  if (fullName.length < 2) {
    return json({
      success: false,
      error: "الاسم يجب أن يكون حرفين على الأقل"
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

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `)
    .bind(email)
    .first();

  if (existing) {
    return json({
      success: false,
      error: "البريد الإلكتروني مستخدم مسبقا"
    }, 409);
  }

  const passwordData = await createPasswordHash(password);

  const result = await env.DB
    .prepare(`
      INSERT INTO users
      (
        full_name,
        email,
        password_hash,
        password_salt,
        role
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      fullName,
      email,
      passwordData.hash,
      passwordData.salt,
      role
    )
    .run();

  if (!result.success) {
    throw new Error("تعذر إنشاء الحساب");
  }

  return json({
    success: true,
    message: "تم إنشاء الحساب بنجاح",
    user: {
      id: result.meta?.last_row_id ?? null,
      full_name: fullName,
      email,
      role
    }
  }, 201);
}


/* =========================================================
   LOGIN
   ========================================================= */

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

  const email = cleanEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return json({
      success: false,
      error: "يرجى إدخال البريد الإلكتروني وكلمة المرور"
    }, 400);
  }

  const user = await env.DB
    .prepare(`
      SELECT
        id,
        full_name,
        email,
        password_hash,
        password_salt,
        role,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER(?)
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

  const validPassword = await verifyPassword(
    password,
    user.password_hash,
    user.password_salt
  );

  if (!validPassword) {
    return json({
      success: false,
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    }, 401);
  }

  const rawToken = generateToken();
  const tokenHash = await sha256(rawToken);

  const expiresAt = new Date(
    Date.now() +
    SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await env.DB
    .prepare(`
      DELETE FROM sessions
      WHERE user_id = ?
    `)
    .bind(user.id)
    .run();

  await env.DB
    .prepare(`
      INSERT INTO sessions
      (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?)
    `)
    .bind(
      user.id,
      tokenHash,
      expiresAt
    )
    .run();

  const headers = new Headers();

  headers.set(
    "Set-Cookie",
    buildSessionCookie(rawToken)
  );

  headers.set(
    "Content-Type",
    "application/json; charset=UTF-8"
  );

  headers.set(
    "Cache-Control",
    "no-store"
  );

  return new Response(
    JSON.stringify({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    }),
    {
      status: 200,
      headers
    }
  );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout(request, env) {
  const token = getSessionToken(request);

  if (token) {
    const tokenHash = await sha256(token);

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE token_hash = ?
      `)
      .bind(tokenHash)
      .run();
  }

  const headers = new Headers();

  headers.set(
    "Set-Cookie",
    clearSessionCookie()
  );

  headers.set(
    "Content-Type",
    "application/json; charset=UTF-8"
  );

  headers.set(
    "Cache-Control",
    "no-store"
  );

  return new Response(
    JSON.stringify({
      success: true,
      message: "تم تسجيل الخروج بنجاح"
    }),
    {
      status: 200,
      headers
    }
  );
}


/* =========================================================
   ME
   ========================================================= */

async function me(request, env) {
  const user = await getAuthenticatedUser(
    request,
    env
  );

  if (!user) {
    return json({
      success: true,
      authenticated: false,
      user: null
    });
  }

  return json({
    success: true,
    authenticated: true,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    }
  });
}


/* =========================================================
   GET MY PROJECTS
   ========================================================= */

async function getProjects(request, env) {
  const user = await getAuthenticatedUser(
    request,
    env
  );

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        id,
        user_id,
        title,
        description,
        budget,
        category,
        status,
        created_at,
        updated_at
      FROM projects
      WHERE user_id = ?
      ORDER BY id DESC
    `)
    .bind(user.id)
    .all();

  return json({
    success: true,
    projects: result.results || [],
    count: result.results?.length || 0
  });
}


/* =========================================================
   CREATE PROJECT
   ========================================================= */

async function createProject(request, env) {
  const user = await getAuthenticatedUser(
    request,
    env
  );

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  // Only clients can create projects
  if (user.role !== "client") {
    return json({
      success: false,
      error: "إنشاء المشاريع متاح لأصحاب المشاريع فقط"
    }, 403);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "بيانات الطلب غير صحيحة"
    }, 400);
  }

  const title = cleanText(body.title);
  const description = cleanText(body.description);
  const category = cleanText(body.category);
  const budget = Number(body.budget);

  if (!title) {
    return json({
      success: false,
      error: "يرجى إدخال عنوان المشروع"
    }, 400);
  }

  if (title.length < 3) {
    return json({
      success: false,
      error: "عنوان المشروع قصير جدا"
    }, 400);
  }

  if (!description) {
    return json({
      success: false,
      error: "يرجى كتابة وصف المشروع"
    }, 400);
  }

  if (description.length < 10) {
    return json({
      success: false,
      error: "وصف المشروع يجب أن يكون أوضح"
    }, 400);
  }

  if (!category) {
    return json({
      success: false,
      error: "يرجى اختيار تصنيف المشروع"
    }, 400);
  }

  if (
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    return json({
      success: false,
      error: "يرجى إدخال ميزانية صحيحة"
    }, 400);
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO projects
      (
        user_id,
        title,
        description,
        budget,
        category,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'open')
    `)
    .bind(
      user.id,
      title,
      description,
      budget,
      category
    )
    .run();

  if (!result.success) {
    throw new Error("تعذر إنشاء المشروع");
  }

  const projectId =
    result.meta?.last_row_id;

  const project = await env.DB
    .prepare(`
      SELECT
        id,
        user_id,
        title,
        description,
        budget,
        category,
        status,
        created_at,
        updated_at
      FROM projects
      WHERE id = ?
      LIMIT 1
    `)
    .bind(projectId)
    .first();

  return json({
    success: true,
    message: "تم إنشاء المشروع بنجاح",
    project
  }, 201);
}


/* =========================================================
   AUTHENTICATED USER
   ========================================================= */

async function getAuthenticatedUser(request, env) {
  const token = getSessionToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);

  const session = await env.DB
    .prepare(`
      SELECT
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.created_at
      FROM sessions s
      INNER JOIN users u
        ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();

  if (!session) {
    return null;
  }

  const expiresTime =
    Date.parse(session.expires_at);

  if (
    Number.isFinite(expiresTime) &&
    expiresTime <= Date.now()
  ) {
    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE id = ?
      `)
      .bind(session.session_id)
      .run();

    return null;
  }

  return {
    id: session.id,
    full_name: session.full_name,
    email: session.email,
    role: session.role,
    created_at: session.created_at
  };
}


/* =========================================================
   PASSWORD
   ========================================================= */

async function createPasswordHash(password) {
  const saltBytes = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const salt = bytesToHex(saltBytes);

  const hash = await sha256(
    password + salt
  );

  return {
    hash,
    salt
  };
}


async function verifyPassword(
  password,
  storedHash,
  storedSalt
) {
  if (!storedHash || !storedSalt) {
    return false;
  }

  const calculatedHash = await sha256(
    password + storedSalt
  );

  return constantTimeEqual(
    calculatedHash,
    storedHash
  );
}


async function sha256(value) {
  const data =
    new TextEncoder().encode(value);

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return bytesToHex(
    new Uint8Array(hashBuffer)
  );
}


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


/* =========================================================
   TOKEN
   ========================================================= */

function generateToken() {
  const bytes = crypto.getRandomValues(
    new Uint8Array(32)
  );

  return bytesToHex(bytes);
}


function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


/* =========================================================
   COOKIE
   ========================================================= */

function buildSessionCookie(token) {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
  ].join("; ");
}


function clearSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
}


function getSessionToken(request) {
  const cookieHeader =
    request.headers.get("Cookie") || "";

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {
    const trimmed = cookie.trim();

    if (
      trimmed.startsWith(
        `${COOKIE_NAME}=`
      )
    ) {
      return decodeURIComponent(
        trimmed.substring(
          COOKIE_NAME.length + 1
        )
      );
    }
  }

  return null;
}


/* =========================================================
   HELPERS
   ========================================================= */

function cleanText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}


function cleanEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}


function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
