const COOKIE_NAME = "mihraf_session";
const SESSION_DAYS = 30;

// ======================================================
// MIHRAF WORKER
// Auth + Services + Projects + Orders + Payments
// ======================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {

      // ==================================================
      // AUTH
      // ==================================================

      if (
        url.pathname === "/api/register" &&
        request.method === "POST"
      ) {
        return await register(request, env);
      }

      if (
        url.pathname === "/api/login" &&
        request.method === "POST"
      ) {
        return await login(request, env);
      }

      if (
        url.pathname === "/api/forgot-password" &&
        request.method === "POST"
      ) {
        return await forgotPassword(request, env);
      }

      if (
        url.pathname === "/api/test-resend" &&
        request.method === "GET"
      ) {
        return await testResend(env);
      }

      if (
        url.pathname === "/api/reset-password" &&
        request.method === "POST"
      ) {
        return await resetPassword(request, env);
      }

      if (
        url.pathname === "/api/logout" &&
        request.method === "POST"
      ) {
        return await logout(request, env);
      }

      if (
        url.pathname === "/api/me" &&
        request.method === "GET"
      ) {
        return await me(request, env);
      }


      // ==================================================
      // NOTIFICATIONS
      // ==================================================

      if (
        url.pathname === "/api/notifications" &&
        request.method === "GET"
      ) {
        return await getNotifications(request, env);
      }

      if (
        url.pathname === "/api/notifications/read-all" &&
        request.method === "POST"
      ) {
        return await markAllNotificationsRead(request, env);
      }

      const notificationReadMatch =
        url.pathname.match(
          /^\/api\/notifications\/(\d+)\/read$/
        );

      if (
        notificationReadMatch &&
        request.method === "POST"
      ) {
        return await markNotificationRead(
          request,
          env,
          Number(notificationReadMatch[1])
        );
      }


      // ==================================================
      // DASHBOARD
      // ==================================================

      if (
        url.pathname === "/api/dashboard-stats" &&
        request.method === "GET"
      ) {
        return await getDashboardStats(request, env);
      }


      // ==================================================
      // PROJECTS
      // ==================================================

      if (
        url.pathname === "/api/projects" &&
        request.method === "GET"
      ) {
        return await getProjects(request, env);
      }

      if (
        url.pathname === "/api/projects" &&
        request.method === "POST"
      ) {
        return await createProject(request, env);
      }

      if (
        url.pathname === "/api/my-projects" &&
        request.method === "GET"
      ) {
        return await getMyProjects(request, env);
      }

      const projectExecutionMatch =
        url.pathname.match(
          /^\/api\/projects\/(\d+)\/execution$/
        );

      if (
        projectExecutionMatch &&
        request.method === "GET"
      ) {
        return await getProjectExecution(
          request,
          env,
          Number(projectExecutionMatch[1])
        );
      }

      const projectDeliveryMatch =
        url.pathname.match(
          /^\/api\/projects\/(\d+)\/deliveries$/
        );

      if (
        projectDeliveryMatch &&
        request.method === "POST"
      ) {
        return await createDelivery(
          request,
          env,
          Number(projectDeliveryMatch[1])
        );
      }

      const projectMatch =
        url.pathname.match(
          /^\/api\/projects\/(\d+)$/
        );

      if (
        projectMatch &&
        request.method === "GET"
      ) {
        return await getProject(
          request,
          env,
          Number(projectMatch[1])
        );
      }

      const projectProposalsMatch =
        url.pathname.match(
          /^\/api\/projects\/(\d+)\/proposals$/
        );

      if (
        projectProposalsMatch &&
        request.method === "GET"
      ) {
        return await getProjectProposals(
          request,
          env,
          Number(projectProposalsMatch[1])
        );
      }


      // ==================================================
      // PROPOSALS
      // ==================================================

      if (
        url.pathname === "/api/proposals" &&
        request.method === "POST"
      ) {
        return await createProposal(request, env);
      }

      if (
        url.pathname === "/api/my-proposals" &&
        request.method === "GET"
      ) {
        return await getMyProposals(request, env);
      }

      const proposalStatusMatch =
        url.pathname.match(
          /^\/api\/proposals\/(\d+)\/status$/
        );

      if (
        proposalStatusMatch &&
        request.method === "POST"
      ) {
        return await updateProposalStatus(
          request,
          env,
          Number(proposalStatusMatch[1])
        );
      }


      // ==================================================
      // SERVICES
      // ==================================================

      if (
        url.pathname === "/api/services" &&
        request.method === "GET"
      ) {
        return await getServices(request, env);
      }

      if (
        url.pathname === "/api/services" &&
        request.method === "POST"
      ) {
        return await createService(request, env);
      }

      if (
        url.pathname === "/api/my-services" &&
        request.method === "GET"
      ) {
        return await getMyServices(request, env);
      }


      // ==================================================
      // PORTFOLIO
      // ==================================================

      if (
        url.pathname === "/api/portfolio" &&
        request.method === "GET"
      ) {
        return await getPortfolio(request, env);
      }


      // ==================================================
      // SERVICE ORDERS
      // ==================================================

      if (
        url.pathname === "/api/service-orders" &&
        request.method === "POST"
      ) {
        return await createServiceOrder(
          request,
          env
        );
      }

      if (
        url.pathname === "/api/my-service-orders" &&
        request.method === "GET"
      ) {
        return await getMyServiceOrders(
          request,
          env
        );
      }

      if (
        url.pathname === "/api/my-service-requests" &&
        request.method === "GET"
      ) {
        return await getMyServiceRequests(
          request,
          env
        );
      }

      const serviceOrderMatch =
        url.pathname.match(
          /^\/api\/service-orders\/(\d+)$/
        );

      if (
        serviceOrderMatch &&
        request.method === "GET"
      ) {
        return await getServiceOrder(
          request,
          env,
          Number(serviceOrderMatch[1])
        );
      }


      // ==================================================
      // PAYMENTS
      // ==================================================

      if (
        url.pathname === "/api/payments/create" &&
        request.method === "POST"
      ) {
        return await createPaymentTransaction(
          request,
          env
        );
      }

      if (
        url.pathname === "/api/payments/my" &&
        request.method === "GET"
      ) {
        return await getMyPayments(
          request,
          env
        );
      }

      const paymentMatch =
        url.pathname.match(
          /^\/api\/payments\/(\d+)$/
        );

      if (
        paymentMatch &&
        request.method === "GET"
      ) {
        return await getPaymentTransaction(
          request,
          env,
          Number(paymentMatch[1])
        );
      }


      // ==================================================
      // DELIVERIES
      // ==================================================

      const deliveryAcceptMatch =
        url.pathname.match(
          /^\/api\/deliveries\/(\d+)\/accept$/
        );

      if (
        deliveryAcceptMatch &&
        request.method === "POST"
      ) {
        return await acceptDelivery(
          request,
          env,
          Number(deliveryAcceptMatch[1])
        );
      }

      const deliveryRevisionMatch =
        url.pathname.match(
          /^\/api\/deliveries\/(\d+)\/revision$/
        );

      if (
        deliveryRevisionMatch &&
        request.method === "POST"
      ) {
        return await requestRevision(
          request,
          env,
          Number(deliveryRevisionMatch[1])
        );
      }


      // ==================================================
      // HEALTH
      // ==================================================

      if (
        url.pathname === "/api/health" &&
        request.method === "GET"
      ) {
        return json({
          success: true,
          message: "MIHRAF Worker يعمل",
          database: !!env.DB,
          payments: !!env.DB
        });
      }


      // ==================================================
      // STATIC FILES
      // ==================================================

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response(
        "Not Found",
        {
          status: 404,
          headers: {
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    } catch (error) {

      console.error(
        "Worker error:",
        error
      );

      return json(
        {
          success: false,
          error:
            "حدث خطأ داخلي في الخادم",
          details:
            error?.message ||
            String(error)
        },
        500
      );
    }
  }
};


// ======================================================
// REGISTER
// ======================================================

async function register(
  request,
  env
) {

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const fullName =
    cleanText(body.full_name);

  const email =
    cleanEmail(body.email);

  const password =
    String(body.password || "");

  const role =
    cleanText(body.role);

  if (!fullName) {
    return json(
      {
        success: false,
        error:
          "يرجى إدخال الاسم الكامل"
      },
      400
    );
  }

  if (fullName.length < 2) {
    return json(
      {
        success: false,
        error:
          "الاسم يجب أن يكون حرفين على الأقل"
      },
      400
    );
  }

  if (
    !email ||
    !isValidEmail(email)
  ) {
    return json(
      {
        success: false,
        error:
          "يرجى إدخال بريد إلكتروني صحيح"
      },
      400
    );
  }

  if (password.length < 6) {
    return json(
      {
        success: false,
        error:
          "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
      },
      400
    );
  }

  if (
    role !== "client" &&
    role !== "freelancer"
  ) {
    return json(
      {
        success: false,
        error:
          "نوع الحساب غير صحيح"
      },
      400
    );
  }

  const existing =
    await env.DB
      .prepare(`
        SELECT id
        FROM users
        WHERE LOWER(email) =
              LOWER(?)
        LIMIT 1
      `)
      .bind(email)
      .first();

  if (existing) {
    return json(
      {
        success: false,
        error:
          "البريد الإلكتروني مستخدم مسبقا"
      },
      409
    );
  }

  const passwordData =
    await createPasswordHash(
      password
    );

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
        passwordData.hash,
        passwordData.salt,
        role
      )
      .run();

  if (!result.success) {
    throw new Error(
      "تعذر إنشاء الحساب"
    );
  }

  return json(
    {
      success: true,
      message:
        "تم إنشاء الحساب بنجاح",
      user: {
        id:
          result.meta?.last_row_id ??
          null,
        full_name:
          fullName,
        email,
        role
      }
    },
    201
  );
}


