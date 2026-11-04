"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

type AuthState = "checking" | "authenticated" | "anonymous";

type LoginResponse = {
  error?: string;
  authenticated?: boolean;
};

const MIN_TOKEN_LENGTH = 32;
const MAX_TOKEN_LENGTH = 512;

function loginError(status: number, message?: string): string {
  if (status === 503) {
    return "المصادقة غير مهيأة على الخادم. تحقق من متغير OWNER_API_TOKEN في Render.";
  }
  if (status === 401) {
    return "المفتاح غير مطابق للمفتاح المحفوظ على الخادم. تأكد من استخدام المفتاح نفسه دون مسافات زائدة.";
  }
  if (status === 403) {
    return "تم رفض الطلب لأسباب أمنية. أعد تحميل الصفحة وحاول مجدداً.";
  }
  if (status === 400) {
    return "صيغة الطلب غير صحيحة. أعد تحميل الصفحة وحاول مجدداً.";
  }
  return message ?? "تعذر تسجيل الدخول. حاول مرة أخرى.";
}

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
    if (busy) return;

    // Remove accidental whitespace introduced by copying a token from a terminal.
    const normalizedToken = token.trim();
    if (normalizedToken.length < MIN_TOKEN_LENGTH) {
      setError(`المفتاح قصير. يجب أن يحتوي على ${MIN_TOKEN_LENGTH} حرفاً على الأقل.`);
      return;
    }
    if (normalizedToken.length > MAX_TOKEN_LENGTH) {
      setError(`المفتاح أطول من الحد المسموح (${MAX_TOKEN_LENGTH} حرفاً).`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token: normalizedToken }),
      });
      const data = (await response.json().catch(() => ({}))) as LoginResponse;
      if (!response.ok || !data.authenticated) {
        setError(loginError(response.status, data.error));
        return;
      }
      setToken("");
      setAuthState("authenticated");
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE", cache: "no-store" });
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
    const normalizedLength = token.trim().length;
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
            onChange={(event) => {
              setToken(event.target.value);
              if (error) setError("");
            }}
            autoComplete="current-password"
            maxLength={MAX_TOKEN_LENGTH}
            required
            aria-describedby="owner-token-hint"
            aria-invalid={Boolean(error)}
            placeholder="أدخل المفتاح السري"
            disabled={busy}
          />
          <small id="owner-token-hint" className="auth-hint">
            {normalizedLength < MIN_TOKEN_LENGTH
              ? `أدخل ${MIN_TOKEN_LENGTH - normalizedLength} حرفاً إضافياً على الأقل. `
              : "الطول مناسب. "}
            {normalizedLength} / {MAX_TOKEN_LENGTH}
          </small>
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <button className="auth-submit" type="submit" disabled={busy || normalizedLength === 0}>
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
