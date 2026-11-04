# إعداد بيئة التطوير والنشر

## المتطلبات
- Node.js 22.x.
- PostgreSQL 14 أو أحدث.
- npm.

## التثبيت المحلي
1. انسخ المستودع.
2. نفذ `npm install`.
3. انسخ `.env.example` إلى `.env.local`.
4. اضبط `DATABASE_URL` لقاعدة PostgreSQL محلية أو مخصصة للتطوير.
5. اضبط `OWNER_API_TOKEN` بقيمة عشوائية آمنة طولها 32–512 حرفاً، واحفظها في مدير أسرار محلي.
6. اضبط متغيرات Upstash في بيئة الإنتاج؛ التطوير المحلي يمكن أن يعمل دون Redis.
7. نفذ `npm run db:generate` ثم `npm run db:deploy` على قاعدة التطوير.
8. شغّل `npm run dev`.

## متغيرات البيئة

| المتغير | مطلوب | الاستخدام |
|---|---|---|
| `DATABASE_URL` | نعم | PostgreSQL connection string |
| `OWNER_API_TOKEN` | نعم | مفتاح دخول المالك، 32–512 حرفاً |
| `UPSTASH_REDIS_REST_URL` | نعم في الإنتاج | عنوان Redis REST لتحديد محاولات الدخول |
| `UPSTASH_REDIS_REST_TOKEN` | نعم في الإنتاج | رمز Redis REST |
| `AI_API_KEY` أو `OPENAI_API_KEY` | لا | مفتاح مزود AI server-side |
| `AI_MODEL` أو `OPENAI_MODEL` | لا | اسم النموذج |
| `AI_BASE_URL` | لا | عنوان API متوافق مع OpenAI؛ الافتراضي OpenAI |

لا تستخدم بادئة `NEXT_PUBLIC_` مع أي سر. لا تضع القيم الحقيقية في GitHub أو سجلات البناء أو المحادثات.

## أوامر مفيدة
- `npm run dev` — خادم التطوير.
- `npm run typecheck` — فحص TypeScript.
- `npm test` — اختبارات الوحدات.
- `npm run build` — بناء الإنتاج.
- `npx prisma validate` — التحقق من Prisma schema.
- `npm run db:generate` — توليد Prisma Client.
- `npm run db:deploy` — تطبيق migrations الملتزمة.
- `npm run db:status` — عرض حالة migrations.
- `npm run db:migrate` — إنشاء migration جديدة أثناء التطوير.
- `npm run db:push` — مزامنة schema دون migration؛ للتطوير المحلي فقط.
- `npm run db:studio` — واجهة Prisma Studio.

## النشر على Render
الخدمة الحالية Web Service باسم `mghal-digital-os` على فرع `main` وفي منطقة Singapore، وتعمل على الخطة المجانية.

- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npm start`
- Runtime: Node.js 22.
- أضف متغيرات البيئة المطلوبة من لوحة Render كقيم سرية.
- لا تضف خطوة ترحيل تلقائية إلى أمر البناء. راجع migration وخذ نسخة احتياطية قبل أي تغيير إنتاجي.

## فحوص ما بعد النشر
1. `GET /api/health` يتحقق من استجابة العملية.
2. `GET /api/ready` يجب أن يرجع HTTP 200 عندما تكون قاعدة البيانات وRedis قابلتين للوصول ومفتاح المالك مضبوطاً.
3. اختبر تسجيل الدخول بالمفتاح نفسه المخزن في `OWNER_API_TOKEN`. خطأ 401 يعني عدم تطابق القيمة، و503 يعني إعداداً ناقصاً أو تعذر خدمة الحماية.
4. بعد الدخول اختبر إنشاء مساحة عمل ومشروع ومهمة وعنصر معرفة ومحتوى، ثم التعديل والحذف.
5. راجع سجلات Render عند ظهور أخطاء، ولا تضف الأسرار إلى السجلات.

## قاعدة البيانات والإصدارات
قاعدة الإنتاج PostgreSQL على Neon. يتضمن المستودع migrations الأولية ومigration الإضافية لحقول المصادقة وجداول الجلسات والدعوات؛ migration الإضافية طُبقت مسبقاً على فرع الإنتاج ثم سُجلت في تاريخ Prisma.

لا تشغّل `db:push` على الإنتاج. اعتمد migrations مراجعة، وخذ نسخة احتياطية قبل أي ترقية. استخدم `npm run db:deploy` فقط في خطوة تشغيل مقصودة بعد التحقق من `DATABASE_URL` وحالة migration.

## حدود الجاهزية
المصادقة الحالية بوابة مالك واحدة تعتمد `OWNER_API_TOKEN` وجلسة موقعة؛ ليست نظام حسابات متعددة ولا توفر عضويات وأدواراً مستقلة. جداول `UserSession` و`WorkspaceInvitation` جاهزة في المخطط، لكن تدفقات التسجيل وإدارة الجلسات والدعوات لم تُنفذ بعد. AI ينشئ مسودات فقط ولا ينشر المحتوى. الجدولة تحفظ المواعيد وتعرضها في التقويم، لكنها لا تشغل ناشراً خلفياً. النشر الاجتماعي الفعلي، تخزين الملفات الدائم، workers، النسخ الاحتياطي، المراقبة واختبارات E2E ما زالت أعمالاً مفتوحة.

## Login protection
Production login attempts are rate-limited to 8 attempts per IP per 15 minutes using Upstash Redis. The readiness endpoint performs live database and Redis checks without exposing secret values.
