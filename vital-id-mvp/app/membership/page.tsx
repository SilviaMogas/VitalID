"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/app/providers";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import type { LocalMembership } from "@/lib/demo";

interface IntegrationStatus {
  stripe: { configured: boolean };
  supabase: { configured: boolean };
}

export default function MembershipPage() {
  const { lang } = useLang();
  const [membership, setMembership] = useState<LocalMembership>({ plan: "free", status: "demo" });
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    setMembership(getItem<LocalMembership>(STORAGE_KEYS.membership) ?? { plan: "free", status: "demo" });
    fetch("/api/integrations/status", { cache: "no-store" }).then(r => r.json()).then(setStatus).catch(() => setStatus({ stripe: { configured: false }, supabase: { configured: false } }));
  }, []);

  const chooseDemo = (plan: LocalMembership["plan"]) => {
    const next: LocalMembership = { plan, status: "demo" };
    setMembership(next);
    setItem(STORAGE_KEYS.membership, next);
  };

  const plans = [
    { id: "free" as const, price: "0", title: lang === "ar" ? "أساسي" : "Free", text: lang === "ar" ? "التسجيل اليومي والسجل المحلي." : "Daily check-in and local history." },
    { id: "plus" as const, price: "9", title: "Plus", text: lang === "ar" ? "المصادر المتصلة والاتجاهات والمشاركة." : "Connected sources, trends and sharing." },
    { id: "circle" as const, price: "19", title: lang === "ar" ? "الدائرة" : "Circle", text: lang === "ar" ? "مشاركة مستمرة مع شخص موثوق." : "Ongoing sharing with one trusted person." },
  ];

  return <div className="pt-6 flex flex-col gap-5">
    <div>
      <p className="eyebrow">{lang === "ar" ? "خطط واضحة" : "Clear plans"}</p>
      <h1 className="text-3xl font-bold">{lang === "ar" ? "عضويتك" : "Your membership"}</h1>
      <p style={{ color: "var(--muted)" }}>{lang === "ar" ? "اختر خطة لاستكشافها. لا توجد دفعة إلا عند إعداد Stripe وفتح صفحة الدفع الآمنة." : "Choose a plan to explore. No payment occurs unless Stripe is configured and you open its secure checkout."}</p>
    </div>

    <section className="card status-row">
      <div><strong>{lang === "ar" ? "الخطة الحالية" : "Current plan"}</strong><p>{membership.plan === "circle" ? "Circle" : membership.plan === "plus" ? "Plus" : "Free"}</p></div>
      <span className="badge badge-warn">{membership.status === "demo" ? (lang === "ar" ? "الخطة المختارة" : "Selected plan") : (lang === "ar" ? "نشطة" : "Active")}</span>
    </section>

    <div className="plan-grid">
      {plans.map(plan => <article key={plan.id} className="card plan-card" data-featured={plan.id === "plus"}>
        <div className="flex justify-between gap-2"><h2 className="font-bold">{plan.title}</h2>{plan.id === "plus" && <span className="badge badge-live">{lang === "ar" ? "موصى بها" : "Recommended"}</span>}</div>
        <div className="plan-price"><strong>€{plan.price}</strong><span>/{lang === "ar" ? "شهر" : "month"}</span></div>
        <p style={{ color: "var(--muted)" }}>{plan.text}</p>
        <button className="btn btn-outline w-full" onClick={() => chooseDemo(plan.id)}>{lang === "ar" ? "جرّب هذه الخطة" : "Try this plan"}</button>
        {plan.id !== "free" && status?.stripe.configured && <a className="btn btn-primary w-full" href={`/api/billing/checkout?plan=${plan.id}`}>{lang === "ar" ? "الدفع الآمن عبر Stripe" : "Secure Stripe checkout"}</a>}
      </article>)}
    </div>

    <section className="card">
      <h2 className="font-bold">{lang === "ar" ? "حالة البنية الخلفية" : "Backend readiness"}</h2>
      <p className="status-row mt-3"><span>Stripe</span><span className="badge badge-neutral">{status?.stripe.configured ? (lang === "ar" ? "مُعد" : "Configured") : (lang === "ar" ? "بانتظار الإعداد" : "Setup pending")}</span></p>
      <p className="status-row mt-3"><span>Supabase</span><span className="badge badge-neutral">{status?.supabase.configured ? (lang === "ar" ? "مُعد" : "Configured") : (lang === "ar" ? "بانتظار الإعداد" : "Setup pending")}</span></p>
      <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>{lang === "ar" ? "يبقى سجلك في هذا المتصفح حتى تتم تهيئة مزامنة الحساب عبر Supabase Auth وwebhook للفوترة." : "Your history remains on this browser until account sync is configured with Supabase Auth and a billing webhook."}</p>
    </section>

    <Link href="/history" className="btn btn-primary w-full">{lang === "ar" ? "عرض سجل فاطمة" : "View Fatima’s history"}</Link>
    <Link href="/" className="btn btn-outline w-full">{lang === "ar" ? "الرئيسية" : "Home"}</Link>
  </div>;
}
