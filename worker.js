const encoder = new TextEncoder();
// force worker redeploy

const SESSION_DAYS = 7;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;


/* ============================================================
   WORKER
   ============================================================ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // =========================
      // AUTH
      // =========================

      if (path === "/api/register" && method === "POST") {
        return await register(request, env);
      }

      if (path === "/api/login" && method === "POST") {
        return await login(request, env);
      }

      if (path === "/api/me" && method === "GET") {
        return await getMe(request, env);
      }

      if (path === "/api/logout" && method === "POST") {
        return await logout(request, env);
      }


      // =========================
      // SERVICES
      // =========================

      if (path === "/api/services" && method === "POST") {
        return await createService(request, env);
      }

      if (path === "/api/services" && method === "GET") {
        return await getServices(request, env);
      }

      if (path === "/api/my-services" && method === "GET") {
        return await getMyServices(request, env);
      }

      if (/^\/api\/services\/\d+$/.test(path) && method === "PUT") {
        return await updateService(request, env);
      }

      if (/^\/api\/services\/\d+$/.test(path) && method === "DELETE") {
        return await deleteService(request, env);
      }


      // =========================
      // PROJECTS
      // =========================

      if (path === "/api/projects" && method === "POST") {
        return await createProject(request, env);
      }

      if (path === "/api/projects" && method === "GET") {
        return await getProjects(request, env);
      }

      if (path === "/api/my-projects" && method === "GET") {
        return await getMyProjects(request, env);
      }

      if (/^\/api\/projects\/\d+$/.test(path) && method === "PUT") {
        return await updateProject(request, env);
      }

      if (/^\/api\/projects\/\d+$/.test(path) && method === "DELETE") {
        return await deleteProject(request, env);
      }


      // =========================
      // PROPOSALS
      // =========================

      if (/^\/api\/projects\/\d+\/proposals$/.test(path) && method === "POST") {
        return await createProposal(request, env);
      }

      if (/^\/api\/projects\/\d+\/proposals$/.test(path) && method === "GET") {
        return await getProjectProposals(request, env);
      }

      if (path === "/api/my-proposals" && method === "GET") {
        return await getMyProposals(request, env);
      }

      if (/^\/api\/proposals\/\d+\/accept$/.test(path) && method === "PUT") {
        return await acceptProposal(request, env);
      }

      if (/^\/api\/proposals\/\d+\/reject$/.test(path) && method === "PUT") {
        return await rejectProposal(request, env);
      }


      // =========================
      // EXECUTION
      // =========================

      if (/^\/api\/projects\/\d+\/execution$/.test(path) && method === "GET") {
        return await getProjectExecution(request, env);
      }

      if (path === "/api/my-executions" && method === "GET") {
        return await getMyExecutions(request, env);
      }

      if (/^\/api\/projects\/\d+\/events$/.test(path) && method === "GET") {
        return await getProjectEvents(request, env);
      }


      // =========================
      // DELIVERIES
      // =========================

      if (/^\/api\/projects\/\d+\/deliveries$/.test(path) && method === "POST") {
        return await createDelivery(request, env);
      }

      if (/^\/api\/deliveries\/\d+\/revision$/.test(path) && method === "POST") {
        return await requestRevision(request, env);
      }

      if (/^\/api\/deliveries\/\d+\/accept$/.test(path) && method === "PUT") {
        return await acceptDelivery(request, env);
      }


      // =========================
      // PORTFOLIO
      // =========================

      if (path === "/api/portfolio" && method === "POST") {
        return await createPortfolio(request, env);
      }

      if (path === "/api/portfolio" && method === "GET") {
        return await getPortfolio(request, env);
      }

      if (path === "/api/my-portfolio" && method === "GET") {
        return await getMyPortfolio(request, env);
      }

      if (/^\/api\/portfolio\/\d+$/.test(path) && method === "GET") {
        return await getPortfolioItem(request, env);
      }

      if (/^\/api\/portfolio\/\d+$/.test(path) && method === "PUT") {
        return await updatePortfolio(request, env);
      }

      if (/^\/api\/portfolio\/\d+$/.test(path) && method === "DELETE") {
        return await deletePortfolio(request, env);
      }


      // =========================
      // FREELANCERS
      // =========================

      if (path === "/api/freelancers" && method === "GET") {
        return await getFreelancers(request, env);
      }

      if (/^\/api\/freelancers\/\d+$/.test(path) && method === "GET") {
        return await getFreelancerProfile(request, env);
      }


      // =========================
      // DATABASE TEST
      // =========================

      if (path === "/api/test" && method === "GET") {
        return await testDatabase(env);
      }


      // =========================
      // ASSETS
      // =========================

      return env.ASSETS.fetch(request);

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


/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}


async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}


function cleanString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}


function normalizeSkills(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => cleanString(item))
      .filter(Boolean)
      .join(", ");
  }

  return cleanString(value);
}


/* ============================================================
   PROJECT SCHEMA COMPATIBILITY
   ============================================================ */

let cachedProjectOwnerColumn = null;


async function getProjectOwnerColumn(env) {
  if (cachedProjectOwnerColumn) {
    return cachedProjectOwnerColumn;
  }

  const result = await env.DB
    .prepare(`PRAGMA table_info(projects)`)
    .all();

  const columns = (result.results || [])
    .map(row => String(row.name || ""));

  const candidates = [
    "client_id",
    "user_id",
    "owner_id",
    "clientId",
    "ownerId"
  ];

  for (const candidate of candidates) {
    if (columns.includes(candidate)) {
      cachedProjectOwnerColumn = candidate;
      return candidate;
    }
  }

  throw new Error(
    "جدول projects لا يحتوي على عمود معروف لصاحب المشروع. الأعمدة الموجودة: " +
    columns.join(", ")
  );
}


