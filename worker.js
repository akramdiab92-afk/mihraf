const COOKIE_NAME = "mihraf_session";
const SESSION_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      // AUTH
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

      // NOTIFICATIONS
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
        url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/);

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

      // DASHBOARD STATISTICS
      if (
        url.pathname === "/api/dashboard-stats" &&
        request.method === "GET"
      ) {
        return await getDashboardStats(request, env);
      }

      // PROJECTS
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

      const projectExecutionMatch =
        url.pathname.match(/^\/api\/projects\/(\d+)\/execution$/);

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
        url.pathname.match(/^\/api\/projects\/(\d+)\/deliveries$/);

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
        url.pathname.match(/^\/api\/projects\/(\d+)$/);

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
        url.pathname.match(/^\/api\/projects\/(\d+)\/proposals$/);

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

      // PROPOSALS
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
        url.pathname.match(/^\/api\/proposals\/(\d+)\/status$/);

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

      // SERVICES

      // إضافة خدمة جديدة
      if (
        url.pathname === "/api/services" &&
        request.method === "POST"
      ) {
        return await createService(request, env);
      }

      // خدماتي
      if (
        url.pathname === "/api/my-services" &&
        request.method === "GET"
      ) {
        return await getMyServices(request, env);
      }

      // DELIVERIES
      const deliveryAcceptMatch =
        url.pathname.match(/^\/api\/deliveries\/(\d+)\/accept$/);

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
        url.pathname.match(/^\/api\/deliveries\/(\d+)\/revision$/);

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

      // HEALTH
      if (
        url.pathname === "/api/health" &&
        request.method === "GET"
      ) {
        return json({
          success: true,
          message: "MIHRAF Worker يعمل",
          database: !!env.DB
        });
      }

      // STATIC FILES
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


// ================================
// REGISTER
// ================================

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

  const existing =
    await env.DB
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

  const passwordData =
    await createPasswordHash(password);

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


// ================================
// LOGIN
// ================================

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

  const validPassword =
    await verifyPassword(
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


// ================================
// LOGOUT
// ================================

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


// ================================
// ME
// ================================

async function me(request, env) {
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
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    }
  });
}


// ================================
// AUTHENTICATED USER
// ================================

async function getAuthenticatedUser(
  request,
  env
) {
  const token = getSessionToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);

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


// ================================
// CREATE SERVICE
// ================================

