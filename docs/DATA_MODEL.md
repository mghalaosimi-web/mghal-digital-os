# نموذج البيانات: الموجود والفجوات

## الحالة الحالية

يوجد مخطط Prisma فعلي في prisma/schema.prisma لمزود PostgreSQL. لم يتم إنشاء أو تطبيق أول migration على قاعدة بيانات فعلية أثناء هذه المرحلة لعدم توفر DATABASE_URL لقاعدة بيانات مخصصة. لذلك لا تساوي عبارة "schema موجود" عبارة "قاعدة البيانات منشورة وجاهزة".

## النماذج المنفذة في Prisma

- **User:** سجل مستخدم أساسي وبريد فريد واسم اختياري. لا يحتوي حالياً كلمة مرور أو موفر هوية أو جلسات.
- **Workspace:** مساحة عمل باسم وslug فريد.
- **Membership:** ربط User وWorkspace مع role نصي افتراضي OWNER. لا توجد بعد قيود RBAC متكاملة أو سياسة تفويض مستخدمة من API.
- **Project:** مشروع مرتبط بمساحة عمل، حالة وتواريخ وفهرسة.
- **Task:** مهمة مرتبطة بمشروع، حالة وأولوية وتاريخ استحقاق.
- **KnowledgeItem:** ملاحظة/رابط/مستند/مرجع مع محتوى ووسوم.
- **ContentItem:** محتوى أساسي وحالة وقناة وموعد نشر اختياري. وجود حالة PUBLISHED لا يعني أن المنظومة نشرت المحتوى فعلياً.
- **AuditEvent:** سجل نشاط مرتبط بمساحة عمل.

## العلاقات والقيود الحالية

- Workspace يمتلك Projects وKnowledgeItems وContentItems وAuditEvents.
- Project يمتلك Tasks.
- User يرتبط بـ Workspace عبر Membership.
- توجد فهارس على Workspace/status وتواريخ التحديث والاستحقاق.
- عمليات الكتابة المدعومة تربط تعديل السجل وAuditEvent بمعاملة Prisma واحدة.

## فجوات النموذج

لم تُنفذ بعد نماذج مستقلة لـ:
- IdentityProfile وBrandVoice وAssets.
- ContentVariant وChannelConnection وApproval.
- TaskDependency وComments وAttachments.
- KnowledgeSource وKnowledgeChunk وEmbeddings.
- Automation وAutomationRun وAutomationStepRun.
- AIInvocation وProviderConfiguration.
- Secret references وIntegration health.
- Notification وAnalyticsEvent.

## قواعد التطوير

1. كل سجل تابع لمساحة عمل يجب أن يحمل workspaceId أو يصل إليها بعلاقة قابلة للتحقق.
2. لا تعتمد على قيمة workspaceId يرسلها العميل كدليل صلاحية؛ يجب التحقق من العضوية/الدور خادمياً.
3. لا تخزن مفاتيح التكامل أو كلمات المرور في جداول إعدادات عامة.
4. استخدم UTC للتواريخ، ووضح المنطقة الزمنية عند العرض والجدولة.
5. أضف migrations مراجعة ومفهرسة بدلاً من db push في بيئة الإنتاج.
6. عرّف سياسة الحذف والاحتفاظ والنسخ الاحتياطي قبل تخزين بيانات تشغيلية مهمة.
7. أضف اختبارات migration واختبارات عزل بين مساحات العمل قبل الإطلاق.
