// ============================================================================
// MADYAN CLOUD ENGINE - SUPABASE + NETLIFY SERVERLESS SYNC CLIENT
// ============================================================================
// يدير هذا الملف الاتصال المباشر بقاعدة بيانات Supabase PostgreSQL
// أو عبر Netlify Serverless Functions (/api/state & /api/config)
// مع دعم التحديث اللحظي (Supabase Realtime) لجميع الأجهزة المتصلة.

export const CLOUD_CONFIG_STORAGE_KEY = "MADYAN_SUPABASE_CLOUD_CONFIG_V1";

export function getSavedCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return parsed;
      }
    }
  } catch (e) {}
  return { supabaseUrl: "", supabaseAnonKey: "" };
}

export function saveCloudConfig(supabaseUrl, supabaseAnonKey) {
  const clean = {
    supabaseUrl: (supabaseUrl || "").trim().replace(/\/$/, ""),
    supabaseAnonKey: (supabaseAnonKey || "").trim()
  };
  localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(clean));
  return clean;
}
