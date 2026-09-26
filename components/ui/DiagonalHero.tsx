import type { ReactNode } from "react";

/**
 * Diagonal-cut banner with a bold italic headline, inspired by the
 * Decathlon Coach app's step/section headers (WELCOME, HEIGHT, FOLLOW-UP…).
 */
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
      className={`hero-diagonal relative overflow-hidden rounded-[1.75rem] ${
        compact ? "px-5 pb-8 pt-5" : "px-6 pb-12 pt-6 md:px-8 md:pb-16 md:pt-8"
      } ${className}`}
    >
      <div className="relative z-10 max-w-[75%]">
        <p className={`display-italic ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl md:text-4xl"}`}>
          {title}
        </p>
        {subtitle && <p className="mt-3 max-w-prose text-sm text-white/80">{subtitle}</p>}
      </div>
      {icon && (
        <div className="pointer-events-none absolute end-4 top-1/2 z-0 -translate-y-1/2 opacity-90 sm:end-6">
          {icon}
        </div>
      )}
    </div>
  );
}
