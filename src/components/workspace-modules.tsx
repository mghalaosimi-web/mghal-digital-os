"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EditorialCalendar } from "@/components/editorial-calendar";

type Workspace = { id: string; name: string; slug: string };
type Project = { id: string; name: string; description: string | null; status: string; dueDate: string | null; _count?: { tasks: number } };
type Task = { id: string; projectId: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null };
type Knowledge = { id: string; title: string; content: string; type: string; sourceUrl: string | null; tags: string[] };
type Content = { id: string; title: string; body: string; status: string; channel: string | null; scheduledAt: string | null };
type Tab = "projects" | "tasks" | "knowledge" | "content";

const tabs: Array<{ id: Tab; label: string; description: string }> = [
  { id: "projects", label: "المشاريع", description: "خطط العمل ومراحل التنفيذ" },
  { id: "tasks", label: "المهام", description: "الأولويات والمتابعة اليومية" },
  { id: "knowledge", label: "المعرفة", description: "ملاحظاتك ومراجعك وروابطك" },
  { id: "content", label: "المحتوى", description: "الأفكار والمسودات والنشر" },
];
const projectStatuses = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
const taskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const contentStatuses = ["IDEA", "DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
const labels: Record<string, string> = {
  PLANNING: "تخطيط", ACTIVE: "نشط", ON_HOLD: "متوقف مؤقتاً", COMPLETED: "مكتمل", ARCHIVED: "مؤرشف",
  TODO: "لم تبدأ", IN_PROGRESS: "قيد التنفيذ", BLOCKED: "متعطلة", DONE: "منجزة", CANCELLED: "ملغاة",
  LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", URGENT: "عاجلة",
  IDEA: "فكرة", DRAFT: "مسودة", REVIEW: "مراجعة", APPROVED: "معتمد", SCHEDULED: "مجدول", PUBLISHED: "منشور",
  NOTE: "ملاحظة", LINK: "رابط", DOCUMENT: "مستند", REFERENCE: "مرجع",
};
const dateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";

export function WorkspaceModules() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("PLANNING");
  const [priority, setPriority] = useState("MEDIUM");
  const [kind, setKind] = useState("NOTE");
  const [channel, setChannel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activeProjects = useMemo(() => projects.filter((p) => !["ARCHIVED", "COMPLETED"].includes(p.status)), [projects]);

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "تعذر تنفيذ العملية");
    return result as T;
  }

  async function loadWorkspaces() {
    setLoading(true);
    setError("");
    try {
      const result = await request<{ data: Workspace[] }>("/api/workspaces");
      setWorkspaces(result.data);
      if (result.data.length && !workspaceId) setWorkspaceId(result.data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل مساحات العمل");
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [p, k, c] = await Promise.all([
        request<{ data: Project[] }>("/api/projects?workspaceId=" + encodeURIComponent(workspaceId)),
        request<{ data: Knowledge[] }>("/api/knowledge?workspaceId=" + encodeURIComponent(workspaceId)),
        request<{ data: Content[] }>("/api/content?workspaceId=" + encodeURIComponent(workspaceId)),
      ]);
      setProjects(p.data);
      setKnowledge(k.data);
      setContent(c.data);
      // Never carry a selected project (or its tasks) across workspace boundaries.
      const nextProjectFilter = p.data.some((item) => item.id === projectFilter)
        ? projectFilter
        : p.data[0]?.id ?? "";
      if (nextProjectFilter !== projectFilter) {
        setProjectFilter(nextProjectFilter);
        setTasks([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل بيانات الوحدة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
    const refresh = () => { void loadWorkspaces(); };
    window.addEventListener("mghal:workspace-changed", refresh);
    return () => window.removeEventListener("mghal:workspace-changed", refresh);
  }, []);
  useEffect(() => { if (workspaceId) void loadData(); }, [workspaceId]);
  useEffect(() => {
    if (tab !== "knowledge" || !workspaceId) return;
    let active = true;
    const query = knowledgeQuery.trim();
    const url = "/api/knowledge?workspaceId=" + encodeURIComponent(workspaceId)
      + (query ? "&q=" + encodeURIComponent(query) : "");
    request<{ data: Knowledge[] }>(url)
      .then((result) => { if (active) setKnowledge(result.data); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "تعذر البحث في قاعدة المعرفة"); });
    return () => { active = false; };
  }, [tab, workspaceId, knowledgeQuery]);

  useEffect(() => {
    if (tab !== "tasks" || !projectFilter) { setTasks([]); return; }
    let active = true;
    request<{ data: Task[] }>("/api/tasks?projectId=" + encodeURIComponent(projectFilter))
      .then((result) => { if (active) setTasks(result.data); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "تعذر تحميل المهام"); });
    return () => { active = false; };
  }, [tab, projectFilter]);

  function resetForm() {
    setEditingId(""); setTitle(""); setDescription(""); setBody(""); setDueDate("");
    setStatus(tab === "projects" ? "PLANNING" : tab === "tasks" ? "TODO" : tab === "content" ? "IDEA" : "NOTE");
    setPriority("MEDIUM"); setKind("NOTE"); setChannel(""); setSourceUrl("");
  }

  function editItem(item: Project | Task | Knowledge | Content) {
    setEditingId(item.id);
    if ("title" in item) setTitle(item.title); else setTitle(item.name);
    if ("description" in item) setDescription(item.description ?? "");
    else setDescription("");
    if ("body" in item) setBody(item.body);
    else if ("content" in item) setBody(item.content);
    else setBody("");
    if ("status" in item) setStatus(item.status);
    if ("priority" in item) setPriority(item.priority);
    if ("type" in item) setKind(item.type);
    if ("channel" in item) setChannel(item.channel ?? "");
    if ("sourceUrl" in item) setSourceUrl(item.sourceUrl ?? "");
    if ("dueDate" in item) setDueDate(dateInput(item.dueDate));
    if ("scheduledAt" in item) setDueDate(dateInput(item.scheduledAt));
    document.getElementById("module-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function generateContentDraft() {
    if (!title.trim()) { setError("اكتب عنواناً أو فكرة أولاً حتى يتمكن المساعد من إعداد المسودة."); return; }
    setGenerating(true); setError(""); setNotice("");
    try {
      const result = await request<{ data: { content: string } }>("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ title, channel: channel || undefined, context: body || description }),
      });
      setBody(result.data.content);
      setNotice("تم إنشاء مسودة أولية. راجعها وعدّلها قبل اعتمادها أو نشرها.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنشاء المسودة بالذكاء الاصطناعي");
    } finally { setGenerating(false); }
  }

  async function exportWorkspace() {
    if (!workspaceId || exporting) return;
    setExporting(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/export?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? "تعذر تصدير مساحة العمل");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "mghal-workspace-export.json";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("تم تجهيز نسخة JSON من بيانات مساحة العمل.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تصدير مساحة العمل");
    } finally {
      setExporting(false);
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let endpoint = ""; let payload: Record<string, unknown> = {};
      if (tab === "projects") {
        endpoint = editingId ? "/api/projects/" + editingId : "/api/projects";
        payload = { name: title, description, status, ...(dueDate ? { dueDate: new Date(dueDate + "T12:00:00").toISOString() } : {}) };
        if (!editingId) payload.workspaceId = workspaceId;
      } else if (tab === "tasks") {
        if (!projectFilter) throw new Error("أنشئ مشروعاً أولاً ثم أضف المهام إليه");
        endpoint = editingId ? "/api/tasks/" + editingId : "/api/tasks";
        payload = { title, description, status, priority, ...(dueDate ? { dueDate: new Date(dueDate + "T12:00:00").toISOString() } : {}) };
        if (!editingId) payload.projectId = projectFilter;
      } else if (tab === "knowledge") {
        endpoint = editingId ? "/api/knowledge/" + editingId : "/api/knowledge";
        payload = { title, content: body, type: kind, ...(sourceUrl ? { sourceUrl } : {}) };
        if (!editingId) payload.workspaceId = workspaceId;
      } else {
        endpoint = editingId ? "/api/content/" + editingId : "/api/content";
        payload = { title, body, status, channel };
        if (!editingId) payload.workspaceId = workspaceId;
        if (status === "SCHEDULED" && dueDate) payload.scheduledAt = new Date(dueDate + "T12:00:00").toISOString();
      }
      await request(endpoint, { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      resetForm();
      await loadData();
      setNotice(editingId ? "تم حفظ التعديلات بنجاح." : "تمت الإضافة بنجاح.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ العنصر");
    } finally { setBusy(false); }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن الحذف.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const endpoint = tab === "projects" ? "/api/projects/" + id : tab === "tasks" ? "/api/tasks/" + id : tab === "knowledge" ? "/api/knowledge/" + id : "/api/content/" + id;
      await request(endpoint, { method: "DELETE" });
      if (editingId === id) resetForm();
      await loadData();
      setNotice("تم الحذف بنجاح.");
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر الحذف"); }
    finally { setBusy(false); }
  }

  const selectedItems = tab === "projects" ? projects : tab === "tasks" ? tasks : tab === "knowledge" ? knowledge : content;
  const formStatusOptions = tab === "projects" ? projectStatuses : tab === "tasks" ? taskStatuses : contentStatuses;

  return (
    <section className="modules-workbench" id="management">
      <div className="workbench-heading">
        <div><div className="eyebrow muted">WORKSPACE CONTROL CENTER</div><h2>إدارة أعمالك</h2><p>أنشئ وعدّل وتابع بياناتك مباشرة من قاعدة البيانات.</p></div>
        {workspaces.length > 0 ? <label className="workspace-select-label"><span>مساحة العمل</span><select value={workspaceId} onChange={(e) => { setWorkspaceId(e.target.value); resetForm(); }}><option value="">اختر مساحة</option>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label> : null}
        {workspaces.length > 0 ? <button className="secondary-action" type="button" onClick={() => void exportWorkspace()} disabled={!workspaceId || exporting}>{exporting ? "جارٍ تجهيز النسخة..." : "↓ تصدير بيانات المساحة"}</button> : null}
      </div>
      <div className="module-tabs" role="tablist" aria-label="وحدات الإدارة">
        {tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "module-tab active" : "module-tab"} key={item.id} onClick={() => { setTab(item.id); resetForm(); setError(""); }}>{item.label}<small>{item.description}</small></button>)}
      </div>
      {error ? <div className="workspace-alert" role="alert">{error}</div> : null}
      {notice ? <div className="workspace-notice" role="status">{notice}</div> : null}
      {!loading && workspaces.length === 0 ? <div className="workspace-state">لا توجد مساحة عمل. أنشئ مساحة من لوحة المؤشرات أولاً.</div> : null}
      <div className="workbench-grid">
        <form className="module-editor" id="module-editor" onSubmit={saveItem}>
          <div className="editor-heading"><strong>{editingId ? "تعديل العنصر" : "إضافة " + tabs.find((x) => x.id === tab)?.label}</strong>{editingId ? <button type="button" className="text-button" onClick={resetForm}>إلغاء التعديل</button> : null}</div>
          <label>العنوان<input value={title} onChange={(e) => setTitle(e.target.value)} minLength={2} maxLength={180} required placeholder="اكتب عنواناً واضحاً..." /></label>
          {(tab === "projects" || tab === "tasks") ? <label>الوصف<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} placeholder="تفاصيل إضافية (اختياري)" /></label> : null}
          {tab === "knowledge" || tab === "content" ? <label>{tab === "knowledge" ? "المحتوى / الملاحظة" : "نص المحتوى"}<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={tab === "knowledge" ? 50000 : 30000} required={tab === "knowledge"} placeholder="اكتب التفاصيل هنا..." /></label> : null}
          {tab === "projects" || tab === "tasks" || tab === "content" ? <label>الحالة<select value={status} onChange={(e) => setStatus(e.target.value)}>{(tab === "projects" ? projectStatuses : tab === "tasks" ? taskStatuses : contentStatuses).map((s) => <option key={s} value={s}>{labels[s] ?? s}</option>)}</select></label> : null}
          {tab === "tasks" ? <label>الأولوية<select value={priority} onChange={(e) => setPriority(e.target.value)}>{priorities.map((p) => <option key={p} value={p}>{labels[p]}</option>)}</select></label> : null}
          {tab === "tasks" ? <label>المشروع<select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} required><option value="">اختر مشروعاً</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label> : null}
          {tab === "knowledge" ? <><label>نوع العنصر<select value={kind} onChange={(e) => setKind(e.target.value)}>{["NOTE", "LINK", "DOCUMENT", "REFERENCE"].map((v) => <option key={v} value={v}>{labels[v]}</option>)}</select></label><label>رابط المصدر<input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." /></label></> : null}
          {tab === "content" ? <><label>قناة النشر<input value={channel} onChange={(e) => setChannel(e.target.value)} maxLength={60} placeholder="LinkedIn، X، Instagram..." /></label><button className="secondary-action" type="button" onClick={() => void generateContentDraft()} disabled={generating || busy}>{generating ? "جارٍ إعداد المسودة..." : "✧ إنشاء مسودة بالذكاء الاصطناعي"}</button></> : null}
          {(tab === "projects" || tab === "tasks" || (tab === "content" && status === "SCHEDULED")) ? <label>{tab === "content" ? "موعد الجدولة" : "تاريخ الاستحقاق"}<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label> : null}
          <button className="auth-submit" type="submit" disabled={busy || !workspaceId || (tab === "tasks" && !projectFilter)}>{busy ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة إلى مساحة العمل"}</button>
        </form>
        <div className="module-records">
          <div className="records-heading"><strong>{tabs.find((x) => x.id === tab)?.label}</strong><span>{selectedItems.length} عنصر</span></div>
          {tab === "knowledge" ? <label className="records-filter">البحث في المعرفة<input type="search" value={knowledgeQuery} onChange={(e) => setKnowledgeQuery(e.target.value)} maxLength={200} placeholder="ابحث في العناوين والمحتوى..." /></label> : null}
          {tab === "tasks" && projects.length > 0 ? <label className="records-filter">تصفية حسب المشروع<select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label> : null}
          {loading ? <div className="workspace-state">جارٍ تحميل البيانات...</div> : selectedItems.length === 0 ? <div className="workspace-empty">لا توجد عناصر هنا بعد. استخدم النموذج لإضافة أول عنصر.</div> : <div className="record-list">
            {selectedItems.map((raw) => {
              const item = raw as Project & Task & Knowledge & Content;
              const itemTitle = item.title ?? item.name;
              const itemDetail = item.description ?? item.content ?? item.body ?? "";
              const itemStatus = item.status ?? item.type ?? "";
              return <article className="record-card" key={item.id}>
                <div className="record-main"><strong>{itemTitle}</strong><span className="record-status">{labels[itemStatus] ?? itemStatus}</span><p>{itemDetail.slice(0, 180) || "لا توجد تفاصيل إضافية."}</p><small>{("priority" in item ? "الأولوية: " + (labels[item.priority] ?? item.priority) + " · " : "") + ("channel" in item && item.channel ? "القناة: " + item.channel : "")}</small></div>
                <div className="record-actions"><button type="button" onClick={() => editItem(raw)}>تعديل</button><button type="button" className="delete-button" onClick={() => void deleteItem(item.id)} disabled={busy}>حذف</button></div>
              </article>;
            })}
          </div>}
        </div>
      </div>
      <EditorialCalendar
        items={content}
        onEdit={(item) => {
          setTab("content");
          editItem(item);
        }}
      />
    </section>
  );
}
