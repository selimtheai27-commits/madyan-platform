// ============================================================================
// MADYAN CLOUD ENGINE - SUPABASE + NETLIFY SERVERLESS SYNC CLIENT
// ============================================================================
// يدير هذا الملف الاتصال المباشر بقاعدة بيانات Supabase PostgreSQL
// أو عبر Netlify Serverless Functions (/api/state & /api/config)
// مع دعم التحديث اللحظي (Supabase Realtime) لجميع الأجهزة المتصلة.

export const CLOUD_CONFIG_STORAGE_KEY = "MADYAN_SUPABASE_CLOUD_CONFIG_V1";

function isValidHttpsUrl(rawUrl) {
  try {
    const u = new URL(String(rawUrl || "").trim());
    return u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

export function getSavedCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw, (k, v) => (k === "__proto__" || k === "constructor" || k === "prototype") ? undefined : v);
      if (parsed && isValidHttpsUrl(parsed.supabaseUrl) && typeof parsed.supabaseAnonKey === "string" && parsed.supabaseAnonKey.trim()) {
        return parsed;
      }
    }
  } catch (e) {}
  return { supabaseUrl: "", supabaseAnonKey: "" };
}

export function saveCloudConfig(supabaseUrl, supabaseAnonKey) {
  const cleanUrl = (supabaseUrl || "").trim().replace(/\/$/, "");
  const clean = {
    supabaseUrl: isValidHttpsUrl(cleanUrl) ? cleanUrl : "",
    supabaseAnonKey: (supabaseAnonKey || "").trim()
  };
  localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(clean));
  return clean;
}
