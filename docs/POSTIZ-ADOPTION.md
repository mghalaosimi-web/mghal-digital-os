# اعتماد ودمج مصدر Postiz

## المصدر المثبّت والمراجَع

- مستودع المصدر: https://github.com/mghalaosimi-web/mghal-digital-automation
- المسار في هذا المستودع: `integrations/postiz` (Git submodule).
- Commit المثبّت: `e94383568f7549c373a985f4521021c4353e1a37`.
- شجرة المصدر: `c5d1e7a5387ccf8c3680dd2d4401c781dc2df5fa`.
- نتيجة الفحص: 1,181 مدخلاً في شجرة Git recursive، دون اقتطاع.
- الترخيص: GNU AGPL-3.0، مع وجود ملف `LICENSE` الأصلي وملف `.env.example`.
- البنية: pnpm monorepo يضم Next.js frontend وNestJS backend وPrisma/PostgreSQL وTemporal وbrowser extension.

## تدقيق الاعتماد المتداخل

ملف `.gitmodules` في المستودع المصدر يعلن مسار `libraries/plugins/src/list/public-api` بعنوان SSH هو `git@github.com:gitroomhq/public-api.git`. لكن شجرة Git للـ commit المثبّت نفسه لا تحتوي هذا المسار ولا أي gitlink بنمط `160000`. لذلك يبدو التصريح قديماً أو غير مستخدم في هذه النسخة، وليس اعتماداً فرعياً تم تضمينه فعلياً. أعد الفحص عند تحديث commit المصدر. لا تحفظ مفاتيح SSH أو بيانات اعتماد في المستودع.

## الحصول على المصدر

```bash
git clone --recurse-submodules https://github.com/mghalaosimi-web/mghal-digital-os.git
```

أو بعد استنساخ المستودع الرئيسي:

```bash
git submodule update --init --recursive
```

## حدود التشغيل والدمج

MGHAL Digital OS هو التطبيق المركزي المنشور حالياً. Postiz تطبيق مستقل متعدد الخدمات وليس مكتبة Next.js قابلة للاستيراد مباشرة. حزمة Docker Compose الخاصة به تضم التطبيق وقاعدة PostgreSQL وRedis وTemporal وقاعدة Temporal وElasticsearch وخدمات مساندة. ويتطلب Node/pnpm وقاعدة بيانات ومخططاً منفصلين وواجهتي frontend/backend ومحرك orchestration وتخزيناً دائماً وإعدادات مزودي الخدمة.

لا تشغّل `prisma-db-push` أو أوامر reset الخاصة بـ Postiz على قاعدة MGHAL الإنتاجية، ولا تستبدل أوامر البناء والتشغيل الحالية في Render بأوامر Postiz. ملف `.env.example` قالب إعداد فقط؛ وجوده لا يعني إعداد Cloudflare R2 أو OAuth أو AI أو الدفع أو البريد أو أي مزود آخر. يجب أن يبقى نشر MGHAL مستقلاً حتى إعداد تصميم تشغيل منفصل واختباره. استيراد المصدر لا يمنح موافقة على خدمة مدفوعة أو مورد جديد مدفوع.

## الترخيص والامتثال

يجب إبقاء إشعارات حقوق النشر وملف AGPL-3.0 كما هي. عند تعديل نسخة Postiz وتشغيلها كخدمة عبر الشبكة، تنطبق متطلبات AGPL-3.0 المتعلقة بإتاحة المصدر المقابل للنسخة المعدلة لمستخدميها. احتفظ بتغييرات Postiz في سجل مصدره المستقل ولا تحدّث commit المثبّت إلا بعد مراجعة التغيير واعتماده.

هذه ملاحظات هندسية وليست استشارة قانونية.