// ======================================================
// LOGIN
// ======================================================

async function login(
  request,
  env
) {

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const email =
    cleanEmail(body.email);

  const password =
    String(body.password || "");

  if (!email || !password) {
    return json(
      {
        success: false,
        error:
          "يرجى إدخال البريد الإلكتروني وكلمة المرور"
      },
      400
    );
  }

  const user =
    await env.DB
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
        WHERE LOWER(email) =
              LOWER(?)
        LIMIT 1
      `)
      .bind(email)
      .first();

  if (!user) {
    return json(
      {
        success: false,
        error:
          "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      },
      401
    );
  }

  const validPassword =
    await verifyPassword(
      password,
      user.password_hash,
      user.password_salt
    );

  if (!validPassword) {
    return json(
      {
        success: false,
        error:
          "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      },
      401
    );
  }

  const rawToken =
    generateToken();

  const tokenHash =
    await sha256(rawToken);

  const expiresAt =
    new Date(
      Date.now() +
      SESSION_DAYS *
      24 *
      60 *
      60 *
      1000
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

  const headers =
    new Headers();

  headers.set(
    "Set-Cookie",
    buildSessionCookie(
      rawToken
    )
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
      message:
        "تم تسجيل الدخول بنجاح",
      user: {
        id: user.id,
        full_name:
          user.full_name,
        email:
          user.email,
        role:
          user.role,
        created_at:
          user.created_at
      }
    }),
    {
      status: 200,
      headers
    }
  );
}


// ======================================================
// FORGOT PASSWORD
// ======================================================

async function forgotPassword(
  request,
  env
) {

  try {

    const body =
      await request.json();

    const email =
      cleanEmail(body.email);

    const genericResponse = {
      success: true,
      message:
        "إذا كان البريد الإلكتروني مسجلا لدينا، ستصلك رسالة لإعادة تعيين كلمة المرور."
    };

    if (!email) {
      return json(
        genericResponse
      );
    }

    const user =
      await env.DB
        .prepare(`
          SELECT
            id,
            full_name,
            email
          FROM users
          WHERE LOWER(email) =
                LOWER(?)
          LIMIT 1
        `)
        .bind(email)
        .first();

    if (!user) {
      return json(
        genericResponse
      );
    }

    await env.DB
      .prepare(`
        DELETE FROM password_reset_tokens
        WHERE user_id = ?
      `)
      .bind(user.id)
      .run();

    const tokenBytes =
      crypto.getRandomValues(
        new Uint8Array(32)
      );

    const token =
      Array.from(tokenBytes)
        .map(byte =>
          byte
            .toString(16)
            .padStart(2, "0")
        )
        .join("");

    const tokenHash =
      await sha256(token);

    const expiresAt =
      new Date(
        Date.now() +
        60 * 60 * 1000
      ).toISOString();

    await env.DB
      .prepare(`
        INSERT INTO password_reset_tokens
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

    const resetUrl =
      `${new URL(request.url).origin}` +
      `/reset-password.html?token=` +
      encodeURIComponent(token);

    const resendResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization":
              `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify({
              from:
                "onboarding@resend.dev",
              to: [user.email],
              subject:
                "إعادة تعيين كلمة المرور - مِهراف",
              html: `
                <div
                  dir="rtl"
                  style="
                    font-family:Arial,sans-serif;
                    line-height:1.8;
                    color:#222
                  "
                >
                  <h2 style="color:#2563eb">
                    إعادة تعيين كلمة المرور
                  </h2>

                  <p>
                    مرحبا،
                  </p>

                  <p>
                    اضغط على الزر التالي
                    لإنشاء كلمة مرور جديدة:
                  </p>

                  <p>
                    <a
                      href="${resetUrl}"
                      style="
                        display:inline-block;
                        background:#2563eb;
                        color:#fff;
                        padding:12px 22px;
                        border-radius:8px;
                        text-decoration:none;
                      "
                    >
                      إعادة تعيين كلمة المرور
                    </a>
                  </p>

                  <p>
                    صلاحية هذا الرابط
                    ساعة واحدة فقط.
                  </p>

                  <p>
                    إذا لم تطلب إعادة تعيين
                    كلمة المرور، يمكنك تجاهل
                    هذه الرسالة.
                  </p>

                  <hr>

                  <p
                    style="
                      color:#777;
                      font-size:13px
                    "
                  >
                    مِهراف |
                    منصة الخدمات والمشاريع
                  </p>
                </div>
              `
            })
        }
      );

    if (!resendResponse.ok) {

      const resendError =
        await resendResponse.text();

      console.error(
        "Resend error:",
        resendError
      );

      await env.DB
        .prepare(`
          DELETE FROM password_reset_tokens
          WHERE token_hash = ?
        `)
        .bind(tokenHash)
        .run();

      throw new Error(
        "Resend: " +
        resendError
      );
    }

    return json(
      genericResponse
    );

  } catch (error) {

    console.error(
      "Forgot password error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "حدث خطأ أثناء معالجة طلب إعادة تعيين كلمة المرور",
        details:
          error?.message ||
          String(error)
      },
      500
    );
  }
}


// ======================================================
// TEST RESEND
// ======================================================

async function testResend(env) {

  try {

    if (!env.RESEND_API_KEY) {
      return json(
        {
          success: false,
          configured: false,
          error:
            "RESEND_API_KEY غير موجود"
        },
        500
      );
    }

    const response =
      await fetch(
        "https://api.resend.com/domains",
        {
          method: "GET",
          headers: {
            "Authorization":
              `Bearer ${env.RESEND_API_KEY}`
          }
        }
      );

    if (!response.ok) {
      return json(
        {
          success: false,
          configured: true,
          resend_ok: false,
          status:
            response.status
        },
        502
      );
    }

    return json({
      success: true,
      configured: true,
      resend_ok: true,
      message:
        "Resend API يعمل والمفتاح مقبول"
    });

  } catch (error) {

    return json(
      {
        success: false,
        configured:
          !!env.RESEND_API_KEY,
        error:
          error?.message ||
          String(error)
      },
      500
    );
  }
}


// ======================================================
// RESET PASSWORD
// ======================================================

async function resetPassword(
  request,
  env
) {

  try {

    const body =
      await request.json();

    const token =
      String(
        body.token || ""
      ).trim();

    const newPassword =
      String(
        body.password || ""
      );

    if (!token) {
      return json(
        {
          success: false,
          error:
            "رمز إعادة التعيين غير موجود."
        },
        400
      );
    }

    if (newPassword.length < 8) {
      return json(
        {
          success: false,
          error:
            "كلمة المرور يجب أن تكون 8 أحرف أو أرقام على الأقل."
        },
        400
      );
    }

    const tokenHash =
      await sha256(token);

    const resetToken =
      await env.DB
        .prepare(`
          SELECT
            id,
            user_id,
            expires_at,
            used_at
          FROM password_reset_tokens
          WHERE token_hash = ?
          LIMIT 1
        `)
        .bind(tokenHash)
        .first();

    if (!resetToken) {
      return json(
        {
          success: false,
          error:
            "رابط إعادة تعيين كلمة المرور غير صالح."
        },
        400
      );
    }

    if (resetToken.used_at) {
      return json(
        {
          success: false,
          error:
            "تم استخدام رابط إعادة تعيين كلمة المرور من قبل."
        },
        400
      );
    }

    const expiresAt =
      new Date(
        resetToken.expires_at
      ).getTime();

    if (
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return json(
        {
          success: false,
          error:
            "انتهت صلاحية رابط إعادة تعيين كلمة المرور."
        },
        400
      );
    }

    const passwordData =
      await createPasswordHash(
        newPassword
      );

    await env.DB
      .prepare(`
        UPDATE users
        SET
          password_hash = ?,
          password_salt = ?
        WHERE id = ?
      `)
      .bind(
        passwordData.hash,
        passwordData.salt,
        resetToken.user_id
      )
      .run();

    await env.DB
      .prepare(`
        UPDATE password_reset_tokens
        SET used_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(resetToken.id)
      .run();

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `)
      .bind(
        resetToken.user_id
      )
      .run();

    return json({
      success: true,
      message:
        "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة."
    });

  } catch (error) {

    console.error(
      "Reset password error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "حدث خطأ أثناء إعادة تعيين كلمة المرور."
      },
      500
    );
  }
}


// ======================================================
// LOGOUT
// ======================================================

async function logout(
  request,
  env
) {

  const token =
    getSessionToken(request);

  if (token) {

    const tokenHash =
      await sha256(token);

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE token_hash = ?
      `)
      .bind(tokenHash)
      .run();
  }

  const headers =
    new Headers();

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
      message:
        "تم تسجيل الخروج بنجاح"
    }),
    {
      status: 200,
      headers
    }
  );
}


