# إعداد بيئة التطوير

## المتطلبات

- Node.js ^20.19.0 أو ^22.12.0 أو >=24.0.0.
- npm حديث متوافق مع lockfile.
- PostgreSQL 14+ لعمليات التشغيل التي تتصل بقاعدة البيانات.

## التثبيت

1. استنسخ المستودع.
2. نفّذ npm ci لتثبيت الاعتماديات من lockfile.
3. انسخ .env.example إلى .env.
4. ضع عنوان PostgreSQL صالحاً في DATABASE_URL.
5. أنشئ قيمة عشوائية قوية لا تقل عن 32 محرفاً لـ OWNER_API_TOKEN، واحفظها في البيئة الخادمية فقط.
6. نفّذ npm run db:generate.
7. عند إنشاء قاعدة البيانات لأول مرة، نفّذ npx prisma migrate dev --name init.
8. شغّل npm run dev.

لا ترفع .env إلى Git. لا تستخدم قيمة المثال كمفتاح حقيقي.

## أوامر التطوير

- npm run dev — خادم التطوير.
- npm run lint — Biome.
- npm test — اختبارات وحدات Vitest.
- npm run test:watch — وضع مراقبة الاختبارات.
- npm run typecheck — فحص TypeScript.
- npm run build — بناء الإنتاج.
- npm run db:generate — توليد Prisma Client.
- npm run db:migrate -- --name descriptive_change — إنشاء/تطبيق migration تطويرية.
- npm run db:push — مزامنة schema دون migration؛ للتجارب المحلية فقط.
- npm run db:studio — Prisma Studio.

## Prisma 7

يُدار اتصال Prisma CLI عبر prisma.config.ts. ويُستخدم PostgreSQL driver adapter في src/lib/prisma.ts. يجب توليد العميل قبل typecheck أو build.

## قاعدة البيانات

لا توجد migration أولية ملتزمة بالمستودع حتى الآن. يجب إنشاء migration ومراجعتها في بيئة تطوير متصلة بقاعدة PostgreSQL مخصصة. لا تشغّل db:push على الإنتاج، ولا تطبق migration إنتاجية دون backup وخطة rollback.

## متغيرات البيئة

- DATABASE_URL: اتصال PostgreSQL.
- OWNER_API_TOKEN: مفتاح إدارة مؤقت للـ API، لا يقل عن 32 محرفاً.
- APP_URL: عنوان التطبيق؛ محجوز للاستخدام عند إضافة روابط callback والتكاملات.

## CI

يستخدم GitHub Actions قيمة DATABASE_URL وهمية للتوليد والبناء فقط؛ لا يفتح اتصالاً بقاعدة بيانات. لذلك نجاح CI لا يثبت اتصال قاعدة البيانات أو نجاح migrations.
