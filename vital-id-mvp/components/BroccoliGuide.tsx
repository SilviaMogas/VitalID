"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/app/providers";
import { guideCopy, guideStepForPath, type GuideStep } from "@/lib/guide";
import { useVoice } from "./VoiceProvider";

export function BroccoliGuide({ step }: { step: GuideStep }) {
  const { lang, dir } = useLang();
  const voice = useVoice();
  const { stop } = voice;
  const copy = guideCopy[lang];
  const [celebrating, setCelebrating] = useState(false);
  const celebration = lang === "ar" ? "رائع يا فاطمة! أحسنتِ. خطوة صغيرة اليوم!" : "Woo-hoo, Fatima! You did it. One small win for today!";
  const message = celebrating ? celebration : voice.listening ? copy.listening : copy[step];
  const state = celebrating ? "success" : voice.listening ? "listening" : voice.speaking ? "speaking" :
    step === "qr" || step === "revoked" ? "success" : "idle";

  useEffect(() => { stop(); return stop; }, [step, lang, stop]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const celebrate = () => {
      setCelebrating(true);
      if (voice.available && !voice.muted) voice.speak(celebration, "challenge");
      timer = setTimeout(() => setCelebrating(false), 4200);
    };
    window.addEventListener("vitalid:celebrate", celebrate);
    return () => {
      window.removeEventListener("vitalid:celebrate", celebrate);
      if (timer) clearTimeout(timer);
    };
  }, [celebration, voice.available, voice.muted, voice.speak]);

  return (
    <aside className="broccoli-guide no-print" dir={dir} lang={lang} aria-label={copy.title} data-testid="broccoli-guide">
      <div className="guide-heading">
        <svg viewBox="0 0 100 110" className="broccoli" data-state={state} aria-hidden="true" focusable="false">
          <g className="broccoli-confetti">
            <circle cx="13" cy="20" r="3" fill="#f2b84b" /><circle cx="88" cy="18" r="3" fill="#ef6a67" />
            <path d="M10 48 l8 -4 M84 45 l8 5 M28 10 l-2 -8 M72 10 l3 -8" stroke="#568bd6" strokeWidth="3" strokeLinecap="round" />
          </g>
          <path d="M42 64 L36 99 Q50 106 64 99 L58 64" fill="#acd283" stroke="#285539" strokeWidth="3" />
          <path className="broccoli-arms" d="M45 79 L28 68 M55 81 L72 69" fill="none" stroke="#285539" strokeWidth="5" strokeLinecap="round" />
          <path d="M23 64 C4 65 3 40 17 35 C10 15 31 5 43 16 C52 1 76 9 77 26 C99 24 103 52 85 60 C80 78 61 79 50 70 C39 79 26 77 23 64Z" fill="#4e9460" stroke="#285539" strokeWidth="3" />
          <path d="M22 33 Q24 21 35 24 M52 20 Q62 16 67 26" fill="none" stroke="#91c783" strokeWidth="4" strokeLinecap="round" />
          <g className="broccoli-eyes" fill="#152c20">
            <circle cx="36" cy="48" r="4" /><circle cx="64" cy="48" r="4" />
          </g>
          <path className="broccoli-smile" d="M42 59 Q50 67 58 59" fill="none" stroke="#152c20" strokeWidth="3" strokeLinecap="round" />
          <ellipse className="broccoli-mouth" cx="50" cy="61" rx="6" ry="5" fill="#152c20" />
        </svg>
        <div className="guide-copy">
          <p className="font-bold">{copy.title}</p>
          <p aria-live="polite" aria-atomic="true" data-testid="guide-message">{message}</p>
        </div>
      </div>
      <div className="guide-controls">
        <button type="button" className="btn btn-outline" data-testid="guide-listen"
          disabled={voice.muted || !voice.available || voice.listening}
          onClick={() => voice.speaking === "guide" ? voice.stop() : voice.speak(message, "guide")}>
          {voice.speaking === "guide" ? copy.stop : copy.listen}
        </button>
        <button type="button" className="btn btn-outline" aria-pressed={voice.muted}
          data-testid="guide-mute" onClick={voice.toggleMute}>
          {voice.muted ? copy.unmute : copy.mute}
        </button>
      </div>
      {(!voice.available || voice.failed) && <p className="text-sm" data-testid="voice-fallback">{voice.failed ? copy.failed : copy.unavailable}</p>}
    </aside>
  );
}

export default function RouteGuide() {
  const path = usePathname();
  const step = guideStepForPath(path);
  return step ? <BroccoliGuide step={step} /> : null;
}