// ======================================================
// ME
// ======================================================

async function me(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
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
      full_name:
        user.full_name,
      email:
        user.email,
      role:
        user.role,
      created_at:
        user.created_at
    }
  });
}


// ======================================================
// AUTHENTICATED USER
// ======================================================

async function getAuthenticatedUser(
  request,
  env
) {

  const token =
    getSessionToken(request);

  if (!token) {
    return null;
  }

  const tokenHash =
    await sha256(token);

  const session =
    await env.DB
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
    Date.parse(
      session.expires_at
    );

  if (
    Number.isFinite(expiresTime) &&
    expiresTime <= Date.now()
  ) {

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE id = ?
      `)
      .bind(
        session.session_id
      )
      .run();

    return null;
  }

  return {
    id: session.id,
    full_name:
      session.full_name,
    email:
      session.email,
    role:
      session.role,
    created_at:
      session.created_at
  };
}


// ======================================================
// CREATE SERVICE
// ======================================================

async function createService(
  request,
  env
) {

  try {

    const user =
      await getAuthenticatedUser(
        request,
        env
      );

    if (!user) {
      return json(
        {
          success: false,
          error:
            "يجب تسجيل الدخول أولا"
        },
        401
      );
    }

    let body;

    try {
      body =
        await request.json();
    } catch {
      return json(
        {
          success: false,
          error:
            "بيانات الطلب غير صحيحة"
        },
        400
      );
    }

    const title =
      cleanText(body.title);

    const description =
      cleanText(
        body.description
      );

    const category =
      cleanText(
        body.category
      );

    const price =
      Number(body.price);

    if (!title) {
      return json(
        {
          success: false,
          error:
            "يرجى إدخال عنوان الخدمة"
        },
        400
      );
    }

    if (title.length < 3) {
      return json(
        {
          success: false,
          error:
            "عنوان الخدمة قصير جدا"
        },
        400
      );
    }

    if (!description) {
      return json(
        {
          success: false,
          error:
            "يرجى كتابة وصف الخدمة"
        },
        400
      );
    }

    if (description.length < 10) {
      return json(
        {
          success: false,
          error:
            "وصف الخدمة يجب أن يكون أوضح"
        },
        400
      );
    }

    if (!category) {
      return json(
        {
          success: false,
          error:
            "يرجى اختيار تصنيف الخدمة"
        },
        400
      );
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "يرجى إدخال سعر صحيح"
        },
        400
      );
    }

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
          Number(user.id),
          title,
          description,
          price,
          category
        )
        .run();

    if (!result.success) {
      throw new Error(
        "تعذر نشر الخدمة"
      );
    }

    const serviceId =
      result.meta?.last_row_id ??
      null;

    const service =
      await env.DB
        .prepare(`
          SELECT
            id,
            user_id,
            title,
            description,
            price,
            category,
            status,
            created_at,
            updated_at
          FROM services
          WHERE id = ?
          LIMIT 1
        `)
        .bind(serviceId)
        .first();

    return json(
      {
        success: true,
        message:
          "تم نشر الخدمة بنجاح",
        service
      },
      201
    );

  } catch (error) {

    console.error(
      "createService error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "حدث خطأ أثناء نشر الخدمة",
        details:
          error?.message ||
          String(error)
      },
      500
    );
  }
}


// ======================================================
// GET PUBLIC SERVICES
// ======================================================

async function getServices(
  request,
  env
) {

  try {

    const url =
      new URL(request.url);

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
              users.full_name
                AS freelancer_name
            FROM services
            INNER JOIN users
              ON users.id =
                 services.user_id
            WHERE
              services.status =
              'active'
              AND services.category = ?
            ORDER BY
              services.id DESC
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
              users.full_name
                AS freelancer_name
            FROM services
            INNER JOIN users
              ON users.id =
                 services.user_id
            WHERE
              services.status =
              'active'
            ORDER BY
              services.id DESC
          `)
          .all();
    }

    return json({
      success: true,
      services:
        result.results || []
    });

  } catch (error) {

    console.error(
      "Get services error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "حدث خطأ أثناء جلب الخدمات",
        details:
          error?.message ||
          String(error)
      },
      500
    );
  }
}


// ======================================================
// SERVICE ORDERS
// ======================================================

async function createServiceOrder(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const serviceId =
    Number(body.service_id);

  const clientMessage =
    cleanText(
      body.client_message
    );

  if (
    !Number.isInteger(serviceId) ||
    serviceId <= 0
  ) {
    return json(
      {
        success: false,
        error:
          "معرف الخدمة غير صحيح"
      },
      400
    );
  }

  if (
    clientMessage &&
    clientMessage.length < 3
  ) {
    return json(
      {
        success: false,
        error:
          "رسالة الطلب قصيرة جدا"
      },
      400
    );
  }

  const service =
    await env.DB
      .prepare(`
        SELECT
          s.id,
          s.user_id,
          s.title,
          s.description,
          s.price,
          s.category,
          s.status,
          u.full_name
            AS freelancer_name
        FROM services s
        INNER JOIN users u
          ON u.id = s.user_id
        WHERE s.id = ?
        LIMIT 1
      `)
      .bind(serviceId)
      .first();

  if (!service) {
    return json(
      {
        success: false,
        error:
          "الخدمة غير موجودة"
      },
      404
    );
  }

  if (
    service.status !==
    "active"
  ) {
    return json(
      {
        success: false,
        error:
          "هذه الخدمة غير متاحة حاليا"
      },
      400
    );
  }

  if (
    Number(service.user_id) ===
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "لا يمكنك طلب خدمتك الخاصة"
      },
      403
    );
  }

  const existing =
    await env.DB
      .prepare(`
        SELECT
          id,
          status
        FROM service_orders
        WHERE service_id = ?
          AND client_id = ?
          AND status IN
          (
            'pending',
            'accepted',
            'in_progress',
            'delivered'
          )
        LIMIT 1
      `)
      .bind(
        serviceId,
        user.id
      )
      .first();

  if (existing) {
    return json(
      {
        success: false,
        error:
          "لديك طلب قائم بالفعل على هذه الخدمة",
        order_id:
          existing.id,
        status:
          existing.status
      },
      409
    );
  }

  const result =
    await env.DB
      .prepare(`
        INSERT INTO service_orders
        (
          service_id,
          client_id,
          freelancer_id,
          title,
          price,
          client_message,
          status
        )
        VALUES
        (?, ?, ?, ?, ?, ?, 'pending')
      `)
      .bind(
        service.id,
        user.id,
        service.user_id,
        service.title,
        Number(service.price),
        clientMessage || null
      )
      .run();

  if (!result.success) {
    throw new Error(
      "تعذر إنشاء طلب الخدمة"
    );
  }

  const orderId =
    result.meta?.last_row_id ??
    null;

  await createNotification(
    env,
    {
      userId:
        service.user_id,
      type:
        "service_order",
      title:
        "طلب خدمة جديد",
      message:
        `وصل طلب جديد على خدمتك "${service.title}" من العميل ${user.full_name} بقيمة $${service.price}`
    }
  );

  const order =
    await env.DB
      .prepare(`
        SELECT
          id,
          service_id,
          client_id,
          freelancer_id,
          title,
          price,
          client_message,
          freelancer_message,
          status,
          created_at,
          updated_at,
          accepted_at,
          started_at,
          delivered_at,
          completed_at,
          cancelled_at
        FROM service_orders
        WHERE id = ?
        LIMIT 1
      `)
      .bind(orderId)
      .first();

  return json(
    {
      success: true,
      message:
        "تم إرسال طلب الخدمة بنجاح",
      order
    },
    201
  );
}


// ======================================================
// MY SERVICE ORDERS
// ======================================================

