"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

type AuthState = "checking" | "authenticated" | "anonymous";

export function OwnerGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر التحقق من الجلسة");
        return (await response.json()) as { authenticated?: boolean };
      })
      .then((data) => {
        if (active) setAuthState(data.authenticated ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (active) setAuthState("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json()) as { error?: string; authenticated?: boolean };
      if (!response.ok || !data.authenticated) {
        setError(data.error ?? "تعذر تسجيل الدخول");
        return;
      }
      setToken("");
      setAuthState("authenticated");
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      setAuthState("anonymous");
      setBusy(false);
    }
  }

  if (authState === "checking") {
    return (
      <main className="auth-screen" aria-live="polite">
        <div className="auth-panel"><span className="auth-mark">M</span><p>جارٍ التحقق من جلسة المالك...</p></div>
      </main>
    );
  }

  if (authState === "anonymous") {
    return (
      <main className="auth-screen">
        <form className="auth-panel" onSubmit={handleLogin}>
          <span className="auth-mark">M</span>
          <div className="eyebrow">MGHAL DIGITAL OS</div>
          <h1>تسجيل دخول المالك</h1>
          <p>أدخل مفتاح المالك المخزن في إعدادات الخادم لبدء جلسة آمنة.</p>
          <label htmlFor="owner-token">مفتاح المالك</label>
          <input
            id="owner-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="current-password"
            minLength={32}
            maxLength={512}
            required
            placeholder="أدخل المفتاح السري"
            disabled={busy}
          />
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <button className="auth-submit" type="submit" disabled={busy || token.length < 32}>
            {busy ? "جارٍ التحقق..." : "دخول آمن"}
          </button>
          <small>لا يُحفظ المفتاح في المتصفح. تُنشأ جلسة خادمية عبر Cookie محمية.</small>
        </form>
      </main>
    );
  }

  return (
    <div className="owner-session-shell">
      <div className="owner-session-toolbar">
        <span><i /> جلسة مالك موثقة</span>
        <button type="button" onClick={handleLogout} disabled={busy}>تسجيل الخروج</button>
      </div>
      {children}
    </div>
  );
}