/* ============================================================
   AUTH
   ============================================================ */

async function register(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات الطلب غير صحيحة"
    }, 400);
  }

  const fullName = cleanString(body.full_name || body.fullName);
  const email = cleanString(body.email).toLowerCase();
  const password = String(body.password || "");
  const role = cleanString(body.role).toLowerCase();

  if (!fullName || !email || !password || !role) {
    return json({
      success: false,
      error: "جميع الحقول المطلوبة يجب تعبئتها"
    }, 400);
  }

  if (fullName.length < 2) {
    return json({
      success: false,
      error: "الاسم يجب أن يكون صحيحًا"
    }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({
      success: false,
      error: "البريد الإلكتروني غير صحيح"
    }, 400);
  }

  if (password.length < 8) {
    return json({
      success: false,
      error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    }, 400);
  }

  if (!["client", "freelancer"].includes(role)) {
    return json({
      success: false,
      error: "نوع الحساب غير صحيح"
    }, 400);
  }

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM users
      WHERE email = ? COLLATE NOCASE
      LIMIT 1
    `)
    .bind(email)
    .first();

  if (existing) {
    return json({
      success: false,
      error: "البريد الإلكتروني مستخدم مسبقًا"
    }, 409);
  }

  const { hash, salt } = await hashPassword(password);

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
      hash,
      salt,
      role
    )
    .run();

  return json({
    success: true,
    message: "تم إنشاء الحساب بنجاح",
    user_id: result.meta.last_row_id
  }, 201);
}


async function login(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات الطلب غير صحيحة"
    }, 400);
  }

  const email = cleanString(body.email).toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return json({
      success: false,
      error: "البريد الإلكتروني وكلمة المرور مطلوبان"
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
        role
      FROM users
      WHERE email = ? COLLATE NOCASE
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

  const passwordHash = await hashPasswordWithSalt(
    password,
    user.password_salt
  );

  const valid = constantTimeEqual(
    hexToBytes(passwordHash),
    hexToBytes(user.password_hash)
  );

  if (!valid) {
    return json({
      success: false,
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    }, 401);
  }

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);

  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE * 1000
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

  const cookie =
    `mihraf_session=${token}; ` +
    `HttpOnly; ` +
    `Secure; ` +
    `SameSite=Lax; ` +
    `Path=/; ` +
    `Max-Age=${SESSION_MAX_AGE}`;

  return json({
    success: true,
    message: "تم تسجيل الدخول بنجاح",
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    }
  }, 200, {
    "Set-Cookie": cookie
  });
}


async function getMe(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      authenticated: false,
      error: "غير مسجل الدخول"
    }, 401);
  }

  return json({
    success: true,
    authenticated: true,
    user
  });
}


async function logout(request, env) {
  const cookies = parseCookies(
    request.headers.get("Cookie") || ""
  );

  const token = cookies.mihraf_session;

  if (token) {
    const tokenHash = await sha256Hex(token);

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE token_hash = ?
      `)
      .bind(tokenHash)
      .run();
  }

  return json({
    success: true,
    message: "تم تسجيل الخروج"
  }, 200, {
    "Set-Cookie":
      "mihraf_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  });
}


/* ============================================================
   SERVICES
   ============================================================ */

async function createService(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "إضافة الخدمات متاحة للمستقلين فقط"
    }, 403);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const title = cleanString(body.title);
  const description = cleanString(body.description);
  const category = cleanString(body.category);
  const price = Number(body.price);

  if (!title || !description || !category) {
    return json({
      success: false,
      error: "العنوان والوصف والتصنيف مطلوبة"
    }, 400);
  }

  if (!Number.isFinite(price) || price < 0) {
    return json({
      success: false,
      error: "السعر غير صحيح"
    }, 400);
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO services
      (
        user_id,
        title,
        description,
        category,
        price,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'active')
    `)
    .bind(
      user.id,
      title,
      description,
      category,
      price
    )
    .run();

  return json({
    success: true,
    message: "تمت إضافة الخدمة بنجاح",
    service_id: result.meta.last_row_id
  }, 201);
}


async function getServices(request, env) {
  const url = new URL(request.url);

  const category = cleanString(
    url.searchParams.get("category")
  );

  let query = `
    SELECT
      s.id,
      s.user_id,
      s.title,
      s.description,
      s.category,
      s.price,
      s.status,
      s.created_at,
      s.updated_at,
      u.full_name AS freelancer_name
    FROM services s
    JOIN users u ON u.id = s.user_id
    WHERE s.status = 'active'
  `;

  const params = [];

  if (category) {
    query += ` AND s.category = ? `;
    params.push(category);
  }

  query += ` ORDER BY s.id DESC `;

  const result = await env.DB
    .prepare(query)
    .bind(...params)
    .all();

  return json({
    success: true,
    services: result.results || []
  });
}


async function getMyServices(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "هذه الصفحة للمستقلين فقط"
    }, 403);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        id,
        user_id,
        title,
        description,
        category,
        price,
        status,
        created_at,
        updated_at
      FROM services
      WHERE user_id = ?
      ORDER BY id DESC
    `)
    .bind(user.id)
    .all();

  return json({
    success: true,
    services: result.results || []
  });
}


