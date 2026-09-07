const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // تسجيل حساب جديد
    if (url.pathname === "/api/register" && request.method === "POST") {
      return register(request, env);
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
          { success: false, error: "Database error" },
          { status: 500 }
        );
      }
    }

    // باقي صفحات الموقع
    return env.ASSETS.fetch(request);
  }
};

async function register(request, env) {
  try {
    const data = await request.json();

    const fullName = String(data.full_name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const role = String(data.role || "");

    if (!fullName || !email || !password || !role) {
      return Response.json(
        { success: false, message: "جميع الحقول مطلوبة" },
        { status: 400 }
      );
    }

    if (!["client", "freelancer"].includes(role)) {
      return Response.json(
        { success: false, message: "نوع الحساب غير صحيح" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { success: false, message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, message: "البريد الإلكتروني غير صحيح" },
        { status: 400 }
      );
    }

    const existing = await env.DB
      .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
      .bind(email)
      .first();

    if (existing) {
      return Response.json(
        { success: false, message: "هذا البريد الإلكتروني مستخدم بالفعل" },
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
    return Response.json(
      {
        success: false,
        message: "حدث خطأ أثناء إنشاء الحساب"
      },
      { status: 500 }
    );
  }
}

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

  return bytesToHex(new Uint8Array(bits));
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