async function getMyServiceOrders(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          o.id,
          o.service_id,
          o.client_id,
          o.freelancer_id,
          o.title,
          o.price,
          o.client_message,
          o.freelancer_message,
          o.status,
          o.created_at,
          o.updated_at,
          o.accepted_at,
          o.started_at,
          o.delivered_at,
          o.completed_at,
          o.cancelled_at,
          u.full_name
            AS freelancer_name
        FROM service_orders o
        INNER JOIN users u
          ON u.id =
             o.freelancer_id
        WHERE o.client_id = ?
        ORDER BY o.id DESC
      `)
      .bind(user.id)
      .all();

  return json({
    success: true,
    orders:
      result.results || [],
    count:
      result.results?.length ||
      0
  });
}


// ======================================================
// MY SERVICE REQUESTS
// ======================================================

async function getMyServiceRequests(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          o.id,
          o.service_id,
          o.client_id,
          o.freelancer_id,
          o.title,
          o.price,
          o.client_message,
          o.freelancer_message,
          o.status,
          o.created_at,
          o.updated_at,
          o.accepted_at,
          o.started_at,
          o.delivered_at,
          o.completed_at,
          o.cancelled_at,
          u.full_name
            AS client_name,
          u.email
            AS client_email
        FROM service_orders o
        INNER JOIN users u
          ON u.id =
             o.client_id
        WHERE o.freelancer_id = ?
        ORDER BY o.id DESC
      `)
      .bind(user.id)
      .all();

  return json({
    success: true,
    orders:
      result.results || [],
    count:
      result.results?.length ||
      0
  });
}


// ======================================================
// GET SERVICE ORDER
// ======================================================

async function getServiceOrder(
  request,
  env,
  orderId
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    return json(
      {
        success: false,
        error:
          "معرف الطلب غير صحيح"
      },
      400
    );
  }

  const order =
    await env.DB
      .prepare(`
        SELECT
          o.id,
          o.service_id,
          o.client_id,
          o.freelancer_id,
          o.title,
          o.price,
          o.client_message,
          o.freelancer_message,
          o.status,
          o.created_at,
          o.updated_at,
          o.accepted_at,
          o.started_at,
          o.delivered_at,
          o.completed_at,
          o.cancelled_at,
          c.full_name
            AS client_name,
          c.email
            AS client_email,
          f.full_name
            AS freelancer_name,
          f.email
            AS freelancer_email
        FROM service_orders o
        INNER JOIN users c
          ON c.id =
             o.client_id
        INNER JOIN users f
          ON f.id =
             o.freelancer_id
        WHERE o.id = ?
        LIMIT 1
      `)
      .bind(orderId)
      .first();

  if (!order) {
    return json(
      {
        success: false,
        error:
          "طلب الخدمة غير موجود"
      },
      404
    );
  }

  const isClient =
    Number(order.client_id) ===
    Number(user.id);

  const isFreelancer =
    Number(order.freelancer_id) ===
    Number(user.id);

  if (
    !isClient &&
    !isFreelancer
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بمشاهدة هذا الطلب"
      },
      403
    );
  }

  return json({
    success: true,
    order,
    is_client:
      isClient,
    is_freelancer:
      isFreelancer
  });
}


// ======================================================
// PAYMENT: CREATE TRANSACTION
// ======================================================

async function createPaymentTransaction(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const serviceOrderId =
    body.service_order_id
      ? Number(
          body.service_order_id
        )
      : null;

  const projectId =
    body.project_id
      ? Number(
          body.project_id
        )
      : null;

  const paymentMethod =
    cleanText(
      body.payment_method
    );

  const provider =
    cleanText(
      body.provider
    );

  let grossAmount = 0;
  let sellerId = null;

  // ----------------------------------------------
  // SERVICE PAYMENT
  // ----------------------------------------------

  if (serviceOrderId) {

    if (
      !Number.isInteger(
        serviceOrderId
      ) ||
      serviceOrderId <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "معرف طلب الخدمة غير صحيح"
        },
        400
      );
    }

    const order =
      await env.DB
        .prepare(`
          SELECT
            id,
            client_id,
            freelancer_id,
            title,
            price,
            status
          FROM service_orders
          WHERE id = ?
          LIMIT 1
        `)
        .bind(serviceOrderId)
        .first();

    if (!order) {
      return json(
        {
          success: false,
          error:
            "طلب الخدمة غير موجود"
        },
        404
      );
    }

    if (
      Number(order.client_id) !==
      Number(user.id)
    ) {
      return json(
        {
          success: false,
          error:
            "هذا الطلب لا يخص حسابك"
        },
        403
      );
    }

    grossAmount =
      Number(order.price);

    sellerId =
      Number(
        order.freelancer_id
      );

  } else if (projectId) {

    // --------------------------------------------
    // PROJECT PAYMENT
    // --------------------------------------------

    if (
      !Number.isInteger(
        projectId
      ) ||
      projectId <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "معرف المشروع غير صحيح"
        },
        400
      );
    }

    const project =
      await env.DB
        .prepare(`
          SELECT
            p.id,
            p.user_id,
            p.title,
            p.status,
            pr.freelancer_id,
            pr.price,
            pr.status AS proposal_status
          FROM projects p
          INNER JOIN proposals pr
            ON pr.project_id =
               p.id
          WHERE p.id = ?
            AND pr.status =
                'accepted'
          ORDER BY pr.id DESC
          LIMIT 1
        `)
        .bind(projectId)
        .first();

    if (!project) {
      return json(
        {
          success: false,
          error:
            "لا يوجد عرض مقبول لهذا المشروع"
        },
        404
      );
    }

    if (
      Number(project.user_id) !==
      Number(user.id)
    ) {
      return json(
        {
          success: false,
          error:
            "هذا المشروع لا يخص حسابك"
        },
        403
      );
    }

    grossAmount =
      Number(project.price);

    sellerId =
      Number(
        project.freelancer_id
      );

  } else {

    return json(
      {
        success: false,
        error:
          "يجب تحديد طلب خدمة أو مشروع"
      },
      400
    );
  }

  if (
    !Number.isFinite(
      grossAmount
    ) ||
    grossAmount <= 0
  ) {
    return json(
      {
        success: false,
        error:
          "قيمة الدفع غير صحيحة"
      },
      400
    );
  }

  if (!sellerId) {
    return json(
      {
        success: false,
        error:
          "تعذر تحديد صاحب الخدمة"
      },
      400
    );
  }

  if (
    Number(sellerId) ===
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "لا يمكنك الدفع لنفسك"
      },
      400
    );
  }


  // ==================================================
  // MIHRAF COMMISSION
  // ==================================================

  const commissionRate = 10;

  const platformFee =
    Number(
      (
        grossAmount *
        commissionRate /
        100
      ).toFixed(2)
    );

  const providerFee = 0;

  const sellerAmount =
    Number(
      (
        grossAmount -
        platformFee -
        providerFee
      ).toFixed(2)
    );

  const platformNet =
    Number(
      (
        platformFee -
        providerFee
      ).toFixed(2)
    );


  // ==================================================
  // PREVENT DUPLICATE PENDING PAYMENT
  // ==================================================

  const duplicateQuery =
    serviceOrderId
      ? `
        SELECT id, status
        FROM payment_transactions
        WHERE service_order_id = ?
          AND payer_id = ?
          AND status = 'pending'
        ORDER BY id DESC
        LIMIT 1
      `
      : `
        SELECT id, status
        FROM payment_transactions
        WHERE project_id = ?
          AND payer_id = ?
          AND status = 'pending'
        ORDER BY id DESC
        LIMIT 1
      `;

  const duplicate =
    await env.DB
      .prepare(duplicateQuery)
      .bind(
        serviceOrderId ||
          projectId,
        user.id
      )
      .first();

  if (duplicate) {

    const existingPayment =
      await env.DB
        .prepare(`
          SELECT
            id,
            payer_id,
            seller_id,
            service_order_id,
            project_id,
            gross_amount,
            currency,
            commission_rate,
            platform_fee,
            provider_fee,
            seller_amount,
            platform_net,
            provider,
            payment_method,
            provider_transaction_id,
            status,
            created_at,
            paid_at,
            updated_at
          FROM payment_transactions
          WHERE id = ?
          LIMIT 1
        `)
        .bind(
          duplicate.id
        )
        .first();

    return json({
      success: true,
      existing: true,
      payment:
        existingPayment
    });
  }


  // ==================================================
  // CREATE PAYMENT RECORD
  // ==================================================

  const result =
    await env.DB
      .prepare(`
        INSERT INTO payment_transactions
        (
          payer_id,
          seller_id,
          service_order_id,
          project_id,
          gross_amount,
          currency,
          commission_rate,
          platform_fee,
          provider_fee,
          seller_amount,
          platform_net,
          provider,
          payment_method,
          status
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          'USD',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'pending'
        )
      `)
      .bind(
        Number(user.id),
        Number(sellerId),
        serviceOrderId,
        projectId,
        grossAmount,
        commissionRate,
        platformFee,
        providerFee,
        sellerAmount,
        platformNet,
        provider || null,
        paymentMethod || null
      )
      .run();

  if (!result.success) {
    throw new Error(
      "تعذر إنشاء معاملة الدفع"
    );
  }

  const paymentId =
    result.meta?.last_row_id ??
    null;

  const payment =
    await env.DB
      .prepare(`
        SELECT
          id,
          payer_id,
          seller_id,
          service_order_id,
          project_id,
          gross_amount,
          currency,
          commission_rate,
          platform_fee,
          provider_fee,
          seller_amount,
          platform_net,
          provider,
          payment_method,
          provider_transaction_id,
          status,
          created_at,
          paid_at,
          updated_at
        FROM payment_transactions
        WHERE id = ?
        LIMIT 1
      `)
      .bind(paymentId)
      .first();

  return json(
    {
      success: true,
      message:
        "تم إنشاء معاملة الدفع",
      payment,
      next_step:
        "بانتظار ربط بوابة الدفع وإتمام العملية"
    },
    201
  );
}


