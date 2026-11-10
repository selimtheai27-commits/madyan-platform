// ============================================================================
// MADYAN SERVERLESS BACKEND API (Netlify Functions + Supabase PostgreSQL)
// ============================================================================
// يربط الواجهة الأمامية بقاعدة بيانات Supabase PostgreSQL عبر متغيرات البيئة في Netlify:
// SUPABASE_URL
// SUPABASE_ANON_KEY (أو SUPABASE_SERVICE_ROLE_KEY)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";

  const safeJsonParse = (str) => JSON.parse(str, (k, v) => (k === "__proto__" || k === "constructor" || k === "prototype") ? undefined : v);

  const path = (event.path || "")
    .replace(/^\/\.netlify\/functions\/api\/?/, "")
    .replace(/^\/api\/?/, "");

  // 1. GET /api/config -> يزود الواجهة الأمامية بإعدادات الاتصال السحابي تلقائياً
  if (event.httpMethod === "GET" && (path === "config" || path === "")) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        configured: Boolean(supabaseUrl && supabaseAnonKey),
        supabaseUrl,
        supabaseAnonKey
      })
    };
  }

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        configured: false,
        message: "لم يتم ضبط متغيرات البيئة SUPABASE_URL و SUPABASE_ANON_KEY بعد."
      })
    };
  }

  const restBase = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
  const dbHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation,resolution=merge-duplicates"
  };

  try {
    // 2. GET /api/state -> قراءة حالة المنصة من جدول madyan_app_state في Supabase
    if (event.httpMethod === "GET" && path === "state") {
      const res = await fetch(`${restBase}/madyan_app_state?id=eq.global&select=*`, {
        method: "GET",
        headers: dbHeaders
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          statusCode: res.status,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: errText })
        };
      }

      const rows = await res.json();
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          state: row ? row.state_data : null,
          updatedAt: row ? row.updated_at : null
        })
      };
    }

    // 3. POST /api/state -> حفظ وتحديث حالة المنصة والجداول العلائقية في Supabase
    if (event.httpMethod === "POST" && path === "state") {
      const body = safeJsonParse(event.body || "{}");
      const stateData = body.state;
      const updatedBy = body.updatedBy || "client";

      if (!stateData || typeof stateData !== "object") {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: "Invalid state payload" })
        };
      }

      // حفظ الحالة الكاملة في madyan_app_state
      const upsertRes = await fetch(`${restBase}/madyan_app_state`, {
        method: "POST",
        headers: dbHeaders,
        body: JSON.stringify({
          id: "global",
          state_data: stateData,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        })
      });

      if (!upsertRes.ok) {
        const errText = await upsertRes.text();
        return {
          statusCode: upsertRes.status,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: errText })
        };
      }

      // مزامنة جدول المستخدمين madyan_users في الخلفية لسهولة الاستعلام المباشر
      if (Array.isArray(stateData.users) && stateData.users.length > 0) {
        const userRows = stateData.users.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          role_type: u.roleType,
          name: u.name,
          job_title: u.jobTitle || "",
          unit: u.unit || "",
          onboarded: Boolean(u.onboarded),
          joined_at: u.joinedAt || Date.now(),
          default_schedule: u.defaultSchedule || {},
          week_overrides: u.weekOverrides || {},
          tasks_record: u.tasksRecord || {},
          updated_at: new Date().toISOString()
        }));
        await fetch(`${restBase}/madyan_users`, {
          method: "POST",
          headers: dbHeaders,
          body: JSON.stringify(userRows)
        }).catch(() => {});
      }

      // مزامنة جدول التعميمات madyan_bulletins
      if (Array.isArray(stateData.bulletins) && stateData.bulletins.length > 0) {
        const bulletinRows = stateData.bulletins.map(b => ({
          id: b.id,
          title: b.title,
          content: b.content,
          category: b.category || "سياسة جديدة",
          sender_name: b.senderName || "",
          sender_role: b.senderRole || "",
          created_at_label: b.createdAt || "",
          target_type: b.targetType || "all",
          recipient_ids: b.recipientIds || [],
          acknowledged_by: b.acknowledgedBy || {}
        }));
        await fetch(`${restBase}/madyan_bulletins`, {
          method: "POST",
          headers: dbHeaders,
          body: JSON.stringify(bulletinRows)
        }).catch(() => {});
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true, savedAt: new Date().toISOString() })
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: `Unknown endpoint: ${path}` })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: String(err.message || err) })
    };
  }
}
