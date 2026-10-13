"use client";

import { Companion } from "@/components/companions/Companion";
import { Broccoli } from "@/components/mascot/Broccoli";
import { Apple, Carrot } from "@/components/mascot/Crew";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";

export type WellnessKind = "health" | "movement" | "nutrition" | "sleep" | "meditation" | "hydration" | "supplements";

const PALETTES: Record<WellnessKind, string> = {
  health: "border-rose-100 bg-rose-50/80",
  movement: "border-emerald-100 bg-emerald-50/80",
  nutrition: "border-orange-100 bg-orange-50/80",
  sleep: "border-indigo-100 bg-indigo-50/80",
  meditation: "border-fuchsia-100 bg-fuchsia-50/70",
  hydration: "border-sky-100 bg-sky-50/80",
  supplements: "border-amber-100 bg-amber-50/80",
};

export function WellnessArt({ kind, size = 52 }: { kind: WellnessKind; size?: number }) {
  let art;
  if (kind === "health" || kind === "movement" || kind === "sleep") {
    art = <Companion name={kind === "health" ? "heart" : kind === "movement" ? "dumbbell" : "moon"} size={size} />;
  } else if (kind === "nutrition") {
    art = <Broccoli state="happy" size={size * 0.86} animate={false} />;
  } else if (kind === "meditation") {
    art = (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
        <ellipse cx="40" cy="68" rx="26" ry="4" fill="#ded4ec" opacity=".5" />
        <path d="M40 65C17 65 9 48 9 32C30 32 39 46 40 65Z" fill="#ae8ecb" />
        <path d="M40 65C63 65 71 48 71 32C50 32 41 46 40 65Z" fill="#c0a0da" />
        <path d="M40 65C23 57 24 29 40 14C56 29 57 57 40 65Z" fill="#dfbce9" />
        <path d="M40 65C28 56 29 36 40 25C51 36 52 56 40 65Z" fill="#f2d8f4" />
        <path d="M33 46C35 49 37 49 39 46M44 46C46 49 48 49 50 46" stroke="#725781" strokeWidth="2.5" strokeLinecap="round" transform="translate(-2 0)" />
        <path d="M35 54Q40 58 45 54" stroke="#725781" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="22" r="2.5" fill="#d7bbe4" />
        <circle cx="66" cy="17" r="2" fill="#d7bbe4" />
      </svg>
    );
  } else if (kind === "hydration") {
    art = (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
        <ellipse cx="40" cy="72" rx="21" ry="3" fill="#bddfe9" opacity=".5" />
        <path d="M40 7C33 20 15 35 15 48A25 25 0 0 0 65 48C65 35 47 20 40 7Z" fill="#78c9df" />
        <path d="M37 20C29 32 24 37 24 46" stroke="#bde9f1" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="32" cy="48" rx="2" ry="3" fill="#235c75" />
        <ellipse cx="48" cy="48" rx="2" ry="3" fill="#235c75" />
        <path d="M35 56Q40 60 45 56" stroke="#235c75" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  } else {
    art = (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
        <ellipse cx="38" cy="72" rx="25" ry="3" fill="#eadaba" opacity=".5" />
        <rect x="19" y="22" width="37" height="46" rx="10" fill="#fff9e9" stroke="#e0bf79" strokeWidth="2" />
        <rect x="22" y="10" width="31" height="17" rx="5" fill="#81a893" />
        <path d="M28 14V22M35 14V22M42 14V22M49 14V22" stroke="#c5dccd" strokeWidth="2" />
        <rect x="19" y="36" width="37" height="20" fill="#f7dc9d" />
        <path d="M32 46H43M37.5 40.5V51.5" stroke="#8e743b" strokeWidth="2" strokeLinecap="round" />
        <rect x="52" y="49" width="13" height="24" rx="6.5" transform="rotate(28 52 49)" fill="#e8baa8" stroke="#fff" strokeWidth="2" />
        <path d="M47 62L58 68" stroke="#fff" strokeWidth="2" />
      </svg>
    );
  }
  return <span className="wellness-art inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>{art}</span>;
}

export function WellnessRibbon({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  const kinds: WellnessKind[] = compact
    ? ["health", "nutrition", "movement", "sleep", "meditation"]
    : ["health", "nutrition", "movement", "sleep", "meditation", "hydration"];
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-3 min-[380px]:grid-cols-5" : "grid-cols-3 sm:grid-cols-6"}`}>
      {kinds.map((kind) => (
        <div key={kind} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 ${PALETTES[kind]}`}>
          <WellnessArt kind={kind} size={compact ? 36 : 46} />
          <span className="text-center text-[10px] font-semibold leading-tight text-ink-2">{t(`wellness.art.${kind}` as TranslationKey)}</span>
        </div>
      ))}
    </div>
  );
}

export function FoodAccent({ size = 46 }: { size?: number }) {
  return (
    <span className="wellness-art relative inline-flex items-center" aria-hidden>
      <Apple size={size * 0.78} />
      <Carrot size={size * 0.78} className="-ms-1" />
    </span>
  );
}
