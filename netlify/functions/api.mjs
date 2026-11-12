// ============================================================================
// MADYAN ZERO-KNOWLEDGE E2EE SERVERLESS API (Netlify Functions + Supabase)
// ============================================================================
// لا يخزن الخادم أي بيانات نصية أو جداول مستخدمين مكشوفة، بل يتعامل حصراً مع
// الخزينة المشفرة من الطرف للطرف (id = 'live_vault' و __e2ee = 'maydan_v1').

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

const coarseUtcIso = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
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

  const safeJsonParse = (str) =>
    JSON.parse(str, (k, v) =>
      k === "__proto__" || k === "constructor" || k === "prototype" ? undefined : v
    );

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
        message: "لم يتم ضبط متغيرات البيئة السحابية بعد."
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
    // 2. GET /api/state -> قراءة الخزينة المشفرة فقط (id = live_vault)
    if (event.httpMethod === "GET" && path === "state") {
      const res = await fetch(`${restBase}/madyan_app_state?id=eq.live_vault&select=id,state_data,updated_at`, {
        method: "GET",
        headers: dbHeaders
      });

      if (!res.ok) {
        return {
          statusCode: res.status,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: "State fetch error" })
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

    // 3. POST /api/state -> حفظ الخزينة المشفرة حصراً (يرفض أي بيانات غير مشفرة)
    if (event.httpMethod === "POST" && path === "state") {
      const body = safeJsonParse(event.body || "{}");
      const stateData = body.state;

      if (!stateData || typeof stateData !== "object" || stateData.__e2ee !== "maydan_v1" || typeof stateData.ct !== "string") {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            ok: false,
            error: "Refused: Only Zero-Knowledge E2EE vault payloads (__e2ee = maydan_v1) are permitted."
          })
        };
      }

      const upsertRes = await fetch(`${restBase}/madyan_app_state`, {
        method: "POST",
        headers: dbHeaders,
        body: JSON.stringify({
          id: "live_vault",
          state_data: stateData,
          updated_at: coarseUtcIso(),
          updated_by: "vault"
        })
      });

      if (!upsertRes.ok) {
        return {
          statusCode: upsertRes.status,
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: false, error: "Vault write error" })
        };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true, savedAt: coarseUtcIso() })
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: "Not found" })
    };
  } catch {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: "Internal server error" })
    };
  }
}
