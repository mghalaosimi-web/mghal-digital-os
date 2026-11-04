# API الأولية

تتطلب المسارات الإدارية جلسة مالك صالحة عبر Cookie موقعة، أو Bearer token من بيئة خادمية موثوقة. لا تضع المفتاح في JavaScript المتصفح أو متغيرات `NEXT_PUBLIC_*` أو تطبيق جوال. الجلسة الحالية مخصصة لمالك واحد فقط وليست مصادقة متعددة المستخدمين.

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

## المشاريع
- `GET /api/projects?workspaceId=<id>`
- `POST /api/projects`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

## المهام
- `GET /api/tasks?projectId=<id>`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`

## المعرفة
- `GET /api/knowledge?workspaceId=<id>&q=<search>`
- `POST /api/knowledge`

## المحتوى
- `GET /api/content?workspaceId=<id>`
- `POST /api/content`

تتحقق المدخلات المدعومة عبر Zod، وتُسجل العمليات المنفذة في AuditEvent ضمن معاملات ذرية حيث طُبّق ذلك. لا تزال عمليات تعديل/حذف المهام والمعرفة والمحتوى، والمصادقة متعددة المستخدمين وفحوص Membership، والحد من معدل الطلبات المستدام، ضمن الأعمال المتبقية. لا تفتح API لمستخدمين متعددين قبل تنفيذ عزل الصلاحيات على الخادم.
