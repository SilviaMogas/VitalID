"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useVoice } from "@/components/providers/VoiceProvider";

interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SRError {
  error: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRError) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  }
}

/** Mic button that appends finalized speech-to-text chunks via `onFinal`. */
export function VoiceDictation({ onFinal, className = "" }: { onFinal: (text: string) => void; className?: string }) {
  const { t, locale } = useLocale();
  const { setListening, stop: stopSpeech } = useVoice();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [denied, setDenied] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    setRecording(false);
    setInterim("");
    setAvailable(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    return () => {
      if (recRef.current) {
        recRef.current.onresult = null;
        recRef.current.onstart = null;
        recRef.current.onerror = null;
        recRef.current.onend = null;
        recRef.current.stop();
      }
      setListening(false);
      recRef.current = null;
    };
  }, [locale, setListening]);

  const start = () => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    stopSpeech();
    setDenied(false);
    const rec = new Ctor();
    rec.lang = localeRef.current === "ar" ? "ar-AE" : "en-GB";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => {
      setRecording(true);
      setListening(true);
    };
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current(r[0].transcript.trim());
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setDenied(true);
      setRecording(false);
      setListening(false);
    };
    rec.onend = () => {
      setRecording(false);
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setDenied(true);
      setRecording(false);
      setListening(false);
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
    setListening(false);
  };

  if (available === null) return null;
  if (!available) return <p className={`text-xs text-muted ${className}`}>{t("a11y.dictateUnavailable")}</p>;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-pressed={recording}
        aria-label={recording ? t("a11y.listening") : t("a11y.dictate")}
        data-testid="dictate-btn"
        className={`press grid h-9 w-9 shrink-0 place-items-center rounded-full text-base transition ${
          recording ? "bg-bad text-white" : "border border-line bg-white text-brand"
        }`}
      >
        <span aria-hidden>{recording ? "■" : "🎤"}</span>
      </button>
      <span className={`text-xs font-medium ${recording ? "text-bad" : "text-muted"}`}>
        {recording ? t("a11y.listening") : t("a11y.dictate")}
      </span>
      {interim && (
        <span className="truncate text-xs text-muted" aria-live="polite">
          {interim}
        </span>
      )}
      {denied && (
        <span role="alert" className="text-xs text-bad">
          {t("a11y.dictateDenied")}
        </span>
      )}
    </div>
  );
}