async function createService(request, env) {
  try {
    const user =
      await getAuthenticatedUser(
        request,
        env
      );

    if (!user) {
      return json({
        success: false,
        error: "يجب تسجيل الدخول أولا"
      }, 401);
    }

    if (user.role !== "freelancer") {
      return json({
        success: false,
        error: "إضافة الخدمات متاحة للمستقلين فقط"
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
    const price = Number(body.price);

    if (!title) {
      return json({
        success: false,
        error: "يرجى إدخال عنوان الخدمة"
      }, 400);
    }

    if (title.length < 3) {
      return json({
        success: false,
        error: "عنوان الخدمة قصير جدا"
      }, 400);
    }

    if (!description) {
      return json({
        success: false,
        error: "يرجى كتابة وصف الخدمة"
      }, 400);
    }

    if (description.length < 10) {
      return json({
        success: false,
        error: "وصف الخدمة يجب أن يكون أوضح"
      }, 400);
    }

    if (!category) {
      return json({
        success: false,
        error: "يرجى اختيار تصنيف الخدمة"
      }, 400);
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return json({
        success: false,
        error: "يرجى إدخال سعر صحيح"
      }, 400);
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
      throw new Error("تعذر نشر الخدمة");
    }

    const serviceId =
      result.meta?.last_row_id ?? null;

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

    return json({
      success: true,
      message: "تم نشر الخدمة بنجاح",
      service
    }, 201);

  } catch (error) {
    console.error(
      "createService error:",
      error
    );

    return json({
      success: false,
      error: "حدث خطأ أثناء نشر الخدمة",
      details: error?.message || String(error)
    }, 500);
  }
}


// ================================
// NOTIFICATIONS
// ================================

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
    if (
      !env.DB ||
      !userId ||
      !type ||
      !title ||
      !message
    ) {
      return null;
    }

    const result =
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
            proposal_id,
            is_read
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `)
        .bind(
          Number(userId),
          cleanText(type),
          cleanText(title),
          cleanText(message),
          projectId ? Number(projectId) : null,
          deliveryId ? Number(deliveryId) : null,
          proposalId ? Number(proposalId) : null
        )
        .run();

    if (!result.success) {
      console.error("Notification insert failed");
      return null;
    }

    return result.meta?.last_row_id || null;

  } catch (error) {
    console.error(
      "Notification error:",
      error
    );

    return null;
  }
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          id,
          user_id,
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
      notification => ({
        ...notification,
        is_read:
          Number(notification.is_read) === 1,
        action_url:
          notification.project_id
            ? `project-details.html?id=${encodeURIComponent(
                notification.project_id
              )}`
            : null
      })
    );

  const unreadResult =
    await env.DB
      .prepare(`
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE user_id = ?
          AND is_read = 0
      `)
      .bind(user.id)
      .first();

  return json({
    success: true,
    notifications,
    unread_count:
      Number(unreadResult?.count || 0)
  });
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(notificationId) ||
    notificationId <= 0
  ) {
    return json({
      success: false,
      error: "معرف الإشعار غير صحيح"
    }, 400);
  }

  const result =
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

  if (!result.success) {
    throw new Error("تعذر تحديث الإشعار");
  }

  return json({
    success: true,
    message: "تم تحديد الإشعار كمقروء"
  });
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  const result =
    await env.DB
      .prepare(`
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ?
          AND is_read = 0
      `)
      .bind(user.id)
      .run();

  if (!result.success) {
    throw new Error("تعذر تحديث الإشعارات");
  }

  return json({
    success: true,
    message: "تم تحديد جميع الإشعارات كمقروءة"
  });
}


// ================================
// DASHBOARD
// ================================

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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role === "client") {
    const results =
      await env.DB.batch([

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM projects
          WHERE user_id = ?
        `).bind(user.id),

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM projects
          WHERE user_id = ?
            AND status = 'open'
        `).bind(user.id),

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM projects
          WHERE user_id = ?
            AND status = 'in_progress'
        `).bind(user.id),

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM projects
          WHERE user_id = ?
            AND status = 'completed'
        `).bind(user.id)

      ]);

    return json({
      success: true,
      role: "client",
      stats: {
        total_projects:
          Number(
            results[0]?.results?.[0]?.count || 0
          ),

        open_projects:
          Number(
            results[1]?.results?.[0]?.count || 0
          ),

        in_progress_projects:
          Number(
            results[2]?.results?.[0]?.count || 0
          ),

        completed_projects:
          Number(
            results[3]?.results?.[0]?.count || 0
          )
      }
    });
  }

  if (user.role === "freelancer") {
    const results =
      await env.DB.batch([

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM proposals
          WHERE freelancer_id = ?
        `).bind(user.id),

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM proposals
          WHERE freelancer_id = ?
            AND status = 'pending'
        `).bind(user.id),

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM proposals
          WHERE freelancer_id = ?
            AND status = 'accepted'
        `).bind(user.id),

        env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM proposals
          WHERE freelancer_id = ?
            AND status = 'rejected'
        `).bind(user.id)

      ]);

    return json({
      success: true,
      role: "freelancer",
      stats: {
        total_proposals:
          Number(
            results[0]?.results?.[0]?.count || 0
          ),

        pending_proposals:
          Number(
            results[1]?.results?.[0]?.count || 0
          ),

        accepted_proposals:
          Number(
            results[2]?.results?.[0]?.count || 0
          ),

        rejected_proposals:
          Number(
            results[3]?.results?.[0]?.count || 0
          )
      }
    });
  }

  return json({
    success: false,
    error: "نوع الحساب غير معروف"
  }, 400);
}


// ================================
// PROJECTS
// ================================

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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  let result;

  if (user.role === "client") {
    result =
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
            u.full_name AS owner_name
          FROM projects p
          LEFT JOIN users u
            ON u.id = p.user_id
          WHERE p.user_id = ?
          ORDER BY p.id DESC
        `)
        .bind(user.id)
        .all();

  } else if (user.role === "freelancer") {
    result =
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
            u.full_name AS owner_name
          FROM projects p
          LEFT JOIN users u
            ON u.id = p.user_id
          WHERE p.status = 'open'
            AND p.user_id != ?
          ORDER BY p.id DESC
        `)
        .bind(user.id)
        .all();

  } else {
    return json({
      success: false,
      error: "نوع الحساب غير معروف"
    }, 400);
  }

  return json({
    success: true,
    projects: result.results || [],
    count: result.results?.length || 0
  });
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

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

  if (!result.success) {
    throw new Error("تعذر إنشاء المشروع");
  }

  const projectId =
    result.meta?.last_row_id;

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

  return json({
    success: true,
    message: "تم إنشاء المشروع بنجاح",
    project
  }, 201);
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
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
          u.full_name AS owner_name
        FROM projects p
        LEFT JOIN users u
          ON u.id = p.user_id
        WHERE p.id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!project) {
    return json({
      success: false,
      error: "المشروع غير موجود"
    }, 404);
  }

  const projectOwnerId =
    Number(project.user_id);

  const currentUserId =
    Number(user.id);

  const isOwner =
    projectOwnerId === currentUserId;

  const canApply =
    user.role === "freelancer" &&
    !isOwner &&
    project.status === "open";

  return json({
    success: true,
    project: {
      ...project,
      is_owner: isOwner
    },
    is_owner: isOwner,
    can_apply: canApply
  });
}

// ================================
// PROPOSALS
// ================================

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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "تقديم العروض متاح للمستقلين فقط"
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

  const projectId = Number(body.project_id);
  const price = Number(body.price);
  const deliveryDays = Number(body.delivery_days);
  const message = cleanText(body.message);

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return json({
      success: false,
      error: "يرجى إدخال سعر صحيح"
    }, 400);
  }

  if (
    !Number.isInteger(deliveryDays) ||
    deliveryDays <= 0
  ) {
    return json({
      success: false,
      error: "يرجى إدخال مدة تسليم صحيحة"
    }, 400);
  }

  if (!message) {
    return json({
      success: false,
      error: "يرجى كتابة رسالة العرض"
    }, 400);
  }

  if (message.length < 5) {
    return json({
      success: false,
      error: "رسالة العرض قصيرة جدا"
    }, 400);
  }

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
    return json({
      success: false,
      error: "المشروع غير موجود"
    }, 404);
  }

  if (
    Number(project.user_id) ===
    Number(user.id)
  ) {
    return json({
      success: false,
      error: "لا يمكنك تقديم عرض على مشروعك"
    }, 403);
  }

  if (project.status !== "open") {
    return json({
      success: false,
      error: "هذا المشروع لم يعد مفتوحا للعروض"
    }, 400);
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
    return json({
      success: false,
      error: "لقد قدمت عرضا على هذا المشروع مسبقا"
    }, 409);
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

  if (!result.success) {
    throw new Error("تعذر إنشاء العرض");
  }

  const proposalId =
    result.meta?.last_row_id;

  const proposal =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.project_id,
          p.freelancer_id,
          p.price,
          p.delivery_days,
          p.message,
          p.status,
          p.created_at,
          p.updated_at,
          u.full_name AS freelancer_name
        FROM proposals p
        LEFT JOIN users u
          ON u.id = p.freelancer_id
        WHERE p.id = ?
        LIMIT 1
      `)
      .bind(proposalId)
      .first();

  await createNotification(env, {
    userId: project.user_id,
    type: "new_proposal",
    title: "عرض جديد على مشروعك",
    message:
      `وصل عرض جديد على مشروع "${project.title}" بقيمة $${price} ومدة تسليم ${deliveryDays} يوم`,
    projectId: project.id,
    proposalId
  });

  return json({
    success: true,
    message: "تم إرسال العرض بنجاح",
    proposal
  }, 201);
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.project_id,
          p.freelancer_id,
          p.price,
          p.delivery_days,
          p.message,
          p.status,
          p.created_at,
          p.updated_at,
          pr.title AS project_title,
          pr.budget AS project_budget,
          pr.category AS project_category
        FROM proposals p
        INNER JOIN projects pr
          ON pr.id = p.project_id
        WHERE p.freelancer_id = ?
        ORDER BY p.id DESC
      `)
      .bind(user.id)
      .all();

  return json({
    success: true,
    proposals: result.results || [],
    count: result.results?.length || 0
  });
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

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
    return json({
      success: false,
      error: "المشروع غير موجود"
    }, 404);
  }

  if (
    Number(project.user_id) !==
    Number(user.id)
  ) {
    return json({
      success: false,
      error: "غير مسموح لك بمشاهدة عروض هذا المشروع"
    }, 403);
  }

  const result =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.project_id,
          p.freelancer_id,
          p.price,
          p.delivery_days,
          p.message,
          p.status,
          p.created_at,
          p.updated_at,
          u.full_name AS freelancer_name,
          u.email AS freelancer_email
        FROM proposals p
        INNER JOIN users u
          ON u.id = p.freelancer_id
        WHERE p.project_id = ?
        ORDER BY p.id DESC
      `)
      .bind(projectId)
      .all();

  return json({
    success: true,
    project,
    proposals: result.results || [],
    count: result.results?.length || 0
  });
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(proposalId) ||
    proposalId <= 0
  ) {
    return json({
      success: false,
      error: "معرف العرض غير صحيح"
    }, 400);
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

  const status = cleanText(body.status);

  const allowedStatuses = [
    "pending",
    "accepted",
    "rejected"
  ];

  if (!allowedStatuses.includes(status)) {
    return json({
      success: false,
      error: "حالة العرض غير صحيحة"
    }, 400);
  }

  const proposal =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.project_id,
          p.freelancer_id,
          p.price,
          p.delivery_days,
          p.status,
          pr.title AS project_title,
          pr.user_id AS project_owner_id,
          pr.status AS project_status
        FROM proposals p
        INNER JOIN projects pr
          ON pr.id = p.project_id
        WHERE p.id = ?
        LIMIT 1
      `)
      .bind(proposalId)
      .first();

  if (!proposal) {
    return json({
      success: false,
      error: "العرض غير موجود"
    }, 404);
  }

  if (
    Number(proposal.project_owner_id) !==
    Number(user.id)
  ) {
    return json({
      success: false,
      error: "غير مسموح لك بتغيير حالة هذا العرض"
    }, 403);
  }

  if (proposal.project_status !== "open") {
    return json({
      success: false,
      error: "المشروع لم يعد مفتوحا لتغيير العروض"
    }, 400);
  }

  if (status === "accepted") {
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
      return json({
        success: false,
        error: "المشروع لديه تنفيذ قائم بالفعل"
      }, 409);
    }

    const dueAt =
      new Date(
        Date.now() +
        Number(proposal.delivery_days) *
        24 *
        60 *
        60 *
        1000
      ).toISOString();

    const results =
      await env.DB.batch([

        env.DB.prepare(`
          UPDATE proposals
          SET
            status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ?
            AND id != ?
            AND status = 'pending'
        `).bind(
          proposal.project_id,
          proposalId
        ),

        env.DB.prepare(`
          UPDATE proposals
          SET
            status = 'accepted',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(proposalId),

        env.DB.prepare(`
          UPDATE projects
          SET
            status = 'in_progress',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND status = 'open'
        `).bind(proposal.project_id),

        env.DB.prepare(`
          INSERT INTO project_executions
          (
            project_id,
            proposal_id,
            freelancer_id,
            due_at,
            status
          )
          VALUES (?, ?, ?, ?, 'in_progress')
        `).bind(
          proposal.project_id,
          proposalId,
          proposal.freelancer_id,
          dueAt
        ),

        env.DB.prepare(`
          INSERT INTO project_events
          (
            project_id,
            execution_id,
            user_id,
            event_type,
            message
          )
          SELECT
            ?,
            id,
            ?,
            'execution_started',
            'تم قبول العرض وبدء تنفيذ المشروع'
          FROM project_executions
          WHERE project_id = ?
          LIMIT 1
        `).bind(
          proposal.project_id,
          user.id,
          proposal.project_id
        )

      ]);

    for (const result of results) {
      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          "تعذر تنفيذ عملية قبول العرض"
        );
      }
    }

    await createNotification(env, {
      userId: proposal.freelancer_id,
      type: "proposal_accepted",
      title: "تم قبول عرضك",
      message:
        `تم قبول عرضك على مشروع "${proposal.project_title}" وبدأ تنفيذ المشروع. السعر المتفق عليه $${proposal.price} ومدة التسليم ${proposal.delivery_days} يوم`,
      projectId: proposal.project_id,
      proposalId
    });

  } else {
    const result =
      await env.DB
        .prepare(`
          UPDATE proposals
          SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          status,
          proposalId
        )
        .run();

    if (!result.success) {
      throw new Error(
        "تعذر تحديث حالة العرض"
      );
    }

    if (status === "rejected") {
      await createNotification(env, {
        userId: proposal.freelancer_id,
        type: "proposal_rejected",
        title: "تم رفض عرضك",
        message:
          `تم رفض عرضك على مشروع "${proposal.project_title}"`,
        projectId: proposal.project_id,
        proposalId
      });
    }
  }

  const updated =
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
      .bind(proposalId)
      .first();

  return json({
    success: true,
    message:
      status === "accepted"
        ? "تم قبول العرض وبدء تنفيذ المشروع"
        : status === "rejected"
          ? "تم رفض العرض"
          : "تم تحديث حالة العرض",
    proposal: updated
  });
}


// ================================
// EXECUTION
// ================================

async function ensureProjectExecution(
  env,
  projectId
) {
  const existing =
    await env.DB
      .prepare(`
        SELECT
          e.id,
          e.project_id,
          e.proposal_id,
          e.freelancer_id,
          e.start_at,
          e.due_at,
          e.status,
          e.completed_at,
          e.created_at,
          e.updated_at
        FROM project_executions e
        WHERE e.project_id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (existing) {
    return existing;
  }

  const project =
    await env.DB
      .prepare(`
        SELECT
          id,
          user_id,
          status
        FROM projects
        WHERE id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!project) {
    return null;
  }

  if (project.status !== "in_progress") {
    return null;
  }

  const acceptedProposal =
    await env.DB
      .prepare(`
        SELECT
          id,
          project_id,
          freelancer_id,
          delivery_days,
          status
        FROM proposals
        WHERE project_id = ?
          AND status = 'accepted'
        ORDER BY id DESC
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (!acceptedProposal) {
    return null;
  }

  const dueAt =
    new Date(
      Date.now() +
      Number(acceptedProposal.delivery_days) *
      24 *
      60 *
      60 *
      1000
    ).toISOString();

  const existingByProposal =
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
        WHERE proposal_id = ?
        LIMIT 1
      `)
      .bind(acceptedProposal.id)
      .first();

  if (existingByProposal) {
    return existingByProposal;
  }

  const result =
    await env.DB
      .prepare(`
        INSERT INTO project_executions
        (
          project_id,
          proposal_id,
          freelancer_id,
          due_at,
          status
        )
        VALUES (?, ?, ?, ?, 'in_progress')
      `)
      .bind(
        projectId,
        acceptedProposal.id,
        acceptedProposal.freelancer_id,
        dueAt
      )
      .run();

  if (!result.success) {
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
        WHERE project_id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (execution) {
    await env.DB
      .prepare(`
        INSERT INTO project_events
        (
          project_id,
          execution_id,
          user_id,
          event_type,
          message
        )
        VALUES (?, ?, ?, 'execution_started', ?)
      `)
      .bind(
        projectId,
        execution.id,
        project.user_id,
        "تم إنشاء تنفيذ المشروع بعد قبول العرض"
      )
      .run();
  }

  return execution;
}


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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

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
    return json({
      success: false,
      error: "المشروع غير موجود"
    }, 404);
  }

  const execution =
    await ensureProjectExecution(
      env,
      projectId
    );

  if (!execution) {
    return json({
      success: false,
      error: "لا يوجد تنفيذ قائم لهذا المشروع"
    }, 404);
  }

  const isClientOwner =
    Number(project.user_id) ===
    Number(user.id);

  const isFreelancer =
    Number(execution.freelancer_id) ===
    Number(user.id);

  if (
    !isClientOwner &&
    !isFreelancer
  ) {
    return json({
      success: false,
      error: "غير مسموح لك بمشاهدة تنفيذ هذا المشروع"
    }, 403);
  }

  const proposal =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.project_id,
          p.freelancer_id,
          p.price,
          p.delivery_days,
          p.message,
          p.status,
          p.created_at,
          p.updated_at,
          u.full_name AS freelancer_name
        FROM proposals p
        LEFT JOIN users u
          ON u.id = p.freelancer_id
        WHERE p.id = ?
        LIMIT 1
      `)
      .bind(execution.proposal_id)
      .first();

  const latestDelivery =
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
          d.created_at
        FROM project_deliveries d
        WHERE d.execution_id = ?
        ORDER BY d.version DESC
        LIMIT 1
      `)
      .bind(execution.id)
      .first();

  const revision =
    await env.DB
      .prepare(`
        SELECT
          r.id,
          r.execution_id,
          r.delivery_id,
          r.client_id,
          r.message,
          r.status,
          r.created_at,
          r.resolved_at
        FROM project_revision_requests r
        WHERE r.execution_id = ?
        ORDER BY r.id DESC
        LIMIT 1
      `)
      .bind(execution.id)
      .first();

  const events =
    await env.DB
      .prepare(`
        SELECT
          e.id,
          e.project_id,
          e.execution_id,
          e.user_id,
          e.event_type,
          e.message,
          e.created_at,
          u.full_name AS user_name
        FROM project_events e
        LEFT JOIN users u
          ON u.id = e.user_id
        WHERE e.project_id = ?
        ORDER BY e.id DESC
        LIMIT 50
      `)
      .bind(projectId)
      .all();

  return json({
    success: true,
    project,
    execution,
    proposal,
    latest_delivery:
      latestDelivery || null,
    revision_request:
      revision || null,
    events:
      events.results || [],
    is_client_owner:
      isClientOwner,
    is_freelancer:
      isFreelancer
  });
}


// ================================
// DELIVERIES
// ================================

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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "إرسال التسليم متاح للمستقل فقط"
    }, 403);
  }

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
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

  const message = cleanText(body.message);
  const fileUrl = cleanText(body.file_url);

  if (!message) {
    return json({
      success: false,
      error: "يرجى كتابة رسالة التسليم"
    }, 400);
  }

  if (message.length < 5) {
    return json({
      success: false,
      error: "رسالة التسليم قصيرة جدا"
    }, 400);
  }

  const execution =
    await ensureProjectExecution(
      env,
      projectId
    );

  if (!execution) {
    return json({
      success: false,
      error: "لا يوجد تنفيذ قائم لهذا المشروع"
    }, 404);
  }

  if (
    Number(execution.freelancer_id) !==
    Number(user.id)
  ) {
    return json({
      success: false,
      error: "غير مسموح لك بتسليم هذا المشروع"
    }, 403);
  }

  if (execution.status === "completed") {
    return json({
      success: false,
      error: "تم إكمال المشروع ولا يمكن إرسال تسليم جديد"
    }, 400);
  }

  if (
    execution.status !== "in_progress" &&
    execution.status !== "revision_requested"
  ) {
    return json({
      success: false,
      error: "حالة التنفيذ الحالية لا تسمح بالتسليم"
    }, 400);
  }

  const maxVersion =
    await env.DB
      .prepare(`
        SELECT MAX(version) AS max_version
        FROM project_deliveries
        WHERE execution_id = ?
      `)
      .bind(execution.id)
      .first();

  const version =
    Number(maxVersion?.max_version || 0) + 1;

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
        VALUES (?, ?, ?, ?, ?, 'submitted')
      `)
      .bind(
        execution.id,
        user.id,
        version,
        message,
        fileUrl || null
      )
      .run();

  if (!result.success) {
    throw new Error("تعذر إنشاء التسليم");
  }

  const deliveryId =
    result.meta?.last_row_id;

  await env.DB.batch([

    env.DB.prepare(`
      UPDATE project_executions
      SET
        status = 'submitted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(execution.id),

    env.DB.prepare(`
      UPDATE project_revision_requests
      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP
      WHERE execution_id = ?
        AND status = 'open'
    `).bind(execution.id),

    env.DB.prepare(`
      INSERT INTO project_events
      (
        project_id,
        execution_id,
        user_id,
        event_type,
        message
      )
      VALUES (?, ?, ?, 'delivery_submitted', ?)
    `).bind(
      projectId,
      execution.id,
      user.id,
      `تم إرسال التسليم رقم ${version}`
    )

  ]);

  const projectOwner =
    await env.DB
      .prepare(`
        SELECT
          p.user_id,
          p.title
        FROM projects p
        WHERE p.id = ?
        LIMIT 1
      `)
      .bind(projectId)
      .first();

  if (projectOwner) {
    await createNotification(env, {
      userId: projectOwner.user_id,
      type:
        version === 1
          ? "new_delivery"
          : "redelivery",
      title:
        version === 1
          ? "تم إرسال تسليم جديد"
          : "تم إرسال نسخة معدلة",
      message:
        version === 1
          ? `تم إرسال التسليم رقم 1 لمشروع "${projectOwner.title}"`
          : `تم إرسال النسخة رقم ${version} المعدلة لمشروع "${projectOwner.title}"`,
      projectId,
      deliveryId
    });
  }

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
        WHERE id = ?
        LIMIT 1
      `)
      .bind(deliveryId)
      .first();

  return json({
    success: true,
    message:
      version === 1
        ? "تم إرسال التسليم بنجاح"
        : `تم إرسال النسخة رقم ${version} بنجاح`,
    delivery
  }, 201);
}


// ================================
// ACCEPT DELIVERY
// ================================

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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "قبول التسليم متاح لصاحب المشروع فقط"
    }, 403);
  }

  if (
    !Number.isInteger(deliveryId) ||
    deliveryId <= 0
  ) {
    return json({
      success: false,
      error: "معرف التسليم غير صحيح"
    }, 400);
  }

  const delivery =
    await env.DB
      .prepare(`
        SELECT
          d.id,
          d.execution_id,
          d.freelancer_id,
          d.version,
          d.status AS delivery_status,
          e.project_id,
          e.status AS execution_status,
          p.user_id AS project_owner_id,
          p.title AS project_title,
          p.status AS project_status
        FROM project_deliveries d
        INNER JOIN project_executions e
          ON e.id = d.execution_id
        INNER JOIN projects p
          ON p.id = e.project_id
        WHERE d.id = ?
        LIMIT 1
      `)
      .bind(deliveryId)
      .first();

  if (!delivery) {
    return json({
      success: false,
      error: "التسليم غير موجود"
    }, 404);
  }

  if (
    Number(delivery.project_owner_id) !==
    Number(user.id)
  ) {
    return json({
      success: false,
      error: "غير مسموح لك بقبول هذا التسليم"
    }, 403);
  }

  if (delivery.execution_status === "completed") {
    return json({
      success: false,
      error: "المشروع مكتمل بالفعل"
    }, 400);
  }

  if (delivery.delivery_status !== "submitted") {
    return json({
      success: false,
      error: "هذا التسليم لا يمكن قبوله حاليا"
    }, 400);
  }

  const results =
    await env.DB.batch([

      env.DB.prepare(`
        UPDATE project_deliveries
        SET status = 'accepted'
        WHERE id = ?
          AND status = 'submitted'
      `).bind(deliveryId),

      env.DB.prepare(`
        UPDATE project_executions
        SET
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(delivery.execution_id),

      env.DB.prepare(`
        UPDATE projects
        SET
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(delivery.project_id),

      env.DB.prepare(`
        UPDATE project_revision_requests
        SET
          status = 'resolved',
          resolved_at = CURRENT_TIMESTAMP
        WHERE execution_id = ?
          AND status = 'open'
      `).bind(delivery.execution_id),

      env.DB.prepare(`
        INSERT INTO project_events
        (
          project_id,
          execution_id,
          user_id,
          event_type,
          message
        )
        VALUES (?, ?, ?, 'delivery_accepted', ?)
      `).bind(
        delivery.project_id,
        delivery.execution_id,
        user.id,
        `تم قبول التسليم رقم ${delivery.version}`
      ),

      env.DB.prepare(`
        INSERT INTO project_events
        (
          project_id,
          execution_id,
          user_id,
          event_type,
          message
        )
        VALUES (?, ?, ?, 'project_completed', 'تم إكمال المشروع بنجاح')
      `).bind(
        delivery.project_id,
        delivery.execution_id,
        user.id
      )

    ]);

  for (const result of results) {
    if (
      result &&
      result.success === false
    ) {
      throw new Error("تعذر إكمال المشروع");
    }
  }

  await createNotification(env, {
    userId: delivery.freelancer_id,
    type: "delivery_accepted",
    title: "تم قبول التسليم",
    message:
      `تم قبول التسليم رقم ${delivery.version} وإكمال مشروع "${delivery.project_title}" بنجاح`,
    projectId: delivery.project_id,
    deliveryId
  });

  await createNotification(env, {
    userId: delivery.freelancer_id,
    type: "project_completed",
    title: "تم إكمال المشروع",
    message:
      `تم إكمال مشروع "${delivery.project_title}" بنجاح`,
    projectId: delivery.project_id,
    deliveryId
  });

  return json({
    success: true,
    message: "تم قبول التسليم وإكمال المشروع",
    project_id: delivery.project_id,
    execution_id: delivery.execution_id,
    delivery_id: deliveryId
  });
}


