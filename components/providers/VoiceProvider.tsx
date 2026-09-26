"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { selectVoice } from "@/lib/voice";

const MUTE_STORAGE_KEY = "vitalid.voiceMuted";

interface VoiceContextValue {
  muted: boolean;
  available: boolean;
  speaking: string | null;
  failed: boolean;
  listening: boolean;
  setListening: (value: boolean) => void;
  toggleMute: () => void;
  stop: () => void;
  speak: (text: string, owner: string) => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const path = usePathname();
  const [muted, setMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [listening, setListeningState] = useState(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(null);
  }, []);

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_STORAGE_KEY) === "true");
    } catch {
      // ignore
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(synth.getVoices());
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      stop();
    };
  }, [stop]);

  useEffect(() => {
    stop();
    setFailed(false);
    setListeningState(false);
  }, [locale, path, stop]);

  const toggleMute = useCallback(() => {
    stop();
    setMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [stop]);

  const setListening = useCallback(
    (value: boolean) => {
      if (value) stop();
      setListeningState(value);
    },
    [stop],
  );

  const speak = useCallback(
    (text: string, owner: string) => {
      stop();
      setFailed(false);
      if (muted || listening) return;
      const voice = selectVoice(window.speechSynthesis?.getVoices() ?? [], locale);
      if (!voice || typeof SpeechSynthesisUtterance === "undefined") {
        setFailed(true);
        return;
      }
      const id = generation.current;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = locale === "ar" ? 0.9 : 0.98;
      utterance.pitch = locale === "ar" ? 1.08 : 1.18;
      utterance.volume = 1;
      const finish = (error = false) => {
        if (id !== generation.current) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setSpeaking(null);
        setFailed(error);
      };
      utterance.onstart = () => {
        if (id !== generation.current) return;
        if (timer.current) clearTimeout(timer.current);
        setSpeaking(owner);
        timer.current = setTimeout(() => {
          stop();
          setFailed(true);
        }, 120_000);
      };
      utterance.onend = () => finish();
      utterance.onerror = () => finish(true);
      timer.current = setTimeout(() => {
        stop();
        setFailed(true);
      }, 8000);
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        stop();
        setFailed(true);
      }
    },
    [locale, listening, muted, stop],
  );

  return (
    <VoiceContext.Provider
      value={{ muted, available: !!selectVoice(voices, locale), speaking, failed, listening, setListening, toggleMute, stop, speak }}
    >
      {children}
    </VoiceContext.Provider>
  );
}
