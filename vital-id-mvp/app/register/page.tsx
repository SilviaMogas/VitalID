"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/app/providers";
import { createFatimaHistory, createFatimaProfile } from "@/lib/demo";
import { clearLocalJourney } from "@/lib/accountClient";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import VegetableWelcome from "@/components/VegetableWelcome";
import { FatimaPortrait } from "@/components/FatimaExperience";
import type { DailyEntry } from "@/lib/daily";

export default function RegisterPage() {
  const { lang } = useLang();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accountConsent,setAccountConsent] = useState(false);
  const [demoConsent, setDemoConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const ar = lang === "ar";

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then(response => response.json())
      .then((data: { configured?: boolean }) => setConfigured(data.configured === true))
      .catch(() => setConfigured(false));
  }, []);

  const continueDemo = async () => {
    if (!demoConsent) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      const prior = getItem<{ isDemo?: boolean }>(STORAGE_KEYS.profile);
      if (!prior?.isDemo) clearLocalJourney();
      setItem(STORAGE_KEYS.profile, createFatimaProfile());
      const existing = getItem<DailyEntry[]>(STORAGE_KEYS.dailyHistory) ?? [];
      const existingDates = new Set(existing.map(entry => entry.date));
      const seeded = createFatimaHistory(lang).filter(entry => !existingDates.has(entry.date));
      setItem(STORAGE_KEYS.dailyHistory, [...existing, ...seeded].sort((a, b) => b.date.localeCompare(a.date)));
      setItem(STORAGE_KEYS.membership, { plan: "plus", status: "demo" });
      setItem(STORAGE_KEYS.consent, { at: Date.now(), demo: true });
      router.push("/dashboard");
    } catch {
      setError(ar ? "تعذر فتح التجربة. حاولي مجدداً." : "Could not open the demo. Please try again.");
      setBusy(false);
    }
  };

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountConsent) return;
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password, name, essentialConsent: accountConsent }),
      });
      const data = await response.json() as { user?: { id: string }; confirmationRequired?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not connect your account.");
      if (data.confirmationRequired) {
        setMessage(ar ? "راجعي بريدك الإلكتروني لتأكيد الحساب، ثم سجّلي الدخول." : "Check your email to confirm your account, then sign in.");
        setBusy(false); return;
      }
      if (!data.user?.id) throw new Error("The account response was incomplete.");
      clearLocalJourney();
      router.push("/consent?account=1");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not connect your account.");
      setBusy(false);
    }
  };

  return <div className="auth-welcome">
    <div className="auth-garden"><VegetableWelcome /></div>
    <p className="eyebrow">{ar ? "مساحة صغيرة لك" : "A little space for you"}</p>
    <h1 className="text-3xl font-bold">{ar ? "مرحباً بك في Vita Lady" : "Welcome to Vita Lady"}</h1>
    <p>{ar ? "يومك له قصة. نحن هنا لنستمع." : "Your day has a story. We’re here to listen."}</p>
    <div className="auth-options" role="group" aria-label={ar ? "خيارات الحساب" : "Account options"}>
      <button type="button" className="btn btn-outline" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); setMessage(""); }}>{ar ? "تسجيل الدخول" : "Log in"}</button>
      <button type="button" className="btn btn-outline" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>{ar ? "إنشاء حساب" : "Sign up"}</button>
    </div>
    <label className="field-check card"><input data-testid="account-consent" type="checkbox" checked={accountConsent} onChange={e=>setAccountConsent(e.target.checked)}/><span>{ar?"أوافق على معالجة اسمي وبريدي وكلمة المرور لإنشاء حساب Supabase أو الدخول إليه. تُحمّل المعلومات الصحية فقط بعد خطوة الموافقة التالية.":"I agree to process my name, email and password to create or access my Supabase account. Health information loads only after the next consent step."}</span></label>
    <form className="auth-form" onSubmit={submitAccount}>
      <fieldset className="flex flex-col gap-3" disabled={!accountConsent || busy}>
      {mode === "signup" && <label>{ar ? "الاسم" : "Your name"}<input type="text" autoComplete="name" maxLength={80} value={name} onChange={event => setName(event.target.value)} required /></label>}
      <label>{ar ? "البريد الإلكتروني" : "Email"}<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>{ar ? "كلمة المرور" : "Password"}<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <button type="submit" className="btn btn-outline w-full" disabled={busy || configured !== true || !accountConsent}>{ar ? (mode === "login" ? "تسجيل الدخول" : "إنشاء حساب") : (mode === "login" ? "Sign in" : "Create account")}</button>
      </fieldset>
    </form>
    <div className="auth-account-note" role="status">
      {configured === false
        ? (ar ? "يلزم إعداد مشروع Supabase لتفعيل الحسابات الشخصية." : "Supabase project setup is needed to activate personal accounts.")
        : (ar ? "حسابك الشخصي يحفظ يومياتك في Supabase." : "Your personal account keeps your daily history in Supabase.")}
    </div>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="auth-divider"><span>{ar ? "أو استكشفي التجربة" : "or step into her day"}</span></div>
    <div className="auth-demo-person"><FatimaPortrait/></div>
    <p className="font-bold">{ar ? "أهلاً فاطمة، يومك جاهز." : "Hey Fátima, your day is ready."}</p>
    <label className="field-check card"><input data-testid="demo-consent" type="checkbox" checked={demoConsent} onChange={e=>setDemoConsent(e.target.checked)}/><span>{ar?"أوافق على فتح تجربة فاطمة وتخزين مسودتي في هذا المتصفح. قصتها خيالية؛ بطاقة Circular تعرض عينة مقدمة وليست اتصالاً حياً. لا يُشارك شيء تلقائياً.":"I agree to open Fátima’s demo and store my draft in this browser. Her story is fictional; Circular shows a supplied sample, not a live connection. Nothing is shared automatically."}</span></label>
    <Link className="underline" href="/onboarding">{ar?"كيف تعمل الخصوصية والمشاركة؟":"How do privacy and sharing work?"}</Link>
    <button data-testid="enter-demo" type="button" className="btn btn-primary w-full" disabled={busy || !demoConsent} onClick={continueDemo}>{ar ? "الدخول باسم فاطمة (تجريبي)" : "Log in as Fátima (Demo)"} <span aria-hidden="true">↗</span></button>
    <Link href="/" className="underline">{ar ? "رجوع" : "Back"}</Link>
  </div>;
}