async function updateService(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "غير مسموح"
    }, 403);
  }

  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف الخدمة غير صحيح"
    }, 400);
  }

  const service = await env.DB
    .prepare(`
      SELECT *
      FROM services
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!service) {
    return json({
      success: false,
      error: "الخدمة غير موجودة"
    }, 404);
  }

  if (service.user_id !== user.id) {
    return json({
      success: false,
      error: "لا تملك صلاحية تعديل هذه الخدمة"
    }, 403);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const title =
    body.title !== undefined
      ? cleanString(body.title)
      : service.title;

  const description =
    body.description !== undefined
      ? cleanString(body.description)
      : service.description;

  const category =
    body.category !== undefined
      ? cleanString(body.category)
      : service.category;

  const price =
    body.price !== undefined
      ? Number(body.price)
      : Number(service.price);

  const status =
    body.status !== undefined
      ? cleanString(body.status)
      : service.status;

  if (!title || !description || !category) {
    return json({
      success: false,
      error: "العنوان والوصف والتصنيف مطلوبة"
    }, 400);
  }

  if (!Number.isFinite(price) || price < 0) {
    return json({
      success: false,
      error: "السعر غير صحيح"
    }, 400);
  }

  if (!["active", "paused"].includes(status)) {
    return json({
      success: false,
      error: "حالة الخدمة غير صحيحة"
    }, 400);
  }

  await env.DB
    .prepare(`
      UPDATE services
      SET
        title = ?,
        description = ?,
        category = ?,
        price = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
      title,
      description,
      category,
      price,
      status,
      id
    )
    .run();

  return json({
    success: true,
    message: "تم تحديث الخدمة بنجاح"
  });
}


async function deleteService(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "غير مسموح"
    }, 403);
  }

  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف الخدمة غير صحيح"
    }, 400);
  }

  const service = await env.DB
    .prepare(`
      SELECT id, user_id
      FROM services
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!service) {
    return json({
      success: false,
      error: "الخدمة غير موجودة"
    }, 404);
  }

  if (service.user_id !== user.id) {
    return json({
      success: false,
      error: "لا تملك صلاحية حذف هذه الخدمة"
    }, 403);
  }

  await env.DB
    .prepare(`
      UPDATE services
      SET
        status = 'deleted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(id)
    .run();

  return json({
    success: true,
    message: "تم حذف الخدمة"
  });
}


/* ============================================================
   PROJECTS
   ============================================================ */

async function createProject(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "إنشاء المشاريع متاح للعملاء فقط"
    }, 403);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const title = cleanString(body.title);
  const description = cleanString(body.description);
  const category = cleanString(body.category);
  const budget = Number(body.budget);

  if (!title || !description || !category) {
    return json({
      success: false,
      error: "العنوان والوصف والتصنيف مطلوبة"
    }, 400);
  }

  if (!Number.isFinite(budget) || budget < 0) {
    return json({
      success: false,
      error: "الميزانية غير صحيحة"
    }, 400);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const result = await env.DB
    .prepare(`
      INSERT INTO projects
      (
        ${ownerColumn},
        title,
        description,
        category,
        budget,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'open')
    `)
    .bind(
      user.id,
      title,
      description,
      category,
      budget
    )
    .run();

  return json({
    success: true,
    message: "تم إنشاء المشروع بنجاح",
    project_id: result.meta.last_row_id
  }, 201);
}


async function getProjects(request, env) {
  try {
    const url = new URL(request.url);

    const category = cleanString(
      url.searchParams.get("category")
    );

    const ownerColumn = await getProjectOwnerColumn(env);

    let query = `
      SELECT
        p.id,
        p.${ownerColumn} AS client_id,
        p.${ownerColumn} AS project_owner_id,
        p.title,
        p.description,
        p.category,
        p.budget,
        p.status,
        p.created_at,
        p.updated_at,
        u.full_name AS client_name
      FROM projects p
      JOIN users u ON u.id = p.${ownerColumn}
      WHERE p.status = 'open'
    `;

    const params = [];

    if (category) {
      query += ` AND p.category = ? `;
      params.push(category);
    }

    query += ` ORDER BY p.id DESC `;

    const result = await env.DB
      .prepare(query)
      .bind(...params)
      .all();

    return json({
      success: true,
      projects: result.results || []
    });

  } catch (error) {
    console.error("getProjects error:", error);

    return json({
      success: false,
      error: "تعذر تحميل المشاريع من قاعدة البيانات",
      details: error?.message || "Unknown database error"
    }, 500);
  }
}


async function getMyProjects(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "هذه الصفحة للعملاء فقط"
    }, 403);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const result = await env.DB
    .prepare(`
      SELECT
        id,
        ${ownerColumn} AS client_id,
        title,
        description,
        category,
        budget,
        status,
        created_at,
        updated_at
      FROM projects
      WHERE ${ownerColumn} = ?
      ORDER BY id DESC
    `)
    .bind(user.id)
    .all();

  return json({
    success: true,
    projects: result.results || []
  });
}


async function updateProject(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "غير مسموح"
    }, 403);
  }

  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const project = await env.DB
    .prepare(`
      SELECT *
      FROM projects
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!project) {
    return json({
      success: false,
      error: "المشروع غير موجود"
    }, 404);
  }

  if (Number(project[ownerColumn]) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية تعديل المشروع"
    }, 403);
  }

  if (project.status !== "open") {
    return json({
      success: false,
      error: "لا يمكن تعديل المشروع بعد بدء تنفيذه"
    }, 400);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const title =
    body.title !== undefined
      ? cleanString(body.title)
      : project.title;

  const description =
    body.description !== undefined
      ? cleanString(body.description)
      : project.description;

  const category =
    body.category !== undefined
      ? cleanString(body.category)
      : project.category;

  const budget =
    body.budget !== undefined
      ? Number(body.budget)
      : Number(project.budget);

  if (!title || !description || !category) {
    return json({
      success: false,
      error: "العنوان والوصف والتصنيف مطلوبة"
    }, 400);
  }

  if (!Number.isFinite(budget) || budget < 0) {
    return json({
      success: false,
      error: "الميزانية غير صحيحة"
    }, 400);
  }

  await env.DB
    .prepare(`
      UPDATE projects
      SET
        title = ?,
        description = ?,
        category = ?,
        budget = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
      title,
      description,
      category,
      budget,
      id
    )
    .run();

  return json({
    success: true,
    message: "تم تعديل المشروع بنجاح"
  });
}