// ================================
// REQUEST REVISION
// ================================

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
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "طلب التعديل متاح لصاحب المشروع فقط"
    }, 403);
  }

  if (
    !Number.isInteger(deliveryId) ||
    deliveryId <= 0
  ) {
    return json({
      success: false,
      error: "معرف التسليم غير صحيح"
    }, 400);
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

  const message = cleanText(body.message);

  if (!message) {
    return json({
      success: false,
      error: "يرجى كتابة تفاصيل التعديل المطلوب"
    }, 400);
  }

  if (message.length < 5) {
    return json({
      success: false,
      error: "تفاصيل التعديل قصيرة جدا"
    }, 400);
  }

  const delivery =
    await env.DB
      .prepare(`
        SELECT
          d.id,
          d.execution_id,
          d.freelancer_id,
          d.version,
          d.status AS delivery_status,
          e.project_id,
          e.status AS execution_status,
          p.user_id AS project_owner_id,
          p.title AS project_title,
          p.status AS project_status
        FROM project_deliveries d
        INNER JOIN project_executions e
          ON e.id = d.execution_id
        INNER JOIN projects p
          ON p.id = e.project_id
        WHERE d.id = ?
        LIMIT 1
      `)
      .bind(deliveryId)
      .first();

  if (!delivery) {
    return json({
      success: false,
      error: "التسليم غير موجود"
    }, 404);
  }

  if (
    Number(delivery.project_owner_id) !==
    Number(user.id)
  ) {
    return json({
      success: false,
      error: "غير مسموح لك بطلب تعديل على هذا التسليم"
    }, 403);
  }

  if (delivery.execution_status === "completed") {
    return json({
      success: false,
      error: "المشروع مكتمل ولا يمكن طلب تعديل"
    }, 400);
  }

  if (delivery.delivery_status !== "submitted") {
    return json({
      success: false,
      error: "لا يمكن طلب تعديل على هذا التسليم حاليا"
    }, 400);
  }

  const openRevision =
    await env.DB
      .prepare(`
        SELECT id
        FROM project_revision_requests
        WHERE execution_id = ?
          AND status = 'open'
        LIMIT 1
      `)
      .bind(delivery.execution_id)
      .first();

  if (openRevision) {
    return json({
      success: false,
      error: "يوجد طلب تعديل مفتوح بالفعل"
    }, 409);
  }

  const results =
    await env.DB.batch([

      env.DB.prepare(`
        UPDATE project_deliveries
        SET status = 'revision_requested'
        WHERE id = ?
      `).bind(deliveryId),

      env.DB.prepare(`
        UPDATE project_executions
        SET
          status = 'revision_requested',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(delivery.execution_id),

      env.DB.prepare(`
        INSERT INTO project_revision_requests
        (
          execution_id,
          delivery_id,
          client_id,
          message,
          status
        )
        VALUES (?, ?, ?, ?, 'open')
      `).bind(
        delivery.execution_id,
        deliveryId,
        user.id,
        message
      ),

      env.DB.prepare(`
        INSERT INTO project_events
        (
          project_id,
          execution_id,
          user_id,
          event_type,
          message
        )
        VALUES (?, ?, ?, 'revision_requested', ?)
      `).bind(
        delivery.project_id,
        delivery.execution_id,
        user.id,
        `تم طلب تعديل على التسليم رقم ${delivery.version}: ${message}`
      )

    ]);

  for (const result of results) {
    if (
      result &&
      result.success === false
    ) {
      throw new Error("تعذر تسجيل طلب التعديل");
    }
  }

  await createNotification(env, {
    userId: delivery.freelancer_id,
    type: "revision_requested",
    title: "مطلوب تعديل على التسليم",
    message:
      `طلب العميل تعديلا على التسليم رقم ${delivery.version} في مشروع "${delivery.project_title}": ${message}`,
    projectId: delivery.project_id,
    deliveryId
  });

  const revision =
    await env.DB
      .prepare(`
        SELECT
          id,
          execution_id,
          delivery_id,
          client_id,
          message,
          status,
          created_at,
          resolved_at
        FROM project_revision_requests
        WHERE execution_id = ?
        ORDER BY id DESC
        LIMIT 1
      `)
      .bind(delivery.execution_id)
      .first();

  return json({
    success: true,
    message: "تم إرسال طلب التعديل للمستقل",
    revision_request: revision
  }, 201);
}


// ================================
// MY SERVICES
// ================================

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
        error: "يجب تسجيل الدخول أولا"
      }, 401);
    }

    if (user.role !== "freelancer") {
      return json({
        success: false,
        error: "هذه الصفحة مخصصة للمنفذين فقط"
      }, 403);
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
      services: result.results || []
    });

  } catch (error) {
    console.error(
      "getMyServices error:",
      error
    );

    return json({
      success: false,
      error: "حدث خطأ أثناء تحميل الخدمات",
      details: error?.message || String(error)
    }, 500);
  }
}


// ================================
// PASSWORD
// ================================

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


async function verifyPassword(
  password,
  storedHash,
  storedSalt
) {
  if (
    !storedHash ||
    !storedSalt
  ) {
    return false;
  }

  const calculatedHash =
    await sha256(
      password + storedSalt
    );

  return constantTimeEqual(
    calculatedHash,
    storedHash
  );
}


// ================================
// SHA-256
// ================================

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


// ================================
// CONSTANT TIME
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


// ================================
// TOKEN
// ================================

function generateToken() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(32)
    );

  return bytesToHex(bytes);
}


// ================================
// BYTES TO HEX
// ================================

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


// ================================
// COOKIE
// ================================

function buildSessionCookie(token) {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${
      SESSION_DAYS *
      24 *
      60 *
      60
    }`
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


// ================================
// READ SESSION COOKIE
// ================================

function getSessionToken(request) {
  const cookieHeader =
    request.headers.get("Cookie") || "";

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {
    const trimmed =
      cookie.trim();

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


// ================================
// HELPERS
// ================================

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
