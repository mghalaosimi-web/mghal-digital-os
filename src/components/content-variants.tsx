"use client";

import { FormEvent, useEffect, useState } from "react";

type Variant = {
  id: string;
  platform: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  lastError: string | null;
};

const platforms = [
  ["LINKEDIN", "LinkedIn"], ["X", "X"], ["INSTAGRAM", "Instagram"],
  ["FACEBOOK", "Facebook"], ["TIKTOK", "TikTok"], ["YOUTUBE", "YouTube"],
  ["THREADS", "Threads"], ["PINTEREST", "Pinterest"], ["REDDIT", "Reddit"],
  ["BLUESKY", "Bluesky"], ["MASTODON", "Mastodon"], ["TELEGRAM", "Telegram"], ["DISCORD", "Discord"],
] as const;

const statusLabels: Record<string, string> = {
  DRAFT: "مسودة", IN_REVIEW: "قيد المراجعة", APPROVED: "معتمد",
  SCHEDULED: "مجدول", PUBLISHING: "جارٍ النشر", PUBLISHED: "منشور",
  FAILED: "فشل", CANCELLED: "ملغى",
};

class ApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(result.error ?? "تعذر تنفيذ العملية", result.code);
  }
  return result as T;
}

function isVariantsSchemaUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.code === "CONTENT_VARIANTS_MIGRATION_REQUIRED";
}

export function ContentVariants({ contentItemId }: { contentItemId: string }) {
  const [items, setItems] = useState<Variant[]>([]);
  const [platform, setPlatform] = useState<string>("LINKEDIN");
  const [body, setBody] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [schemaUnavailable, setSchemaUnavailable] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await api<{ data: Variant[] }>(`/api/content/${contentItemId}/variants`);
      setItems(result.data);
      setSchemaUnavailable(false);
      setError("");
    } catch (e) {
      if (isVariantsSchemaUnavailable(e)) {
        setSchemaUnavailable(true);
        setItems([]);
        setError("");
      } else {
        setError(e instanceof Error ? e.message : "تعذر تحميل نسخ القنوات");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [contentItemId]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`/api/content/${contentItemId}/variants`, {
        method: "POST",
        body: JSON.stringify({ platform, body }),
      });
      setBody("");
      await load();
      setNotice("أضيفت نسخة القناة.");
    } catch (e) {
      if (isVariantsSchemaUnavailable(e)) setSchemaUnavailable(true);
      setError(e instanceof Error ? e.message : "تعذر إضافة النسخة");
    } finally { setBusy(false); }
  }

  async function update(item: Variant, status: string, scheduledAt?: string | null) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`/api/content/variants/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(status === "SCHEDULED" ? { scheduledAt } : {}),
        }),
      });
      await load();
      setNotice("تم تحديث حالة النسخة.");
    } catch (e) {
      if (isVariantsSchemaUnavailable(e)) {
        setSchemaUnavailable(true);
        setItems([]);
      }
      setError(e instanceof Error ? e.message : "تعذر تحديث النسخة");
    } finally { setBusy(false); }
  }

  async function remove(item: Variant) {
    if (!window.confirm("حذف نسخة هذه القناة؟")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`/api/content/variants/${item.id}`, { method: "DELETE" });
      await load();
      setNotice("حذفت النسخة.");
    } catch (e) {
      if (isVariantsSchemaUnavailable(e)) {
        setSchemaUnavailable(true);
        setItems([]);
      }
      setError(e instanceof Error ? e.message : "تعذر حذف النسخة");
    } finally { setBusy(false); }
  }

  return (
    <section className="content-variants" aria-labelledby="variants-heading">
      <div className="variants-heading">
        <strong id="variants-heading">نسخ القنوات الاجتماعية</strong>
        <span>جهّز صياغة مستقلة لكل منصة</span>
      </div>
      {schemaUnavailable ? (
        <p className="workspace-alert" role="status">
          ميزة نسخ القنوات غير مفعّلة في قاعدة الإنتاج حالياً؛ لم يُطبّق ترحيل قاعدة البيانات بعد. بيانات المحتوى الأساسية لم تتأثر، وسيظهر نموذج إدارة النسخ بعد تفعيل المخطط.
        </p>
      ) : (
      <form className="variant-create" onSubmit={add}>
        <label>المنصة
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            {platforms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>نص النسخة
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} maxLength={30000} required placeholder="اكتب أو الصق الصياغة الخاصة بهذه القناة..." />
        </label>
        <button className="secondary-action" type="submit" disabled={busy || !body.trim()}>إضافة نسخة للمنصة</button>
      </form>
      )}
      {error ? <p className="workspace-alert" role="alert">{error}</p> : null}
      {notice ? <p className="workspace-notice" role="status">{notice}</p> : null}
      {loading ? <p className="variants-empty">جارٍ تحميل النسخ...</p> : schemaUnavailable ? null : items.length === 0 ? <p className="variants-empty">لم تُنشأ نسخ للقنوات بعد.</p> : (
        <div className="variant-list">
          {items.map((item) => (
            <article className="variant-card" key={item.id}>
              <div className="variant-card-head">
                <strong>{platforms.find(([value]) => value === item.platform)?.[1] ?? item.platform}</strong>
                <span className={"record-status variant-status-" + item.status.toLowerCase()}>{statusLabels[item.status] ?? item.status}</span>
              </div>
              <p>{item.body}</p>
              {item.scheduledAt ? <small>موعد النشر: {new Date(item.scheduledAt).toLocaleString("ar")}</small> : null}
              {item.lastError ? <small className="variant-error">{item.lastError}</small> : null}
              {item.status === "DRAFT" ? <button type="button" disabled={busy} onClick={() => void update(item, "IN_REVIEW")}>إرسال للمراجعة</button> : null}
              {item.status === "IN_REVIEW" ? <button type="button" disabled={busy} onClick={() => void update(item, "APPROVED")}>اعتماد النسخة</button> : null}
              {item.status === "APPROVED" ? (
                <div className="variant-schedule">
                  <input aria-label="موعد النشر" type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
                  <button type="button" disabled={busy || !scheduleAt} onClick={() => void update(item, "SCHEDULED", new Date(scheduleAt).toISOString())}>جدولة</button>
                </div>
              ) : null}
              {item.status === "SCHEDULED" ? <button type="button" disabled={busy} onClick={() => void update(item, "APPROVED")}>إلغاء الجدولة وإرجاعها للاعتماد</button> : null}
              {item.status === "FAILED" ? <button type="button" disabled={busy} onClick={() => void update(item, "APPROVED")}>إعادة للمراجعة</button> : null}
              {item.status === "CANCELLED" ? <button type="button" disabled={busy} onClick={() => void update(item, "DRAFT")}>إعادة كمسودة</button> : null}
              {item.status !== "PUBLISHED" && item.status !== "PUBLISHING" ? <button className="delete-button" type="button" disabled={busy} onClick={() => void remove(item)}>حذف النسخة</button> : null}
            </article>
          ))}
        </div>
      )}
      <p className="variants-disclaimer">الاعتماد والجدولة الداخليان جاهزان؛ الربط بحسابات المنصات ومحرك النشر الفعلي سيُفعّلان بعد إعداد OAuth ومفاتيح التطبيقات الرسمية.</p>
    </section>
  );
}
