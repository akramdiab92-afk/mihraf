const SESSION_COOKIE = "mihraf_session";
const SESSION_DAYS = 30;

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

      if (path === "/api/logout" && method === "POST") {
        return await logout(request, env);
      }

      if (path === "/api/me" && method === "GET") {
        const user = await getCurrentUser(request, env);

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
          user
        });
      }

      // =========================
      // PROJECTS
      // =========================

      if (path === "/api/projects" && method === "GET") {
        return await getProjects(request, env);
      }

      if (path === "/api/projects" && method === "POST") {
        return await createProject(request, env);
      }

      // تفاصيل مشروع
      const projectMatch = path.match(/^\/api\/projects\/(\d+)$/);

      if (projectMatch && method === "GET") {
        return await getProjectDetails(
          request,
          env,
          Number(projectMatch[1])
        );
      }

      // =========================
      // PROPOSALS
      // =========================

      if (path === "/api/proposals" && method === "POST") {
        return await createProposal(request, env);
      }

      if (path === "/api/my-proposals" && method === "GET") {
        return await getMyProposals(request, env);
      }

      const projectProposalsMatch =
        path.match(/^\/api\/projects\/(\d+)\/proposals$/);

      if (projectProposalsMatch && method === "GET") {
        return await getProjectProposals(
          request,
          env,
          Number(projectProposalsMatch[1])
        );
      }

      const proposalStatusMatch =
        path.match(/^\/api\/proposals\/(\d+)\/status$/);

      if (proposalStatusMatch && method === "POST") {
        return await updateProposalStatus(
          request,
          env,
          Number(proposalStatusMatch[1])
        );
      }

      // =========================
      // HEALTH
      // =========================

      if (path === "/api/health" && method === "GET") {
        const result = await env.DB
          .prepare("SELECT 1 AS ok")
          .first();

        return json({
          success: true,
          database: result?.ok === 1
        });
      }

      // =========================
      // STATIC FILES
      // =========================

      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response("Not Found", { status: 404 });

    } catch (error) {
      console.error("Worker error:", error);

      return json({
        success: false,
        error: "حدث خطأ غير متوقع في الخادم",
        details: error?.message || String(error)
      }, 500);
    }
  }
};


// ======================================================
// REGISTER
// ======================================================

async function register(request, env) {
  const body = await readJson(request);

  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "").trim();

  if (!fullName) {
    return json({ success: false, error: "الاسم مطلوب" }, 400);
  }

  if (!email || !email.includes("@")) {
    return json({ success: false, error: "البريد الإلكتروني غير صحيح" }, 400);
  }

  if (password.length < 6) {
    return json({
      success: false,
      error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    }, 400);
  }

  if (!["client", "freelancer"].includes(role)) {
    return json({
      success: false,
      error: "نوع الحساب غير صحيح"
    }, 400);
  }

  const existing = await env.DB
    .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first();

  if (existing) {
    return json({
      success: false,
      error: "البريد الإلكتروني مستخدم مسبقا"
    }, 409);
  }

  const salt = randomHex(16);
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


// ======================================================
// LOGIN
// ======================================================

async function login(request, env) {
  const body = await readJson(request);

  const email = String(body.email || "").trim().toLowerCase();
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
      WHERE email = ?
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

  const passwordHash = await hashPassword(
    password,
    user.password_salt
  );

  if (passwordHash !== user.password_hash) {
    return json({
      success: false,
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    }, 401);
  }

  const token = randomToken(32);
  const tokenHash = await sha256(token);

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await env.DB
    .prepare("DELETE FROM sessions WHERE user_id = ?")
    .bind(user.id)
    .run();

  await env.DB
    .prepare(`
      INSERT INTO sessions
      (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `)
    .bind(
      user.id,
      tokenHash,
      expiresAt
    )
    .run();

  const headers = new Headers();

  headers.set("Content-Type", "application/json; charset=utf-8");

  headers.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${token}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
    ].join("; ")
  );

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
      headers
    }
  );
}


// ======================================================
// LOGOUT
// ======================================================

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);

  if (token) {
    const tokenHash = await sha256(token);

    await env.DB
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
  }

  const headers = new Headers();

  headers.set("Content-Type", "application/json; charset=utf-8");

  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );

  return new Response(
    JSON.stringify({
      success: true,
      message: "تم تسجيل الخروج"
    }),
    {
      status: 200,
      headers
    }
  );
}


