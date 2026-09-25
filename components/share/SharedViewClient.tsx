"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { isWorse, statusTone } from "@/components/dashboard/MetricCard";
import { METRIC_META } from "@/lib/vital-id";
import type { TranslationKey } from "@/lib/i18n";
import { isShareActive, type SharePayload } from "@/lib/sharing";

type State = "loading" | "unavailable" | "active";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</h2>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-end text-sm font-medium">{children}</span>
    </div>
  );
}

export default function SharedViewClient({ id }: { id: string }) {
  const { t, n, d, locale } = useLocale();
  const [state, setState] = useState<State>("loading");
  const [payload, setPayload] = useState<SharePayload | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/share/${id}`, { cache: "no-store" });
      if (res.status === 410) {
        setState("unavailable");
        setPayload(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const p = (await res.json()) as SharePayload;
      if (!isShareActive(p)) {
        setState("unavailable");
        setPayload(null);
        return;
      }
      setPayload(p);
      setState("active");
    } catch {
      /* transient error — keep current state */
    }
  }, [id]);

  useEffect(() => {
    const t0 = setTimeout(poll, 0);
    const iv = setInterval(() => {
      // Reflect client-side expiry without waiting for the next fetch.
      setPayload((p) => {
        if (p && !isShareActive(p)) {
          setState("unavailable");
          return null;
        }
        return p;
      });
      poll();
    }, 10_000);
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
    };
  }, [poll]);

  if (state === "loading") {
    return <p className="py-16 text-center text-muted">{t("common.loading")}</p>;
  }

  if (state === "unavailable" || !payload) {
    return (
      <div className="card mx-auto mt-16 max-w-sm p-8 text-center">
        <p className="text-lg font-semibold">{t("share.unavailable")}</p>
      </div>
    );
  }

  const s = payload.snapshot;
  const listSep = locale === "ar" ? "، " : ", ";
  const sharedBy = payload.sharedByLocalized?.[locale] ?? payload.sharedBy;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <SectionTitle>{t("share.recipientTitle")}</SectionTitle>
        <div className="mt-3 divide-y divide-line">
          <Row label={t("share.sharedBy")}>{sharedBy}</Row>
          <Row label={t("share.purposeLabel")}>
            {t(`share.purpose.${payload.purpose}` as TranslationKey)}
          </Row>
          <Row label={t("share.validUntil")}>
            {d(payload.expiresAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Row>
        </div>
      </div>

      {s.identity && (
        <div className="card p-5">
          <SectionTitle>{t("share.field.identity")}</SectionTitle>
          <div className="mt-3 divide-y divide-line">
            <Row label={t("vitalId.holder")}>{s.identity.fullName}</Row>
            <Row label={t("vitalId.dob")}>
              <span dir="ltr">{d(s.identity.dateOfBirth, { year: "numeric" })}</span>
            </Row>
            <Row label={t("vitalId.sex")}>
              {t(`vitalId.sex.${s.identity.sex}` as TranslationKey)}
            </Row>
            <Row label={t("vitalId.nationality")}>
              {t(`vitalId.nationality.${s.identity.nationality}` as TranslationKey)}
            </Row>
            <Row label={t("vitalId.idLabel")}>
              <span className="tabular font-mono" dir="ltr">
                {s.identity.vitalId}
              </span>
            </Row>
          </div>
        </div>
      )}

      {s.emergencyInfo && (
        <div className="card p-5">
          <SectionTitle>{t("vitalId.emergency")}</SectionTitle>
          <div className="mt-3 divide-y divide-line">
            <Row label={t("vitalId.bloodType")}>
              <span
                className="rounded-full bg-bad-soft px-2.5 py-0.5 text-xs font-bold text-bad"
                dir="ltr"
              >
                {s.emergencyInfo.bloodType}
              </span>
            </Row>
            <Row label={t("vitalId.allergies")}>
              {s.emergencyInfo.allergies.length === 0
                ? t("vitalId.none")
                : s.emergencyInfo.allergies
                    .map((a) => t(`vitalId.allergy.${a}` as TranslationKey))
                    .join(listSep)}
            </Row>
            <Row label={t("vitalId.conditions")}>
              {s.emergencyInfo.conditions.length === 0
                ? t("vitalId.none")
                : s.emergencyInfo.conditions.join(listSep)}
            </Row>
            <Row label={t("vitalId.emergencyContact")}>
              <span>
                {s.emergencyInfo.emergencyContact.name} ·{" "}
                {t(`vitalId.relation.${s.emergencyInfo.emergencyContact.relation}` as TranslationKey)}
                <br />
                <span className="tabular text-muted" dir="ltr">
                  {s.emergencyInfo.emergencyContact.phone}
                </span>
              </span>
            </Row>
          </div>
        </div>
      )}

      {s.currentSignals && (
        <div className="card p-5">
          <SectionTitle>{t("vitalId.currentSignals")}</SectionTitle>
          <div className="mt-3 divide-y divide-line">
            {s.currentSignals.map((m) => {
              const tone = statusTone(m.status, isWorse(m));
              const decimals = METRIC_META[m.metric].decimals;
              return (
                <div key={m.metric} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm font-medium text-ink-2">
                    {t(`metric.${m.metric}` as TranslationKey)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular text-sm font-semibold">
                      {n(m.value, decimals)}{" "}
                      <span className="text-xs font-normal text-muted">
                        {t(`unit.${m.unit}` as TranslationKey)}
                      </span>
                    </span>
                    <StatusBadge status={m.status} tone={tone} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {s.recentTrends && (
        <div className="card p-5">
          <SectionTitle>{t("vitalId.recentTrends")}</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {s.recentTrends.map((insight) => (
              <li key={insight.id} className="flex items-start gap-2.5 text-sm leading-snug">
                <span
                  aria-hidden
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    insight.severity === "attention" ? "bg-warn" : "bg-brand"
                  }`}
                />
                {t(insight.key as TranslationKey, insight.params)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.healthProfile && (
        <div className="card p-5">
          <SectionTitle>{t("vitalId.healthProfile")}</SectionTitle>
          <div className="mt-3 divide-y divide-line">
            <Row label={t("vitalId.height")}>
              <span className="tabular">
                {n(s.healthProfile.heightCm)} {t("vitalId.cm")}
              </span>
            </Row>
            <Row label={t("vitalId.weight")}>
              <span className="tabular">
                {n(s.healthProfile.weightKg)} {t("vitalId.kg")}
              </span>
            </Row>
            <Row label={t("vitalId.medications")}>
              {s.healthProfile.medications.length === 0
                ? t("vitalId.none")
                : s.healthProfile.medications.join(listSep)}
            </Row>
          </div>
        </div>
      )}

      {s.sources && (
        <div className="card p-5">
          <SectionTitle>{t("vitalId.dataSources")}</SectionTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.sources.map((src) => (
              <span
                key={src}
                className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand"
              >
                {t(`source.${src}` as TranslationKey)}
              </span>
            ))}
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-muted">{t("share.readonlyFooter")}</footer>
    </div>
  );
}