// ======================================================
// MY PAYMENTS
// ======================================================

async function getMyPayments(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          id,
          payer_id,
          seller_id,
          service_order_id,
          project_id,
          gross_amount,
          currency,
          commission_rate,
          platform_fee,
          provider_fee,
          seller_amount,
          platform_net,
          provider,
          payment_method,
          provider_transaction_id,
          status,
          created_at,
          paid_at,
          updated_at
        FROM payment_transactions
        WHERE payer_id = ?
           OR seller_id = ?
        ORDER BY id DESC
      `)
      .bind(
        user.id,
        user.id
      )
      .all();

  return json({
    success: true,
    payments:
      result.results || [],
    count:
      result.results?.length ||
      0
  });
}


// ======================================================
// GET PAYMENT
// ======================================================

async function getPaymentTransaction(
  request,
  env,
  paymentId
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  if (
    !Number.isInteger(
      paymentId
    ) ||
    paymentId <= 0
  ) {
    return json(
      {
        success: false,
        error:
          "معرف الدفع غير صحيح"
      },
      400
    );
  }

  const payment =
    await env.DB
      .prepare(`
        SELECT
          id,
          payer_id,
          seller_id,
          service_order_id,
          project_id,
          gross_amount,
          currency,
          commission_rate,
          platform_fee,
          provider_fee,
          seller_amount,
          platform_net,
          provider,
          payment_method,
          provider_transaction_id,
          status,
          created_at,
          paid_at,
          updated_at
        FROM payment_transactions
        WHERE id = ?
        LIMIT 1
      `)
      .bind(paymentId)
      .first();

  if (!payment) {
    return json(
      {
        success: false,
        error:
          "معاملة الدفع غير موجودة"
      },
      404
    );
  }

  const isPayer =
    Number(payment.payer_id) ===
    Number(user.id);

  const isSeller =
    Number(payment.seller_id) ===
    Number(user.id);

  if (
    !isPayer &&
    !isSeller
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بمشاهدة معاملة الدفع"
      },
      403
    );
  }

  return json({
    success: true,
    payment,
    is_payer:
      isPayer,
    is_seller:
      isSeller
  });
}

// ======================================================
// NOTIFICATIONS
// ======================================================

async function createNotification(
  env,
  {
    userId,
    type,
    title,
    message,
    projectId = null,
    deliveryId = null,
    proposalId = null
  }
) {
  try {
    await env.DB
      .prepare(`
        INSERT INTO notifications
        (
          user_id,
          type,
          title,
          message,
          project_id,
          delivery_id,
          proposal_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        Number(userId),
        type,
        title,
        message,
        projectId,
        deliveryId,
        proposalId
      )
      .run();
  } catch (error) {
    console.error(
      "createNotification error:",
      error
    );
  }
}


// ======================================================
// GET NOTIFICATIONS
// ======================================================

async function getNotifications(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          id,
          type,
          title,
          message,
          project_id,
          delivery_id,
          proposal_id,
          is_read,
          created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 50
      `)
      .bind(user.id)
      .all();

  const notifications =
    (result.results || []).map(
      item => ({
        ...item,
        action_url:
          item.project_id
            ? `project-details.html?id=${item.project_id}`
            : null
      })
    );

  const unread =
    notifications.filter(
      item =>
        Number(item.is_read) === 0
    ).length;

  return json({
    success: true,
    notifications,
    unread_count: unread
  });
}


// ======================================================
// MARK NOTIFICATION READ
// ======================================================

async function markNotificationRead(
  request,
  env,
  notificationId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  await env.DB
    .prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ?
        AND user_id = ?
    `)
    .bind(
      notificationId,
      user.id
    )
    .run();

  return json({
    success: true
  });
}


// ======================================================
// MARK ALL NOTIFICATIONS READ
// ======================================================

async function markAllNotificationsRead(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  await env.DB
    .prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ?
        AND is_read = 0
    `)
    .bind(user.id)
    .run();

  return json({
    success: true,
    message:
      "تم تعليم جميع الإشعارات كمقروءة"
  });
}


// ======================================================
// DASHBOARD STATS
// ======================================================

async function getDashboardStats(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const userId =
    Number(user.id);

  const [
    projects,
    openProjects,
    inProgressProjects,
    completedProjects,
    proposals,
    pendingProposals,
    acceptedProposals,
    rejectedProposals,
    services,
    serviceOrders,
    serviceRequests,
    portfolio
  ] =
    await Promise.all([
      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM projects
        WHERE user_id = ?
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM projects
        WHERE user_id = ?
          AND status = 'open'
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM projects
        WHERE user_id = ?
          AND status = 'in_progress'
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM projects
        WHERE user_id = ?
          AND status = 'completed'
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM proposals
        WHERE freelancer_id = ?
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM proposals
        WHERE freelancer_id = ?
          AND status = 'pending'
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM proposals
        WHERE freelancer_id = ?
          AND status = 'accepted'
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM proposals
        WHERE freelancer_id = ?
          AND status = 'rejected'
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM services
        WHERE user_id = ?
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM service_orders
        WHERE client_id = ?
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM service_orders
        WHERE freelancer_id = ?
      `).bind(userId).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM portfolio
        WHERE user_id = ?
      `).bind(userId).first()
    ]);

  return json({
    success: true,
    role: "user",
    stats: {
      total_projects:
        Number(projects?.count || 0),

      open_projects:
        Number(openProjects?.count || 0),

      in_progress_projects:
        Number(inProgressProjects?.count || 0),

      completed_projects:
        Number(completedProjects?.count || 0),

      total_proposals:
        Number(proposals?.count || 0),

      pending_proposals:
        Number(pendingProposals?.count || 0),

      accepted_proposals:
        Number(acceptedProposals?.count || 0),

      rejected_proposals:
        Number(rejectedProposals?.count || 0),

      total_services:
        Number(services?.count || 0),

      total_service_orders:
        Number(serviceOrders?.count || 0),

      total_service_requests:
        Number(serviceRequests?.count || 0),

      total_portfolio:
        Number(portfolio?.count || 0)
    }
  });
}


// ======================================================
// GET PROJECTS
// ======================================================

async function getProjects(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.user_id,
          p.title,
          p.description,
          p.budget,
          p.category,
          p.status,
          p.created_at,
          p.updated_at,
          u.full_name
            AS owner_name
        FROM projects p
        INNER JOIN users u
          ON u.id = p.user_id
        ORDER BY p.id DESC
      `)
      .all();

  const projects =
    (result.results || []).map(
      project => ({
        ...project,
        is_owner:
          Number(project.user_id) ===
          Number(user.id)
      })
    );

  return json({
    success: true,
    projects,
    count: projects.length
  });
}


// ======================================================
// GET MY PROJECTS
// ======================================================

