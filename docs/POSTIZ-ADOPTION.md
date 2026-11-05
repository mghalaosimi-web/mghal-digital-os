# اعتماد ودمج مصدر Postiz

## المصدر المثبّت والمراجَع

- مستودع المصدر: https://github.com/mghalaosimi-web/mghal-digital-automation
- المسار في هذا المستودع: `integrations/postiz` (Git submodule).
- Commit المثبّت: `e94383568f7549c373a985f4521021c4353e1a37`.
- شجرة المصدر: `c5d1e7a5387ccf8c3680dd2d4401c781dc2df5fa`.
- نتيجة الفحص: 1,181 مدخلاً في شجرة Git recursive، دون اقتطاع من GitHub.
- الترخيص: GNU AGPL-3.0، مع وجود ملف `LICENSE` الأصلي وملف `.env.example`.
- البنية: pnpm monorepo يضم Next.js frontend وNestJS backend وPrisma/PostgreSQL وTemporal وbrowser extension.

يوجد في ملف `.gitmodules` داخل المصدر تصريح بمكوّن متداخل `libraries/plugins/src/list/public-api` عبر عنوان SSH هو `git@github.com:gitroomhq/public-api.git`. لكن الشجرة المثبّتة التي فُحصت لم تُظهر gitlink لهذا المسار؛ لذلك يجب التحقق من صلاحية الوصول وطريقة checkout لهذا الاعتماد قبل اعتبار بناء Postiz الكامل جاهزاً. لا تضع مفاتيح SSH أو بيانات اعتماد داخل المستودع.

## الحصول على المصدر

```bash
git clone --recurse-submodules https://github.com/mghalaosimi-web/mghal-digital-os.git
```

أو بعد استنساخ المستودع الرئيسي:

```bash
git submodule update --init --recursive
```

إذا فشل الاعتماد المتداخل بسبب عنوان SSH، فتحقق من صلاحية الوصول واضبط محلياً وبشكل آمن تحويل عنوان Git إلى HTTPS عند الحاجة؛ لا تضمّن بيانات الاعتماد داخل الرابط ولا تحفظها في Git.

## حدود التشغيل والدمج

MGHAL Digital OS هو التطبيق المركزي المنشور حالياً. Postiz تطبيق مستقل متعدد الخدمات وليس مكتبة Next.js قابلة للاستيراد مباشرة. يتطلب Node/pnpm وواجهة frontend وخلفية backend وقاعدة PostgreSQL وخدمات Temporal وإعدادات مزودي الخدمة الخاصة به.

ملف `.env.example` في Postiz قالب إعداد فقط. وجوده لا يعني إعداد Cloudflare R2 أو OAuth أو AI أو الدفع أو البريد أو أي مزود آخر. لا تنسخ أسرار أو قيم بيئة الإنتاج بين التطبيقين، ولا تشغّل `prisma-db-push` أو أوامر reset الخاصة بـ Postiz على قاعدة MGHAL الإنتاجية. يجب أن يبقى نشر MGHAL مستقلاً حتى إعداد تصميم نشر منفصل واختباره.

## الترخيص والامتثال

يجب إبقاء إشعارات حقوق النشر وملف AGPL-3.0 كما هي. عند تعديل نسخة Postiz وتشغيلها كخدمة عبر الشبكة، تنطبق متطلبات AGPL-3.0 المتعلقة بإتاحة المصدر المقابل للنسخة المعدلة لمستخدميها. احتفظ بتغييرات Postiz في سجل مصدره المستقل ولا تحدّث commit المثبّت إلا بعد مراجعة التغيير واعتماده.

هذه ملاحظات هندسية وليست استشارة قانونية.