async function deleteProject(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "غير مسموح"
    }, 403);
  }

  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const project = await env.DB
    .prepare(`
      SELECT *
      FROM projects
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!project) {
    return json({
      success: false,
      error: "المشروع غير موجود"
    }, 404);
  }

  if (Number(project[ownerColumn]) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية إلغاء المشروع"
    }, 403);
  }

  if (["completed", "cancelled"].includes(project.status)) {
    return json({
      success: false,
      error: "المشروع منتهٍ مسبقًا"
    }, 400);
  }

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE projects
      SET
        status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id),

    env.DB.prepare(`
      UPDATE proposals
      SET status = 'rejected'
      WHERE project_id = ?
      AND status = 'pending'
    `).bind(id)
  ]);

  return json({
    success: true,
    message: "تم إلغاء المشروع بنجاح"
  });
}


/* ============================================================
   PROPOSALS
   ============================================================ */

async function createProposal(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "تقديم العروض متاح للمستقلين فقط"
    }, 403);
  }

  const parts = new URL(request.url)
    .pathname
    .split("/")
    .filter(Boolean);

  const projectId = Number(parts[2]);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const project = await env.DB
    .prepare(`
      SELECT *
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

  if (project.status !== "open") {
    return json({
      success: false,
      error: "المشروع غير مفتوح لاستقبال العروض"
    }, 400);
  }

  if (Number(project[ownerColumn]) === Number(user.id)) {
    return json({
      success: false,
      error: "لا يمكنك التقديم على مشروعك"
    }, 400);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const price = Number(body.price);

  const deliveryDays = Number(
    body.delivery_days ?? body.deliveryDays
  );

  const message = cleanString(body.message);

  if (!Number.isFinite(price) || price < 0) {
    return json({
      success: false,
      error: "السعر غير صحيح"
    }, 400);
  }

  if (
    !Number.isInteger(deliveryDays) ||
    deliveryDays <= 0
  ) {
    return json({
      success: false,
      error: "مدة التسليم غير صحيحة"
    }, 400);
  }

  if (message.length < 10) {
    return json({
      success: false,
      error: "رسالة العرض قصيرة جدًا"
    }, 400);
  }

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM proposals
      WHERE project_id = ?
      AND freelancer_id = ?
      AND status IN ('pending', 'accepted')
      LIMIT 1
    `)
    .bind(projectId, user.id)
    .first();

  if (existing) {
    return json({
      success: false,
      error: "لديك عرض موجود مسبقًا على هذا المشروع"
    }, 409);
  }

  const result = await env.DB
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

  return json({
    success: true,
    message: "تم إرسال العرض بنجاح",
    proposal_id: result.meta.last_row_id
  }, 201);
}


async function getProjectProposals(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  const parts = new URL(request.url)
    .pathname
    .split("/")
    .filter(Boolean);

  const projectId = Number(parts[2]);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const project = await env.DB
    .prepare(`
      SELECT *
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

  if (Number(project[ownerColumn]) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية مشاهدة عروض هذا المشروع"
    }, 403);
  }

  const result = await env.DB
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
      JOIN users u ON u.id = p.freelancer_id
      WHERE p.project_id = ?
      ORDER BY p.id DESC
    `)
    .bind(projectId)
    .all();

  return json({
    success: true,
    proposals: result.results || []
  });
}


async function getMyProposals(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "هذه الصفحة للمستقلين فقط"
    }, 403);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const result = await env.DB
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
        pr.description AS project_description,
        pr.category AS project_category,
        pr.budget AS project_budget,
        u.full_name AS client_name
      FROM proposals p
      JOIN projects pr ON pr.id = p.project_id
      JOIN users u ON u.id = pr.${ownerColumn}
      WHERE p.freelancer_id = ?
      ORDER BY p.id DESC
    `)
    .bind(user.id)
    .all();

  return json({
    success: true,
    proposals: result.results || []
  });
}


