"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/app/providers";
import type { AccountProfile } from "@/lib/accountClient";
import type { DemoProfile } from "@/lib/demo";
import { getItem, STORAGE_KEYS } from "@/lib/storage";
import { loadWorkFocus, overworkReason, workedMilliseconds, type WorkFocusState } from "@/lib/workFocus";

export default function WorkdayNudge({ profile }: { profile: DemoProfile | AccountProfile }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [state, setState] = useState<WorkFocusState | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const key = STORAGE_KEYS.workFocus + "." + profile.id;
    const refresh = () => {
      const current = Date.now();
      setState(loadWorkFocus(getItem<WorkFocusState>(key), current));
      setNow(current);
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(interval);
  }, [profile.id]);

  if (!state) return null;
  const reason = overworkReason(state, now);
  const name = profile.isDemo ? (ar ? "فاطمة" : "Fátima") : profile.name;
  const minutes = Math.floor(workedMilliseconds(state, now) / 60_000);

  return <section className="card flex flex-col gap-3" data-testid="workday-nudge">
    <div className="flex items-center gap-2"><span aria-hidden="true">⏱</span><h2 className="font-bold">{ar ? "العمل والاستراحات" : "Work & breaks"}</h2></div>
    {reason ? <p role="alert" data-testid="workday-warning">
      {reason === "limit"
        ? (ar ? name + "، تجاوزتِ حد العمل اليومي الذي اخترتِه. سجّلتِ " + minutes + " دقيقة. حان وقت استراحة." : name + ", you’ve reached your chosen work limit: " + minutes + " minutes logged. Take a break.")
        : (ar ? name + "، انتهت ساعات عملك المخطط لها وما زلتِ تعملين. خذي استراحة قصيرة." : name + ", your planned work hours are over and you’re still working. Take a short break.")}
    </p> : <p style={{ color: "var(--muted)" }}>
      {ar ? "ساعاتك: " + state.workStart + "–" + state.workEnd + ". يمكنك تتبع العمل وإيقاع التركيز والاستراحة." : "Your hours: " + state.workStart + "–" + state.workEnd + ". Track your work and make time for breaks."}
    </p>}
    <Link href="/focus" className="btn btn-outline w-full">{ar ? "افتحي مؤقت التركيز" : "Open focus timer"}</Link>
  </section>;
}
