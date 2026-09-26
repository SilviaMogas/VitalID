"use client";

import { useLang } from "@/app/providers";
import Link from "next/link";
import { createFatimaProfile, type DemoProfile } from "@/lib/demo";

export default function FatimaProfileCard({ profile }: { profile: DemoProfile }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const details = profile.vitamins?.length && profile.goals?.length && profile.connectedApps?.includes("cronometer") && profile.connectedApps?.includes("renpho") ? profile : createFatimaProfile(profile.joinedAt);
  return <section className="fatima-profile card" data-testid="fatima-profile" aria-labelledby="fatima-profile-title">
    <div className="fatima-profile-head">
      <div className="fatima-avatar" aria-hidden="true">F</div>
      <div>
        <p className="eyebrow">{ar ? "ملف فاطمة" : "Fátima's profile"}</p>
        <h2 id="fatima-profile-title" className="text-xl font-bold">{ar ? "هذه هي فاطمة" : "Get to know Fátima"}</h2>
      </div>
      <span className="fatima-profile-age">{details.age} <small>{ar ? "سنة" : "years"}</small></span>
    </div>
    <p className="fatima-profile-lifestyle">{details.lifestyle[lang]}</p>
    <div className="fatima-profile-group">
      <h3 className="font-bold">{ar ? "الفيتامينات المسجّلة" : "Vitamin & food log"}</h3>
      <ul className="fatima-vitamin-list">
        {details.vitamins.map(vitamin => <li key={vitamin.id}>
          <span className="fatima-vitamin-icon" aria-hidden="true">{vitamin.id === "c" ? "🍊" : "✦"}</span>
          <span><strong>{vitamin.name[lang]}</strong><small>{vitamin.entry[lang]}</small></span>
        </li>)}
      </ul>
    </div>
    <div className="fatima-profile-group">
      <h3 className="font-bold">{ar ? "ما يهمّها الآن" : "Her goals right now"}</h3>
      <ul className="fatima-goal-list">
        {details.goals.map(goal => <li key={goal.id}><strong>{goal.title[lang]}</strong><small>{goal.detail[lang]}</small></li>)}
      </ul>
    </div>
    <div className="fatima-profile-group">
      <h3 className="font-bold">{ar ? "تطبيقاتها" : "Connected apps"}</h3>
      <div className="fatima-app-pills">{details.connectedApps.map(id => <span key={id}>{id === "circular" ? "◉ Circular Ring" : id === "plaud" ? "🎙 PLAUD" : id === "whoop" ? "⌚ WHOOP" : id === "cronometer" ? "🥗 Cronometer" : "⚖ RENPHO Health"}</span>)}</div>
      <Link href="/connections" className="underline text-sm">{ar ? "عرض مصادر البيانات" : "View data sources"}</Link>
    </div>
    <p className="fatima-profile-disclosure">{ar ? "هذه سجلات شخصية للغذاء والفيتامينات، وليست نتائج تحاليل أو توصيات طبية." : "These are food and vitamin logs, not lab results or supplement advice."}</p>
  </section>;
}