async function acceptProposal(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "غير مسموح"
    }, 403);
  }

  const proposalId = getIdFromPath(request);

  if (!proposalId) {
    return json({
      success: false,
      error: "معرف العرض غير صحيح"
    }, 400);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const proposal = await env.DB
    .prepare(`
      SELECT
        p.*,
        pr.${ownerColumn} AS client_id,
        pr.status AS project_status,
        pr.title AS project_title
      FROM proposals p
      JOIN projects pr ON pr.id = p.project_id
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

  if (Number(proposal.client_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية قبول هذا العرض"
    }, 403);
  }

  if (proposal.status !== "pending") {
    return json({
      success: false,
      error: "العرض ليس بانتظار القبول"
    }, 400);
  }

  if (proposal.project_status !== "open") {
    return json({
      success: false,
      error: "المشروع لم يعد مفتوحًا"
    }, 400);
  }

  const existingExecution = await env.DB
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
      error: "يوجد تنفيذ قائم لهذا المشروع"
    }, 409);
  }

  const startAt = new Date();

  const dueAt = new Date(
    startAt.getTime() +
    Number(proposal.delivery_days) *
    24 *
    60 *
    60 *
    1000
  );

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE proposals
      SET
        status = 'accepted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(proposalId),

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
      UPDATE projects
      SET
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(proposal.project_id),

    env.DB.prepare(`
      INSERT INTO project_executions
      (
        project_id,
        proposal_id,
        client_id,
        freelancer_id,
        status,
        start_at,
        due_at
      )
      VALUES (?, ?, ?, ?, 'in_progress', ?, ?)
    `).bind(
      proposal.project_id,
      proposalId,
      proposal.client_id,
      proposal.freelancer_id,
      startAt.toISOString(),
      dueAt.toISOString()
    ),

    env.DB.prepare(`
      INSERT INTO project_events
      (
        project_id,
        user_id,
        event_type,
        message
      )
      VALUES (?, ?, 'proposal_accepted', ?)
    `).bind(
      proposal.project_id,
      user.id,
      "تم قبول عرض المستقل وبدء تنفيذ المشروع"
    )
  ]);

  const execution = await env.DB
    .prepare(`
      SELECT *
      FROM project_executions
      WHERE project_id = ?
      LIMIT 1
    `)
    .bind(proposal.project_id)
    .first();

  return json({
    success: true,
    message: "تم قبول العرض وبدء التنفيذ",
    execution
  });
}


async function rejectProposal(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "غير مسموح"
    }, 403);
  }

  const proposalId = getIdFromPath(request);

  if (!proposalId) {
    return json({
      success: false,
      error: "معرف العرض غير صحيح"
    }, 400);
  }

  const ownerColumn = await getProjectOwnerColumn(env);

  const proposal = await env.DB
    .prepare(`
      SELECT
        p.*,
        pr.${ownerColumn} AS client_id
      FROM proposals p
      JOIN projects pr ON pr.id = p.project_id
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

  if (Number(proposal.client_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية رفض هذا العرض"
    }, 403);
  }

  if (proposal.status !== "pending") {
    return json({
      success: false,
      error: "العرض ليس بانتظار القرار"
    }, 400);
  }

  await env.DB
    .prepare(`
      UPDATE proposals
      SET
        status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(proposalId)
    .run();

  return json({
    success: true,
    message: "تم رفض العرض"
  });
}


/* ============================================================
   EXECUTION
   ============================================================ */

async function getProjectExecution(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  const projectId = getIdFromPath(request);

  if (!projectId) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  const execution = await env.DB
    .prepare(`
      SELECT
        e.*,
        p.title AS project_title,
        p.description AS project_description,
        p.budget AS project_budget,
        c.full_name AS client_name,
        f.full_name AS freelancer_name
      FROM project_executions e
      JOIN projects p ON p.id = e.project_id
      JOIN users c ON c.id = e.client_id
      JOIN users f ON f.id = e.freelancer_id
      WHERE e.project_id = ?
      LIMIT 1
    `)
    .bind(projectId)
    .first();

  if (!execution) {
    return json({
      success: false,
      error: "لا يوجد تنفيذ لهذا المشروع"
    }, 404);
  }

  if (
    Number(execution.client_id) !== Number(user.id) &&
    Number(execution.freelancer_id) !== Number(user.id)
  ) {
    return json({
      success: false,
      error: "لا تملك صلاحية مشاهدة التنفيذ"
    }, 403);
  }

  const deliveries = await env.DB
    .prepare(`
      SELECT
        d.*,
        u.full_name AS freelancer_name
      FROM project_deliveries d
      JOIN users u ON u.id = d.freelancer_id
      WHERE d.execution_id = ?
      ORDER BY d.version DESC
    `)
    .bind(execution.id)
    .all();

  const revisions = await env.DB
    .prepare(`
      SELECT
        r.*,
        d.version,
        u.full_name AS client_name
      FROM project_revision_requests r
      JOIN project_deliveries d ON d.id = r.delivery_id
      JOIN users u ON u.id = r.client_id
      WHERE r.execution_id = ?
      ORDER BY r.id DESC
    `)
    .bind(execution.id)
    .all();

  return json({
    success: true,
    execution,
    deliveries: deliveries.results || [],
    revisions: revisions.results || []
  });
}


async function getMyExecutions(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  let query;

  if (user.role === "client") {
    query = `
      SELECT
        e.*,
        p.title AS project_title,
        p.description AS project_description,
        f.full_name AS freelancer_name
      FROM project_executions e
      JOIN projects p ON p.id = e.project_id
      JOIN users f ON f.id = e.freelancer_id
      WHERE e.client_id = ?
      ORDER BY e.id DESC
    `;
  } else {
    query = `
      SELECT
        e.*,
        p.title AS project_title,
        p.description AS project_description,
        c.full_name AS client_name
      FROM project_executions e
      JOIN projects p ON p.id = e.project_id
      JOIN users c ON c.id = e.client_id
      WHERE e.freelancer_id = ?
      ORDER BY e.id DESC
    `;
  }

  const result = await env.DB
    .prepare(query)
    .bind(user.id)
    .all();

  return json({
    success: true,
    executions: result.results || []
  });
}


async function getProjectEvents(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  const projectId = getIdFromPath(request);

  if (!projectId) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  const execution = await env.DB
    .prepare(`
      SELECT *
      FROM project_executions
      WHERE project_id = ?
      LIMIT 1
    `)
    .bind(projectId)
    .first();

  if (!execution) {
    const ownerColumn = await getProjectOwnerColumn(env);

    const project = await env.DB
      .prepare(`
        SELECT ${ownerColumn}
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
      Number(project[ownerColumn]) !== Number(user.id)
    ) {
      return json({
        success: false,
        error: "لا تملك صلاحية مشاهدة الأحداث"
      }, 403);
    }
  } else {
    if (
      Number(execution.client_id) !== Number(user.id) &&
      Number(execution.freelancer_id) !== Number(user.id)
    ) {
      return json({
        success: false,
        error: "لا تملك صلاحية مشاهدة الأحداث"
      }, 403);
    }
  }

  const result = await env.DB
    .prepare(`
      SELECT
        e.*,
        u.full_name AS user_name
      FROM project_events e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.project_id = ?
      ORDER BY e.id DESC
    `)
    .bind(projectId)
    .all();

  return json({
    success: true,
    events: result.results || []
  });
}


/* ============================================================
   DELIVERIES
   ============================================================ */

