"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/app/providers";
import { getItem, setItem } from "@/lib/storage";
import { selectVoice } from "@/lib/guide";

type VoiceContext = {
  muted: boolean; available: boolean; speaking: string | null; failed: boolean;
  listening: boolean; setListening: (value: boolean) => void;
  toggleMute: () => void; stop: () => void; speak: (text: string, owner: string) => void;
};
const Context = createContext<VoiceContext | null>(null);
export function useVoice() {
  const value = useContext(Context);
  if (!value) throw new Error("VoiceProvider is required");
  return value;
}

export default function VoiceProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const path = usePathname();
  const [muted, setMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [listening, setListeningState] = useState(false);
  const generation = useRef(0);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    utterance.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(null);
  }, []);

  useEffect(() => {
    setMuted(getItem<boolean>("vitalid.voiceMuted") === true);
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
  }, [lang, path, stop]);

  const toggleMute = () => {
    stop();
    const next = !muted;
    setMuted(next);
    setItem("vitalid.voiceMuted", next);
  };
  const setListening = useCallback((value: boolean) => {
    if (value) stop();
    setListeningState(value);
  }, [stop]);

  const speak = useCallback((text: string, owner: string) => {
    stop();
    setFailed(false);
    if (muted || listening) return;
    const voice = selectVoice(window.speechSynthesis?.getVoices() ?? [], lang);
    if (!voice || typeof SpeechSynthesisUtterance === "undefined") {
      setFailed(true);
      return;
    }
    const id = generation.current;
    const u = new SpeechSynthesisUtterance(text);
    utterance.current = u;
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = lang === "ar" ? 0.9 : 0.98;
    u.pitch = lang === "ar" ? 1.08 : 1.18;
    u.volume = 1;
    const finish = (error = false) => {
      if (id !== generation.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      utterance.current = null;
      setSpeaking(null);
      setFailed(error);
    };
    // Animate only when the browser confirms that speech has started.
    u.onstart = () => {
      if (id !== generation.current) return;
      if (timer.current) clearTimeout(timer.current);
      setSpeaking(owner);
      timer.current = setTimeout(() => { stop(); setFailed(true); }, 120_000);
    };
    u.onend = () => finish();
    u.onerror = () => finish(true);
    timer.current = setTimeout(() => { stop(); setFailed(true); }, 8000);
    try { window.speechSynthesis.speak(u); }
    catch { stop(); setFailed(true); }
  }, [lang, listening, muted, stop]);

  return <Context.Provider value={{
    muted, available: !!selectVoice(voices, lang), speaking, failed,
    listening, setListening, toggleMute, stop, speak,
  }}>{children}</Context.Provider>;
}
