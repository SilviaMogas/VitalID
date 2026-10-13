import Image from "next/image";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/Logo";

/**
 * Public brand kit at /brand: the brandbook in short, plus every asset as a
 * direct download. Copy is English-only (press and partner audience) and is
 * pinned LTR so it keeps its layout when the UI is switched to Arabic.
 * Source of truth for the rules: docs/BRAND.md.
 */

const LOGOS = [
  { file: "logo-mark-green.svg", label: "Mark · green", note: "On light backgrounds", dark: false },
  { file: "logo-mark-white.svg", label: "Mark · white", note: "On brand green", dark: true },
  { file: "logo-mark-ink.svg", label: "Mark · ink", note: "One-colour print only", dark: false },
  { file: "app-icon.svg", label: "App icon", note: "Avatars, favicon, app tile", dark: false },
  { file: "logo-horizontal-green.svg", label: "Lockup · green", note: "On light backgrounds", dark: false, wide: true },
  { file: "logo-horizontal-white.svg", label: "Lockup · white", note: "On brand green", dark: true, wide: true },
];

const COLORS = [
  { name: "Brand", hex: "#0e7a5f", use: "Logo, primary action, links" },
  { name: "Brand deep", hex: "#0a5c48", use: "Pressed states, card waves" },
  { name: "Hero top", hex: "#164d40", use: "Identity gradient, start" },
  { name: "Hero bottom", hex: "#0b3229", use: "Identity gradient, end" },
  { name: "Mint", hex: "#b7e4c7", use: "Leaf, IDs and accents on green" },
  { name: "Brand soft", hex: "#e8f3ef", use: "Tinted chips, active nav" },
  { name: "Canvas", hex: "#f5f5f7", use: "Page background" },
  { name: "Ink", hex: "#1d1d1f", use: "Body text" },
  { name: "Coral", hex: "#ff8a7a", use: "Mascot warmth only, never a status" },
];

const CREW = [
  { src: "/companions/heart.png", name: "Heart", role: "Health" },
  { src: "/brand/crew/nutrition.svg", name: "Broccoli", role: "Nutrition" },
  { src: "/companions/dumbbell.png", name: "Dumbbell", role: "Movement" },
  { src: "/companions/moon.png", name: "Moon", role: "Rest" },
  { src: "/brand/crew/mindfulness.svg", name: "Lotus", role: "Mindfulness" },
  { src: "/brand/crew/hydration.svg", name: "Drop", role: "Hydration" },
  { src: "/companions/shield.png", name: "Shield", role: "Privacy and sharing" },
  { src: "/companions/muscle.png", name: "Muscle", role: "Strength" },
  { src: "/coach/doctor.png", name: "Coach", role: "Rule-based guidance" },
];

const POSTS = [
  "Health has a new identity",
  "Your health lives everywhere",
  "One card. Your whole picture",
  "Share 3 facts. For 1 hour",
  "Meet the crew",
  "Your health. In your hands",
];

const NEVER = [
  "Vital ID is not a medical device and does not give medical advice.",
  "The Coach is rule-based. It is not AI and not a doctor.",
  "WHOOP is the only live integration; others are “coming soon”.",
  "Revoking a share stops new reads; it does not erase copies already saved.",
  "Sample data is always labelled DEMO or “Sample data”.",
];

function Download({ href, children = "Download" }: Readonly<{ href: string; children?: string }>) {
  return (
    <a
      href={href}
      download
      className="press inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-deep"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </a>
  );
}

