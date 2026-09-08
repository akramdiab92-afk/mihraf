const encoder = new TextEncoder();

const SESSION_DAYS = 7;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;


// ==================================================
// Worker
// ==================================================

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    // ================================
    // المستخدمون
    // ================================

    if (
      url.pathname === "/api/register" &&
      request.method === "POST"
    ) {
      return register(request, env);
    }

    if (
      url.pathname === "/api/login" &&
      request.method === "POST"
    ) {
      return login(request, env);
    }

    if (
      url.pathname === "/api/me" &&
      request.method === "GET"
    ) {
      return getCurrentUser(request, env);
    }

    if (
      url.pathname === "/api/logout" &&
      request.method === "POST"
    ) {
      return logout(request, env);
    }


    // ================================
    // الخدمات
    // ================================

    // إنشاء خدمة
    if (
      url.pathname === "/api/services" &&
      request.method === "POST"
    ) {
      return createService(request, env);
    }


    // جلب جميع الخدمات
    if (
      url.pathname === "/api/services" &&
      request.method === "GET"
    ) {
      return getServices(request, env);
    }


    // تعديل / حذف خدمة
    if (
      url.pathname.startsWith("/api/services/") &&
      request.method === "PUT"
    ) {
      return updateService(request, env);
    }

    if (
      url.pathname.startsWith("/api/services/") &&
      request.method === "DELETE"
    ) {
      return deleteService(request, env);
    }


    // خدمات المستخدم الحالي
    if (
      url.pathname === "/api/my-services" &&
      request.method === "GET"
    ) {
      return getMyServices(request, env);
    }


    // ================================
    // اختبار قاعدة البيانات
    // ================================

    if (
      url.pathname === "/api/test" &&
      request.method === "GET"
    ) {

      try {

        const result = await env.DB
          .prepare(
            "SELECT COUNT(*) AS count FROM users"
          )
          .first();


        const servicesResult = await env.DB
          .prepare(
            "SELECT COUNT(*) AS count FROM services"
          )
          .first();


        return Response.json({

          success: true,

          database: true,

          users: result.count,

          services: servicesResult.count

        });

      } catch (error) {

        console.error(error);

        return Response.json(
          {
            success: false,
            error: "Database error"
          },
          {
            status: 500
          }
        );

      }

    }


    // ================================
    // باقي صفحات الموقع
    // ================================

    return env.ASSETS.fetch(request);

  }

};


// ==================================================
// تسجيل حساب جديد
// ==================================================

