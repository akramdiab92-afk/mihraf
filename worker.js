export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // =========================
      // API
      // =========================

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

  try {
    // -------------------------------------------------
    // قراءة بنية جدول users الموجودة فعليا
    // -------------------------------------------------

    const columns = await getTableInfo(env.DB, "users");

    if (!columns.length) {
      return json({
        success: false,
        error: "جدول المستخدمين غير موجود"
      }, 500);
    }

    const columnNames = columns.map(c => c.name);

    // -------------------------------------------------
    // التحقق من البريد
    // -------------------------------------------------

    const emailColumn = findColumn(columnNames, [
      "email",
      "mail"
    ]);

    if (!emailColumn) {
      return json({
        success: false,
        error: "عمود البريد الإلكتروني غير موجود في جدول users"
      }, 500);
    }

    const existing = await env.DB
      .prepare(`
        SELECT *
        FROM users
        WHERE LOWER(${quoteIdentifier(emailColumn)}) = ?
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

    // -------------------------------------------------
    // تجهيز كلمة المرور
    // -------------------------------------------------

    const { hash, salt } = await hashPassword(password);

    // -------------------------------------------------
    // تجهيز بيانات المستخدم حسب الأعمدة الموجودة
    // -------------------------------------------------

    const data = {};

    const idColumn = findColumn(columnNames, [
      "id",
      "user_id"
    ]);

    const nameColumn = findColumn(columnNames, [
      "full_name",
      "fullname",
      "name",
      "username"
    ]);

    const passwordHashColumn = findColumn(columnNames, [
      "password_hash",
      "passwordHash",
      "password"
    ]);

    const passwordSaltColumn = findColumn(columnNames, [
      "password_salt",
      "passwordSalt",
      "salt"
    ]);

    const roleColumn = findColumn(columnNames, [
      "role",
      "user_role",
      "account_type",
      "type"
    ]);

    const createdColumn = findColumn(columnNames, [
      "created_at",
      "createdAt",
      "created"
    ]);

    // الاسم
    if (nameColumn) {
      data[nameColumn] = fullName;
    }

    // البريد
    data[emailColumn] = email;

    // كلمة المرور
    if (passwordHashColumn) {
      data[passwordHashColumn] = hash;
    }

    // Salt
    if (passwordSaltColumn) {
      data[passwordSaltColumn] = salt;
    }

    // نوع الحساب
    if (roleColumn) {
      data[roleColumn] = role;
    }

    // تاريخ الإنشاء
    if (createdColumn) {
      data[createdColumn] = new Date().toISOString();
    }

    // -------------------------------------------------
    // ID
    // إذا كان INTEGER PRIMARY KEY نترك SQLite يولده
    // وإذا كان TEXT نولد UUID
    // -------------------------------------------------

    if (idColumn) {
      const idInfo = columns.find(
        c => c.name === idColumn
      );

      const isIntegerPrimaryKey =
        Number(idInfo?.pk) === 1 &&
        String(idInfo?.type || "")
          .toUpperCase()
          .includes("INT");

      if (!isIntegerPrimaryKey) {
        data[idColumn] = crypto.randomUUID();
      }
    }

    // -------------------------------------------------
    // التأكد من الحقول الأساسية
    // -------------------------------------------------

    if (!nameColumn) {
      return json({
        success: false,
        error: "عمود اسم المستخدم غير موجود في جدول users"
      }, 500);
    }

    if (!passwordHashColumn) {
      return json({
        success: false,
        error: "عمود كلمة المرور غير موجود في جدول users"
      }, 500);
    }

    // -------------------------------------------------
    // INSERT ديناميكي
    // -------------------------------------------------

    const keys = Object.keys(data);
    const values = Object.values(data);

    const placeholders = keys
      .map(() => "?")
      .join(", ");

    const sql = `
      INSERT INTO users (
        ${keys.map(quoteIdentifier).join(", ")}
      )
      VALUES (
        ${placeholders}
      )
    `;

    const result = await env.DB
      .prepare(sql)
      .bind(...values)
      .run();

    // الحصول على ID المستخدم
    let userId = data[idColumn];

    if (userId === undefined && idColumn) {
      const inserted = await env.DB
        .prepare(`
          SELECT *
          FROM users
          WHERE ${quoteIdentifier(emailColumn)} = ?
          LIMIT 1
        `)
        .bind(email)
        .first();

      if (inserted) {
        userId = inserted[idColumn];
      }
    }

    return json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      user: {
        id: userId,
        full_name: fullName,
        email,
        role
      }
    }, 201);

  } catch (error) {
    console.error("Register error:", error);

    return json({
      success: false,
      error: "تعذر إنشاء الحساب",
      details: error?.message || "Database error"
    }, 500);
  }
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

  try {
    const columns = await getTableInfo(env.DB, "users");

    const columnNames = columns.map(c => c.name);

    const emailColumn = findColumn(columnNames, [
      "email",
      "mail"
    ]);

    const passwordHashColumn = findColumn(columnNames, [
      "password_hash",
      "passwordHash",
      "password"
    ]);

    const passwordSaltColumn = findColumn(columnNames, [
      "password_salt",
      "passwordSalt",
      "salt"
    ]);

    const idColumn = findColumn(columnNames, [
      "id",
      "user_id"
    ]);

    const nameColumn = findColumn(columnNames, [
      "full_name",
      "fullname",
      "name",
      "username"
    ]);

    const roleColumn = findColumn(columnNames, [
      "role",
      "user_role",
      "account_type",
      "type"
    ]);

    if (!emailColumn || !passwordHashColumn) {
      return json({
        success: false,
        error: "بنية جدول المستخدمين لا تحتوي على بيانات الدخول المطلوبة"
      }, 500);
    }

    const user = await env.DB
      .prepare(`
        SELECT *
        FROM users
        WHERE LOWER(${quoteIdentifier(emailColumn)}) = ?
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

    const storedHash =
      user[passwordHashColumn];

    if (!storedHash) {
      return json({
        success: false,
        error: "بيانات كلمة المرور لهذا الحساب غير مكتملة"
      }, 500);
    }

    let valid = false;

    // الحسابات الجديدة تستخدم hash + salt
    if (passwordSaltColumn && user[passwordSaltColumn]) {
      const passwordHash =
        await hashPasswordWithSalt(
          password,
          user[passwordSaltColumn]
        );

      valid = constantTimeEqual(
        passwordHash,
        String(storedHash)
      );
    }

    if (!valid) {
      return json({
        success: false,
        error: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      }, 401);
    }

    // -------------------------------------------------
    // إنشاء جلسة
    // -------------------------------------------------

    const sessionColumns =
      await getTableInfo(env.DB, "sessions");

    if (!sessionColumns.length) {
      return json({
        success: false,
        error: "جدول الجلسات غير موجود"
      }, 500);
    }

    const sessionNames =
      sessionColumns.map(c => c.name);

    const sessionIdColumn =
      findColumn(sessionNames, [
        "id",
        "session_id"
      ]);

    const sessionUserColumn =
      findColumn(sessionNames, [
        "user_id",
        "userid",
        "userId"
      ]);

    const expiresColumn =
      findColumn(sessionNames, [
        "expires_at",
        "expiresAt",
        "expires"
      ]);

    const createdColumn =
      findColumn(sessionNames, [
        "created_at",
        "createdAt",
        "created"
      ]);

    if (!sessionIdColumn || !sessionUserColumn) {
      return json({
        success: false,
        error: "بنية جدول الجلسات غير صحيحة"
      }, 500);
    }

    const sessionId = randomToken(48);
    const now = new Date();

    const expiresAt = new Date(
      now.getTime() +
      30 * 24 * 60 * 60 * 1000
    );

    const sessionData = {};

    sessionData[sessionIdColumn] = sessionId;
    sessionData[sessionUserColumn] =
      user[idColumn];

    if (expiresColumn) {
      sessionData[expiresColumn] =
        expiresAt.toISOString();
    }

    if (createdColumn) {
      sessionData[createdColumn] =
        now.toISOString();
    }

    const sessionKeys =
      Object.keys(sessionData);

    const sessionValues =
      Object.values(sessionData);

    const sessionPlaceholders =
      sessionKeys.map(() => "?").join(", ");

    await env.DB
      .prepare(`
        INSERT INTO sessions (
          ${sessionKeys.map(quoteIdentifier).join(", ")}
        )
        VALUES (
          ${sessionPlaceholders}
        )
      `)
      .bind(...sessionValues)
      .run();

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
          id: user[idColumn],
          full_name:
            nameColumn ? user[nameColumn] : "",
          email: user[emailColumn],
          role:
            roleColumn ? user[roleColumn] : "client"
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Set-Cookie": cookie
        }
      }
    );

  } catch (error) {
    console.error("Login error:", error);

    return json({
      success: false,
      error: "تعذر تسجيل الدخول",
      details: error?.message || "Database error"
    }, 500);
  }
}