// ======================================================
// CURRENT USER
// ======================================================

async function getCurrentUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);

  const row = await env.DB
    .prepare(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role
  };
}


// ======================================================
// GET PROJECTS
// ======================================================

async function getProjects(request, env) {
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  const result = await env.DB
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
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.id DESC
    `)
    .bind(user.id)
    .all();

  return json({
    success: true,
    projects: result.results || []
  });
}


// ======================================================
// CREATE PROJECT
// ======================================================

async function createProject(request, env) {
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "فقط أصحاب المشاريع يمكنهم إنشاء مشروع"
    }, 403);
  }

  const body = await readJson(request);

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "").trim();
  const budget = Number(body.budget);

  if (!title) {
    return json({
      success: false,
      error: "عنوان المشروع مطلوب"
    }, 400);
  }

  if (!description) {
    return json({
      success: false,
      error: "وصف المشروع مطلوب"
    }, 400);
  }

  if (!category) {
    return json({
      success: false,
      error: "التصنيف مطلوب"
    }, 400);
  }

  if (!Number.isFinite(budget) || budget <= 0) {
    return json({
      success: false,
      error: "الميزانية غير صحيحة"
    }, 400);
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO projects
      (user_id, title, description, budget, category, status)
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

  const project = await env.DB
    .prepare(`
      SELECT *
      FROM projects
      WHERE id = ?
      LIMIT 1
    `)
    .bind(result.meta.last_row_id)
    .first();

  return json({
    success: true,
    message: "تم نشر المشروع بنجاح",
    project
  }, 201);
}


// ======================================================
// PROJECT DETAILS
// ======================================================

async function getProjectDetails(request, env, projectId) {
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  const project = await env.DB
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
      LEFT JOIN users u ON u.id = p.user_id
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

  return json({
    success: true,
    project: {
      ...project,
      is_owner: Number(project.user_id) === Number(user.id),
      can_apply:
        user.role === "freelancer" &&
        Number(project.user_id) !== Number(user.id) &&
        project.status === "open"
    }
  });
}


// ======================================================
// CREATE PROPOSAL
// ======================================================

async function createProposal(request, env) {
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "فقط المستقلون يمكنهم تقديم العروض"
    }, 403);
  }

  const body = await readJson(request);

  const projectId = Number(body.project_id);
  const price = Number(body.price);
  const deliveryDays = Number(body.delivery_days);
  const message = String(body.message || "").trim();

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return json({
      success: false,
      error: "المشروع غير صحيح"
    }, 400);
  }

  if (!Number.isFinite(price) || price <= 0) {
    return json({
      success: false,
      error: "السعر غير صحيح"
    }, 400);
  }

  if (!Number.isInteger(deliveryDays) || deliveryDays <= 0) {
    return json({
      success: false,
      error: "مدة التسليم غير صحيحة"
    }, 400);
  }

  if (!message) {
    return json({
      success: false,
      error: "رسالة العرض مطلوبة"
    }, 400);
  }

  const project = await env.DB
    .prepare(`
      SELECT id, user_id, status
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

  if (Number(project.user_id) === Number(user.id)) {
    return json({
      success: false,
      error: "لا يمكنك تقديم عرض على مشروعك"
    }, 403);
  }

  if (project.status !== "open") {
    return json({
      success: false,
      error: "هذا المشروع لم يعد مفتوحا لاستقبال العروض"
    }, 400);
  }

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM proposals
      WHERE project_id = ?
        AND freelancer_id = ?
      LIMIT 1
    `)
    .bind(projectId, user.id)
    .first();

  if (existing) {
    return json({
      success: false,
      error: "لقد قدمت عرضا على هذا المشروع مسبقا"
    }, 409);
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO proposals
      (project_id, freelancer_id, price, delivery_days, message, status)
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

  const proposal = await env.DB
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
      LEFT JOIN users u ON u.id = p.freelancer_id
      WHERE p.id = ?
      LIMIT 1
    `)
    .bind(result.meta.last_row_id)
    .first();

  return json({
    success: true,
    message: "تم إرسال العرض بنجاح",
    proposal
  }, 201);
}


// ======================================================
// MY PROPOSALS
// ======================================================