async function register(request, env) {

  try {

    const data = await request.json();

    const fullName =
      String(data.full_name || "").trim();

    const email =
      String(data.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(data.password || "");

    const role =
      String(data.role || "");


    // التحقق من البيانات

    if (
      !fullName ||
      !email ||
      !password ||
      !role
    ) {

      return Response.json(
        {
          success: false,
          message: "جميع الحقول مطلوبة"
        },
        {
          status: 400
        }
      );

    }


    if (
      !["client", "freelancer"].includes(role)
    ) {

      return Response.json(
        {
          success: false,
          message: "نوع الحساب غير صحيح"
        },
        {
          status: 400
        }
      );

    }


    if (password.length < 8) {

      return Response.json(
        {
          success: false,
          message:
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
        },
        {
          status: 400
        }
      );

    }


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {

      return Response.json(
        {
          success: false,
          message:
            "البريد الإلكتروني غير صحيح"
        },
        {
          status: 400
        }
      );

    }


    // التأكد أن البريد غير مستخدم

    const existing =
      await env.DB
        .prepare(
          "SELECT id FROM users WHERE email = ? COLLATE NOCASE"
        )
        .bind(email)
        .first();


    if (existing) {

      return Response.json(
        {
          success: false,
          message:
            "هذا البريد الإلكتروني مستخدم بالفعل"
        },
        {
          status: 409
        }
      );

    }


    // إنشاء Salt

    const salt =
      randomBytes(16);


    // تشفير كلمة المرور

    const passwordHash =
      await hashPassword(
        password,
        salt
      );


    // إنشاء المستخدم

    const result =
      await env.DB
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
          passwordHash,
          bytesToHex(salt),
          role
        )
        .run();


    return Response.json({

      success: true,

      message:
        "تم إنشاء الحساب بنجاح",

      user_id:
        result.meta.last_row_id

    });


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء إنشاء الحساب"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// تسجيل الدخول
// ==================================================

async function login(request, env) {

  try {

    const data =
      await request.json();


    const email =
      String(data.email || "")
        .trim()
        .toLowerCase();


    const password =
      String(data.password || "");


    if (!email || !password) {

      return Response.json(
        {
          success: false,
          message:
            "البريد الإلكتروني وكلمة المرور مطلوبان"
        },
        {
          status: 400
        }
      );

    }


    // البحث عن المستخدم

    const user =
      await env.DB
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
          message:
            "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        },
        {
          status: 401
        }
      );

    }


    // تحويل Salt

    const salt =
      hexToBytes(
        user.password_salt
      );


    // حساب Hash

    const passwordHash =
      await hashPassword(
        password,
        salt
      );


    // مقارنة آمنة

    if (
      !constantTimeEqual(
        passwordHash,
        user.password_hash
      )
    ) {

      return Response.json(
        {
          success: false,
          message:
            "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        },
        {
          status: 401
        }
      );

    }


    // إنشاء Session Token

    const sessionToken =
      randomToken(32);


    const sessionTokenHash =
      await sha256Hex(
        sessionToken
      );


    // تاريخ انتهاء الجلسة

    const expiresAt =
      new Date(
        Date.now() +
        SESSION_DAYS *
        24 *
        60 *
        60 *
        1000
      ).toISOString();


    // حذف الجلسات القديمة

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `)
      .bind(user.id)
      .run();


    // إنشاء الجلسة

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
        sessionTokenHash,
        expiresAt
      )
      .run();


    // Cookie

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

        message:
          "تم تسجيل الدخول بنجاح",

        user: {

          id:
            user.id,

          full_name:
            user.full_name,

          email:
            user.email,

          role:
            user.role

        }

      }),

      {

        status: 200,

        headers: {

          "Content-Type":
            "application/json; charset=UTF-8",

          "Set-Cookie":
            cookie

        }

      }

    );


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء تسجيل الدخول"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// المستخدم الحالي
// ==================================================

async function getCurrentUser(
  request,
  env
) {

  try {

    const cookies =
      parseCookies(
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
        {
          status: 401
        }
      );

    }


    const tokenHash =
      await sha256Hex(
        sessionToken
      );


    const session =
      await env.DB
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
        {
          status: 401
        }
      );

    }


    // التأكد من انتهاء الجلسة

    if (
      new Date(
        session.expires_at
      ).getTime() <= Date.now()
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
          message:
            "انتهت الجلسة"
        },
        {
          status: 401
        }
      );

    }


    return Response.json({

      success: true,

      logged_in: true,

      user: {

        id:
          session.id,

        full_name:
          session.full_name,

        email:
          session.email,

        role:
          session.role

      }

    });


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء التحقق من الجلسة"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// تسجيل الخروج
// ==================================================

async function logout(
  request,
  env
) {

  try {

    const cookies =
      parseCookies(
        request.headers.get("Cookie") || ""
      );


    const sessionToken =
      cookies.mihraf_session;


    if (sessionToken) {

      const tokenHash =
        await sha256Hex(
          sessionToken
        );


      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE token_hash = ?
        `)
        .bind(tokenHash)
        .run();

    }


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

        message:
          "تم تسجيل الخروج"

      }),

      {

        status: 200,

        headers: {

          "Content-Type":
            "application/json; charset=UTF-8",

          "Set-Cookie":
            cookie

        }

      }

    );


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء تسجيل الخروج"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// إنشاء خدمة
// ==================================================