// =====================================================
// ME
// =====================================================

async function me(request, env) {
  try {
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

    const sessionColumns =
      await getTableInfo(env.DB, "sessions");

    const sessionNames =
      sessionColumns.map(c => c.name);

    const sessionIdColumn =
      findColumn(sessionNames, [
        "id",
        "session_id"
      ]);

    const sessionUserColumn =
      findColumn(sessionNames, [
        "user_id",
        "userid",
        "userId"
      ]);

    const expiresColumn =
      findColumn(sessionNames, [
        "expires_at",
        "expiresAt",
        "expires"
      ]);

    if (!sessionIdColumn || !sessionUserColumn) {
      return json({
        success: true,
        authenticated: false,
        user: null
      });
    }

    const userColumns =
      await getTableInfo(env.DB, "users");

    const userNames =
      userColumns.map(c => c.name);

    const userIdColumn =
      findColumn(userNames, [
        "id",
        "user_id"
      ]);

    const nameColumn =
      findColumn(userNames, [
        "full_name",
        "fullname",
        "name",
        "username"
      ]);

    const emailColumn =
      findColumn(userNames, [
        "email",
        "mail"
      ]);

    const roleColumn =
      findColumn(userNames, [
        "role",
        "user_role",
        "account_type",
        "type"
      ]);

    const session =
      await env.DB
        .prepare(`
          SELECT
            s.${quoteIdentifier(sessionUserColumn)} AS session_user_id,
            ${expiresColumn
              ? `s.${quoteIdentifier(expiresColumn)} AS session_expires,`
              : ""}
            u.*
          FROM sessions s
          INNER JOIN users u
            ON u.${quoteIdentifier(userIdColumn)}
             = s.${quoteIdentifier(sessionUserColumn)}
          WHERE s.${quoteIdentifier(sessionIdColumn)} = ?
          LIMIT 1
        `)
        .bind(sessionId)
        .first();

    if (!session) {
      return clearSessionResponse();
    }

    if (expiresColumn && session.session_expires) {
      const expiresTime =
        new Date(session.session_expires).getTime();

      if (
        Number.isFinite(expiresTime) &&
        expiresTime <= Date.now()
      ) {
        await env.DB
          .prepare(`
            DELETE FROM sessions
            WHERE ${quoteIdentifier(sessionIdColumn)} = ?
          `)
          .bind(sessionId)
          .run();

        return clearSessionResponse();
      }
    }

    return json({
      success: true,
      authenticated: true,
      user: {
        id: session[userIdColumn],
        full_name:
          nameColumn ? session[nameColumn] : "",
        email:
          emailColumn ? session[emailColumn] : "",
        role:
          roleColumn
            ? session[roleColumn]
            : "client"
      }
    });

  } catch (error) {
    console.error("ME error:", error);

    return json({
      success: false,
      error: "تعذر التحقق من الحساب",
      details: error?.message || "Database error"
    }, 500);
  }
}


