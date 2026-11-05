# Madyan | محرك بناء العادات المؤسسية (Full-Stack Platform)

منصة **Madyan** المتكاملة لبناء ومتابعة العادات المؤسسية الأسبوعية، وإدارة النشرات الإدارية والتعميمات اللحظية، والمحاضرات التفاعلية والاختبارات.

---

## 🏗️ هيكل المشروع (Full-Stack Architecture)

```text
madyan-platform/
├── index.html                  # تطبيق الواجهة الأمامية الكامل (React 18 + Tailwind + Supabase Realtime)
├── netlify.toml                # إعدادات الاستضافة وتوجيه طلبات الـ API إلى Serverless Functions
├── package.json                # تعريف الحزم وأوامر التشغيل
├── netlify/
│   └── functions/
│       └── api.mjs             # الباك-إند السحابي (Serverless Node.js API) المتصل بـ Supabase
├── src/
│   └── config/
│       └── supabaseClient.js   # وحدة إعدادات الاتصال السحابي بـ Supabase
└── supabase/
    └── schema.sql              # هيكل جداول قاعدة البيانات PostgreSQL + الصلاحيات + التحديث اللحظي
```

---

## 🚀 خطوات التفعيل السريع (Supabase + GitHub + Netlify)

### 1️⃣ تهيئة جداول قاعدة البيانات في Supabase
1. افتح لوحة تحكم مشروعك في [Supabase](https://supabase.com/dashboard).
2. من القائمة الجانبية اختر **SQL Editor** ثم اضغط **New Query**.
3. انسخ محتوى ملف [`supabase/schema.sql`](./supabase/schema.sql) بالكامل والصقه ثم اضغط **Run** (أو انسخه مباشرة من زر **"☁️ الربط السحابي Supabase"** داخل المنصة).
4. من **Project Settings -> API** في Supabase، انسخ:
   - `Project URL`
   - `anon public key`

### 2️⃣ ربط المستودع مع Netlify (تشغيل السيرفر والاستضافة مجاناً)
1. افتح حسابك في [Netlify](https://app.netlify.com) واضغط **Add new site -> Import an existing project**.
2. اختر **GitHub** وحدد المستودع: `selimtheai27-commits/madyan-platform`.
3. في إعدادات **Environment variables** داخل Netlify أضف المتغيرين التاليين:
   - `SUPABASE_URL` = رابط مشروعك في Supabase
   - `SUPABASE_ANON_KEY` = مفتاح الـ `anon public` من Supabase
4. اضغط **Deploy site** — سيقوم Netlify برفع الواجهة وتشغيل الـ Serverless API (`/api/state` و `/api/config`) أوتوماتيكياً، وأي تعديل يُرفع على GitHub سيتحدث في الموقع خلال أقل من دقيقة!

> 💡 **ميزة إضافية:** يمكنك أيضاً إدخال `Project URL` و `Anon Key` مباشرةً من داخل واجهة المنصة عبر زر **«☁️ الربط السحابي Supabase»** في شاشة الدخول أو بوابة المدير ليتم الاتصال فوراً ومزامنة البيانات لحظياً بين جميع الأجهزة!