function Section({ id, title, lead, children }: Readonly<{ id: string; title: string; lead: string; children: ReactNode }>) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-ink-2">{lead}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function BrandKit() {
  return (
    <div dir="ltr" lang="en" className="space-y-14">
      <header className="hero-green relative overflow-hidden rounded-[1.75rem] p-7 md:p-10">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">Brand kit</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.02] tracking-[-0.045em] md:text-6xl">
              Your health.
              <br />
              <span className="text-mint">In your hands.</span>
            </h1>
            <p className="mt-4 text-white/80">
              Logos, colours, type and the Vital ID crew, ready to use. Please keep to the guidelines below
              when you write or design about Vital ID.
            </p>
          </div>
          <LogoMark size={120} tone="light" className="shrink-0" />
        </div>
      </header>

      <Section id="logo" title="Logo" lead="A heart with a leaf: health and natural wellbeing in one shape. Write the name as “Vital ID”: two words, ID in capitals.">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {LOGOS.map((l) => (
            <li key={l.file} className={`card flex flex-col overflow-hidden ${l.wide ? "col-span-2" : ""}`}>
              <div className={`grid h-32 place-items-center p-5 ${l.dark ? "bg-brand" : "bg-canvas"}`}>
                <Image src={`/brand/logos/${l.file}`} alt={l.label} width={l.wide ? 270 : 72} height={l.wide ? 60 : 72} unoptimized />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{l.label}</p>
                  <p className="text-sm text-muted">{l.note}</p>
                </div>
                <Download href={`/brand/logos/${l.file}`}>SVG</Download>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-2">
          Keep clear space of half the mark’s height on every side. Minimum size 20&nbsp;px tall on screen. Do not
          recolour, rotate, add shadows or replace the leaf.
        </p>
      </Section>

      <Section id="colour" title="Colour" lead="One calm green on a very light grey canvas. The identity gradient runs from Hero top to Hero bottom at 140°.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COLORS.map((c) => (
            <li key={c.hex} className="card overflow-hidden">
              <div className="h-20 border-b border-black/5" style={{ background: c.hex }} />
              <div className="p-3.5">
                <p className="font-semibold">{c.name}</p>
                <p className="tabular font-mono text-sm text-ink-2">{c.hex}</p>
                <p className="mt-1 text-xs text-muted">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-2">
          Status colours (stable, improving, declining, unusual) always carry their word. Never signal a status by
          colour alone.
        </p>
      </Section>

      <Section id="type" title="Type" lead="The system sans: SF Pro on Apple, Segoe UI on Windows, Noto Sans Arabic for Arabic. Where those are not available, use Inter.">
        <div className="card space-y-4 p-6">
          <p className="text-5xl font-bold leading-none tracking-[-0.045em]">Your health.</p>
          <p className="text-2xl font-semibold tracking-tight">How is it changing?</p>
          <p className="text-ink-2">Share only what you choose, for as long as you choose.</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Portable health identity</p>
          <p className="text-3xl font-bold" dir="rtl" lang="ar">صحتك. بين يديك.</p>
        </div>
      </Section>

      <Section id="crew" title="The crew" lead="Friendly guides that explain the signals. Use them whole and happy; never sad, ill or in clinical messages.">
        <ul className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-9">
          {CREW.map((m) => (
            <li key={m.src} className="card flex flex-col items-center gap-2 p-3 text-center">
              <Image src={m.src} alt={`${m.name} mascot`} width={72} height={72} className="h-[72px] w-[72px] object-contain" unoptimized />
              <p className="text-sm font-semibold leading-tight">{m.name}</p>
              <p className="text-[11px] leading-tight text-muted">{m.role}</p>
              <Download href={m.src}>{m.src.endsWith(".svg") ? "SVG" : "PNG"}</Download>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="voice" title="Voice" lead="Clear, warm and precise. Short sentences, second person, sentence case. No emoji in the product.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card p-5">
            <p className="font-semibold">Say it like this</p>
            <ul className="mt-3 space-y-2 text-ink-2">
              <li>Your health. In your hands.</li>
              <li>Your portable health identity.</li>
              <li>Share only what you choose, for as long as you choose.</li>
              <li>A clearer view of your wellbeing.</li>
            </ul>
          </div>
          <div className="card p-5">
            <p className="font-semibold">Never claim</p>
            <ul className="mt-3 space-y-2 text-ink-2">
              {NEVER.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="social" title="Launch series" lead="Six Instagram posts at 4:5 (1080 × 1350), each an 8-second motion loop with a still cover.">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {POSTS.map((title, i) => {
            const n = String(i + 1).padStart(2, "0");
            return (
              <li key={n} className="card overflow-hidden">
                <video
                  className="aspect-[4/5] w-full bg-canvas object-cover"
                  src={`/brand/social/${n}.mp4`}
                  poster={`/brand/social/${n}.png`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={title}
                />
                <div className="space-y-1.5 p-3.5">
                  <p className="text-sm font-semibold leading-tight">
                    {n} · {title}
                  </p>
                  <div className="flex gap-4">
                    <Download href={`/brand/social/${n}.mp4`}>MP4</Download>
                    <Download href={`/brand/social/${n}.png`}>PNG</Download>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
