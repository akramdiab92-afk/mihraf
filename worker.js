const COOKIE_NAME = "mihraf_session";
const SESSION_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      // ======================================================
      // AUTH
      // ======================================================

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


      // ======================================================
      // PROJECTS
      // ======================================================

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

      // Project details
      const projectMatch = url.pathname.match(
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

      // Project proposals
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


      // ======================================================
      // PROPOSALS
      // ======================================================

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


      // ======================================================
      // HEALTH
      // ======================================================

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


      // ======================================================
      // STATIC FILES
      // ======================================================

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      });

    } catch (error) {
      console.error("Worker error:", error);

      return json({
        success: false,
        error: "حدث خطأ داخلي في الخادم",
        details:
          error?.message ||
          String(error)
      }, 500);
    }
  }
};


// ==========================================================
// REGISTER
// ==========================================================

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
      error:
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
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

  const passwordData =
    await createPasswordHash(password);

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
    throw new Error(
      "تعذر إنشاء الحساب"
    );
  }

  return json({
    success: true,
    message: "تم إنشاء الحساب بنجاح",
    user: {
      id:
        result.meta?.last_row_id ??
        null,
      full_name: fullName,
      email,
      role
    }
  }, 201);
}


// ==========================================================
// LOGIN
// ==========================================================

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
  const password =
    String(body.password || "");

  if (!email || !password) {
    return json({
      success: false,
      error:
        "يرجى إدخال البريد الإلكتروني وكلمة المرور"
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
      error:
        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
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
      error:
        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    }, 401);
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
      message:
        "تم تسجيل الدخول بنجاح",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
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


// ==========================================================
// LOGOUT
// ==========================================================

async function logout(request, env) {
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


// ==========================================================
// ME
// ==========================================================

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
      full_name:
        user.full_name,
      email: user.email,
      role: user.role,
      created_at:
        user.created_at
    }
  });
}


// ==========================================================
// GET AUTHENTICATED USER
// ==========================================================

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
      .bind(session.session_id)
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


