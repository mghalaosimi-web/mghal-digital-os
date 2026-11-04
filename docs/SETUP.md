# إعداد بيئة التطوير

## المتطلبات
- Node.js 20.9 أو أحدث (يوصى بـ Node.js 22).
- PostgreSQL 14 أو أحدث.
- npm.

## التثبيت لأول مرة
1. انسخ المستودع.
2. نفذ `npm install`.
3. انسخ `.env.example` إلى `.env.local`.
4. ضع بيانات PostgreSQL في `DATABASE_URL`.
5. أنشئ قيمة عشوائية قوية لا تقل عن 32 حرفاً لـ `OWNER_API_TOKEN` وخزّنها في البيئة الخادمية فقط.
6. نفذ `npm run db:generate`.
7. طبّق migrations الملتزمة بالمستودع عبر `npm run db:deploy`.
8. شغّل `npm run dev`.

## أوامر مفيدة
- `npm run dev` — خادم التطوير.
- `npm run typecheck` — فحص TypeScript.
- `npm run build` — بناء الإنتاج.
- `npm run db:generate` — توليد Prisma Client.
- `npm run db:deploy` — تطبيق migrations الملتزمة (للتجهيز والإنتاج).
- `npm run db:status` — عرض حالة migrations.
- `npm run db:migrate` — إنشاء migration جديدة في التطوير بعد تعديل schema.
- `npm run db:push` — مزامنة schema دون migration؛ للتطوير المحلي فقط.
- `npm run db:studio` — واجهة Prisma Studio.

## قاعدة البيانات
أول migration موجودة في `prisma/migrations` وتطابق نماذج Prisma الحالية. لا تُشغّل `db:push` على الإنتاج. اعتمد migrations مراجعة ونسخاً احتياطياً قبل أي ترقية. لا تعتبر قاعدة البيانات جاهزة قبل نجاح `db:status` و`/api/ready` مع اتصال فعلي.

## حالة المصادقة
حراسة API الحالية تعتمد مفتاح مالك خادمياً وليست نظام حسابات مستخدمين. لا تضع المفتاح في كود المتصفح أو متغيرات NEXT_PUBLIC. قبل الإطلاق العام يجب إضافة تسجيل الدخول، إدارة الجلسات، واستحقاقات وصول لكل workspace، ثم إزالة الاعتماد على مفتاح واحد كهوية للمالك.