async function getMyProposals(request, env) {
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "freelancer") {
    return json({
      success: false,
      error: "هذه الصفحة للمستقلين"
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
        pr.title AS project_title,
        pr.budget AS project_budget,
        pr.category AS project_category,
        pr.status AS project_status
      FROM proposals p
      INNER JOIN projects pr ON pr.id = p.project_id
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


// ======================================================
// PROJECT PROPOSALS
// ======================================================

async function getProjectProposals(request, env, projectId) {
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  const project = await env.DB
    .prepare(`
      SELECT id, user_id, title, status
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

  if (Number(project.user_id) !== Number(user.id)) {
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
      INNER JOIN users u ON u.id = p.freelancer_id
      WHERE p.project_id = ?
      ORDER BY
        CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END,
        p.id DESC
    `)
    .bind(projectId)
    .all();

  return json({
    success: true,
    project,
    proposals: result.results || []
  });
}


// ======================================================
// UPDATE PROPOSAL STATUS
// ======================================================

async function updateProposalStatus(request, env, proposalId) {
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({
      success: false,
      error: "يجب تسجيل الدخول أولا"
    }, 401);
  }

  if (user.role !== "client") {
    return json({
      success: false,
      error: "فقط صاحب المشروع يمكنه إدارة العروض"
    }, 403);
  }

  const body = await readJson(request);
  const status = String(body.status || "").trim();

  if (!["accepted", "rejected"].includes(status)) {
    return json({
      success: false,
      error: "حالة العرض غير صحيحة"
    }, 400);
  }

  const proposal = await env.DB
    .prepare(`
      SELECT
        p.id,
        p.project_id,
        p.freelancer_id,
        p.status AS proposal_status,
        pr.user_id AS owner_id,
        pr.status AS project_status
      FROM proposals p
      INNER JOIN projects pr ON pr.id = p.project_id
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

  if (Number(proposal.owner_id) !== Number(user.id)) {
    return json({
      success: false,
      error: "لا تملك صلاحية إدارة هذا العرض"
    }, 403);
  }

  if (proposal.proposal_status !== "pending") {
    return json({
      success: false,
      error: "هذا العرض تمت معالجته مسبقا"
    }, 400);
  }

  if (proposal.project_status !== "open") {
    return json({
      success: false,
      error: "المشروع لم يعد مفتوحا"
    }, 400);
  }

  if (status === "accepted") {
    // قبول العرض
    await env.DB
      .prepare(`
        UPDATE proposals
        SET status = 'accepted',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(proposalId)
      .run();

    // رفض باقي العروض المعلقة
    await env.DB
      .prepare(`
        UPDATE proposals
        SET status = 'rejected',
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

    // نقل المشروع إلى مرحلة التنفيذ
    await env.DB
      .prepare(`
        UPDATE projects
        SET status = 'in_progress',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(proposal.project_id)
      .run();

  } else {
    await env.DB
      .prepare(`
        UPDATE proposals
        SET status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(proposalId)
      .run();
  }

  const updated = await env.DB
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
        p.updated_at
      FROM proposals p
      WHERE p.id = ?
      LIMIT 1
    `)
    .bind(proposalId)
    .first();

  return json({
    success: true,
    message:
      status === "accepted"
        ? "تم قبول العرض وبدء المشروع"
        : "تم رفض العرض",
    proposal: updated
  });
}


// ======================================================
// PASSWORD HASH
// ======================================================

async function hashPassword(password, salt) {
  return await sha256(password + salt);
}


// ======================================================
// SHA256
// ======================================================

async function sha256(value) {
  const data = new TextEncoder().encode(value);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(
    new Uint8Array(hash)
  )
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}


// ======================================================
// RANDOM HEX
// ======================================================

function randomHex(bytes) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}


// ======================================================
// RANDOM TOKEN
// ======================================================

function randomToken(bytes = 32) {
  return randomHex(bytes);
}


// ======================================================
// COOKIE
// ======================================================

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const index = cookie.indexOf("=");

    if (index === -1) continue;

    const key = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();

    if (key === name) {
      return value;
    }
  }

  return null;
}


// ======================================================
// JSON BODY
// ======================================================

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}


// ======================================================
// JSON RESPONSE
// ======================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

---

2. "project.html"

هذه صفحة تفاصيل المشروع، ومنها المستقل يقدم عرضه، وصاحب المشروع يشوف العروض.

