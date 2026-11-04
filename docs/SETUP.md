# إعداد بيئة التطوير

## المتطلبات
- Node.js 20.9 أو أحدث.
- PostgreSQL 14 أو أحدث.
- npm.

## التثبيت
1. انسخ المستودع.
2. نفذ `npm install`.
3. انسخ `.env.example` إلى `.env.local`.
4. ضع بيانات PostgreSQL في `DATABASE_URL`.
5. أنشئ مفتاحاً عشوائياً قوياً لـ `OWNER_API_TOKEN` وخزنه في البيئة الخادمية فقط.
6. نفذ `npx prisma generate`.
7. نفذ `npx prisma migrate dev --name init`.
8. شغل `npm run dev`.

## أوامر مفيدة
- `npm run dev` — خادم التطوير.
- `npm run typecheck` — فحص TypeScript.
- `npm run build` — بناء الإنتاج.
- `npm run db:generate` — توليد Prisma Client.
- `npm run db:migrate` — تطبيق migrations في التطوير.
- `npm run db:push` — مزامنة schema دون migration؛ للتطوير فقط.
- `npm run db:studio` — واجهة Prisma Studio.

## قاعدة البيانات
أنشئ migrations محلياً بعد توفير PostgreSQL. لا تُشغّل `db:push` على الإنتاج. اعتمد migrations مراجعة ونسخاً احتياطياً قبل أي ترقية.

## حالة المصادقة
حراسة API الحالية تعتمد مفتاح مالك خادمياً وليست نظام حسابات مستخدمين. قبل الإطلاق العام يجب إضافة تسجيل الدخول، إدارة الجلسات، CSRF عند الحاجة، واستحقاقات وصول لكل workspace، ثم إزالة الاعتماد على مفتاح واحد كهوية للمالك.