async function getMyProjects(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.user_id,
          p.title,
          p.description,
          p.budget,
          p.category,
          p.status,
          p.created_at,
          p.updated_at,
          u.full_name
            AS owner_name
        FROM projects p
        INNER JOIN users u
          ON u.id = p.user_id
        WHERE p.user_id = ?
        ORDER BY p.id DESC
      `)
      .bind(user.id)
      .all();

  const projects =
    result.results || [];

  return json({
    success: true,
    projects,
    count: projects.length
  });
}


// ======================================================
// CREATE PROJECT
// ======================================================

async function createProject(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const title =
    cleanText(body.title);

  const description =
    cleanText(body.description);

  const category =
    cleanText(body.category);

  const budget =
    Number(body.budget);

  if (!title) {
    return json(
      {
        success: false,
        error:
          "يرجى إدخال عنوان المشروع"
      },
      400
    );
  }

  if (!description) {
    return json(
      {
        success: false,
        error:
          "يرجى إدخال وصف المشروع"
      },
      400
    );
  }

  if (!category) {
    return json(
      {
        success: false,
        error:
          "يرجى اختيار تصنيف المشروع"
      },
      400
    );
  }

  if (
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    return json(
      {
        success: false,
        error:
          "ميزانية المشروع غير صحيحة"
      },
      400
    );
  }

  const result =
    await env.DB
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

  const projectId =
    result.meta?.last_row_id ??
    null;

  const project =
    await env.DB
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

  return json(
    {
      success: true,
      message:
        "تم نشر المشروع بنجاح",
      project
    },
    201
  );
}


// ======================================================
// GET PROJECT
// ======================================================

async function getProject(
  request,
  env,
  projectId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const project =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.user_id,
          p.title,
          p.description,
          p.budget,
          p.category,
          p.status,
          p.created_at,
          p.updated_at,
          u.full_name
            AS owner_name
        FROM projects p
        INNER JOIN users u
          ON u.id = p.user_id
        WHERE p.id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!project) {
    return json(
      {
        success: false,
        error:
          "المشروع غير موجود"
      },
      404
    );
  }

  const isOwner =
    Number(project.user_id) ===
    Number(user.id);

  return json({
    success: true,
    project: {
      ...project,
      is_owner: isOwner,
      can_apply:
        !isOwner &&
        project.status === "open"
    }
  });
}


// ======================================================
// CREATE PROPOSAL
// ======================================================

async function createProposal(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const projectId =
    Number(body.project_id);

  const price =
    Number(body.price);

  const deliveryDays =
    Number(body.delivery_days);

  const message =
    cleanText(body.message);

  const project =
    await env.DB
      .prepare(`
        SELECT
          id,
          user_id,
          title,
          status
        FROM projects
        WHERE id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!project) {
    return json(
      {
        success: false,
        error:
          "المشروع غير موجود"
      },
      404
    );
  }

  if (
    Number(project.user_id) ===
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "لا يمكنك التقديم على مشروعك"
      },
      403
    );
  }

  if (project.status !== "open") {
    return json(
      {
        success: false,
        error:
          "المشروع لم يعد مفتوحا للتقديم"
      },
      400
    );
  }

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return json(
      {
        success: false,
        error:
          "السعر غير صحيح"
      },
      400
    );
  }

  if (
    !Number.isInteger(deliveryDays) ||
    deliveryDays <= 0
  ) {
    return json(
      {
        success: false,
        error:
          "مدة التسليم غير صحيحة"
      },
      400
    );
  }

  if (!message) {
    return json(
      {
        success: false,
        error:
          "يرجى كتابة رسالة العرض"
      },
      400
    );
  }

  const existing =
    await env.DB
      .prepare(`
        SELECT id
        FROM proposals
        WHERE project_id = ?
          AND freelancer_id = ?
        LIMIT 1
      `)
      .bind(
        projectId,
        user.id
      )
      .first();

  if (existing) {
    return json(
      {
        success: false,
        error:
          "لقد قدمت عرضا على هذا المشروع مسبقا"
      },
      409
    );
  }

  const result =
    await env.DB
      .prepare(`
        INSERT INTO proposals
        (
          project_id,
          freelancer_id,
          price,
          delivery_days,
          message,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'pending')
      `)
      .bind(
        projectId,
        user.id,
        price,
        deliveryDays,
        message
      )
      .run();

  const proposalId =
    result.meta?.last_row_id ??
    null;

  await createNotification(
    env,
    {
      userId:
        project.user_id,
      type:
        "proposal",
      title:
        "عرض جديد على مشروعك",
      message:
        `وصل عرض جديد من ${user.full_name} على مشروع "${project.title}" بقيمة $${price}`,
      projectId,
      proposalId
    }
  );

  return json(
    {
      success: true,
      message:
        "تم إرسال العرض بنجاح",
      proposal_id:
        proposalId
    },
    201
  );
}


// ======================================================
// MY PROPOSALS
// ======================================================

