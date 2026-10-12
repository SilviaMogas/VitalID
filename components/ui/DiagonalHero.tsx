import type { ReactNode } from "react";

/** Shared page/step heading. The legacy export name is kept for existing callers. */
export function DiagonalHero({
  title,
  subtitle,
  icon,
  compact = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Smaller padding, for use inside a card/step rather than as a full page header. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-between gap-5 ${
        compact ? "py-4" : "pb-4 pt-2"
      } ${className}`}
    >
      <div className="min-w-0">
        <p className={`font-semibold tracking-tight text-ink ${compact ? "text-xl sm:text-2xl" : "text-3xl md:text-4xl"}`}>
          {title}
        </p>
        {subtitle && <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {icon && (
        <div className="pointer-events-none shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}
