"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";
import { isShareActive, type SharePayload } from "@/lib/sharing";
import { getInsurer } from "@/lib/insurers";
import { LogoMark } from "@/components/layout/Logo";
import { Broccoli } from "@/components/mascot/Broccoli";
import { Companion } from "@/components/companions/Companion";
import {
  EmergencySection,
  HealthProfileSection,
  Row,
  SectionTitle,
  SignalsSection,
  SourcePills,
  TrendsSection,
} from "@/components/vital-id/VitalIdSections";

type State = "loading" | "unavailable" | "active";

export default function SharedViewClient({ id }: { id: string }) {
  const { t, d, locale } = useLocale();
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
        <Broccoli state="neutral" size={72} className="anim-float mx-auto" />
        <p className="mt-4 text-lg font-semibold">{t("share.unavailable")}</p>
      </div>
    );
  }

  const s = payload.snapshot;
  const sharedBy = payload.sharedByLocalized?.[locale] ?? payload.sharedBy;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2.5">
        <LogoMark size={28} tone="brand" />
        <span className="text-sm font-semibold tracking-tight">{t("app.name")}</span>
      </header>

      <div className="surface flex items-center gap-3 p-4">
        <Broccoli state="neutral" size={40} className="anim-float shrink-0" />
        <p className="text-sm font-medium text-ink-2">{t("mascot.recipient")}</p>
      </div>

      <div className="card p-5">
        <SectionTitle>{t("share.recipientTitle")}</SectionTitle>
        <div className="mt-3 flex items-center gap-3">
          <Companion name="shield" mood="calm" size={48} label={t("companion.shield")} />
          <p className="text-xs text-muted">{t("companion.shieldNote")}</p>
        </div>
        <div className="mt-3 divide-y divide-line">
          <Row label={t("share.sharedBy")}>{sharedBy}</Row>
          <Row label={t("share.purposeLabel")}>
            {t(`share.purpose.${payload.purpose}` as TranslationKey)}
          </Row>
          {!!payload.sentTo?.length && (
            <Row label={t("share.sentTo")}>
              <span className="flex flex-wrap justify-end gap-x-2 gap-y-1">
                {payload.sentTo.map((recipient) => {
                  const insurer = getInsurer(recipient.insurerId);
                  if (!insurer) return null;
                  return (
                    <span key={recipient.insurerId} className="inline-flex items-center gap-1">
                      <span
                        className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: insurer.color }}
                      >
                        {insurer.monogram}
                      </span>
                      {locale === "ar" ? insurer.nameAr : insurer.name}
                    </span>
                  );
                })}
              </span>
            </Row>
          )}
          <Row label={t("share.validUntil")}>
            {d(payload.expiresAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Row>
        </div>
      </div>

      {s.identity && (
        <div className="surface p-5">
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

      {s.emergencyInfo && <EmergencySection info={s.emergencyInfo} />}

      {s.currentSignals && <SignalsSection signals={s.currentSignals} />}

      {s.recentTrends && <TrendsSection insights={s.recentTrends} />}

      {s.healthProfile && <HealthProfileSection profile={s.healthProfile} />}

      {s.sources && (
        <div className="surface p-5">
          <SectionTitle>{t("vitalId.dataSources")}</SectionTitle>
          <SourcePills sources={s.sources} />
        </div>
      )}

      <footer className="text-center text-xs text-muted">{t("share.readonlyFooter")}</footer>
    </div>
  );
}
