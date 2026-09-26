"use client";

import { useEffect, useRef, useState } from "react";
import { useVoice } from "./VoiceProvider";
import { useLang } from "@/app/providers";

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

export default function VoiceDictation({ onFinal }: { onFinal: (text: string) => void }) {
  const { t, lang } = useLang();
  const { setListening, stop: stopSpeech } = useVoice();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [denied, setDenied] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const langRef = useRef(lang);
  langRef.current = lang;

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
  }, [lang, setListening]);

  const start = () => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    stopSpeech();
    setDenied(false);
    const rec = new Ctor();
    rec.lang = langRef.current === "ar" ? "ar-AE" : "en-GB";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => { setRecording(true); setListening(true); };
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
    rec.onend = () => { setRecording(false); setListening(false); };
    recRef.current = rec;
    try { rec.start(); }
    catch { setDenied(true); setRecording(false); setListening(false); }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
    setListening(false);
  };

  if (available === null) return null;
  if (!available)
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {t("checkin.dictate.unavailable")}
      </p>
    );

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        className={`dictate-btn${recording ? " recording" : ""}`}
        onClick={recording ? stop : start}
        aria-pressed={recording}
        aria-label={recording ? t("checkin.stop") : t("checkin.dictate")}
        data-testid="dictate-btn"
      >
        {recording ? "■" : "🎤"}
      </button>
      <span className="text-sm font-semibold" style={{ color: recording ? "var(--error)" : "var(--muted)" }}>
        {recording ? t("checkin.listening") : t("checkin.dictate")}
      </span>
      {interim && (
        <p className="text-sm" style={{ color: "var(--muted)" }} aria-live="polite">
          {interim}
        </p>
      )}
      {denied && (
        <p role="alert" style={{ color: "var(--error)" }}>
          {t("checkin.dictate.denied")}
        </p>
      )}
    </div>
  );
}
