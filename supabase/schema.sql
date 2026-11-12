-- ============================================================================
-- MAYDAN PLATFORM - ZERO-KNOWLEDGE E2EE SUPABASE SCHEMA
-- ============================================================================
-- قم بتشغيل هذا الملف في Supabase -> SQL Editor -> New Query -> Run
-- يقوم هذا المخطط بحذف أي جداول نصية قديمة والاحتفاظ فقط بجدول الخزينة المشفرة
-- (madyan_app_state) حيث يتم تخزين الصف المشفر (id = 'live_vault') بصيغة AES-256-GCM.

-- 1. إزالة الجداول النصية القديمة المكشوفة إن وجدت
DROP TABLE IF EXISTS public.madyan_users CASCADE;
DROP TABLE IF EXISTS public.madyan_bulletins CASCADE;
DROP TABLE IF EXISTS public.madyan_curriculums CASCADE;

-- 2. جدول الخزينة المشفرة من الطرف للطرف (Zero-Knowledge Encrypted Vault)
CREATE TABLE IF NOT EXISTS public.madyan_app_state (
  id TEXT PRIMARY KEY DEFAULT 'live_vault',
  state_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_DATE,
  updated_by TEXT DEFAULT 'vault'
);

-- حذف أي صف قديم غير مشفر
DELETE FROM public.madyan_app_state WHERE id = 'global';

-- 3. تفعيل الصلاحيات (Row Level Security)
ALTER TABLE public.madyan_app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write on madyan_app_state" ON public.madyan_app_state;
CREATE POLICY "Allow public read/write on madyan_app_state"
  ON public.madyan_app_state FOR ALL
  USING (id = 'live_vault')
  WITH CHECK (
    id = 'live_vault'
    AND (state_data->>'__e2ee') = 'maydan_v1'
  );

-- 4. تفعيل التحديث اللحظي للخزينة المشفرة (Supabase Realtime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'madyan_app_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.madyan_app_state;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
