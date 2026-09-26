"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getItem, STORAGE_KEYS } from "@/lib/storage";
import VegetableWelcome from "@/components/VegetableWelcome";
import { useLang } from "./providers";

export default function Welcome() {
  const { t, lang } = useLang();
  const router = useRouter();
  useEffect(() => {
    if (getItem(STORAGE_KEYS.profile) && getItem(STORAGE_KEYS.consent)) router.replace("/dashboard");
  }, [router]);
  return (
    <div className="flex flex-col pt-8 gap-6 min-h-[78vh]">
      <section className="welcome-hero">
        <VegetableWelcome />
        <p className="eyebrow">{lang === "ar" ? "صوتك + يومك + بياناتك" : "Your voice + your day + your data"}</p>
        <h1 className="text-4xl font-bold garden-wordmark">Vita Lady</h1>
        <h2 className="text-2xl font-bold">{lang === "ar" ? "كيف تشعر اليوم؟" : "How are you feeling today?"}</h2>
        <p className="text-lg">{lang === "ar" ? "معلوماتك الصحية، منظّمة وتُشارك وفق شروطك." : "Your health information, organised and shared on your terms."}</p>
      </section>

      <Link href="/onboarding" className="btn btn-primary w-full hero-action" data-testid="start">{t("welcome.start")}</Link>

      <Link href="/register" className="btn btn-outline">{lang==="ar"?"تسجيل الدخول / إنشاء حساب / مثال فاطمة":"Sign in / Sign up / Fátima demo"}</Link>
      <div className="value-grid">
        <article className="value-card"><span aria-hidden="true">🎙️</span><strong>{lang === "ar" ? "قلها بطريقتك" : "Say it your way"}</strong><small>{lang === "ar" ? "صوت أو كتابة أو PLAUD" : "Voice, text or PLAUD"}</small></article>
        <article className="value-card"><span aria-hidden="true">⌚</span><strong>{lang === "ar" ? "اجمع الصورة" : "Complete the picture"}</strong><small>{lang === "ar" ? "WHOOP والحركة والطعام" : "WHOOP, movement and food"}</small></article>
        <article className="value-card"><span aria-hidden="true">📖</span><strong>{lang === "ar" ? "افهم أيامك" : "See your days"}</strong><small>{lang === "ar" ? "ملخص وسجل يومي" : "Daily recap and history"}</small></article>
      </div>

      <footer className="mt-auto pt-6 pb-4 text-sm text-center" style={{ color: "var(--muted)" }}>
        <p>{lang === "ar" ? "ملخصات رفاهية وصفية، وليست تشخيصاً طبياً." : "Descriptive wellness recaps, not medical diagnoses."}</p>
        <Link href="/judges" className="underline">{t("welcome.presenter")}</Link>
      </footer>
    </div>
  );
}
