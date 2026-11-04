"use client";

import { FormEvent, useEffect, useState } from "react";

type Workspace = { id: string; name: string; slug: string };
type Activity = {
  id: string;
  actor: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: string;
};
type Overview = {
  workspace: Workspace;
  metrics: {
    projects: number;
    activeProjects: number;
    tasks: number;
    completedTasks: number;
    overdueTasks: number;
    knowledgeItems: number;
    contentItems: number;
  };
  recentActivity: Activity[];
};

const metricLabels: Array<{ key: keyof Overview["metrics"]; label: string; icon: string }> = [
  { key: "projects", label: "المشاريع", icon: "▦" },
  { key: "activeProjects", label: "مشاريع نشطة", icon: "◈" },
  { key: "tasks", label: "إجمالي المهام", icon: "✓" },
  { key: "completedTasks", label: "مهام مكتملة", icon: "✦" },
  { key: "overdueTasks", label: "مهام متأخرة", icon: "◷" },
  { key: "knowledgeItems", label: "عناصر المعرفة", icon: "⌘" },
  { key: "contentItems", label: "عناصر المحتوى", icon: "✳" },
];

function activityLabel(action: string): string {
  const labels: Record<string, string> = {
    "workspace.created": "إنشاء مساحة عمل",
    "project.created": "إنشاء مشروع",
    "project.updated": "تحديث مشروع",
    "project.deleted": "حذف مشروع",
    "task.created": "إنشاء مهمة",
    "task.updated": "تحديث مهمة",
    "task.deleted": "حذف مهمة",
    "knowledge.created": "إضافة معرفة",
    "knowledge.updated": "تحديث معرفة",
    "knowledge.deleted": "حذف معرفة",
    "content.created": "إنشاء محتوى",
    "content.updated": "تحديث محتوى",
    "content.deleted": "حذف محتوى",
  };
  return labels[action] ?? action;
}

export function WorkspaceDashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [workspaceName, setWorkspaceName] = useState("مساحة عملي");
  const [workspaceSlug, setWorkspaceSlug] = useState("my-workspace");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkspaces() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/workspaces", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "تعذر تحميل مساحات العمل");
      const items = (result.data ?? []) as Workspace[];
      setWorkspaces(items);
      if (!workspaceId && items.length > 0) setWorkspaceId(items[0].id);
      if (items.length === 0) setOverview(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
    // Load once when the dashboard mounts; workspace changes are handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    setLoading(true);
    fetch(`/api/overview?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "تعذر تحميل المؤشرات");
        return result.data as Overview;
      })
      .then((data) => {
        if (active) {
          setOverview(data);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "تعذر تحميل المؤشرات");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspaceId]);

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName, slug: workspaceSlug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "تعذر إنشاء مساحة العمل");
      const created = result.data as Workspace;
      setWorkspaces((current) => [...current, created]);
      setWorkspaceId(created.id);
      setOverview(null);
      window.dispatchEvent(new Event("mghal:workspace-changed"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء مساحة العمل");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="workspace-dashboard" aria-labelledby="workspace-dashboard-title">
      <div className="workspace-dashboard-heading">
        <div>
          <div className="eyebrow muted">LIVE WORKSPACE DATA</div>
          <h2 id="workspace-dashboard-title">مؤشرات مساحة العمل</h2>
          <p>بيانات مباشرة من قاعدة البيانات وسجل عمليات المنظومة.</p>
        </div>
        {workspaces.length > 0 ? (
          <label className="workspace-select-label">
            <span>مساحة العمل</span>
            <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? <div className="workspace-alert" role="alert">{error}</div> : null}

      {loading ? (
        <div className="workspace-state">جارٍ تحميل بيانات مساحة العمل...</div>
      ) : workspaces.length === 0 ? (
        <form className="workspace-create" onSubmit={createWorkspace}>
          <div className="workspace-create-copy">
            <strong>ابدأ بإنشاء مساحة عملك الأولى</strong>
            <p>ستكون المساحة الحاوية لمشاريعك ومهامك ومعرفتك ومحتواك.</p>
          </div>
          <label>اسم المساحة<input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} minLength={2} maxLength={80} required /></label>
          <label>المعرّف اللاتيني<input dir="ltr" value={workspaceSlug} onChange={(event) => setWorkspaceSlug(event.target.value.toLowerCase())} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={60} required /></label>
          <button type="submit" disabled={creating}>{creating ? "جارٍ الإنشاء..." : "إنشاء مساحة العمل"}</button>
        </form>
      ) : overview ? (
        <>
          <div className="workspace-metrics">
            {metricLabels.map((metric) => (
              <article className="workspace-metric" key={metric.key}>
                <span className="workspace-metric-icon">{metric.icon}</span>
                <span className="workspace-metric-label">{metric.label}</span>
                <strong>{overview.metrics[metric.key].toLocaleString("ar")}</strong>
              </article>
            ))}
          </div>
          <div className="workspace-activity">
            <div className="workspace-activity-heading">
              <strong>آخر النشاطات</strong>
              <span>{overview.recentActivity.length.toLocaleString("ar")} أحداث</span>
            </div>
            {overview.recentActivity.length === 0 ? (
              <p className="workspace-empty">لا توجد نشاطات بعد. ستظهر هنا العمليات التي تنفذها داخل المساحة.</p>
            ) : (
              <ul>
                {overview.recentActivity.map((item) => (
                  <li key={item.id}>
                    <span className="workspace-activity-dot" />
                    <span className="workspace-activity-name">{activityLabel(item.action)}</span>
                    <span className="workspace-activity-resource">{item.resource}</span>
                    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="workspace-state">لا توجد بيانات لعرضها بعد.</div>
      )}
    </section>
  );
}
