# MGHAL Digital OS

منظومة تشغيل رقمية شخصية لإدارة المشاريع والمهام والمعرفة والمحتوى وسير العمل، مع أساس قابل للتوسع للمساعدين الذكيين والأتمتة.

> **الحالة الحالية:** تطبيق فعلي منشور على Render، بواجهة عربية RTL، وواجهات CRUD متصلة بـ PostgreSQL عبر Prisma، ومصادقة مالك، وتحديد محاولات الدخول عبر Upstash Redis، وسجل تدقيق، وتقويم تحريري، وتوليد مسودات عبر مزود متوافق مع OpenAI. ما زالت المنظومة في مرحلة البناء؛ لا تُعد المصادقة متعددة المستخدمين أو النشر الاجتماعي أو العمال الخلفيون ميزات مكتملة.

## الوصول والبيئة

- التطبيق: https://mghal-digital-os.onrender.com
- المستودع: https://github.com/mghalaosimi-web/mghal-digital-os
- الاستضافة: Render Web Service — Free
- قاعدة البيانات: Neon PostgreSQL
- تحديد معدل محاولات الدخول: Upstash Redis
- المنطقة: Singapore

## ما يعمل حالياً

- إدارة مساحات العمل والمشاريع والمهام.
- إدارة عناصر المعرفة مع البحث والتعديل والحذف.
- إدارة المحتوى وحالات دورة العمل، مع تاريخ جدولة وتقويم تحريري.
- لوحة ملخص للمساحة ومؤشرات الأداء والنشاط الأخير.
- سجل تدقيق للعمليات المدعومة.
- تصدير بيانات مساحة العمل بصيغة JSON ضمن حدود حجم معلنة.
- بوابة دخول للمالك باستخدام `OWNER_API_TOKEN` محفوظ على الخادم فقط، مع Cookie جلسة HttpOnly وموقعة.
- حماية تسجيل الدخول بتحديد المعدل عبر Redis.
- نقطة توليد مسودات AI عبر واجهة OpenAI-compatible، ولا تنشر المحتوى تلقائياً.
- فحوص CI: تدقيق التبعيات، Prisma validate/generate، اختبارات وحدات، TypeScript، وبناء إنتاجي.

## التقنية

- Next.js 16 App Router
- React 19 وTypeScript
- Prisma 6 وPostgreSQL
- Zod للتحقق من المدخلات
- Upstash Redis وRatelimit
- GitHub Actions للتحقق المستمر

## مصدر Postiz المدمج

المصدر الكامل لمشروع Postiz محفوظ في `integrations/postiz` كـ Git submodule مثبت على commit محدد، مع ملف AGPL-3.0 وإشعاراته. للحصول على المصدر عند الاستنساخ:

```bash
git clone --recurse-submodules https://github.com/mghalaosimi-web/mghal-digital-os.git
```

راجع [دليل دمج مصدر Postiz](docs/POSTIZ-SOURCE-INTEGRATION.md) و[قرار الاعتماد والترخيص](docs/POSTIZ-ADOPTION.md). وجود المصدر لا يعني تشغيل خدمات Postiz أو تفعيل النشر الاجتماعي في تطبيق MGHAL الحالي.

## إعداد البيئة

انسخ `.env.example` إلى `.env` محلياً، ثم اضبط القيم المناسبة:

| المتغير | الاستخدام |
| --- | --- |
| `DATABASE_URL` | اتصال PostgreSQL |
| `OWNER_API_TOKEN` | مفتاح المالك، من 32 إلى 512 حرفاً |
| `UPSTASH_REDIS_REST_URL` | عنوان Redis REST |
| `UPSTASH_REDIS_REST_TOKEN` | رمز Redis REST |
| `AI_API_KEY` أو `OPENAI_API_KEY` | مفتاح مزود AI اختيارياً |
| `AI_MODEL` أو `OPENAI_MODEL` | اسم النموذج |
| `AI_BASE_URL` | عنوان API متوافق مع OpenAI؛ الافتراضي OpenAI |

لا تضع أي سر في متغير يبدأ بـ `NEXT_PUBLIC_` أو في Git أو في المحادثات. لا ترسل `OWNER_API_TOKEN` إلى أي طرف.

## التطوير المحلي

يتطلب Node.js 22 وPostgreSQL ومتغيرات البيئة:

```bash
npm install
npx prisma generate
npm run dev
```

أوامر التحقق:

```bash
npm run typecheck
npm test
npm run build
npx prisma validate
```

## حدود المنتج الحالية

- الدخول الحالي للمالك فقط؛ جداول UserSession وWorkspaceInvitation موجودة في قاعدة البيانات وممثلة في Prisma، لكن تدفق التسجيل وتسجيل الدخول متعدد المستخدمين وإدارة الدعوات لم يُنفذ بعد.
- يجب إضافة فحوص عضوية Workspace وRBAC قبل تفعيل حسابات متعددة.
- AI ينشئ مسودة فقط. لا يوجد نشر تلقائي أو ربط اجتماعي فعّال حتى الآن.
- نسخ القنوات الاجتماعية: الكود وواجهات API موجودة، لكن جدول `ContentVariant` غير مطبق في قاعدة الإنتاج حالياً؛ لذلك تبقى هذه الميزة غير متاحة حتى اكتمال ترحيل قاعدة البيانات المعتمد. ترجع الواجهات `503` واضحاً بدلاً من الفشل الداخلي.
- الجدولة تحفظ المواعيد وتعرضها في التقويم، لكنها لا تشغل ناشراً خلفياً.
- تخزين الملفات الدائم، queue/worker، الموافقات، اختبارات E2E، النسخ الاحتياطي واختبار الاستعادة ما زالت أعمالاً مفتوحة.
- لا توجد خدمة مدفوعة جديدة ضمن الخطة الحالية؛ لا تفعّل أي إضافة مدفوعة دون موافقة مستقلة.

## التوثيق

- [نطاق المنتج](docs/PRODUCT.md)
- [المعمارية](docs/ARCHITECTURE.md)
- [نموذج البيانات](docs/DATA_MODEL.md)
- [الأمن والخصوصية](docs/SECURITY.md)
- [خارطة الطريق](docs/ROADMAP.md)
- [دليل الإعداد](docs/SETUP.md)
- [مرجع API](docs/API.md)
- [دليل تشغيل الإنتاج](docs/PRODUCTION-RUNBOOK.md)
- [دليل دمج مصدر Postiz](docs/POSTIZ-SOURCE-INTEGRATION.md)
- [قرار اعتماد Postiz والترخيص](docs/POSTIZ-ADOPTION.md)

## الترخيص

تطبيق MGHAL الأصلي لم يُحدد ترخيصه بعد. مصدر Postiz داخل `integrations/postiz` مستقل ومرخّص تحت AGPL-3.0؛ راجع إشعاراته وملف LICENSE داخله.