async function createDelivery(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "تسليم المشروع متاح للمستقل فقط"
    }, 403);
  }

  const projectId = getIdFromPath(request);

  if (!projectId) {
    return json({
      success: false,
      error: "معرف المشروع غير صحيح"
    }, 400);
  }

  const execution = await env.DB
    .prepare(`
      SELECT *
      FROM project_executions
      WHERE project_id = ?
      LIMIT 1
    `)
    .bind(projectId)
    .first();

  if (!execution) {
    return json({
      success: false,
      error: "لا يوجد تنفيذ لهذا المشروع"
    }, 404);
  }

  if (Number(execution.freelancer_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية تسليم هذا المشروع"
    }, 403);
  }

  if (
    !["in_progress", "revision_requested"]
      .includes(execution.status)
  ) {
    return json({
      success: false,
      error: "لا يمكن التسليم في الحالة الحالية"
    }, 400);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const message = cleanString(body.message);

  const fileUrl = cleanString(
    body.file_url || body.fileUrl
  );

  if (message.length < 10) {
    return json({
      success: false,
      error: "رسالة التسليم قصيرة جدًا"
    }, 400);
  }

  const latest = await env.DB
    .prepare(`
      SELECT COALESCE(MAX(version), 0) AS max_version
      FROM project_deliveries
      WHERE execution_id = ?
    `)
    .bind(execution.id)
    .first();

  const version =
    Number(latest?.max_version || 0) + 1;

  const deliveryResult = await env.DB
    .prepare(`
      INSERT INTO project_deliveries
      (
        execution_id,
        project_id,
        freelancer_id,
        version,
        message,
        file_url,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'submitted')
    `)
    .bind(
      execution.id,
      projectId,
      user.id,
      version,
      message,
      fileUrl || null
    )
    .run();

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
        updated_at = CURRENT_TIMESTAMP
      WHERE execution_id = ?
      AND status = 'open'
    `).bind(execution.id),

    env.DB.prepare(`
      INSERT INTO project_events
      (
        project_id,
        user_id,
        event_type,
        message
      )
      VALUES (?, ?, 'delivery_submitted', ?)
    `).bind(
      projectId,
      user.id,
      `تم إرسال التسليم رقم ${version}`
    )
  ]);

  return json({
    success: true,
    message: "تم إرسال التسليم بنجاح",
    delivery_id: deliveryResult.meta.last_row_id,
    version
  }, 201);
}


async function requestRevision(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "طلب التعديل متاح للعميل فقط"
    }, 403);
  }

  const deliveryId = getIdFromPath(request);

  if (!deliveryId) {
    return json({
      success: false,
      error: "معرف التسليم غير صحيح"
    }, 400);
  }

  const delivery = await env.DB
    .prepare(`
      SELECT
        d.*,
        e.status AS execution_status,
        e.client_id,
        e.freelancer_id
      FROM project_deliveries d
      JOIN project_executions e
        ON e.id = d.execution_id
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

  if (Number(delivery.client_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية طلب تعديل"
    }, 403);
  }

  if (delivery.execution_status !== "submitted") {
    return json({
      success: false,
      error: "التسليم ليس بانتظار المراجعة"
    }, 400);
  }

  if (delivery.status !== "submitted") {
    return json({
      success: false,
      error: "حالة التسليم لا تسمح بطلب تعديل"
    }, 400);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const message = cleanString(
    body.message ||
    body.reason ||
    body.revision_message
  );

  if (message.length < 5) {
    return json({
      success: false,
      error: "يرجى كتابة تفاصيل التعديل"
    }, 400);
  }

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM project_revision_requests
      WHERE delivery_id = ?
      AND status = 'open'
      LIMIT 1
    `)
    .bind(deliveryId)
    .first();

  if (existing) {
    return json({
      success: false,
      error: "يوجد طلب تعديل مفتوح لهذا التسليم"
    }, 409);
  }

  const revisionResult = await env.DB
    .prepare(`
      INSERT INTO project_revision_requests
      (
        delivery_id,
        execution_id,
        project_id,
        client_id,
        message,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'open')
    `)
    .bind(
      deliveryId,
      delivery.execution_id,
      delivery.project_id,
      user.id,
      message
    )
    .run();

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE project_deliveries
      SET
        status = 'revision_requested',
        updated_at = CURRENT_TIMESTAMP
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
      INSERT INTO project_events
      (
        project_id,
        user_id,
        event_type,
        message
      )
      VALUES (?, ?, 'revision_requested', ?)
    `).bind(
      delivery.project_id,
      user.id,
      message
    )
  ]);

  return json({
    success: true,
    message: "تم إرسال طلب التعديل",
    revision_id: revisionResult.meta.last_row_id
  }, 201);
}


