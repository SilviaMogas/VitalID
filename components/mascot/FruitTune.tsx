"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";

// A short, bouncy loop synthesised with Web Audio so the 404 ships no audio
// files. Browsers block autoplay with sound, so it only starts on a tap.

const BPM = 132;
const STEP = 60 / BPM / 2; // eighth notes

// MIDI notes, null = rest. Two bars of melody over a simple bass line.
const MELODY: (number | null)[] = [
  72, null, 76, 79, 76, null, 72, 74,
  76, null, 79, 81, 79, null, 76, null,
  77, null, 81, 84, 81, null, 77, 79,
  76, 74, 72, null, 67, null, 72, null,
];
const BASS: (number | null)[] = [
  48, null, null, null, 55, null, null, null,
  45, null, null, null, 52, null, null, null,
  41, null, null, null, 48, null, null, null,
  43, null, null, null, 43, null, 48, null,
];

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function blip(ctx: AudioContext, out: AudioNode, midi: number, at: number, len: number, type: OscillatorType, gain: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq(midi), at);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

export function FruitTune() {
  const { t } = useLocale();
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    setPlaying(false);
  };

  const start = () => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    ctxRef.current = ctx;

    let step = 0;
    let next = ctx.currentTime + 0.05;
    // Lookahead scheduler: queue notes slightly ahead of the audio clock.
    const tick = () => {
      while (next < ctx.currentTime + 0.2) {
        const i = step % MELODY.length;
        const m = MELODY[i];
        const b = BASS[i];
        if (m !== null) blip(ctx, master, m, next, STEP * 0.9, "triangle", 0.5);
        if (b !== null) blip(ctx, master, b, next, STEP * 3, "sine", 0.6);
        next += STEP;
        step += 1;
      }
    };
    tick();
    timerRef.current = window.setInterval(tick, 50);
    setPlaying(true);
  };

  useEffect(() => stop, []);

  return (
    <button
      type="button"
      onClick={playing ? stop : start}
      aria-pressed={playing}
      className="press inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 transition hover:bg-sage"
    >
      <span aria-hidden className={playing ? "anim-dance inline-block" : "inline-block"}>{playing ? "🎶" : "🎵"}</span>
      {t(playing ? "common.musicOff" : "common.musicOn")}
    </button>
  );
}
