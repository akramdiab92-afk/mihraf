export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/db-structure") {
      try {
        const users = await env.DB
          .prepare("PRAGMA table_info(users)")
          .all();

        const sessions = await env.DB
          .prepare("PRAGMA table_info(sessions)")
          .all();

        return new Response(
          JSON.stringify({
            success: true,
            users: users.results || [],
            sessions: sessions.results || []
          }, null, 2),
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store"
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message
          }, null, 2),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=utf-8"
            }
          }
        );
      }
    }

    return await env.ASSETS.fetch(request);
  }
};
