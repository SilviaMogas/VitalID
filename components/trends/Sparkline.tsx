"use client";

const STROKE = {
  good: "#15803d",
  warn: "#b45309",
  bad: "#b91c1c",
  neutral: "#3b4658",
} as const;

export function Sparkline({
  values,
  baseline,
  tone = "neutral",
  className = "",
}: {
  values: number[];
  baseline?: number;
  tone?: keyof typeof STROKE;
  className?: string;
}) {
  if (values.length < 2) return null;
  const w = 100;
  const h = 40;
  const all = baseline === undefined ? values : [...values, baseline];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 4 - ((v - min) / span) * (h - 8);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden style={{ direction: "ltr" }}>
      {baseline !== undefined && (
        <line x1="0" x2={w} y1={y(baseline)} y2={y(baseline)} stroke="#c9ceD8" strokeDasharray="3 3" strokeWidth="1" />
      )}
      <path d={path} fill="none" stroke={STROKE[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.5" fill={STROKE[tone]} />
    </svg>
  );
}