:::writing{variant="document" id="74106" title="project.html الكامل"}

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تفاصيل المشروع | مِهراف</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, Tahoma, sans-serif;
      background: #181b20;
      color: #e7eaf0;
      min-height: 100vh;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      height: 68px;
      background: #20242a;
      border-bottom: 1px solid #30363f;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }

    .logo {
      color: #4f8cff;
      font-size: 25px;
      font-weight: 800;
    }

    .back {
      background: #242930;
      border: 1px solid #30363f;
      padding: 10px 16px;
      border-radius: 10px;
      color: #e7eaf0;
    }

    .container {
      width: min(1100px, calc(100% - 30px));
      margin: 35px auto;
    }

    .loading,
    .error {
      background: #242930;
      border: 1px solid #30363f;
      border-radius: 16px;
      padding: 30px;
      text-align: center;
    }

    .error {
      color: #ff8d8d;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 22px;
    }

    .card {
      background: #242930;
      border: 1px solid #30363f;
      border-radius: 18px;
      padding: 25px;
      margin-bottom: 22px;
    }

    .title {
      font-size: 30px;
      margin-bottom: 18px;
    }

    .description {
      color: #c4c9d2;
      line-height: 1.9;
      white-space: pre-wrap;
      margin-bottom: 25px;
    }

    .meta {
      display: grid;
      gap: 12px;
    }

    .meta-item {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      padding: 13px;
      background: #20242a;
      border-radius: 10px;
    }

    .muted {
      color: #9da4af;
    }

    .value {
      font-weight: bold;
    }

    .blue {
      color: #4f8cff;
    }

    .btn {
      width: 100%;
      border: 0;
      border-radius: 11px;
      padding: 13px;
      cursor: pointer;
      font-size: 15px;
      font-weight: bold;
      margin-top: 10px;
    }

    .btn-primary {
      background: #4f8cff;
      color: white;
    }

    .btn-primary:hover {
      background: #3978e8;
    }

    .btn-danger {
      background: #8d3038;
      color: white;
    }

    .btn-secondary {
      background: #30363f;
      color: white;
    }

    .form-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      margin-bottom: 7px;
      color: #cdd2da;
    }

    input,
    textarea {
      width: 100%;
      background: #181b20;
      color: #e7eaf0;
      border: 1px solid #30363f;
      border-radius: 10px;
      padding: 12px;
      outline: none;
      font-size: 15px;
    }

    input:focus,
    textarea:focus {
      border-color: #4f8cff;
    }

    textarea {
      min-height: 130px;
      resize: vertical;
    }

    .message {
      display: none;
      padding: 12px;
      border-radius: 10px;
      margin-top: 12px;
      line-height: 1.6;
    }

    .success {
      display: block;
      background: #173b29;
      color: #82e5a9;
    }

    .error-message {
      display: block;
      background: #401f24;
      color: #ff9da7;
    }

    .section-title {
      font-size: 22px;
      margin-bottom: 18px;
    }

    .proposal {
      border: 1px solid #30363f;
      background: #20242a;
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 14px;
    }

    .proposal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }

    .proposal-name {
      font-weight: bold;
      font-size: 17px;
    }

    .proposal-message {
      color: #c4c9d2;
      line-height: 1.7;
      margin: 12px 0;
      white-space: pre-wrap;
    }

    .proposal-data {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .badge {
      padding: 7px 10px;
      border-radius: 8px;
      background: #30363f;
      color: #e7eaf0;
      font-size: 13px;
    }

    .status-pending {
      color: #ffd36b;
    }

    .status-accepted {
      color: #70e5a0;
    }

    .status-rejected {
      color: #ff858f;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 800px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .title {
        font-size: 24px;
      }
    }
  </style>
</head>

<body>

<header class="header">
  <a href="index.html" class="logo">مِهراف</a>
  <a href="projects.html" class="back">العودة للمشاريع</a>
</header>