async function getMyProposals(
  request,
  env
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          pr.id,
          pr.project_id,
          pr.freelancer_id,
          pr.price,
          pr.delivery_days,
          pr.message,
          pr.status,
          pr.created_at,
          pr.updated_at,
          p.title
            AS project_title,
          p.description
            AS project_description,
          p.budget
            AS project_budget,
          p.category
            AS project_category,
          p.status
            AS project_status
        FROM proposals pr
        INNER JOIN projects p
          ON p.id = pr.project_id
        WHERE pr.freelancer_id = ?
        ORDER BY pr.id DESC
      `)
      .bind(user.id)
      .all();

  return json({
    success: true,
    proposals:
      result.results || []
  });
}


// ======================================================
// PROJECT PROPOSALS
// ======================================================

async function getProjectProposals(
  request,
  env,
  projectId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const project =
    await env.DB
      .prepare(`
        SELECT
          id,
          user_id,
          title
        FROM projects
        WHERE id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!project) {
    return json(
      {
        success: false,
        error:
          "المشروع غير موجود"
      },
      404
    );
  }

  if (
    Number(project.user_id) !==
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بمشاهدة عروض هذا المشروع"
      },
      403
    );
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          pr.id,
          pr.project_id,
          pr.freelancer_id,
          pr.price,
          pr.delivery_days,
          pr.message,
          pr.status,
          pr.created_at,
          pr.updated_at,
          u.full_name
            AS freelancer_name,
          u.email
            AS freelancer_email
        FROM proposals pr
        INNER JOIN users u
          ON u.id =
             pr.freelancer_id
        WHERE pr.project_id = ?
        ORDER BY pr.id DESC
      `)
      .bind(projectId)
      .all();

  return json({
    success: true,
    proposals:
      result.results || []
  });
}


// ======================================================
// UPDATE PROPOSAL STATUS
// ======================================================

async function updateProposalStatus(
  request,
  env,
  proposalId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const status =
    cleanText(body.status);

  if (
    ![
      "accepted",
      "rejected"
    ].includes(status)
  ) {
    return json(
      {
        success: false,
        error:
          "حالة العرض غير صحيحة"
      },
      400
    );
  }

  const proposal =
    await env.DB
      .prepare(`
        SELECT
          pr.id,
          pr.project_id,
          pr.freelancer_id,
          pr.price,
          pr.delivery_days,
          pr.message,
          pr.status,
          p.user_id
            AS project_owner_id,
          p.title
            AS project_title,
          p.status
            AS project_status
        FROM proposals pr
        INNER JOIN projects p
          ON p.id = pr.project_id
        WHERE pr.id = ?
        LIMIT 1
      `)
      .bind(proposalId)
      .first();

  if (!proposal) {
    return json(
      {
        success: false,
        error:
          "العرض غير موجود"
      },
      404
    );
  }

  if (
    Number(proposal.project_owner_id) !==
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بتعديل هذا العرض"
      },
      403
    );
  }

  if (
    proposal.status !==
    "pending"
  ) {
    return json(
      {
        success: false,
        error:
          "لا يمكن تعديل هذا العرض حاليا"
      },
      400
    );
  }

  if (status === "rejected") {

    await env.DB
      .prepare(`
        UPDATE proposals
        SET
          status = 'rejected',
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(proposalId)
      .run();

    await createNotification(
      env,
      {
        userId:
          proposal.freelancer_id,
        type:
          "proposal_rejected",
        title:
          "تم رفض عرضك",
        message:
          `تم رفض عرضك على مشروع "${proposal.project_title}"`,
        projectId:
          proposal.project_id,
        proposalId
      }
    );

    return json({
      success: true,
      message:
        "تم رفض العرض"
    });
  }


  // ====================================================
  // ACCEPT
  // ====================================================

  const existingExecution =
    await env.DB
      .prepare(`
        SELECT id
        FROM project_executions
        WHERE project_id = ?
        LIMIT 1
      `)
      .bind(proposal.project_id)
      .first();

  if (existingExecution) {
    return json(
      {
        success: false,
        error:
          "يوجد تنفيذ قائم لهذا المشروع"
      },
      409
    );
  }

  await env.DB
    .prepare(`
      UPDATE proposals
      SET
        status =
          CASE
            WHEN id = ?
            THEN 'accepted'
            ELSE
              CASE
                WHEN status = 'pending'
                THEN 'rejected'
                ELSE status
              END
          END,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE project_id = ?
    `)
    .bind(
      proposalId,
      proposal.project_id
    )
    .run();

  await env.DB
    .prepare(`
      UPDATE projects
      SET
        status = 'in_progress',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
      proposal.project_id
    )
    .run();

  const execution =
    await ensureProjectExecution(
      env,
      proposal.project_id
    );

  await createNotification(
    env,
    {
      userId:
        proposal.freelancer_id,
      type:
        "proposal_accepted",
      title:
        "تم قبول عرضك",
      message:
        `تم قبول عرضك على مشروع "${proposal.project_title}". يمكنك الآن بدء التنفيذ.`,
      projectId:
        proposal.project_id,
      proposalId
    }
  );

  return json({
    success: true,
    message:
      "تم قبول العرض وبدء تنفيذ المشروع",
    execution
  });
}


// ======================================================
// ENSURE PROJECT EXECUTION
// ======================================================

async function ensureProjectExecution(
  env,
  projectId
) {
  const existing =
    await env.DB
      .prepare(`
        SELECT
          id,
          project_id,
          proposal_id,
          freelancer_id,
          start_at,
          due_at,
          status,
          completed_at,
          created_at,
          updated_at
        FROM project_executions
        WHERE project_id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (existing) {
    return existing;
  }

  const acceptedProposal =
    await env.DB
      .prepare(`
        SELECT
          id,
          project_id,
          freelancer_id,
          price,
          delivery_days
        FROM proposals
        WHERE project_id = ?
          AND status = 'accepted'
        ORDER BY id DESC
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!acceptedProposal) {
    throw new Error(
      "لا يوجد عرض مقبول للمشروع"
    );
  }

  const startAt =
    new Date();

  const dueAt =
    new Date(
      startAt.getTime() +
      Number(
        acceptedProposal.delivery_days
      ) *
      24 *
      60 *
      60 *
      1000
    );

  const result =
    await env.DB
      .prepare(`
        INSERT INTO project_executions
        (
          project_id,
          proposal_id,
          freelancer_id,
          start_at,
          due_at,
          status
        )
        VALUES
        (?, ?, ?, ?, ?, 'in_progress')
      `)
      .bind(
        projectId,
        acceptedProposal.id,

        // =================================================
        // FIX:
        // الصحيح freelancer_id
        // =================================================
        acceptedProposal.freelancer_id,

        startAt.toISOString(),
        dueAt.toISOString()
      )
      .run();

  let executionId =
    result.meta?.last_row_id ??
    null;

  if (!executionId) {

    const retry =
      await env.DB
        .prepare(`
          SELECT
            id,
            project_id,
            proposal_id,
            freelancer_id,
            start_at,
            due_at,
            status,
            completed_at,
            created_at,
            updated_at
          FROM project_executions
          WHERE project_id = ?
          LIMIT 1
        `)
        .bind(projectId)
        .first();

    if (retry) {
      return retry;
    }

    throw new Error(
      "تعذر إنشاء تنفيذ المشروع"
    );
  }

  const project =
    await env.DB
      .prepare(`
        SELECT
          title,
          user_id
        FROM projects
        WHERE id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  await env.DB
    .prepare(`
      INSERT INTO project_events
      (
        project_id,
        user_id,
        event_type,
        message
      )
      VALUES (?, ?, ?, ?)
    `)
    .bind(
      projectId,
      acceptedProposal.freelancer_id,
      "execution_started",
      "بدأ تنفيذ المشروع"
    )
    .run()
    .catch(() => {});

  const execution =
    await env.DB
      .prepare(`
        SELECT
          id,
          project_id,
          proposal_id,
          freelancer_id,
          start_at,
          due_at,
          status,
          completed_at,
          created_at,
          updated_at
        FROM project_executions
        WHERE id = ?
        LIMIT 1
      `)
      .bind(executionId)
      .first();

  return execution;
}


// ======================================================
// GET PROJECT EXECUTION
// ======================================================

async function getProjectExecution(
  request,
  env,
  projectId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const project =
    await env.DB
      .prepare(`
        SELECT
          id,
          user_id,
          title,
          description,
          budget,
          category,
          status
        FROM projects
        WHERE id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!project) {
    return json(
      {
        success: false,
        error:
          "المشروع غير موجود"
      },
      404
    );
  }

  const execution =
    await ensureProjectExecution(
      env,
      projectId
    );

  const isOwner =
    Number(project.user_id) ===
    Number(user.id);

  const isFreelancer =
    Number(
      execution.freelancer_id
    ) ===
    Number(user.id);

  if (
    !isOwner &&
    !isFreelancer
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بمشاهدة التنفيذ"
      },
      403
    );
  }

  const proposal =
    await env.DB
      .prepare(`
        SELECT
          id,
          project_id,
          freelancer_id,
          price,
          delivery_days,
          message,
          status,
          created_at,
          updated_at
        FROM proposals
        WHERE id = ?
        LIMIT 1
      `)
      .bind(
        execution.proposal_id
      )
      .first();

  const delivery =
    await env.DB
      .prepare(`
        SELECT
          id,
          execution_id,
          freelancer_id,
          version,
          message,
          file_url,
          status,
          created_at
        FROM project_deliveries
        WHERE execution_id = ?
        ORDER BY version DESC
        LIMIT 1
      `)
      .bind(execution.id)
      .first();

  const revision =
    await env.DB
      .prepare(`
        SELECT
          id,
          execution_id,
          delivery_id,
          message,
          status,
          created_at,
          resolved_at
        FROM project_revision_requests
        WHERE execution_id = ?
        ORDER BY id DESC
        LIMIT 1
      `)
      .bind(execution.id)
      .first();

  const events =
    await env.DB
      .prepare(`
        SELECT
          id,
          project_id,
          user_id,
          event_type,
          message,
          created_at
        FROM project_events
        WHERE project_id = ?
        ORDER BY id DESC
      `)
      .bind(projectId)
      .all();

  return json({
    success: true,
    project,
    execution,
    proposal,
    delivery,
    revision,
    events:
      events.results || [],
    is_owner:
      isOwner,
    is_freelancer:
      isFreelancer
  });
}


// ======================================================
// CREATE DELIVERY
// ======================================================

async function createDelivery(
  request,
  env,
  projectId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const message =
    cleanText(body.message);

  const fileUrl =
    cleanText(body.file_url);

  if (!message) {
    return json(
      {
        success: false,
        error:
          "يرجى كتابة رسالة التسليم"
      },
      400
    );
  }

  const execution =
    await ensureProjectExecution(
      env,
      projectId
    );

  if (
    Number(execution.freelancer_id) !==
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بتسليم هذا المشروع"
      },
      403
    );
  }

  if (
    ![
      "in_progress",
      "revision_requested"
    ].includes(
      execution.status
    )
  ) {
    return json(
      {
        success: false,
        error:
          "لا يمكن تسليم المشروع في حالته الحالية"
      },
      400
    );
  }

  const lastDelivery =
    await env.DB
      .prepare(`
        SELECT
          MAX(version) AS version
        FROM project_deliveries
        WHERE execution_id = ?
      `)
      .bind(execution.id)
      .first();

  const version =
    Number(
      lastDelivery?.version || 0
    ) + 1;

  const result =
    await env.DB
      .prepare(`
        INSERT INTO project_deliveries
        (
          execution_id,
          freelancer_id,
          version,
          message,
          file_url,
          status
        )
        VALUES
        (?, ?, ?, ?, ?, 'submitted')
      `)
      .bind(
        execution.id,
        user.id,
        version,
        message,
        fileUrl || null
      )
      .run();

  const deliveryId =
    result.meta?.last_row_id ??
    null;

  await env.DB
    .prepare(`
      UPDATE project_executions
      SET
        status = 'submitted',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(execution.id)
    .run();

  await env.DB
    .prepare(`
      UPDATE project_revision_requests
      SET
        status = 'resolved',
        resolved_at =
          CURRENT_TIMESTAMP
      WHERE execution_id = ?
        AND status = 'open'
    `)
    .bind(execution.id)
    .run()
    .catch(() => {});

  await createNotification(
    env,
    {
      userId:
        await getProjectOwnerId(
          env,
          projectId
        ),
      type:
        "delivery",
      title:
        "تم تسليم المشروع",
      message:
        `تم إرسال التسليم رقم ${version} لمشروعك`,
      projectId,
      deliveryId
    }
  );

  return json(
    {
      success: true,
      message:
        "تم تسليم المشروع بنجاح",
      delivery_id:
        deliveryId,
      version
    },
    201
  );
}


// ======================================================
// ACCEPT DELIVERY
// ======================================================

async function acceptDelivery(
  request,
  env,
  deliveryId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  const delivery =
    await env.DB
      .prepare(`
        SELECT
          d.id,
          d.execution_id,
          d.freelancer_id,
          d.version,
          d.message,
          d.file_url,
          d.status,
          e.project_id,
          p.user_id
            AS project_owner_id,
          p.title
            AS project_title
        FROM project_deliveries d
        INNER JOIN project_executions e
          ON e.id =
             d.execution_id
        INNER JOIN projects p
          ON p.id =
             e.project_id
        WHERE d.id = ?
        LIMIT 1
      `)
      .bind(deliveryId)
      .first();

  if (!delivery) {
    return json(
      {
        success: false,
        error:
          "التسليم غير موجود"
      },
      404
    );
  }

  if (
    Number(delivery.project_owner_id) !==
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بقبول هذا التسليم"
      },
      403
    );
  }

  if (
    delivery.status !==
    "submitted"
  ) {
    return json(
      {
        success: false,
        error:
          "هذا التسليم لم يعد قابلا للقبول"
      },
      400
    );
  }

  await env.DB
    .prepare(`
      UPDATE project_deliveries
      SET status = 'accepted'
      WHERE id = ?
    `)
    .bind(deliveryId)
    .run();

  await env.DB
    .prepare(`
      UPDATE project_executions
      SET
        status = 'completed',
        completed_at =
          CURRENT_TIMESTAMP,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(delivery.execution_id)
    .run();

  await env.DB
    .prepare(`
      UPDATE projects
      SET
        status = 'completed',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(delivery.project_id)
    .run();

  await env.DB
    .prepare(`
      UPDATE project_revision_requests
      SET
        status = 'resolved',
        resolved_at =
          CURRENT_TIMESTAMP
      WHERE execution_id = ?
        AND status = 'open'
    `)
    .bind(delivery.execution_id)
    .run()
    .catch(() => {});

  await createNotification(
    env,
    {
      userId:
        delivery.freelancer_id,
      type:
        "delivery_accepted",
      title:
        "تم قبول التسليم",
      message:
        `تم قبول تسليم مشروع "${delivery.project_title}" وإكمال المشروع`,
      projectId:
        delivery.project_id,
      deliveryId
    }
  );

  return json({
    success: true,
    message:
      "تم قبول التسليم وإكمال المشروع بنجاح"
  });
}


// ======================================================
// REQUEST REVISION
// ======================================================

async function requestRevision(
  request,
  env,
  deliveryId
) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return json(
      {
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      },
      401
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        success: false,
        error:
          "بيانات الطلب غير صحيحة"
      },
      400
    );
  }

  const message =
    cleanText(body.message);

  if (!message) {
    return json(
      {
        success: false,
        error:
          "يرجى كتابة تفاصيل التعديل المطلوب"
      },
      400
    );
  }

  const delivery =
    await env.DB
      .prepare(`
        SELECT
          d.id,
          d.execution_id,
          d.freelancer_id,
          d.status,
          e.project_id,
          p.user_id
            AS project_owner_id,
          p.title
            AS project_title
        FROM project_deliveries d
        INNER JOIN project_executions e
          ON e.id =
             d.execution_id
        INNER JOIN projects p
          ON p.id =
             e.project_id
        WHERE d.id = ?
        LIMIT 1
      `)
      .bind(deliveryId)
      .first();

  if (!delivery) {
    return json(
      {
        success: false,
        error:
          "التسليم غير موجود"
      },
      404
    );
  }

  if (
    Number(delivery.project_owner_id) !==
    Number(user.id)
  ) {
    return json(
      {
        success: false,
        error:
          "غير مسموح لك بطلب تعديل"
      },
      403
    );
  }

  if (
    delivery.status !==
    "submitted"
  ) {
    return json(
      {
        success: false,
        error:
          "لا يمكن طلب تعديل على هذا التسليم"
      },
      400
    );
  }

  const existing =
    await env.DB
      .prepare(`
        SELECT id
        FROM project_revision_requests
        WHERE execution_id = ?
          AND status = 'open'
        LIMIT 1
      `)
      .bind(
        delivery.execution_id
      )
      .first();

  if (existing) {
    return json(
      {
        success: false,
        error:
          "يوجد طلب تعديل مفتوح بالفعل"
      },
      409
    );
  }

  const result =
    await env.DB
      .prepare(`
        INSERT INTO project_revision_requests
        (
          execution_id,
          delivery_id,
          message,
          status
        )
        VALUES (?, ?, ?, 'open')
      `)
      .bind(
        delivery.execution_id,
        deliveryId,
        message
      )
      .run();

  await env.DB
    .prepare(`
      UPDATE project_deliveries
      SET status =
        'revision_requested'
      WHERE id = ?
    `)
    .bind(deliveryId)
    .run();

  await env.DB
    .prepare(`
      UPDATE project_executions
      SET
        status =
          'revision_requested',
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(delivery.execution_id)
    .run();

  await createNotification(
    env,
    {
      userId:
        delivery.freelancer_id,
      type:
        "revision_requested",
      title:
        "مطلوب تعديل على التسليم",
      message:
        `طلب العميل تعديلا على مشروع "${delivery.project_title}": ${message}`,
      projectId:
        delivery.project_id,
      deliveryId
    }
  );

  return json(
    {
      success: true,
      message:
        "تم إرسال طلب التعديل",
      revision_id:
        result.meta?.last_row_id ??
        null
    },
    201
  );
}


// ======================================================
// MY SERVICES
// ======================================================

async function getMyServices(
  request,
  env
) {
  try {

    const user =
      await getAuthenticatedUser(
        request,
        env
      );

    if (!user) {
      return json({
        success: false,
        error:
          "يجب تسجيل الدخول أولا"
      }, 401);
    }

    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            user_id,
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
        .bind(Number(user.id))
        .all();

    return json({
      success: true,
      services:
        result.results || []
    });

  } catch (error) {

    console.error(
      "getMyServices error:",
      error
    );

    return json({
      success: false,
      error:
        "حدث خطأ أثناء تحميل الخدمات",
      details:
        error?.message ||
        String(error)
    }, 500);
  }
}


// ======================================================
// PORTFOLIO
// ======================================================

async function getPortfolio(
  request,
  env
) {
  try {

    const url =
      new URL(request.url);

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
              p.id,
              p.user_id,
              p.title,
              p.description,
              p.image_url,
              p.project_url,
              p.category,
              p.created_at,
              u.full_name
                AS freelancer_name
            FROM portfolio p
            INNER JOIN users u
              ON u.id = p.user_id
            WHERE p.status = 'published'
              AND p.category = ?
            ORDER BY p.id DESC
          `)
          .bind(category)
          .all();

    } else {

      result =
        await env.DB
          .prepare(`
            SELECT
              p.id,
              p.user_id,
              p.title,
              p.description,
              p.image_url,
              p.project_url,
              p.category,
              p.created_at,
              u.full_name
                AS freelancer_name
            FROM portfolio p
            INNER JOIN users u
              ON u.id = p.user_id
            WHERE p.status = 'published'
            ORDER BY p.id DESC
          `)
          .all();
    }

    return json({
      success: true,
      portfolio:
        result.results || []
    });

  } catch (error) {

    console.error(
      "getPortfolio error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "حدث خطأ أثناء تحميل معرض الأعمال",
        details:
          error?.message ||
          String(error)
      },
      500
    );
  }
}