async function acceptDelivery(request, env) {
  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "قبول التسليم متاح للعميل فقط"
    }, 403);
  }

  const deliveryId = getIdFromPath(request);

  if (!deliveryId) {
    return json({
      success: false,
      error: "معرف التسليم غير صحيح"
    }, 400);
  }

  const delivery = await env.DB
    .prepare(`
      SELECT
        d.*,
        e.status AS execution_status,
        e.client_id
      FROM project_deliveries d
      JOIN project_executions e
        ON e.id = d.execution_id
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

  if (Number(delivery.client_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية قبول هذا التسليم"
    }, 403);
  }

  if (delivery.execution_status !== "submitted") {
    return json({
      success: false,
      error: "التنفيذ ليس بانتظار القبول"
    }, 400);
  }

  if (delivery.status !== "submitted") {
    return json({
      success: false,
      error: "التسليم ليس صالحًا للقبول"
    }, 400);
  }

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE project_deliveries
      SET
        status = 'accepted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(deliveryId),

    env.DB.prepare(`
      UPDATE project_executions
      SET
        status = 'completed',
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
        updated_at = CURRENT_TIMESTAMP
      WHERE execution_id = ?
      AND status = 'open'
    `).bind(delivery.execution_id),

    env.DB.prepare(`
      INSERT INTO project_events
      (
        project_id,
        user_id,
        event_type,
        message
      )
      VALUES (?, ?, 'project_completed', ?)
    `).bind(
      delivery.project_id,
      user.id,
      "تم قبول التسليم وإنهاء المشروع بنجاح"
    )
  ]);

  return json({
    success: true,
    message: "تم قبول التسليم وإنهاء المشروع"
  });
}


/* ============================================================
   PORTFOLIO TABLE
   ============================================================ */

async function ensurePortfolioTable(env) {
  await env.DB
    .prepare(`
      CREATE TABLE IF NOT EXISTS portfolio_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        project_url TEXT,
        skills TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .run();

  await env.DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_user
      ON portfolio_items(user_id)
    `)
    .run();

  await env.DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_status
      ON portfolio_items(status)
    `)
    .run();

  await env.DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_category
      ON portfolio_items(category)
    `)
    .run();
}


/* ============================================================
   CREATE PORTFOLIO
   ============================================================ */

async function createPortfolio(request, env) {
  await ensurePortfolioTable(env);

  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "إضافة الأعمال متاحة للمستقلين فقط"
    }, 403);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const title = cleanString(body.title);
  const description = cleanString(body.description);
  const category = cleanString(body.category);

  const imageUrl = cleanString(
    body.image_url ||
    body.image ||
    body.cover_image ||
    body.coverImage
  );

  const projectUrl = cleanString(
    body.project_url ||
    body.projectUrl ||
    body.url
  );

  const skills = normalizeSkills(
    body.skills ||
    body.technologies ||
    body.tech_stack
  );

  const status =
    cleanString(body.status) || "active";

  if (title.length < 3) {
    return json({
      success: false,
      error: "عنوان العمل قصير جدًا"
    }, 400);
  }

  if (description.length < 10) {
    return json({
      success: false,
      error: "وصف العمل قصير جدًا"
    }, 400);
  }

  if (!category) {
    return json({
      success: false,
      error: "تصنيف العمل مطلوب"
    }, 400);
  }

  if (!["active", "hidden"].includes(status)) {
    return json({
      success: false,
      error: "حالة العمل غير صحيحة"
    }, 400);
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO portfolio_items
      (
        user_id,
        title,
        description,
        category,
        image_url,
        project_url,
        skills,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      user.id,
      title,
      description,
      category,
      imageUrl || null,
       
    imageUrl || null,
    projectUrl || null,
    skills || null,
    status
  )
  .run();

  const itemId = result.meta?.last_row_id;

  return json({
    success: true,
    message: "تمت إضافة العمل بنجاح",
    item: {
      id: itemId,
      user_id: user.id,
      title,
      description,
      category,
      image_url: imageUrl || null,
      project_url: projectUrl || null,
      skills: skills || null,
      status
    }
  }, 201);
}


/* ============================================================
   GET PORTFOLIO
   ============================================================ */

async function getPortfolio(request, env) {
  await ensurePortfolioTable(env);

  const url = new URL(request.url);

  const category = cleanString(
    url.searchParams.get("category")
  );

  const search = cleanString(
    url.searchParams.get("search")
  );

  let query = `
    SELECT
      p.id,
      p.user_id,
      p.title,
      p.description,
      p.category,
      p.image_url,
      p.project_url,
      p.skills,
      p.status,
      p.created_at,
      p.updated_at,
      u.full_name
    FROM portfolio_items p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.status = 'active'
      AND u.role = 'freelancer'
  `;

  const params = [];

  if (category) {
    query += ` AND p.category = ? `;
    params.push(category);
  }

  if (search) {
    query += `
      AND (
        p.title LIKE ?
        OR p.description LIKE ?
        OR p.skills LIKE ?
        OR u.full_name LIKE ?
      )
    `;

    const pattern = `%${search}%`;

    params.push(
      pattern,
      pattern,
      pattern,
      pattern
    );
  }

  query += `
    ORDER BY p.created_at DESC
  `;

  const result = await env.DB
    .prepare(query)
    .bind(...params)
    .all();

  return json({
    success: true,
    portfolio: result.results || []
  });
}


/* ============================================================
   MY PORTFOLIO
   ============================================================ */

async function getMyPortfolio(request, env) {
  await ensurePortfolioTable(env);

  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        id,
        user_id,
        title,
        description,
        category,
        image_url,
        project_url,
        skills,
        status,
        created_at,
        updated_at
      FROM portfolio_items
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
    .bind(user.id)
    .all();

  return json({
    success: true,
    portfolio: result.results || []
  });
}


/* ============================================================
   GET SINGLE PORTFOLIO ITEM
   ============================================================ */

async function getPortfolioItem(request, env) {
  await ensurePortfolioTable(env);

  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف العمل غير صحيح"
    }, 400);
  }

  const result = await env.DB
    .prepare(`
      SELECT
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.category,
        p.image_url,
        p.project_url,
        p.skills,
        p.status,
        p.created_at,
        p.updated_at,
        u.full_name
      FROM portfolio_items p
      INNER JOIN users u ON u.id = p.user_id
      WHERE p.id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!result) {
    return json({
      success: false,
      error: "العمل غير موجود"
    }, 404);
  }

  return json({
    success: true,
    item: result
  });
}


/* ============================================================
   UPDATE PORTFOLIO
   ============================================================ */