<main class="container">

  <div id="loading" class="loading">
    جاري تحميل المشروع...
  </div>

  <div id="errorBox" class="error hidden"></div>

  <div id="content" class="hidden">

    <div class="grid">

      <div>

        <div class="card">
          <h1 id="projectTitle" class="title"></h1>

          <div id="projectDescription" class="description"></div>

          <div class="meta">
            <div class="meta-item">
              <span class="muted">التصنيف</span>
              <span id="projectCategory" class="value"></span>
            </div>

            <div class="meta-item">
              <span class="muted">الميزانية</span>
              <span id="projectBudget" class="value blue"></span>
            </div>

            <div class="meta-item">
              <span class="muted">صاحب المشروع</span>
              <span id="projectOwner" class="value"></span>
            </div>

            <div class="meta-item">
              <span class="muted">الحالة</span>
              <span id="projectStatus" class="value"></span>
            </div>
          </div>
        </div>

        <div id="proposalsCard" class="card hidden">
          <h2 class="section-title">العروض المقدمة</h2>
          <div id="proposalsList"></div>
        </div>

      </div>

      <aside>

        <div id="applyCard" class="card hidden">

          <h2 class="section-title">قدم عرضك</h2>

          <form id="proposalForm">

            <div class="form-group">
              <label for="price">السعر</label>
              <input
                id="price"
                type="number"
                min="1"
                step="0.01"
                placeholder="مثال: 50"
                required
              >
            </div>

            <div class="form-group">
              <label for="deliveryDays">مدة التسليم بالأيام</label>
              <input
                id="deliveryDays"
                type="number"
                min="1"
                step="1"
                placeholder="مثال: 5"
                required
              >
            </div>

            <div class="form-group">
              <label for="message">رسالة العرض</label>
              <textarea
                id="message"
                placeholder="اكتب لصاحب المشروع لماذا أنت مناسب لتنفيذ المشروع..."
                required
              ></textarea>
            </div>

            <button class="btn btn-primary" type="submit">
              إرسال العرض
            </button>

            <div id="formMessage" class="message"></div>

          </form>

        </div>

        <div id="ownerCard" class="card hidden">
          <h2 class="section-title">إدارة المشروع</h2>

          <p class="muted" style="line-height:1.8;">
            يمكنك من هنا مراجعة العروض المقدمة على مشروعك وقبول العرض المناسب.
          </p>
        </div>

      </aside>

    </div>

  </div>

</main>

