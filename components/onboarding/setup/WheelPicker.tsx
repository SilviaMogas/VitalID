"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const PAD_COUNT = Math.floor(VISIBLE / 2);
const SETTLE_MS = 120;

/** One scroll-snap column of sequential integers, styled like a mechanical scale wheel. */
function WheelColumn({
  values,
  value,
  onChange,
  format = (v: number) => String(v),
  ariaLabel,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const emittedRef = useRef(value);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [centerIndex, setCenterIndex] = useState(() => Math.max(0, values.indexOf(value)));

  // Initial scroll position (no smooth animation on mount).
  useEffect(() => {
    const idx = values.indexOf(emittedRef.current);
    if (idx !== -1 && containerRef.current) containerRef.current.scrollTop = idx * ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow external value changes (e.g. loaded from server) that didn't come from this wheel.
  useEffect(() => {
    if (value === emittedRef.current) return;
    const idx = values.indexOf(value);
    if (idx === -1) return;
    emittedRef.current = value;
    setCenterIndex(idx);
    containerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
  }, [value, values]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  function readCenterIndex() {
    const el = containerRef.current;
    if (!el) return centerIndex;
    return Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)));
  }

  function handleScroll() {
    setCenterIndex(readCenterIndex());
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const idx = readCenterIndex();
      const v = values[idx];
      if (v !== emittedRef.current) {
        emittedRef.current = v;
        onChange(v);
      }
    }, SETTLE_MS);
  }

  return (
    <div className="relative select-none" style={{ height: ITEM_HEIGHT * VISIBLE }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 rounded-xl bg-brand-soft"
        style={{ height: ITEM_HEIGHT }}
      />
      <div
        ref={containerRef}
        role="listbox"
        aria-label={ariaLabel}
        onScroll={handleScroll}
        className="wheel-scroll relative z-10 h-full snap-y snap-mandatory overflow-y-scroll"
        style={{ paddingBlock: ITEM_HEIGHT * PAD_COUNT }}
      >
        {values.map((v, i) => {
          const dist = Math.abs(i - centerIndex);
          return (
            <div
              key={v}
              role="option"
              aria-selected={i === centerIndex}
              className="tabular flex items-center justify-center text-xl transition-[opacity,color] duration-150"
              style={{
                height: ITEM_HEIGHT,
                opacity: dist === 0 ? 1 : dist === 1 ? 0.55 : dist === 2 ? 0.22 : 0,
                color: dist === 0 ? "var(--color-brand-deep)" : "var(--color-muted)",
                fontWeight: dist === 0 ? 700 : 500,
              }}
            >
              {format(v)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

/** Single-wheel integer picker, e.g. height in cm. */
export function HeightWheel({
  value,
  onChange,
  min = 50,
  max = 250,
  defaultValue = 170,
  unit = "cm",
  ariaLabel = "Height",
}: {
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  unit?: string;
  ariaLabel?: string;
}) {
  const values = useMemo(() => range(min, max), [min, max]);
  const current = value ?? defaultValue;
  return (
    <div className="flex items-center justify-center gap-2">
      <WheelColumn values={values} value={current} onChange={onChange} ariaLabel={ariaLabel} />
      <span className="text-sm font-semibold text-ink-2">{unit}</span>
    </div>
  );
}

/** Two-wheel decimal picker (whole + one decimal), e.g. weight in kg. */
export function WeightWheel({
  value,
  onChange,
  min = 20,
  max = 400,
  defaultValue = 70,
  unit = "kg",
  ariaLabel = "Weight",
}: {
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  unit?: string;
  ariaLabel?: string;
}) {
  const wholeValues = useMemo(() => range(min, max), [min, max]);
  const decValues = useMemo(() => range(0, 9), []);
  const current = value ?? defaultValue;
  const whole = Math.floor(current);
  const dec = Math.round((current - whole) * 10 + Number.EPSILON) % 10;

  return (
    <div className="flex items-center justify-center gap-1">
      <WheelColumn
        values={wholeValues}
        value={whole}
        onChange={(w) => onChange(Math.round((w + dec / 10) * 10) / 10)}
        ariaLabel={ariaLabel}
      />
      <span className="text-lg font-bold text-ink-2">.</span>
      <WheelColumn
        values={decValues}
        value={dec}
        onChange={(d) => onChange(Math.round((whole + d / 10) * 10) / 10)}
        ariaLabel={`${ariaLabel} decimal`}
      />
      <span className="ms-1 text-sm font-semibold text-ink-2">{unit}</span>
    </div>
  );
}
