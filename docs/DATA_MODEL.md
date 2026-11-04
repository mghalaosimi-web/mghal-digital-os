# نموذج البيانات الأولي

هذا نموذج نطاق مفاهيمي، وليس schema منفذاً أو migration.

## قواعد عامة

- كل سجل مملوك لمساحة عمل عبر workspace_id عند دعم أكثر من مساحة.
- استخدم UUID/ULID كمعرفات عامة.
- created_at وupdated_at بتوقيت UTC.
- لا تخزن الأسرار في جداول إعدادات عادية.
- استخدم soft delete فقط عندما توجد حاجة استرجاع/تدقيق واضحة، مع سياسة احتفاظ.
- أضف فهارس للمفاتيح الأجنبية وحقول البحث والتصفية.

## الكيانات الأساسية

### Workspace & Membership
Workspace(id, name, slug, created_at)
Membership(id, workspace_id, user_id, role, status)

### Identity
Profile(id, workspace_id, display_name, bio, locale, timezone)
BrandVoice(id, workspace_id, name, guidelines, examples)
Asset(id, workspace_id, storage_key, mime_type, size, checksum, metadata)

### Content
ContentItem(id, workspace_id, title, body, content_type, status, created_by)
ContentVariant(id, content_item_id, channel, body, status, scheduled_at, published_at)
ContentApproval(id, content_variant_id, reviewer_id, decision, note, decided_at)
ChannelConnection(id, workspace_id, provider, external_account_id, status, secret_reference)

### Projects
Project(id, workspace_id, name, description, status, start_at, due_at)
Task(id, project_id, title, description, status, priority, assignee_id, due_at)
TaskDependency(task_id, depends_on_task_id)
Activity(id, workspace_id, actor_id, entity_type, entity_id, action, payload)

### Knowledge
KnowledgeSource(id, workspace_id, source_type, title, uri, checksum, metadata)
KnowledgeChunk(id, source_id, chunk_index, content, embedding_reference)
Tag(id, workspace_id, name)
TagAssignment(tag_id, entity_type, entity_id)

### Automation
Automation(id, workspace_id, name, trigger_type, definition, enabled)
AutomationRun(id, automation_id, status, started_at, finished_at, idempotency_key, error_summary)
AutomationStepRun(id, run_id, step_key, status, input_summary, output_summary, started_at, finished_at)

### AI & Audit
AIInvocation(id, workspace_id, purpose, provider, model, status, token_usage, source_refs)
AuditEvent(id, workspace_id, actor_id, action, resource_type, resource_id, created_at, metadata)

## قيود مهمة

- unique(workspace_id, slug) للمساحات/المعرفات المناسبة.
- unique(automation_id, idempotency_key) لمنع تنفيذ مكرر.
- لا تسجل access tokens أو prompts التي تحتوي بيانات سرية في audit.
- يجب فرض ملكية workspace في طبقة الاستعلام وليس في الواجهة فقط.
- حذف اتصال قناة يجب أن يلغي/يدوّر السر في secret manager.
