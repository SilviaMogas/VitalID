"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useVoice } from "@/components/providers/VoiceProvider";

/** Small "listen to this" button; reads `text` aloud via the shared VoiceProvider. */
export function ReadAloud({ text, owner, className = "" }: { text: string; owner: string; className?: string }) {
  const { t } = useLocale();
  const voice = useVoice();
  const { stop } = voice;

  useEffect(() => {
    stop();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const speaking = voice.speaking === owner;

  return (
    <div className={className}>
      <button
        type="button"
        disabled={voice.muted || !voice.available || voice.listening}
        onClick={() => (speaking ? voice.stop() : voice.speak(text, owner))}
        className="press inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="read-aloud"
      >
        <span aria-hidden>{speaking ? "⏹" : "🔊"}</span>
        {speaking ? t("a11y.stop") : t("a11y.listen")}
      </button>
      {!voice.available && <p className="mt-1 text-[11px] text-muted">{t("a11y.unavailable")}</p>}
    </div>
  );
}
