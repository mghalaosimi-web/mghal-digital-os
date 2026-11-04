"use client";

import { useMemo, useState } from "react";

export type CalendarContentItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  channel: string | null;
  scheduledAt: string | null;
};

const weekdays = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const statusLabels: Record<string, string> = {
  IDEA: "فكرة", DRAFT: "مسودة", REVIEW: "مراجعة", APPROVED: "معتمد",
  SCHEDULED: "مجدول", PUBLISHED: "منشور", ARCHIVED: "مؤرشف",
};

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function EditorialCalendar({ items, onEdit }: {
  items: CalendarContentItem[];
  onEdit: (item: CalendarContentItem) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((offset + count) / 7) * 7;
    return Array.from({ length: total }, (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > count ? null : new Date(year, month, day);
    });
  }, [year, month]);

  const scheduledItems = items.filter((item) => item.scheduledAt && item.status !== "ARCHIVED");
  const byDate = useMemo(() => {
    const grouped = new Map<string, CalendarContentItem[]>();
    for (const item of scheduledItems) {
      const key = dateKey(new Date(item.scheduledAt as string));
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return grouped;
  }, [scheduledItems]);

  const monthItems = scheduledItems.filter((item) => {
    const date = new Date(item.scheduledAt as string);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const today = dateKey(new Date());

  return (
    <section className="editorial-calendar" aria-label="التقويم التحريري">
      <div className="calendar-heading">
        <div>
          <div className="eyebrow muted">EDITORIAL PLANNER</div>
          <h3>التقويم التحريري</h3>
          <p>تابع مواعيد المحتوى وحالاته من مساحة العمل الحالية.</p>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} aria-label="الشهر السابق">السابق</button>
          <strong>{new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" }).format(visibleMonth)}</strong>
          <button type="button" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} aria-label="الشهر التالي">التالي</button>
          <button type="button" onClick={() => setVisibleMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>اليوم</button>
        </div>
      </div>
      <div className="calendar-summary">
        <span><strong>{monthItems.length}</strong> عنصر مجدول في هذا الشهر</span>
        <span><strong>{monthItems.filter((item) => item.status === "PUBLISHED").length}</strong> منشور</span>
        <span><strong>{monthItems.filter((item) => item.status === "SCHEDULED").length}</strong> بانتظار التنفيذ</span>
      </div>
      <div className="calendar-weekdays">{weekdays.map((day) => <div key={day}>{day}</div>)}</div>
      <div className="calendar-grid">
        {days.map((date, index) => {
          if (!date) return <div className="calendar-day calendar-day-empty" key={"empty-" + index} />;
          const key = dateKey(date);
          const entries = byDate.get(key) ?? [];
          return (
            <div className={"calendar-day" + (key === today ? " calendar-day-today" : "")} key={key}>
              <span className="calendar-day-number">{date.getDate()}</span>
              <div className="calendar-day-items">
                {entries.slice(0, 3).map((item) => (
                  <button type="button" className={"calendar-event calendar-event-" + item.status.toLowerCase()}
                    key={item.id} onClick={() => onEdit(item)}
                    title={item.title + (item.channel ? " · " + item.channel : "")}>
                    <span>{item.title}</span><small>{statusLabels[item.status] ?? item.status}</small>
                  </button>
                ))}
                {entries.length > 3 ? <span className="calendar-more">+{entries.length - 3} أخرى</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      {monthItems.length === 0 ? <div className="calendar-empty">لا توجد عناصر مجدولة لهذا الشهر. أنشئ محتوى وحدد حالته «مجدول» وموعد نشره لإظهاره هنا.</div> : null}
      <p className="calendar-footnote">اضغط على أي عنصر لفتحه في محرر المحتوى. الجدولة تحفظ الموعد فقط؛ النشر التلقائي يتطلب ربط القناة ومزود النشر.</p>
    </section>
  );
}
