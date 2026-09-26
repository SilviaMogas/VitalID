"use client";

import { useEffect } from "react";
import { useLang } from "@/app/providers";
import { guideCopy } from "@/lib/guide";
import { useVoice } from "./VoiceProvider";

export default function ReadAloud({ text, className }: { text: string; className?: string }) {
  const { t, lang } = useLang();
  const voice = useVoice();
  const { stop } = voice;
  useEffect(() => { stop(); return stop; }, [text, stop]);
  return (
    <div>
      <button type="button" className={`btn btn-outline ${className ?? ""}`}
        disabled={voice.muted || !voice.available || voice.listening}
        onClick={() => voice.speaking === "summary" ? voice.stop() : voice.speak(text, "summary")}
        data-testid="read-aloud">
        {voice.speaking === "summary" ? t("a11y.stop") : t("a11y.listen")}
      </button>
      {!voice.available && <p className="text-sm">{guideCopy[lang].unavailable}</p>}
    </div>
  );
}