// ==========================================================
// GET MY PROJECTS
// ==========================================================

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
      error:
        "يجب تسجيل الدخول أولا"
    }, 401);
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
          u.full_name AS owner_name
        FROM projects p
        LEFT JOIN users u
          ON u.id = p.user_id
        WHERE p.user_id = ?
        ORDER BY p.id DESC
      `)
      .bind(user.id)
      .all();

  return json({
    success: true,
    projects:
      result.results || [],
    count:
      result.results?.length || 0
  });
}


// ==========================================================
// CREATE PROJECT
// ==========================================================

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
      error:
        "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error:
        "إنشاء المشاريع متاح لأصحاب المشاريع فقط"
    }, 403);
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "بيانات الطلب غير صحيحة"
    }, 400);
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
    return json({
      success: false,
      error:
        "يرجى إدخال عنوان المشروع"
    }, 400);
  }

  if (title.length < 3) {
    return json({
      success: false,
      error:
        "عنوان المشروع قصير جدا"
    }, 400);
  }

  if (!description) {
    return json({
      success: false,
      error:
        "يرجى كتابة وصف المشروع"
    }, 400);
  }

  if (description.length < 10) {
    return json({
      success: false,
      error:
        "وصف المشروع يجب أن يكون أوضح"
    }, 400);
  }

  if (!category) {
    return json({
      success: false,
      error:
        "يرجى اختيار تصنيف المشروع"
    }, 400);
  }

  if (
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    return json({
      success: false,
      error:
        "يرجى إدخال ميزانية صحيحة"
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
    throw new Error(
      "تعذر إنشاء المشروع"
    );
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
    message:
      "تم إنشاء المشروع بنجاح",
    project
  }, 201);
}


// ==========================================================
// GET PROJECT DETAILS
// ==========================================================

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
      error:
        "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error:
        "معرف المشروع غير صحيح"
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
      error:
        "المشروع غير موجود"
    }, 404);
  }

  const canApply =
    user.role === "freelancer" &&
    project.user_id !== user.id &&
    project.status === "open";

  return json({
    success: true,
    project,
    is_owner:
      project.user_id === user.id,
    can_apply: canApply
  });
}


// ==========================================================
// CREATE PROPOSAL
// ==========================================================

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
      error:
        "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error:
        "تقديم العروض متاح للمستقلين فقط"
    }, 403);
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "بيانات الطلب غير صحيحة"
    }, 400);
  }

  const projectId =
    Number(body.project_id);

  const price =
    Number(body.price);

  const deliveryDays =
    Number(body.delivery_days);

  const message =
    cleanText(body.message);

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error:
        "معرف المشروع غير صحيح"
    }, 400);
  }

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return json({
      success: false,
      error:
        "يرجى إدخال سعر صحيح"
    }, 400);
  }

  if (
    !Number.isInteger(deliveryDays) ||
    deliveryDays <= 0
  ) {
    return json({
      success: false,
      error:
        "يرجى إدخال مدة تسليم صحيحة"
    }, 400);
  }

  if (!message) {
    return json({
      success: false,
      error:
        "يرجى كتابة رسالة العرض"
    }, 400);
  }

  if (message.length < 5) {
    return json({
      success: false,
      error:
        "رسالة العرض قصيرة جدا"
    }, 400);
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
    return json({
      success: false,
      error:
        "المشروع غير موجود"
    }, 404);
  }

  if (project.user_id === user.id) {
    return json({
      success: false,
      error:
        "لا يمكنك تقديم عرض على مشروعك"
    }, 403);
  }

  if (project.status !== "open") {
    return json({
      success: false,
      error:
        "هذا المشروع لم يعد مفتوحا للعروض"
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
      error:
        "لقد قدمت عرضا على هذا المشروع مسبقا"
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
    throw new Error(
      "تعذر إنشاء العرض"
    );
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

  return json({
    success: true,
    message:
      "تم إرسال العرض بنجاح",
    proposal
  }, 201);
}


// ==========================================================
// GET MY PROPOSALS
// ==========================================================

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
      error:
        "يجب تسجيل الدخول أولا"
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
    proposals:
      result.results || [],
    count:
      result.results?.length || 0
  });
}


// ==========================================================
// GET PROJECT PROPOSALS
// ==========================================================

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
      error:
        "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0
  ) {
    return json({
      success: false,
      error:
        "معرف المشروع غير صحيح"
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
      error:
        "المشروع غير موجود"
    }, 404);
  }

  if (project.user_id !== user.id) {
    return json({
      success: false,
      error:
        "غير مسموح لك بمشاهدة عروض هذا المشروع"
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
    proposals:
      result.results || [],
    count:
      result.results?.length || 0
  });
}


// ==========================================================
// UPDATE PROPOSAL STATUS
// ==========================================================

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
      error:
        "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (
    !Number.isInteger(proposalId) ||
    proposalId <= 0
  ) {
    return json({
      success: false,
      error:
        "معرف العرض غير صحيح"
    }, 400);
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "بيانات الطلب غير صحيحة"
    }, 400);
  }

  const status =
    cleanText(body.status);

  const allowedStatuses = [
    "pending",
    "accepted",
    "rejected"
  ];

  if (
    !allowedStatuses.includes(status)
  ) {
    return json({
      success: false,
      error:
        "حالة العرض غير صحيحة"
    }, 400);
  }

  const proposal =
    await env.DB
      .prepare(`
        SELECT
          p.id,
          p.project_id,
          p.freelancer_id,
          p.status,
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
      error:
        "العرض غير موجود"
    }, 404);
  }

  // Only project owner can accept/reject
  if (
    proposal.project_owner_id !==
    user.id
  ) {
    return json({
      success: false,
      error:
        "غير مسموح لك بتغيير حالة هذا العرض"
    }, 403);
  }

  if (
    proposal.project_status !==
    "open"
  ) {
    return json({
      success: false,
      error:
        "المشروع لم يعد مفتوحا لتغيير العروض"
    }, 400);
  }

  if (status === "accepted") {
    const result =
      await env.DB
        .prepare(`
          UPDATE proposals
          SET
            status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ?
            AND id != ?
            AND status = 'pending'
        `)
        .bind(
          proposal.project_id,
          proposalId
        )
        .run();

    if (!result.success) {
      throw new Error(
        "تعذر تحديث العروض الأخرى"
      );
    }

    const accepted =
      await env.DB
        .prepare(`
          UPDATE proposals
          SET
            status = 'accepted',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(proposalId)
        .run();

    if (!accepted.success) {
      throw new Error(
        "تعذر قبول العرض"
      );
    }

    const project =
      await env.DB
        .prepare(`
          UPDATE projects
          SET
            status = 'in_progress',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(proposal.project_id)
        .run();

    if (!project.success) {
      throw new Error(
        "تعذر تحديث حالة المشروع"
      );
    }

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
        ? "تم قبول العرض وتحديث حالة المشروع"
        : status === "rejected"
          ? "تم رفض العرض"
          : "تم تحديث حالة العرض",
    proposal: updated
  });
}


// ==========================================================
// PASSWORD
// ==========================================================

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


// ==========================================================
// SHA-256
// ==========================================================

async function sha256(value) {
  const data =
    new TextEncoder()
      .encode(value);

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return bytesToHex(
    new Uint8Array(hashBuffer)
  );
}


// ==========================================================
// CONSTANT TIME COMPARISON
// ==========================================================

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


// ==========================================================
// TOKEN
// ==========================================================

function generateToken() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(32)
    );

  return bytesToHex(bytes);
}


// ==========================================================
// BYTES TO HEX
// ==========================================================

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


// ==========================================================
// COOKIE
// ==========================================================

function buildSessionCookie(
  token
) {
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


// ==========================================================
// READ SESSION COOKIE
// ==========================================================

function getSessionToken(
  request
) {
  const cookieHeader =
    request.headers.get(
      "Cookie"
    ) || "";

  const cookies =
    cookieHeader.split(";");

  for (
    const cookie of cookies
  ) {
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


// ==========================================================
// HELPERS
// ==========================================================

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