// =====================================================
// LOGOUT
// =====================================================

async function logout(request, env) {
  try {
    const cookies = parseCookies(
      request.headers.get("Cookie") || ""
    );

    const sessionId = cookies.session;

    if (sessionId) {
      const columns =
        await getTableInfo(env.DB, "sessions");

      const names =
        columns.map(c => c.name);

      const idColumn =
        findColumn(names, [
          "id",
          "session_id"
        ]);

      if (idColumn) {
        await env.DB
          .prepare(`
            DELETE FROM sessions
            WHERE ${quoteIdentifier(idColumn)} = ?
          `)
          .bind(sessionId)
          .run();
      }
    }

    return clearSessionResponse(
      "تم تسجيل الخروج"
    );

  } catch (error) {
    console.error("Logout error:", error);

    return clearSessionResponse(
      "تم تسجيل الخروج"
    );
  }
}


// =====================================================
// DATABASE HELPERS
// =====================================================

async function getTableInfo(db, tableName) {
  const allowed = [
    "users",
    "sessions"
  ];

  if (!allowed.includes(tableName)) {
    throw new Error("Invalid table");
  }

  const result = await db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();

  return result.results || [];
}


function findColumn(columns, names) {
  for (const wanted of names) {
    const found = columns.find(
      column =>
        String(column.name).toLowerCase() ===
        String(wanted).toLowerCase()
    );

    if (found) {
      return found.name;
    }
  }

  return null;
}


function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
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


async function hashPasswordWithSalt(
  password,
  saltHex
) {
  const salt = hexToBytes(saltHex);

  const hash = await derivePasswordHash(
    password,
    salt
  );

  return bytesToHex(hash);
}


async function derivePasswordHash(
  password,
  salt
) {
  const encoder = new TextEncoder();

  const passwordKey =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      {
        name: "PBKDF2"
      },
      false,
      ["deriveBits"]
    );

  const bits =
    await crypto.subtle.deriveBits(
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
// RANDOM
// =====================================================

function randomBytes(length) {
  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return bytes;
}


function randomToken(bytesLength = 32) {
  return bytesToHex(
    randomBytes(bytesLength)
  );
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
    throw new Error(
      "Invalid hexadecimal value"
    );
  }

  const bytes =
    new Uint8Array(hex.length / 2);

  for (
    let i = 0;
    i < bytes.length;
    i++
  ) {
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
// COOKIES
// =====================================================

function parseCookies(cookieHeader) {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (
    const part of cookieHeader.split(";")
  ) {
    const index = part.indexOf("=");

    if (index === -1) {
      continue;
    }

    const name =
      part.slice(0, index).trim();

    const value =
      part.slice(index + 1).trim();

    if (name) {
      cookies[name] = value;
    }
  }

  return cookies;
}


// =====================================================
// CLEAR SESSION RESPONSE
// =====================================================

function clearSessionResponse(
  message = null
) {
  return new Response(
    JSON.stringify({
      success: true,
      ...(message ? { message } : {}),
      authenticated: false,
      user: null
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie":
          "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
      }
    }
  );
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
// JSON
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
