-- ============================================================================
-- MADYAN PLATFORM - SUPABASE POSTGRESQL SCHEMA + VIDEO STORAGE BUCKET
-- ============================================================================
-- قم بنسخ هذا الملف وتشغيله مرة واحدة في Supabase -> SQL Editor -> New Query -> Run

-- 1. الجدول الرئيسي لمزامنة حالة المنصة بالكامل (JSONB Atomic + Realtime Sync)
CREATE TABLE IF NOT EXISTS public.madyan_app_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  state_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system'
);

-- 2. جدول المستخدمين والكوادر (Relational Mirror for SQL Queries & Auth)
CREATE TABLE IF NOT EXISTS public.madyan_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('admin', 'executive', 'cadre')),
  name TEXT NOT NULL,
  job_title TEXT,
  unit TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  joined_at BIGINT,
  default_schedule JSONB DEFAULT '{"meetDay": 2, "meetTime": "19:00", "meetDuration": 90}'::jsonb,
  week_overrides JSONB DEFAULT '{}'::jsonb,
  tasks_record JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. جدول النشرة الإدارية والتعميمات (One-Way Administrative Bulletins)
CREATE TABLE IF NOT EXISTS public.madyan_bulletins (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'سياسة جديدة',
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  created_at_label TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'custom')),
  recipient_ids JSONB DEFAULT '[]'::jsonb,
  acknowledged_by JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. جدول المحاضرات والاختبارات الأسبوعية (Weekly Curriculums)
CREATE TABLE IF NOT EXISTS public.madyan_curriculums (
  week_key TEXT PRIMARY KEY,
  lecture_title TEXT NOT NULL,
  lecture_desc TEXT,
  video_type TEXT NOT NULL DEFAULT 'mp4',
  video_url TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. تفعيل الصلاحيات (Row Level Security) للسماح بالقراءة والكتابة عبر مفتاح المنصة
ALTER TABLE public.madyan_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madyan_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madyan_bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madyan_curriculums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write on madyan_app_state" ON public.madyan_app_state;
CREATE POLICY "Allow public read/write on madyan_app_state"
  ON public.madyan_app_state FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on madyan_users" ON public.madyan_users;
CREATE POLICY "Allow public read/write on madyan_users"
  ON public.madyan_users FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on madyan_bulletins" ON public.madyan_bulletins;
CREATE POLICY "Allow public read/write on madyan_bulletins"
  ON public.madyan_bulletins FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on madyan_curriculums" ON public.madyan_curriculums;
CREATE POLICY "Allow public read/write on madyan_curriculums"
  ON public.madyan_curriculums FOR ALL
  USING (true) WITH CHECK (true);

-- 6. إنشاء حاوية تخزين الفيديوهات والملفات (Supabase Storage Bucket: madyan-media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('madyan-media', 'madyan-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public read on madyan-media" ON storage.objects;
CREATE POLICY "Allow public read on madyan-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'madyan-media');

DROP POLICY IF EXISTS "Allow public upload on madyan-media" ON storage.objects;
CREATE POLICY "Allow public upload on madyan-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'madyan-media');

DROP POLICY IF EXISTS "Allow public update on madyan-media" ON storage.objects;
CREATE POLICY "Allow public update on madyan-media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'madyan-media');

-- 7. تفعيل التحديث اللحظي (Supabase Realtime)
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
