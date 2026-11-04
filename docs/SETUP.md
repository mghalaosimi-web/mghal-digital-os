# إعداد بيئة التطوير والنشر

## المتطلبات
- Node.js 22.x (المحدد في `package.json`).
- PostgreSQL 14 أو أحدث.
- npm.

## التثبيت المحلي
1. انسخ المستودع.
2. نفذ `npm install`.
3. انسخ `.env.example` إلى `.env.local`.
4. اضبط `DATABASE_URL` لقاعدة PostgreSQL محلية أو مخصصة للتطوير.
5. أنشئ مفتاحاً عشوائياً قوياً لـ `OWNER_API_TOKEN` بطول لا يقل عن 32 حرفاً. خزّنه في البيئة الخادمية فقط.
6. نفذ `npm run db:generate`.
7. طبّق migrations على قاعدة التطوير عبر `npm run db:deploy`.
8. شغّل `npm run dev`.

## متغيرات البيئة
| المتغير | مطلوب | الاستخدام |
|---|---|---|
| `DATABASE_URL` | نعم | PostgreSQL connection string |
| `OWNER_API_TOKEN` | نعم | مفتاح دخول المالك، 32–512 حرفاً |
| `OPENAI_API_KEY` | لا | مفتاح OpenAI server-side لتوليد مسودات المحتوى |
| `OPENAI_MODEL` | لا | اسم النموذج المسموح به في حساب OpenAI |

لا تستخدم بادئة `NEXT_PUBLIC_` مع أي سر. لا تضع القيم الحقيقية في GitHub أو سجلات البناء أو المحادثات.

## أوامر مفيدة
- `npm run dev` — خادم التطوير.
- `npm run typecheck` — فحص TypeScript.
- `npm run build` — بناء الإنتاج.
- `npm run db:generate` — توليد Prisma Client.
- `npm run db:deploy` — تطبيق migrations الملتزمة.
- `npm run db:status` — عرض حالة migrations.
- `npm run db:migrate` — إنشاء migration جديدة أثناء التطوير.
- `npm run db:push` — مزامنة schema دون migration؛ للتطوير المحلي فقط.
- `npm run db:studio` — واجهة Prisma Studio.

## النشر على Render
الخدمة الحالية هي Web Service باسم `mghal-digital-os` على فرع `main` وفي منطقة Singapore.

- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npm start`
- Runtime: Node.js 22.
- Environment variables: أضف `DATABASE_URL` و`OWNER_API_TOKEN` من لوحة Render كقيم سرية.

ميزة إنشاء مسودات الذكاء الاصطناعي اختيارية؛ لتفعيلها أضف `OPENAI_API_KEY` و`OPENAI_MODEL` كمتغيرين سريين/إعدادين خادميين في Render. لا تضع المفتاح في الواجهة أو `NEXT_PUBLIC_*`. endpoint هو `/api/ai/generate` ولا ينشر المحتوى تلقائياً؛ كل ناتج يحتاج مراجعة واعتماداً بشرياً.

بعد تغيير متغيرات البيئة احفظ التغييرات وانتظر اكتمال إعادة النشر. لا تعتبر حالة Deploy = Live دليلاً كافياً على اتصال قاعدة البيانات أو نجاح تسجيل الدخول.

## فحوص ما بعد النشر
1. افتح `/api/health` للتأكد من أن عملية التطبيق تستجيب.
2. افتح `/api/ready`؛ يجب أن يرجع HTTP 200 و`database: reachable`. إذا أعاد 503 فتحقق من `DATABASE_URL` واتصال Neon.
3. اختبر تسجيل الدخول باستخدام المفتاح نفسه المحفوظ في `OWNER_API_TOKEN`. خطأ 401 يعني عدم تطابق المفتاح، و503 يعني أن إعداد المصادقة غير مكتمل.
4. بعد الدخول اختبر إنشاء مساحة عمل ومشروع ومهمة وعنصر معرفة ومحتوى، ثم اختبر التعديل والحذف.
5. راجع سجلات Render عند ظهور أخطاء، ولا تضف قيم الأسرار إلى السجلات.

## قاعدة البيانات والإصدارات
قاعدة PostgreSQL الأساسية أُنشئت على Neon، وطُبّق عليها المخطط الأولي سابقاً. لا نفترض أن Render متصل بها حتى ينجح `/api/ready` من عنوان Render نفسه.

لا تشغّل `db:push` على الإنتاج. اعتمد migrations مراجعة، وخذ نسخة احتياطية قبل أي ترقية. نفّذ `npm run db:deploy` على بيئة الإنتاج عبر خطوة تشغيل آمنة ومقصودة بعد التأكد من `DATABASE_URL`، ولا تضع ترحيلات schema في خطوة build إذا كانت قد تتكرر أو تتزامن.

## حدود الجاهزية
المصادقة الحالية بوابة مالك واحدة تعتمد `OWNER_API_TOKEN` وجلسة موقعة. ليست نظام حسابات متعددة ولا توفر عضويات وأدواراً مستقلة. وحدات المشاريع والمهام والمعرفة والمحتوى هي إدارة أولية؛ تمت إضافة نقطة تكامل أولية لتوليد مسودات المحتوى عبر OpenAI عند ضبط متغيرات البيئة، لكنها ليست نظام وكلاء أو أتمتة. أما النشر الاجتماعي الفعلي ومحرك الأتمتة والموصلات ومساعدو الذكاء الاصطناعي المتخصصون والمراقبة والنسخ الاحتياطي واختبارات E2E فما زالت أعمالاً مطلوبة قبل الإطلاق العام.

## Login protection

Production login attempts are rate-limited to 8 attempts per IP per 15 minutes using Upstash Redis. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the deployment environment. Local development remains usable without Redis, but should not be exposed publicly without configuring the limiter. The readiness endpoint checks the database and owner-token configuration without exposing secret values.
