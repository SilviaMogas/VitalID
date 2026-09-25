"use client";

import type { ReactNode } from "react";
import { Companion } from "@/components/companions/Companion";
import type { CompanionName } from "@/lib/companions";

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

export function Field({
  id,
  label,
  children,
  hint,
  optional,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
  optional?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between text-xs font-medium text-ink-2">
        <span>{label}</span>
        {optional && <span className="text-[11px] font-normal text-muted">{optional}</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  placeholder,
}: {
  id: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        dir="ltr"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${inputClass} ${unit ? "pe-14" : ""}`}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-xs text-muted">
          {unit}
        </span>
      )}
    </div>
  );
}

/** Selectable pill/tile used for goals, gender, activity level, blood type. */
export function Choice({
  selected,
  onClick,
  children,
  icon,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={`press flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-start text-sm font-medium transition ${
        selected
          ? "border-brand bg-brand-soft text-brand-deep ring-1 ring-brand/30"
          : "border-line bg-white text-ink-2 hover:bg-canvas"
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
      <span
        aria-hidden
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
          selected ? "border-brand bg-brand text-white" : "border-line bg-white text-transparent"
        }`}
      >
        ✓
      </span>
    </button>
  );
}

export function StepHeader({
  eyebrow,
  title,
  subtitle,
  companion,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  companion?: CompanionName;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>
      </div>
      {companion && <Companion name={companion} mood="calm" size={64} className="shrink-0" />}
    </div>
  );
}

export function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-end font-medium text-ink">{value}</span>
    </div>
  );
}