// ======================================================
// GET PROJECT OWNER
// ======================================================

async function getProjectOwnerId(
  env,
  projectId
) {
  const project =
    await env.DB
      .prepare(`
        SELECT user_id
        FROM projects
        WHERE id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  return project
    ? Number(project.user_id)
    : null;
}


// ======================================================
// PASSWORD HASH
// ======================================================

async function createPasswordHash(
  password
) {
  const saltBytes =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const salt =
    bytesToHex(saltBytes);

  const hash =
    await sha256(
      password + salt
    );

  return {
    hash,
    salt
  };
}


// ======================================================
// VERIFY PASSWORD
// ======================================================

async function verifyPassword(
  password,
  storedHash,
  salt
) {
  const hash =
    await sha256(
      password + salt
    );

  return constantTimeEqual(
    hash,
    storedHash
  );
}


// ======================================================
// SHA256
// ======================================================

async function sha256(
  value
) {
  const data =
    new TextEncoder()
      .encode(String(value));

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return bytesToHex(
    new Uint8Array(
      hashBuffer
    )
  );
}


// ======================================================
// CONSTANT TIME EQUAL
// ======================================================

function constantTimeEqual(
  a,
  b
) {
  const x =
    String(a || "");

  const y =
    String(b || "");

  if (
    x.length !==
    y.length
  ) {
    return false;
  }

  let result = 0;

  for (
    let i = 0;
    i < x.length;
    i++
  ) {
    result |=
      x.charCodeAt(i) ^
      y.charCodeAt(i);
  }

  return result === 0;
}


// ======================================================
// TOKEN
// ======================================================

function generateToken() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(32)
    );

  return bytesToHex(bytes);
}


// ======================================================
// BYTES TO HEX
// ======================================================

function bytesToHex(
  bytes
) {
  return Array.from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// ======================================================
// SESSION COOKIE
// ======================================================

function buildSessionCookie(
  token
) {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ].join("; ");
}


// ======================================================
// CLEAR COOKIE
// ======================================================

function clearSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ].join("; ");
}


// ======================================================
// GET SESSION TOKEN
// ======================================================

function getSessionToken(
  request
) {
  const cookieHeader =
    request.headers.get(
      "Cookie"
    );

  if (!cookieHeader) {
    return null;
  }

  const cookies =
    cookieHeader
      .split(";")
      .map(
        item =>
          item.trim()
      );

  for (
    const cookie of cookies
  ) {
    const index =
      cookie.indexOf("=");

    if (index === -1) {
      continue;
    }

    const name =
      cookie.slice(
        0,
        index
      );

    const value =
      cookie.slice(
        index + 1
      );

    if (
      name ===
      COOKIE_NAME
    ) {
      return value || null;
    }
  }

  return null;
}


// ======================================================
// CLEAN TEXT
// ======================================================

function cleanText(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


// ======================================================
// CLEAN EMAIL
// ======================================================

function cleanEmail(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}


// ======================================================
// VALID EMAIL
// ======================================================

function isValidEmail(
  email
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);
}


// ======================================================
// JSON RESPONSE
// ======================================================

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}
