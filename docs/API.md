# API الأولية

جميع المسارات الإدارية التالية محمية بمفتاح مالك خادمي. أرسل:
`Authorization: Bearer <OWNER_API_TOKEN>`

**مهم:** لا تضع المفتاح في JavaScript المتصفح أو متغيرات `NEXT_PUBLIC_*` أو تطبيق جوال. استخدم هذه الواجهات من بيئة خادمية موثوقة فقط. لم تُنفذ بعد مصادقة مستخدمين وجلسات كاملة؛ لا تعرض هذه الواجهات مباشرة لمستخدمين غير موثوقين.

## فحوص الخدمة
- `GET /api/health` — فحص liveness؛ يؤكد أن التطبيق يستجيب ويعرض وجود الإعدادات دون كشف قيمها. لا يثبت اتصال قاعدة البيانات.
- `GET /api/ready` — فحص readiness؛ ينفذ استعلاماً بسيطاً إلى PostgreSQL. يعيد HTTP 503 إذا كان `DATABASE_URL` غير مضبوط أو تعذر الوصول إلى قاعدة البيانات.

## مساحات العمل
- `GET /api/workspaces`
- `POST /api/workspaces`
- Body: `{ "name": "My Workspace", "slug": "my-workspace" }`

## المشاريع
- `GET /api/projects?workspaceId=<id>`
- `POST /api/projects`
- Body: `{ "workspaceId": "<id>", "name": "Project name", "description": "Optional" }`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

## المهام
- `GET /api/tasks?projectId=<id>`
- `POST /api/tasks`
- Body: `{ "projectId": "<id>", "title": "Task title", "priority": "HIGH" }`
- `PATCH /api/tasks/:taskId`

## المعرفة
- `GET /api/knowledge?workspaceId=<id>&q=<search>`
- `POST /api/knowledge`
- Body: `{ "workspaceId": "<id>", "title": "Reference", "content": "Notes", "type": "NOTE" }`

## المحتوى
- `GET /api/content?workspaceId=<id>`
- `POST /api/content`
- Body: `{ "workspaceId": "<id>", "title": "Draft", "body": "Content", "status": "IDEA" }`

جميع المدخلات تتحقق عبر Zod، وتُسجل عمليات الإنشاء والتعديل والحذف المدعومة في AuditEvent. أضف rate limiting ومصادقة مستخدمين وصلاحيات لكل مساحة عمل قبل فتح API على الإنترنت.
