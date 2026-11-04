# API الأولية

## المصادقة

جميع المسارات الإدارية أدناه محمية بمفتاح مالك خادمي:
Authorization: Bearer <OWNER_API_TOKEN>

يجب أن يكون المفتاح 32 محرفاً على الأقل. لا تضعه في JavaScript المتصفح أو متغيرات NEXT_PUBLIC_* أو تطبيق جوال. استخدم هذه الواجهات من بيئة خادمية موثوقة فقط.

**هذه ليست مصادقة مستخدمين:** لا توجد حالياً حسابات دخول أو جلسات أو RBAC فعلي. المفتاح الواحد يمنح صلاحية المالك على جميع المساحات. لا تعرض المسارات لمستخدمين غير موثوقين.

## قواعد الطلب

- يجب إرسال Content-Type: application/json في طلبات JSON.
- الحد الأعلى الافتراضي لحجم جسم الطلب 512 KiB.
- JSON غير الصحيح يعيد 400، ونوع المحتوى غير المدعوم يعيد 415، والجسم الكبير يعيد 413.
- المدخلات تتحقق عبر Zod.
- عمليات الإنشاء والتعديل والحذف المدعومة تحفظ سجل AuditEvent داخل المعاملة نفسها.

## المسارات

### فحص الخدمة
- GET /api/health — فحص liveness وإظهار وجود متغيرات الإعداد فقط. لا يجري اتصالاً فعلياً بقاعدة البيانات ولا يعد readiness check.

### مساحات العمل
- GET /api/workspaces
- POST /api/workspaces
- Body: { "name": "My Workspace", "slug": "my-workspace" }

### المشاريع
- GET /api/projects?workspaceId=<id>
- POST /api/projects
- Body: { "workspaceId": "<id>", "name": "Project name", "description": "Optional" }
- PATCH /api/projects/:projectId
- DELETE /api/projects/:projectId

### المهام
- GET /api/tasks?projectId=<id>
- POST /api/tasks
- Body: { "projectId": "<id>", "title": "Task title", "priority": "HIGH" }
- PATCH /api/tasks/:taskId

### المعرفة
- GET /api/knowledge?workspaceId=<id>&q=<search>
- POST /api/knowledge
- Body: { "workspaceId": "<id>", "title": "Reference", "content": "Notes", "type": "NOTE" }

### المحتوى
- GET /api/content?workspaceId=<id>
- POST /api/content
- Body: { "workspaceId": "<id>", "title": "Draft", "body": "Content", "status": "IDEA" }

## حدود معروفة

- لا يوجد rate limiting بعد.
- لا توجد صلاحيات لكل عضو/Workspace؛ المفتاح مؤقت وشامل.
- لا يوجد CRUD كامل لكل الموارد؛ لا يوجد DELETE للمهام أو PATCH للمحتوى والمعرفة.
- حالة PUBLISHED في ContentItem مجرد قيمة حالة يحددها العميل، ولا تنفذ نشرًا خارجياً.
- أخطاء قاعدة البيانات غير موحدة بالكامل وقد تظهر كاستجابة 500 عامة من Next.js.
- لا يوجد pagination cursor بعد؛ القوائم محدودة بـ take.
- يجب إضافة اختبارات تكامل وقواعد عزل workspace قبل إتاحة API للعامة.