async function updatePortfolio(request, env) {
  await ensurePortfolioTable(env);

  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "تعديل الأعمال متاح للمستقلين فقط"
    }, 403);
  }

  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف العمل غير صحيح"
    }, 400);
  }

  const existing = await env.DB
    .prepare(`
      SELECT *
      FROM portfolio_items
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!existing) {
    return json({
      success: false,
      error: "العمل غير موجود"
    }, 404);
  }

  if (Number(existing.user_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا يمكنك تعديل هذا العمل"
    }, 403);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "بيانات غير صحيحة"
    }, 400);
  }

  const title =
    cleanString(body.title) || existing.title;

  const description =
    cleanString(body.description) || existing.description;

  const category =
    cleanString(body.category) || existing.category;

  const imageUrl =
    cleanString(
      body.image_url ??
      body.image ??
      body.cover_image ??
      body.coverImage
    ) || existing.image_url || "";

  const projectUrl =
    cleanString(
      body.project_url ??
      body.projectUrl ??
      body.url
    ) || existing.project_url || "";

  const skillsValue =
    body.skills ??
    body.technologies ??
    body.tech_stack;

  const skills =
    skillsValue !== undefined
      ? normalizeSkills(skillsValue)
      : (existing.skills || "");

  const status =
    cleanString(body.status) ||
    existing.status ||
    "active";

  if (title.length < 3) {
    return json({
      success: false,
      error: "عنوان العمل قصير جدًا"
    }, 400);
  }

  if (description.length < 10) {
    return json({
      success: false,
      error: "وصف العمل قصير جدًا"
    }, 400);
  }

  if (!category) {
    return json({
      success: false,
      error: "تصنيف العمل مطلوب"
    }, 400);
  }

  if (!["active", "hidden"].includes(status)) {
    return json({
      success: false,
      error: "حالة العمل غير صحيحة"
    }, 400);
  }

  await env.DB
    .prepare(`
      UPDATE portfolio_items
      SET
        title = ?,
        description = ?,
        category = ?,
        image_url = ?,
        project_url = ?,
        skills = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
    `)
    .bind(
      title,
      description,
      category,
      imageUrl || null,
      projectUrl || null,
      skills || null,
      status,
      id,
      user.id
    )
    .run();

  return json({
    success: true,
    message: "تم تعديل العمل بنجاح",
    item: {
      id: Number(id),
      user_id: user.id,
      title,
      description,
      category,
      image_url: imageUrl || null,
      project_url: projectUrl || null,
      skills: skills || null,
      status
    }
  });
}


/* ============================================================
   DELETE PORTFOLIO
   ============================================================ */

async function deletePortfolio(request, env) {
  await ensurePortfolioTable(env);

  const user = await authenticateUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "حذف الأعمال متاح للمستقلين فقط"
    }, 403);
  }

  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف العمل غير صحيح"
    }, 400);
  }

  const existing = await env.DB
    .prepare(`
      SELECT id, user_id
      FROM portfolio_items
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!existing) {
    return json({
      success: false,
      error: "العمل غير موجود"
    }, 404);
  }

  if (Number(existing.user_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا يمكنك حذف هذا العمل"
    }, 403);
  }

  await env.DB
    .prepare(`
      DELETE FROM portfolio_items
      WHERE id = ?
        AND user_id = ?
    `)
    .bind(id, user.id)
    .run();

  return json({
    success: true,
    message: "تم حذف العمل بنجاح"
  });
}


/* ============================================================
   FREELANCERS
   ============================================================ */

async function getFreelancers(request, env) {
  const url = new URL(request.url);

  const search = cleanString(
    url.searchParams.get("search")
  );

  let query = `
    SELECT
      u.id,
      u.full_name,
      u.email
    FROM users u
    WHERE u.role = 'freelancer'
  `;

  const params = [];

  if (search) {
    query += `
      AND (
        u.full_name LIKE ?
        OR u.email LIKE ?
      )
    `;

    const pattern = `%${search}%`;

    params.push(
      pattern,
      pattern
    );
  }

  query += `
    ORDER BY u.id DESC
  `;

  const result = await env.DB
    .prepare(query)
    .bind(...params)
    .all();

  const freelancers = result.results || [];

  /*
   * نضيف عدد الأعمال لكل مستقل.
   * إذا كان جدول portfolio_items موجودًا نستخدمه،
   * وإذا لم يكن موجودًا ننشئه تلقائيًا.
   */
  await ensurePortfolioTable(env);

  for (const freelancer of freelancers) {
    const portfolioResult = await env.DB
      .prepare(`
        SELECT COUNT(*) AS count
        FROM portfolio_items
        WHERE user_id = ?
          AND status = 'active'
      `)
      .bind(freelancer.id)
      .first();

    freelancer.portfolio_count =
      Number(portfolioResult?.count || 0);
  }

  return json({
    success: true,
    freelancers
  });
}


/* ============================================================
   FREELANCER PROFILE
   ============================================================ */

async function getFreelancerProfile(request, env) {
  const id = getIdFromPath(request);

  if (!id) {
    return json({
      success: false,
      error: "معرف المستقل غير صحيح"
    }, 400);
  }

  const freelancer = await env.DB
    .prepare(`
      SELECT
        id,
        full_name,
        email
      FROM users
      WHERE id = ?
        AND role = 'freelancer'
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!freelancer) {
    return json({
      success: false,
      error: "المستقل غير موجود"
    }, 404);
  }

  await ensurePortfolioTable(env);

  const portfolioResult = await env.DB
    .prepare(`
      SELECT
        id,
        user_id,
        title,
        description,
        category,
        image_url,
        project_url,
        skills,
        status,
        created_at,
        updated_at
      FROM portfolio_items
      WHERE user_id = ?
        AND status = 'active'
      ORDER BY created_at DESC
    `)
    .bind(id)
    .all();

  return json({
    success: true,
    freelancer: {
      ...freelancer,
      portfolio: portfolioResult.results || []
    }
  });
}