async function createService(
  request,
  env
) {

  try {

    // الحصول على المستخدم

    const user =
      await authenticateUser(
        request,
        env
      );


    if (!user) {

      return Response.json(
        {
          success: false,
          message:
            "يجب تسجيل الدخول أولًا"
        },
        {
          status: 401
        }
      );

    }


    // يجب أن يكون مستقل

    if (
      user.role !== "freelancer"
    ) {

      return Response.json(
        {
          success: false,
          message:
            "فقط المستقل يستطيع إضافة خدمة"
        },
        {
          status: 403
        }
      );

    }


    const data =
      await request.json();


    const title =
      String(data.title || "").trim();


    const description =
      String(data.description || "").trim();


    const category =
      String(data.category || "").trim();


    const price =
      Number(data.price);


    // التحقق من البيانات

    if (
      !title ||
      !description ||
      !category ||
      !Number.isFinite(price)
    ) {

      return Response.json(
        {
          success: false,
          message:
            "جميع بيانات الخدمة مطلوبة"
        },
        {
          status: 400
        }
      );

    }


    if (title.length < 3) {

      return Response.json(
        {
          success: false,
          message:
            "عنوان الخدمة قصير جدًا"
        },
        {
          status: 400
        }
      );

    }


    if (description.length < 10) {

      return Response.json(
        {
          success: false,
          message:
            "وصف الخدمة قصير جدًا"
        },
        {
          status: 400
        }
      );

    }


    if (price <= 0) {

      return Response.json(
        {
          success: false,
          message:
            "السعر يجب أن يكون أكبر من صفر"
        },
        {
          status: 400
        }
      );

    }


    // حفظ الخدمة

    const result =
      await env.DB
        .prepare(`
          INSERT INTO services
          (
            user_id,
            title,
            description,
            price,
            category
          )
          VALUES (?, ?, ?, ?, ?)
        `)
        .bind(
          user.id,
          title,
          description,
          price,
          category
        )
        .run();


    return Response.json({

      success: true,

      message:
        "تم نشر الخدمة بنجاح",

      service_id:
        result.meta.last_row_id

    });


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء إنشاء الخدمة"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// جلب جميع الخدمات
// ==================================================

async function getServices(
  request,
  env
) {

  try {

    const url =
      new URL(
        request.url
      );


    const category =
      String(
        url.searchParams.get(
          "category"
        ) || ""
      ).trim();


    let result;


    if (category) {

      result =
        await env.DB
          .prepare(`
            SELECT
              services.id,
              services.title,
              services.description,
              services.price,
              services.category,
              services.status,
              services.created_at,
              users.id AS user_id,
              users.full_name AS freelancer_name
            FROM services
            INNER JOIN users
              ON users.id = services.user_id
            WHERE
              services.status = 'active'
              AND services.category = ?
            ORDER BY services.id DESC
          `)
          .bind(category)
          .all();

    } else {

      result =
        await env.DB
          .prepare(`
            SELECT
              services.id,
              services.title,
              services.description,
              services.price,
              services.category,
              services.status,
              services.created_at,
              users.id AS user_id,
              users.full_name AS freelancer_name
            FROM services
            INNER JOIN users
              ON users.id = services.user_id
            WHERE services.status = 'active'
            ORDER BY services.id DESC
          `)
          .all();

    }


    return Response.json({

      success: true,

      services:
        result.results || []

    });


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء جلب الخدمات"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// جلب خدمات المستخدم الحالي
// ==================================================

async function getMyServices(
  request,
  env
) {

  try {

    const user =
      await authenticateUser(
        request,
        env
      );


    if (!user) {

      return Response.json(
        {
          success: false,
          message:
            "يجب تسجيل الدخول أولًا"
        },
        {
          status: 401
        }
      );

    }


    if (
      user.role !== "freelancer"
    ) {

      return Response.json(
        {
          success: false,
          message:
            "هذه الصفحة للمستقلين فقط"
        },
        {
          status: 403
        }
      );

    }


    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            title,
            description,
            price,
            category,
            status,
            created_at,
            updated_at
          FROM services
          WHERE user_id = ?
          ORDER BY id DESC
        `)
        .bind(user.id)
        .all();


    return Response.json({

      success: true,

      services:
        result.results || []

    });


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء جلب خدماتك"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// تعديل خدمة
// ==================================================

async function updateService(
  request,
  env
) {

  try {

    const user =
      await authenticateUser(
        request,
        env
      );


    if (!user) {

      return Response.json(
        {
          success: false,
          message:
            "يجب تسجيل الدخول أولًا"
        },
        {
          status: 401
        }
      );

    }


    if (
      user.role !== "freelancer"
    ) {

      return Response.json(
        {
          success: false,
          message:
            "فقط المستقل يستطيع تعديل الخدمة"
        },
        {
          status: 403
        }
      );

    }


    const serviceId =
      getIdFromPath(
        request
      );


    if (!serviceId) {

      return Response.json(
        {
          success: false,
          message:
            "رقم الخدمة غير صحيح"
        },
        {
          status: 400
        }
      );

    }


    // التأكد أن الخدمة ملك للمستخدم

    const service =
      await env.DB
        .prepare(`
          SELECT
            id,
            user_id
          FROM services
          WHERE id = ?
          LIMIT 1
        `)
        .bind(serviceId)
        .first();


    if (!service) {

      return Response.json(
        {
          success: false,
          message:
            "الخدمة غير موجودة"
        },
        {
          status: 404
        }
      );

    }


    if (
      Number(service.user_id) !==
      Number(user.id)
    ) {

      return Response.json(
        {
          success: false,
          message:
            "لا يمكنك تعديل هذه الخدمة"
        },
        {
          status: 403
        }
      );

    }


    const data =
      await request.json();


    const title =
      String(data.title || "").trim();


    const description =
      String(data.description || "").trim();


    const category =
      String(data.category || "").trim();


    const price =
      Number(data.price);


    const status =
      String(
        data.status || "active"
      );


    if (
      !title ||
      !description ||
      !category ||
      !Number.isFinite(price)
    ) {

      return Response.json(
        {
          success: false,
          message:
            "جميع بيانات الخدمة مطلوبة"
        },
        {
          status: 400
        }
      );

    }


    if (price <= 0) {

      return Response.json(
        {
          success: false,
          message:
            "السعر يجب أن يكون أكبر من صفر"
        },
        {
          status: 400
        }
      );

    }


    if (
      !["active", "paused"].includes(status)
    ) {

      return Response.json(
        {
          success: false,
          message:
            "حالة الخدمة غير صحيحة"
        },
        {
          status: 400
        }
      );

    }


    await env.DB
      .prepare(`
        UPDATE services
        SET
          title = ?,
          description = ?,
          price = ?,
          category = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
      `)
      .bind(
        title,
        description,
        price,
        category,
        status,
        serviceId,
        user.id
      )
      .run();


    return Response.json({

      success: true,

      message:
        "تم تعديل الخدمة بنجاح"

    });


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء تعديل الخدمة"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// حذف خدمة
// ==================================================

async function deleteService(
  request,
  env
) {

  try {

    const user =
      await authenticateUser(
        request,
        env
      );


    if (!user) {

      return Response.json(
        {
          success: false,
          message:
            "يجب تسجيل الدخول أولًا"
        },
        {
          status: 401
        }
      );

    }


    if (
      user.role !== "freelancer"
    ) {

      return Response.json(
        {
          success: false,
          message:
            "فقط المستقل يستطيع حذف الخدمة"
        },
        {
          status: 403
        }
      );

    }


    const serviceId =
      getIdFromPath(
        request
      );


    if (!serviceId) {

      return Response.json(
        {
          success: false,
          message:
            "رقم الخدمة غير صحيح"
        },
        {
          status: 400
        }
      );

    }


    const service =
      await env.DB
        .prepare(`
          SELECT
            id,
            user_id
          FROM services
          WHERE id = ?
          LIMIT 1
        `)
        .bind(serviceId)
        .first();


    if (!service) {

      return Response.json(
        {
          success: false,
          message:
            "الخدمة غير موجودة"
        },
        {
          status: 404
        }
      );

    }


    if (
      Number(service.user_id) !==
      Number(user.id)
    ) {

      return Response.json(
        {
          success: false,
          message:
            "لا يمكنك حذف هذه الخدمة"
        },
        {
          status: 403
        }
      );

    }


    // حذف منطقي بدل حذف السجل نهائيًا

    await env.DB
      .prepare(`
        UPDATE services
        SET
          status = 'deleted',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
      `)
      .bind(
        serviceId,
        user.id
      )
      .run();


    return Response.json({

      success: true,

      message:
        "تم حذف الخدمة بنجاح"

    });


  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء حذف الخدمة"
      },
      {
        status: 500
      }
    );

  }

}


// ==================================================
// التحقق من المستخدم والجلسة
// ==================================================

async function authenticateUser(
  request,
  env
) {

  try {

    const cookies =
      parseCookies(
        request.headers.get("Cookie") || ""
      );


    const sessionToken =
      cookies.mihraf_session;


    if (!sessionToken) {
      return null;
    }


    const tokenHash =
      await sha256Hex(
        sessionToken
      );


    const session =
      await env.DB
        .prepare(`
          SELECT
            users.id,
            users.full_name,
            users.email,
            users.role,
            sessions.expires_at
          FROM sessions
          INNER JOIN users
            ON users.id = sessions.user_id
          WHERE sessions.token_hash = ?
          LIMIT 1
        `)
        .bind(tokenHash)
        .first();


    if (!session) {
      return null;
    }


    // الجلسة منتهية

    if (
      new Date(
        session.expires_at
      ).getTime() <= Date.now()
    ) {

      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE token_hash = ?
        `)
        .bind(tokenHash)
        .run();

      return null;

    }


    return {

      id:
        session.id,

      full_name:
        session.full_name,

      email:
        session.email,

      role:
        session.role

    };


  } catch (error) {

    console.error(error);

    return null;

  }

}


// ==================================================
// استخراج رقم الخدمة من الرابط
// ==================================================

function getIdFromPath(
  request
) {

  const url =
    new URL(
      request.url
    );


  const parts =
    url.pathname
      .split("/")
      .filter(Boolean);


  const id =
    Number(
      parts[parts.length - 1]
    );


  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {

    return null;

  }


  return id;

}


// ==================================================
// تشفير كلمة المرور PBKDF2
// ==================================================

async function hashPassword(
  password,
  salt
) {

  const key =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );


  const bits =
    await crypto.subtle.deriveBits(

      {
        name:
          "PBKDF2",

        salt:
          salt,

        iterations:
          100000,

        hash:
          "SHA-256"
      },

      key,

      256

    );


  return bytesToHex(
    new Uint8Array(bits)
  );

}


// ==================================================
// SHA-256
// ==================================================

async function sha256Hex(
  value
) {

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


// ==================================================
// Token
// ==================================================

function randomToken(
  length
) {

  return bytesToHex(
    randomBytes(length)
  );

}


// ==================================================
// Random Bytes
// ==================================================

function randomBytes(
  length
) {

  const bytes =
    new Uint8Array(
      length
    );


  crypto.getRandomValues(
    bytes
  );


  return bytes;

}


// ==================================================
// Hex → Bytes
// ==================================================

function hexToBytes(
  hex
) {

  const bytes =
    new Uint8Array(
      hex.length / 2
    );


  for (
    let i = 0;
    i < bytes.length;
    i++
  ) {

    bytes[i] =
      parseInt(
        hex.substring(
          i * 2,
          i * 2 + 2
        ),
        16
      );

  }


  return bytes;

}


// ==================================================
// Bytes → Hex
// ==================================================

function bytesToHex(
  bytes
) {

  return Array.from(
    bytes
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


// ==================================================
// مقارنة آمنة
// ==================================================

function constantTimeEqual(
  a,
  b
) {

  if (
    typeof a !== "string" ||
    typeof b !== "string"
  ) {

    return false;

  }


  if (
    a.length !== b.length
  ) {

    return false;

  }


  let result = 0;


  for (
    let i = 0;
    i < a.length;
    i++
  ) {

    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);

  }


  return result === 0;

}


// ==================================================
// قراءة Cookies
// ==================================================

function parseCookies(
  cookieHeader
) {

  const cookies = {};


  cookieHeader
    .split(";")
    .forEach(
      cookie => {

        const index =
          cookie.indexOf("=");


        if (
          index === -1
        ) {

          return;

        }


        const name =
          cookie
            .substring(
              0,
              index
            )
            .trim();


        const value =
          cookie
            .substring(
              index + 1
            )
            .trim();


        cookies[name] =
          value;

      }
    );


  return cookies;

}
