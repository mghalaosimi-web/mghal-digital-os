# API الأولية

تتطلب المسارات الإدارية جلسة مالك صالحة عبر Cookie موقعة، أو Bearer token من بيئة خادمية موثوقة. لا تضع المفتاح في JavaScript المتصفح أو متغيرات `NEXT_PUBLIC_*` أو تطبيق جوال. الجلسة الحالية مخصصة لمالك واحد فقط وليست مصادقة متعددة المستخدمين.

تستخدم أجسام الإنشاء والتحديث مخططات Zod صارمة؛ تُرفض الحقول غير المعروفة بدلاً من تجاهلها. كما تُحدد أطوال معرّفات الاستعلامات والبحث وأحجام النتائج لتقليل المدخلات غير المنضبطة.

## فحوص الخدمة
- `GET /api/health` — فحص liveness؛ لا يثبت اتصال قاعدة البيانات.
- `GET /api/ready` — فحص readiness؛ ينفذ استعلاماً إلى PostgreSQL ويعيد HTTP 503 عند غياب الاتصال.

## مساحات العمل
- `GET /api/workspaces`
- `POST /api/workspaces`
- Body: `{ "name": "My Workspace", "slug": "my-workspace" }`

## لوحة المؤشرات
- `GET /api/overview?workspaceId=<id>`
- يعيد ملخص مساحة العمل، وعدد المشاريع النشطة، والمهام المكتملة والمتأخرة، وعناصر المعرفة والمحتوى، وآخر 12 حدث تدقيق.
- لا يخزن النتيجة مؤقتاً؛ يعيد HTTP 404 إذا لم توجد مساحة العمل.

## سجل التدقيق
- `GET /api/audit?workspaceId=<id>&limit=30&cursor=<eventId>`
- يدعم فلاتر `action` و`resource`، ويعيد الأحداث بترتيب الأحدث أولاً مع `pagination.nextCursor` للتنقل بين الصفحات.
- الحد الأقصى للصفحة 100 حدث، ويُرفض المؤشر إذا لم يكن تابعاً لمساحة العمل المطلوبة.

## المشاريع
- `GET /api/projects?workspaceId=<id>`
- `POST /api/projects`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

## المهام
- `GET /api/tasks?projectId=<id>`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`

## المعرفة
- `GET /api/knowledge?workspaceId=<id>&q=<search>`
- `POST /api/knowledge`
- `PATCH /api/knowledge/:itemId`
- `DELETE /api/knowledge/:itemId`

## المحتوى
- `GET /api/content?workspaceId=<id>`
- `POST /api/content`
- `PATCH /api/content/:itemId`
- `DELETE /api/content/:itemId`

تُسجل عمليات الإنشاء والتحديث والحذف المنفذة في AuditEvent ضمن معاملات ذرية حيث طُبّق ذلك. لا تزال واجهات CRUD المرئية، والمصادقة متعددة المستخدمين وفحوص Membership، والحد من معدل الطلبات المستدام، والاختبارات الآلية لمسارات API ضمن الأعمال المتبقية. لا تفتح API لمستخدمين متعددين قبل تنفيذ عزل الصلاحيات على الخادم.


## Export

- `GET /api/export?workspaceId=<id>` — يتطلب جلسة المالك أو Bearer token. ينزّل ملف JSON يحتوي بيانات مساحة العمل ومشاريعها ومهامها وعناصر المعرفة والمحتوى وسجل التدقيق. يصدّر حتى 5000 سجل لكل نوع، ويضمّن `counts` و`truncated` لتوضيح ما إذا تجاوزت البيانات الحد. الاستجابة خاصة وغير قابلة للتخزين المؤقت (`Cache-Control: no-store, private`).