<script>
  const params = new URLSearchParams(location.search);
  const projectId = Number(params.get("id"));

  const loading = document.getElementById("loading");
  const errorBox = document.getElementById("errorBox");
  const content = document.getElementById("content");

  const applyCard = document.getElementById("applyCard");
  const ownerCard = document.getElementById("ownerCard");
  const proposalsCard = document.getElementById("proposalsCard");

  let currentUser = null;
  let currentProject = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusText(status) {
    const map = {
      open: "مفتوح",
      in_progress: "قيد التنفيذ",
      completed: "مكتمل",
      cancelled: "ملغي"
    };

    return map[status] || status;
  }

  function proposalStatusText(status) {
    const map = {
      pending: "قيد المراجعة",
      accepted: "مقبول",
      rejected: "مرفوض"
    };

    return map[status] || status;
  }

  async function load() {
    if (!projectId) {
      showError("رقم المشروع غير صحيح");
      return;
    }

    try {
      const meResponse = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store"
      });

      const meData = await meResponse.json();

      if (!meData.success || !meData.authenticated) {
        location.href = "login.html";
        return;
      }

      currentUser = meData.user;

      const response = await fetch(
        `/api/projects/${projectId}`,
        {
          credentials: "include",
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        showError(data.error || "تعذر تحميل المشروع");
        return;
      }

      currentProject = data.project;

      document.getElementById("projectTitle").textContent =
        currentProject.title;

      document.getElementById("projectDescription").textContent =
        currentProject.description;

      document.getElementById("projectCategory").textContent =
        currentProject.category;

      document.getElementById("projectBudget").textContent =
        `${Number(currentProject.budget).toLocaleString()} $`;

      document.getElementById("projectOwner").textContent =
        currentProject.owner_name || "غير معروف";

      document.getElementById("projectStatus").textContent =
        statusText(currentProject.status);

      loading.classList.add("hidden");
      content.classList.remove("hidden");

      if (
        currentUser.role === "freelancer" &&
        currentProject.can_apply
      ) {
        applyCard.classList.remove("hidden");
      }

      if (currentProject.is_owner) {
        ownerCard.classList.remove("hidden");
        proposalsCard.classList.remove("hidden");
        await loadProposals();
      }

    } catch (error) {
      console.error(error);
      showError("حدث خطأ أثناء تحميل المشروع");
    }
  }

  async function loadProposals() {
    const list = document.getElementById("proposalsList");

    list.innerHTML = "جاري تحميل العروض...";

    try {
      const response = await fetch(
        `/api/projects/${projectId}/proposals`,
        {
          credentials: "include",
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        list.innerHTML =
          `<div class="error">${escapeHtml(data.error || "تعذر تحميل العروض")}</div>`;
        return;
      }

      if (!data.proposals.length) {
        list.innerHTML = `
          <div class="muted">
            لا توجد عروض مقدمة على هذا المشروع حتى الآن.
          </div>
        `;
        return;
      }

      list.innerHTML = data.proposals.map(proposal => {

        const statusClass =
          proposal.status === "accepted"
            ? "status-accepted"
            : proposal.status === "rejected"
              ? "status-rejected"
              : "status-pending";

        const buttons =
          proposal.status === "pending" &&
          currentProject.status === "open"
            ? `
              <button
                class="btn btn-primary"
                onclick="changeProposalStatus(${proposal.id}, 'accepted')"
              >
                قبول العرض
              </button>

              <button
                class="btn btn-danger"
                onclick="changeProposalStatus(${proposal.id}, 'rejected')"
              >
                رفض العرض
              </button>
            `
            : "";

        return `
          <div class="proposal">

            <div class="proposal-head">
              <div class="proposal-name">
                ${escapeHtml(proposal.freelancer_name)}
              </div>

              <div class="${statusClass}">
                ${escapeHtml(proposalStatusText(proposal.status))}
              </div>
            </div>

            <div class="proposal-data">
              <span class="badge">
                السعر: ${Number(proposal.price).toLocaleString()} $
              </span>

              <span class="badge">
                التسليم: ${Number(proposal.delivery_days)} يوم
              </span>
            </div>

            <div class="proposal-message">
              ${escapeHtml(proposal.message)}
            </div>

            ${buttons}

          </div>
        `;
      }).join("");

    } catch (error) {
      console.error(error);
      list.innerHTML =
        `<div class="error">حدث خطأ أثناء تحميل العروض</div>`;
    }
  }

  async function changeProposalStatus(proposalId, status) {
    const text =
      status === "accepted"
        ? "هل تريد قبول هذا العرض؟ سيتم رفض باقي العروض ونقل المشروع إلى قيد التنفيذ."
        : "هل تريد رفض هذا العرض؟";

    if (!confirm(text)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/proposals/${proposalId}/status`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || "تعذر تحديث العرض");
        return;
      }

      alert(data.message || "تم تحديث العرض");

      location.reload();

    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحديث العرض");
    }
  }

  document
    .getElementById("proposalForm")
    .addEventListener("submit", async function(event) {

      event.preventDefault();

      const formMessage =
        document.getElementById("formMessage");

      formMessage.className = "message";
      formMessage.textContent = "جاري إرسال العرض...";

      const price =
        Number(document.getElementById("price").value);

      const deliveryDays =
        Number(document.getElementById("deliveryDays").value);

      const message =
        document.getElementById("message").value.trim();

      try {

        const response = await fetch("/api/proposals", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            project_id: projectId,
            price,
            delivery_days: deliveryDays,
            message
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          formMessage.className =
            "message error-message";

          formMessage.textContent =
            data.error || "تعذر إرسال العرض";

          return;
        }

        formMessage.className =
          "message success";

        formMessage.textContent =
          "تم إرسال عرضك بنجاح";

        document.getElementById("proposalForm").reset();

      } catch (error) {
        console.error(error);

        formMessage.className =
          "message error-message";

        formMessage.textContent =
          "حدث خطأ أثناء إرسال العرض";
      }
    });

  function showError(message) {
    loading.classList.add("hidden");
    content.classList.add("hidden");

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  load();
</script>

</body>
</html>

---

3. "my-proposals.html"

هذه صفحة المستقل لمتابعة العروض التي قدمها.

:::writing{variant="document" id="92614" title="my-proposals.html الكامل"}

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>عروضي | مِهراف</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, Tahoma, sans-serif;
      background: #181b20;
      color: #e7eaf0;
      min-height: 100vh;
    }

    a {
      text-decoration: none;
      color: inherit;
    }

    header {
      height: 68px;
      background: #20242a;
      border-bottom: 1px solid #30363f;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }

    .logo {
      color: #4f8cff;
      font-size: 25px;
      font-weight: 800;
    }

    .back {
      padding: 10px 15px;
      border-radius: 10px;
      border: 1px solid #30363f;
      background: #242930;
    }

    main {
      width: min(1000px, calc(100% - 30px));
      margin: 35px auto;
    }

    h1 {
      margin-bottom: 25px;
    }

    .card {
      background: #242930;
      border: 1px solid #30363f;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .project-title {
      font-size: 21px;
      font-weight: bold;
      color: #fff;
      margin-bottom: 12px;
    }

    .data {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 12px 0;
    }

    .badge {
      background: #30363f;
      border-radius: 8px;
      padding: 8px 11px;
      font-size: 13px;
    }

    .message {
      color: #bfc5ce;
      line-height: 1.8;
      white-space: pre-wrap;
      margin: 15px 0;
    }

    .pending {
      color: #ffd36b;
    }

    .accepted {
      color: #72e5a1;
    }

    .rejected {
      color: #ff858f;
    }

    .btn {
      display: inline-block;
      background: #4f8cff;
      color: white;
      padding: 10px 15px;
      border-radius: 9px;
    }

    .empty,
    .error {
      background: #242930;
      border: 1px solid #30363f;
      border-radius: 16px;
      padding: 30px;
      text-align: center;
    }

    .error {
      color: #ff8b96;
    }

    .muted {
      color: #9da4af;
    }
  </style>
</head>

<body>

<header>
  <a href="index.html" class="logo">مِهراف</a>
  <a href="index.html" class="back">الرئيسية</a>
</header>

<main>

  <h1>عروضي</h1>

  <div id="loading" class="empty">
    جاري تحميل العروض...
  </div>

  <div id="content"></div>

</main>

<script>

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function proposalStatus(status) {
    const map = {
      pending: ["قيد المراجعة", "pending"],
      accepted: ["مقبول", "accepted"],
      rejected: ["مرفوض", "rejected"]
    };

    return map[status] || [status, ""];
  }

  async function load() {

    try {

      const meResponse = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store"
      });

      const meData = await meResponse.json();

      if (!meData.success || !meData.authenticated) {
        location.href = "login.html";
        return;
      }

      if (meData.user.role !== "freelancer") {
        document.getElementById("loading").innerHTML = `
          <div class="error">
            هذه الصفحة مخصصة للمستقلين.
          </div>
        `;
        return;
      }

      const response = await fetch("/api/my-proposals", {
        credentials: "include",
        cache: "no-store"
      });

      const data = await response.json();

      document.getElementById("loading").style.display = "none";

      if (!response.ok || !data.success) {
        document.getElementById("content").innerHTML = `
          <div class="error">
            ${escapeHtml(data.error || "تعذر تحميل العروض")}
          </div>
        `;
        return;
      }

      if (!data.proposals.length) {
        document.getElementById("content").innerHTML = `
          <div class="empty">
            <h2 style="margin-bottom:10px;">
              لا توجد عروض حتى الآن
            </h2>

            <p class="muted" style="margin-bottom:20px;">
              عندما تقدم عرضا على أحد المشاريع سيظهر هنا.
            </p>

            <a href="projects.html" class="btn">
              تصفح المشاريع
            </a>
          </div>
        `;

        return;
      }

      document.getElementById("content").innerHTML =
        data.proposals.map(proposal => {

          const [statusText, statusClass] =
            proposalStatus(proposal.status);

          return `
            <div class="card">

              <div class="project-title">
                ${escapeHtml(proposal.project_title)}
              </div>

              <div class="${statusClass}" style="font-weight:bold;">
                ${escapeHtml(statusText)}
              </div>

              <div class="data">

                <span class="badge">
                  عرضك: ${Number(proposal.price).toLocaleString()} $
                </span>

                <span class="badge">
                  مدة التسليم: ${Number(proposal.delivery_days)} يوم
                </span>

                <span class="badge">
                  ميزانية المشروع:
                  ${Number(proposal.project_budget).toLocaleString()} $
                </span>

                <span class="badge">
                  التصنيف:
                  ${escapeHtml(proposal.project_category)}
                </span>

              </div>

              <div class="message">
                ${escapeHtml(proposal.message)}
              </div>

              <a
                href="project.html?id=${Number(proposal.project_id)}"
                class="btn"
              >
                مشاهدة المشروع
              </a>

            </div>
          `;

        }).join("");

    } catch (error) {

      console.error(error);

      document.getElementById("loading").style.display = "none";

      document.getElementById("content").innerHTML = `
        <div class="error">
          حدث خطأ أثناء تحميل العروض.
        </div>
      `;
    }
  }

  load();

</script>

</body>
</html>

---

4. "projects.html"

استبدل صفحة المشاريع بهذه النسخة، بحيث كل مشروع له زر مشاهدة المشروع.

:::writing{variant="document" id="31587" title="projects.html الكامل"}

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>المشاريع | مِهراف</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, Tahoma, sans-serif;
      background: #181b20;
      color: #e7eaf0;
      min-height: 100vh;
    }

    header {
      height: 68px;
      background: #20242a;
      border-bottom: 1px solid #30363f;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }

    .logo {
      color: #4f8cff;
      font-size: 25px;
      font-weight: 800;
    }

    .back {
      background: #242930;
      border: 1px solid #30363f;
      padding: 10px 15px;
      border-radius: 10px;
      color: white;
      text-decoration: none;
    }

    main {
      width: min(1100px, calc(100% - 30px));
      margin: 35px auto;
    }

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 25px;
    }

    .create {
      background: #4f8cff;
      color: white;
      padding: 11px 17px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: bold;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .card,
    .loading,
    .empty,
    .error {
      background: #242930;
      border: 1px solid #30363f;
      border-radius: 17px;
      padding: 20px;
    }

    .loading,
    .empty,
    .error {
      text-align: center;
    }

    .error {
      color: #ff8d97;
    }

    .title {
      font-size: 21px;
      font-weight: bold;
      margin-bottom: 12px;
    }

    .description {
      color: #bfc5ce;
      line-height: 1.7;
      margin-bottom: 15px;
    }

    .data {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }

    .badge {
      background: #30363f;
      padding: 7px 9px;
      border-radius: 8px;
      font-size: 13px;
    }

    .budget {
      color: #4f8cff;
      font-weight: bold;
    }

    .btn {
      display: inline-block;
      background: #4f8cff;
      color: white;
      text-decoration: none;
      padding: 10px 15px;
      border-radius: 9px;
      font-weight: bold;
    }

    @media (max-width: 750px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .top {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  </style>
</head>

<body>

<header>
  <a href="index.html" class="logo">مِهراف</a>
  <a href="index.html" class="back">الرئيسية</a>
</header>

<main>

  <div class="top">
    <h1>المشاريع</h1>

    <a href="create-project.html" class="create">
      + نشر مشروع
    </a>
  </div>

  <div id="loading" class="loading">
    جاري تحميل المشاريع...
  </div>

  <div id="content"></div>

</main>

<script>

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadProjects() {

    try {

      const meResponse = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store"
      });

      const meData = await meResponse.json();

      if (!meData.success || !meData.authenticated) {
        location.href = "login.html";
        return;
      }

      const response = await fetch("/api/projects", {
        credentials: "include",
        cache: "no-store"
      });

      const data = await response.json();

      document.getElementById("loading").style.display = "none";

      if (!response.ok || !data.success) {
        document.getElementById("content").innerHTML = `
          <div class="error">
            ${escapeHtml(data.error || "تعذر تحميل المشاريع")}
          </div>
        `;
        return;
      }

      if (!data.projects.length) {
        document.getElementById("content").innerHTML = `
          <div class="empty">
            لا توجد مشاريع منشورة حاليا.
          </div>
        `;
        return;
      }

      document.getElementById("content").innerHTML = `
        <div class="grid">
          ${data.projects.map(project => `
            <div class="card">

              <div class="title">
                ${escapeHtml(project.title)}
              </div>

              <div class="description">
                ${escapeHtml(project.description)}
              </div>

              <div class="data">

                <span class="badge">
                  التصنيف:
                  ${escapeHtml(project.category)}
                </span>

                <span class="badge budget">
                  ${Number(project.budget).toLocaleString()} $
                </span>

                <span class="badge">
                  ${escapeHtml(
                    project.status === "open"
                      ? "مفتوح"
                      : project.status === "in_progress"
                        ? "قيد التنفيذ"
                        : project.status
                  )}
                </span>

              </div>

              <a
                class="btn"
                href="project.html?id=${Number(project.id)}"
              >
                مشاهدة المشروع
              </a>

            </div>
          `).join("")}
        </div>
      `;

    } catch (error) {

      console.error(error);

      document.getElementById("loading").style.display = "none";

      document.getElementById("content").innerHTML = `
        <div class="error">
          حدث خطأ أثناء تحميل المشاريع.
        </div>
      `;
    }
  }

  loadProjects();

</script>

</body>
</html>
