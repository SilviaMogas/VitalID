"use client";

import type { ReactNode } from "react";
import { useMembership } from "@/components/providers/MembershipProvider";
import { requiredPlanFor, type Feature } from "@/lib/plans";
import { LockIcon, UpgradeChip } from "./UpgradeChip";

/**
 * Gates a feature by plan. Default variant renders a dashed lock card instead
 * of children; `variant="overlay"` keeps children visible but blurred with an
 * upgrade chip on top. Renders nothing lock-related while membership loads.
 */
export function LockedFeature({
  feature,
  title,
  description,
  variant = "card",
  children,
}: {
  feature: Feature;
  title: string;
  description?: string;
  variant?: "card" | "overlay";
  children?: ReactNode;
}) {
  const { loading, hasFeature } = useMembership();

  if (loading || hasFeature(feature)) return <>{children}</>;

  const required = requiredPlanFor(feature);
  const chip = required === "free" ? null : <UpgradeChip plan={required} />;

  if (variant === "overlay") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-60 blur-sm" aria-hidden>
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <LockIcon className="h-5 w-5 text-ink-2" />
          <p className="text-sm font-semibold text-ink-2">{title}</p>
          {description && <p className="text-xs text-muted">{description}</p>}
          {chip}
        </div>
      </div>
    );
  }

  return (
    <div className="card border-dashed p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas text-muted">
          <LockIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          <div className="mt-3">{chip}</div>
        </div>
      </div>
    </div>
  );
}
