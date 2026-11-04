import { OwnerGate } from "@/components/owner-gate";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";

const modules = [
  { name: "الهوية الرقمية", detail: "ملفك المهني ونبرة علامتك وأصولك", icon: "◈", status: "قيد التأسيس" },
  { name: "استوديو المحتوى", detail: "الأفكار والمسودات والتقويم التحريري", icon: "✳", status: "قيد التأسيس" },
  { name: "المشاريع والمهام", detail: "الأولويات والتنفيذ ومتابعة التقدم", icon: "▦", status: "قيد التأسيس" },
  { name: "قاعدة المعرفة", detail: "مصادرك وملاحظاتك ومعلوماتك", icon: "⌘", status: "قيد التأسيس" },
  { name: "الأتمتة الذكية", detail: "سير العمل والموافقات وسجل التشغيل", icon: "⌁", status: "قيد التأسيس" },
  { name: "مركز الذكاء الاصطناعي", detail: "مساعدون متخصصون ضمن صلاحيات واضحة", icon: "✧", status: "قيد التأسيس" },
];

export default function Home() {
  return (
    <OwnerGate>
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="MGHAL Digital OS home"><span className="brand-mark">M</span><span><strong>MGHAL</strong><small>DIGITAL OS</small></span></a>
        <div className="workspace-label">مساحة العمل</div>
        <nav className="nav-list" aria-label="التنقل الرئيسي">
          <a className="nav-item active" href="#overview"><span>⌂</span>نظرة عامة</a>
          <a className="nav-item" href="#modules"><span>▦</span>الوحدات</a>
          <a className="nav-item" href="#activity"><span>◷</span>النشاط</a>
        </nav>
        <div className="sidebar-bottom"><span className="status-dot" />النظام في مرحلة التأسيس</div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumb">مساحة العمل <span>/</span> نظرة عامة</div><div className="profile-chip"><span className="avatar">م</span><span>مساحة المالك</span></div></header>
        <div className="content">
          <section className="hero">
            <div className="hero-copy"><div className="eyebrow"><span className="status-dot" /> DIGITAL COMMAND CENTER</div><h1>كل أعمالك الرقمية،<br/><em>في مكان واحد.</em></h1><p>مساحة موحدة لإدارة هويتك ومحتواك ومشاريعك ومعرفتك، مع ذكاء اصطناعي يعمل تحت إشرافك.</p><a className="primary-link" href="#modules">استكشف الوحدات <span>←</span></a></div>
            <div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core">M<span>+</span></div><i className="orbit-dot dot-one" /><i className="orbit-dot dot-two" /><i className="orbit-dot dot-three" /></div>
          </section>

          <WorkspaceDashboard />

          <section className="section-head" id="modules"><div><div className="eyebrow muted">WORKSPACE MODULES</div><h2>مكونات منظومتك</h2><p>أساس متكامل قابل للتوسع، يبدأ من احتياجاتك اليومية.</p></div><span className="module-count">06 وحدات أساسية</span></section>
          <section className="module-grid">{modules.map((module, index) => <article className="module-card" key={module.name}><div className="card-top"><span className="module-icon">{module.icon}</span><span className="card-index">0{index + 1}</span></div><h3>{module.name}</h3><p>{module.detail}</p><div className="card-footer"><span className="mini-dot" />{module.status}<span className="card-arrow">↗</span></div></article>)}</section>

          <section className="foundation" id="activity"><div className="foundation-icon">✦</div><div><strong>نبني الأساس الصحيح أولاً</strong><p>الواجهة الحالية هي نقطة الانطلاق. ستظهر بياناتك الحقيقية هنا بعد ربط قاعدة البيانات وتفعيل الوحدات تدريجياً.</p></div><span className="foundation-tag">FOUNDATION PHASE</span></section>
          <footer>MGHAL DIGITAL OS <span>•</span> BUILT FOR FOCUS, CONTROL & GROWTH</footer>
        </div>
      </section>
    </main>
    </OwnerGate>
  );
}
