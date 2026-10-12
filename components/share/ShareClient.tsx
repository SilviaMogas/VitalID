"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMembership } from "@/components/providers/MembershipProvider";
import { LockedFeature } from "@/components/membership/LockedFeature";
import { LockIcon, UpgradeChip } from "@/components/membership/UpgradeChip";
import type { TranslationKey } from "@/lib/i18n";
import { SectionTitle } from "@/components/vital-id/VitalIdSections";
import { MascotNote } from "@/components/mascot/MascotNote";
import { Companion } from "@/components/companions/Companion";
import {
  PURPOSE_PRESETS,
  SHARE_DURATIONS,
  SHARE_FIELDS,
  SHARE_PURPOSES,
  type ShareDuration,
  type ShareField,
  type SharePayload,
  type SharePurpose,
  type ShareRecipient,
} from "@/lib/sharing";
import { getInsurer, INSURERS, type InsurerId } from "@/lib/insurers";
import { InsurerMonogram, resolveRecipients } from "@/components/share/InsurerBadge";
import { DisclosurePreview } from "@/components/share/DisclosurePreview";

interface ShareSummary {
  id: string;
  purpose: SharePurpose;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  selectedFields: ShareField[];
  sentTo?: ShareRecipient[];
}

interface ConfirmedShareMutation {
  version: number;
  share?: ShareSummary;
  sentTo?: ShareRecipient[];
}

function orderShares(shares: ShareSummary[]): ShareSummary[] {
  return [...shares].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function upsertShare(shares: ShareSummary[], next: ShareSummary): ShareSummary[] {
  return orderShares([...shares.filter((share) => share.id !== next.id), next]);
}

function statusOf(s: ShareSummary): "active" | "expired" | "revoked" {
  if (s.revoked) return "revoked";
  return new Date(s.expiresAt).getTime() > Date.now() ? "active" : "expired";
}

const STATUS_BADGE: Record<ReturnType<typeof statusOf>, string> = {
  active: "bg-good-soft text-good",
  expired: "bg-canvas text-muted",
  revoked: "bg-bad-soft text-bad",
};

export default function ShareClient() {
  const { t, d, locale } = useLocale();
  const { account } = useAuth();
  const { hasFeature } = useMembership();
  const canPickExpiry = hasFeature("configurableExpiry");
  const [purpose, setPurpose] = useState<SharePurpose | null>(null);
  const [fields, setFields] = useState<Set<ShareField>>(new Set());
  const [duration, setDuration] = useState<ShareDuration>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SharePayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [shares, setShares] = useState<ShareSummary[]>([]);
  const [selectedInsurers, setSelectedInsurers] = useState<Set<InsurerId>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);
  const [sendFailed, setSendFailed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentMissing, setConsentMissing] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState("");
  const [accountCodeFeedback, setAccountCodeFeedback] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ snapshot: SharePayload["snapshot"] } | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [disclosureConsent, setDisclosureConsent] = useState(false);
  const sharesRequestVersion = useRef(0);
  const latestAppliedSharesVersion = useRef(0);
  const confirmedRevokedShareIds = useRef(new Set<string>());
  const confirmedShareMutations = useRef(new Map<string, ConfirmedShareMutation>());
  const fieldKey = SHARE_FIELDS.filter((field) => fields.has(field)).join(",");
  const validRecipient = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(recipientUserId.trim());

  async function copyAccountCode() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.userId);
      setAccountCodeFeedback(locale === "ar" ? "تم نسخ رمزك." : "Your code is copied.");
    } catch {
      setAccountCodeFeedback(locale === "ar" ? "تعذر النسخ. حدد الرمز أدناه وانسخه يدوياً." : "Couldn’t copy. Select the code below and copy it manually.");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    setPreviewError(false);
    setDisclosureConsent(false);
    if (!fieldKey) return () => controller.abort();
    void fetch("/api/share/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedFields: fieldKey.split(",") }),
      cache: "no-store",
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error("Preview unavailable");
      const data = await res.json();
      if (!controller.signal.aborted) setPreview(data);
    }).catch(() => {
      if (!controller.signal.aborted) setPreviewError(true);
    });
    return () => controller.abort();
  }, [fieldKey]);

  const link = useMemo(
    () =>
      result && typeof window !== "undefined"
        ? `${window.location.origin}/shared/${result.id}`
        : "",
    [result],
  );

  const refreshShares = useCallback(async () => {
    const requestVersion = ++sharesRequestVersion.current;
    try {
      const res = await fetch("/api/share", { cache: "no-store" });
      if (res.ok) {
        const nextShares = (await res.json()) as ShareSummary[];
        if (requestVersion <= latestAppliedSharesVersion.current) return;
        for (const [id, mutation] of confirmedShareMutations.current) {
          if (mutation.version < requestVersion) confirmedShareMutations.current.delete(id);
        }
        const mergedShares = new Map(nextShares.map((share) => [share.id, share]));
        for (const [id, mutation] of confirmedShareMutations.current) {
          if (mutation.share && !mergedShares.has(id)) mergedShares.set(id, mutation.share);
          if (mutation.sentTo) {
            const share = mergedShares.get(id);
            if (share) mergedShares.set(id, { ...share, sentTo: mutation.sentTo });
          }
        }
        latestAppliedSharesVersion.current = requestVersion;
        setShares(orderShares(Array.from(mergedShares.values())).map((share) =>
          confirmedRevokedShareIds.current.has(share.id) ? { ...share, revoked: true } : share,
        ));
      }
    } catch {
      /* keep current list */
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(refreshShares, 0);
    return () => clearTimeout(t0);
  }, [refreshShares]);

  function pickPurpose(p: SharePurpose) {
    setPurpose(p);
    setFields(new Set(PURPOSE_PRESETS[p]));
  }

  function toggleField(f: ShareField) {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  async function generate() {
    if (fields.size === 0) {
      setError(t("share.selectAtLeastOne"));
      return;
    }
    if (!preview || !disclosureConsent || !validRecipient) {
      setError(locale === "ar" ? "أدخل معرّف المستلم وراجع البيانات ووافق على المشاركة." : "Enter the recipient’s account ID, review the data and authorize this disclosure.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: purpose ?? "custom",
          selectedFields: Array.from(fields),
          durationMinutes: duration,
          recipientUserId: recipientUserId.trim().toLowerCase(),
          expectedSnapshot: preview.snapshot,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = (await res.json()) as SharePayload;
      const createdShare: ShareSummary = {
        id: created.id,
        purpose: created.purpose,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
        revoked: created.revoked,
        selectedFields: created.selectedFields,
        sentTo: created.sentTo ?? [],
      };
      confirmedShareMutations.current.set(created.id, {
        version: sharesRequestVersion.current,
        share: createdShare,
      });
      setShares((current) => upsertShare(current, createdShare));
      setResult(created);
      setSelectedInsurers(new Set());
      setSendFeedback(null);
      setSendFailed(false);
      refreshShares();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      const response = await fetch(`/api/share/${id}/revoke`, { method: "POST" });
      if (!response.ok) throw new Error("Revocation not confirmed");
      confirmedRevokedShareIds.current.add(id);
      if (result?.id === id) setResult({ ...result, revoked: true });
      setShares((current) => current.map((share) => share.id === id ? { ...share, revoked: true } : share));
      refreshShares();
    } catch {
      setError(t("common.error"));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function toggleInsurer(id: InsurerId) {
    setSelectedInsurers((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSendFeedback(null);
    setSendFailed(false);
    setConsentMissing(false);
  }

  async function sendToInsurers() {
    if (!result || selectedInsurers.size === 0) return;
    if (!consent) {
      setConsentMissing(true);
      return;
    }
    const selected = Array.from(selectedInsurers);
    setSending(true);
    setSendFeedback(null);
    setSendFailed(false);
    try {
      const res = await fetch(`/api/share/${result.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insurers: selected, consent: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const response = (await res.json()) as { id: string; sentTo: ShareRecipient[] };
      const existingMutation = confirmedShareMutations.current.get(response.id);
      const mutationVersion = sharesRequestVersion.current;
      confirmedShareMutations.current.set(response.id, {
        ...(existingMutation ?? {}),
        version: Math.max(existingMutation?.version ?? 0, mutationVersion),
        sentTo: response.sentTo,
      });
      setResult((current) =>
        current?.id === response.id ? { ...current, sentTo: response.sentTo } : current,
      );
      setShares((current) => current.map((share) =>
        share.id === response.id ? { ...share, sentTo: response.sentTo } : share,
      ));
      setSelectedInsurers(new Set());
      setConsent(false);
      const names = selected
        .map((id) => getInsurer(id))
        .filter((insurer): insurer is NonNullable<typeof insurer> => Boolean(insurer))
        .map((insurer) => (locale === "ar" ? insurer.nameAr : insurer.name))
        .join(locale === "ar" ? "، " : ", ");
      setSendFeedback(t("share.sentSuccess", { names }));
      refreshShares();
    } catch {
      setSendFeedback(t("common.error"));
      setSendFailed(true);
    } finally {
      setSending(false);
    }
  }

  async function resetDemo() {
    if (!window.confirm(t("share.resetConfirm"))) return;
    await fetch("/api/share/reset", { method: "POST" });
    const resetBarrier = ++sharesRequestVersion.current;
    latestAppliedSharesVersion.current = resetBarrier;
    confirmedShareMutations.current.clear();
    setResult(null);
    setShares([]);
    setFields(new Set());
    setPurpose(null);
    setSelectedInsurers(new Set());
    setSendFeedback(null);
    setSendFailed(false);
    setConsent(false);
    setConsentMissing(false);
    refreshShares();
  }

  const activeShares = shares.filter((s) => statusOf(s) === "active");
  const pastShares = shares.filter((s) => statusOf(s) !== "active");

  function renderShareRow(s: ShareSummary) {
    const st = statusOf(s);
    return (
      <div
        key={s.id}
        className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {t(`share.purpose.${s.purpose}` as TranslationKey)}
            {!!s.sentTo?.length && (
              <span className="ms-2 inline-flex -space-x-1 align-middle">
                {resolveRecipients(s.sentTo).map(({ recipient, insurer }) => (
                  <span key={recipient.insurerId} title={locale === "ar" ? insurer.nameAr : insurer.name}>
                    <InsurerMonogram insurer={insurer} className="h-5 w-5 text-[9px] ring-2 ring-white" />
                  </span>
                ))}
              </span>
            )}
            <span className="ms-2 font-mono text-xs text-muted" dir="ltr">
              {s.id}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t("share.validUntil")}{" "}
            {d(s.expiresAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[st]}`}>
            {t(`share.status.${st}` as TranslationKey)}
          </span>
          {st === "active" && (
            <button
              type="button"
              onClick={() => revoke(s.id)}
              className="press rounded-full bg-white px-3 py-1 text-xs font-medium text-bad ring-1 ring-bad/40 transition hover:bg-bad-soft"
            >
              {t("share.revoke")}
            </button>
          )}
        </span>
      </div>
    );
  }

  const pill = (on: boolean) =>
    `press rounded-2xl px-4 py-1.5 text-sm font-medium transition ${
      on
        ? "bg-brand text-white shadow-card"
        : "bg-white text-ink-2 ring-1 ring-line hover:bg-sage"
    }`;

  return (
    <div className="space-y-5">
      <section className="flex items-center gap-3">
        <Companion name="shield" mood="idle" size={56} label={t("companion.shield")} className="shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("share.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("share.subtitle")}</p>
        </div>
      </section>

      <div className="rise" style={{ ["--i" as string]: 0 }}>
        <MascotNote state="encouraging" size={56}>
          {t("mascot.shareIntro")}
        </MascotNote>
      </div>

      {/* Step 1 — purpose */}
      <div className="card rise p-5" style={{ ["--i" as string]: 1 }}>
        <div className="flex items-baseline gap-2">
          <SectionTitle>{t("share.stepPurpose")}</SectionTitle>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SHARE_PURPOSES.map((p) => (
            <button key={p} type="button" onClick={() => pickPurpose(p)} className={pill(purpose === p)}>
              {t(`share.purpose.${p}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — fields */}
      <div className="card rise p-5" style={{ ["--i" as string]: 2 }}>
        <div className="flex items-baseline gap-2">
          <SectionTitle>{t("share.stepInfo")}</SectionTitle>
        </div>
        <div className="mt-3 space-y-2">
          {SHARE_FIELDS.map((f) => (
            <label
              key={f}
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line transition hover:ring-brand"
            >
              <input
                type="checkbox"
                checked={fields.has(f)}
                onChange={() => toggleField(f)}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-medium">{t(`share.field.${f}` as TranslationKey)}</span>
                <span className="block text-xs text-muted">{t(`share.preview.${f}` as TranslationKey)}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Step 3 — expiry */}
      <div className="card rise p-5" style={{ ["--i" as string]: 3 }}>
        <div className="flex items-baseline gap-2">
          <SectionTitle>{t("share.stepExpiry")}</SectionTitle>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SHARE_DURATIONS.map((dur) => {
            const locked = !canPickExpiry && dur !== 60;
            return (
              <button
                key={dur}
                type="button"
                disabled={locked}
                onClick={() => { setDuration(locked ? 60 : dur); setDisclosureConsent(false); }}
                className={`${pill(duration === dur)} ${locked ? "inline-flex items-center gap-1 opacity-60" : ""}`}
              >
                {t(`share.duration.${dur}` as TranslationKey)}
                {locked && <LockIcon className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
        {!canPickExpiry && (
          <div className="mt-3">
            <UpgradeChip plan="plus" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <section className="card space-y-4 p-5" aria-labelledby="share-recipient-heading">
        <h2 id="share-recipient-heading" className="text-lg font-semibold">
          {locale === "ar" ? "٤. من يمكنه فتح الرابط؟" : "4. Who can open this link?"}
        </h2>
        <p id="recipient-help" className="text-sm leading-relaxed text-muted">
          {locale === "ar"
            ? "سيتمكن حساب المستلم الذي تختاره فقط من فتح الرابط عند تسجيل الدخول، بالإضافة إليك. إعادة توجيه الرابط لا تمنح الآخرين الوصول."
            : "Only the recipient account you choose can open the link when signed in, besides you. Forwarding the link won’t give anyone else access."}
        </p>
        <div className="rounded-2xl bg-canvas p-4 text-sm">
          <p className="font-semibold">{locale === "ar" ? "كيف تحصل على رمز المستلم؟" : "How do I get their code?"}</p>
          <ol className="mt-2 list-decimal space-y-2 ps-5 text-ink-2">
            <li>{locale === "ar" ? "اطلب منه تسجيل الدخول إلى Vital ID وفتح صفحة المشاركة." : "Ask them to sign in to Vital ID and open Share."}</li>
            <li>{locale === "ar" ? "يفتح قسم «استلام البيانات» وينسخ رمز حسابه." : "They open “Receive data” below and copy their account code."}</li>
            <li>{locale === "ar" ? "تأكد منه عبر وسيلة اتصال تثق بها، ثم الصق الرمز هنا." : "Confirm it with them through a channel you trust, then paste it here."}</li>
          </ol>
          <p className="mt-3 text-xs text-muted">{locale === "ar" ? "ليس لدى المستلم حساب؟ عليه إنشاء حساب أولاً. الرمز يحدد الحساب ولا يتحقق من هوية الشخص أو صفته المهنية." : "No account yet? They need to create one first. The code selects an account; it doesn’t verify the person or their professional role."}</p>
        </div>
        <label className="block text-sm font-medium">
          {locale === "ar" ? "رمز حساب المستلم" : "Recipient’s account code"}
          <input
            value={recipientUserId}
            onChange={(e) => { setRecipientUserId(e.target.value); setDisclosureConsent(false); }}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="recipient-help recipient-format"
            aria-invalid={Boolean(recipientUserId.trim()) && !validRecipient}
            placeholder={locale === "ar" ? "الصق رمز حساب المستلم" : "Paste their account code"}
            className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-sm"
          />
        </label>
        <p id="recipient-format" className={`text-xs ${recipientUserId.trim() && !validRecipient ? "text-bad" : "text-muted"}`}>
          {recipientUserId.trim() && !validRecipient
            ? (locale === "ar" ? "الرمز غير مكتمل. انسخ رمز الحساب كاملاً من صفحة المشاركة، وليس البريد الإلكتروني أو رقم Vital ID." : "That code looks incomplete. Copy the full account code from Share, not an email or a Vital ID number.")
            : (locale === "ar" ? "الصق رمز المستلم، وليس رمز حسابك." : "Paste the recipient’s code, not your own receiving code.")}
        </p>
        {account && (
          <details className="border-t border-line pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-brand">
              {locale === "ar" ? "استلام البيانات — رمز حسابك" : "Receive data — your account code"}
            </summary>
            <p className="mt-3 text-sm text-muted">{locale === "ar" ? "أرسل هذا الرمز لشخص يريد مشاركة بياناته معك. الرمز وحده لا يتيح له الاطلاع على بياناتك." : "Send this code to someone who wants to share their data with you. The code alone doesn’t let them read your data."}</p>
            <label className="mt-3 block text-xs text-muted">
              {locale === "ar" ? "رمز حسابك للاستلام" : "Your receiving code"}
              <input readOnly value={account.userId} dir="ltr" onFocus={(e) => e.target.select()} className="mt-2 w-full rounded-xl border border-line bg-canvas p-3 font-mono text-xs text-ink" />
            </label>
            <button type="button" onClick={copyAccountCode} className="press mt-3 rounded-xl bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">
              {locale === "ar" ? "نسخ رمزي" : "Copy my code"}
            </button>
            <p role="status" className="mt-2 text-xs text-muted">{accountCodeFeedback}</p>
          </details>
        )}
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="share-review-heading">
        <div>
          <h2 id="share-review-heading" className="text-lg font-semibold">
            {locale === "ar" ? "٥. راجع ما ستشاركه" : "5. Review what you’re sharing"}
          </h2>
          <p className="mt-2 text-sm text-muted">{locale === "ar" ? "هذه البيانات فقط هي التي ستظهر في الرابط. افتح كل قسم للمراجعة، أو عد إلى الخطوة ٢ لإزالة أي فئة." : "Only the data below will be included. Open each section to review it, or go back to step 2 to remove a category."}</p>
        </div>
        {preview ? (
          <DisclosurePreview snapshot={preview.snapshot} />
        ) : (
          <p className="text-sm text-muted">
            {previewError
              ? (locale === "ar" ? "المعاينة غير متاحة. المشاركة محظورة." : "Preview unavailable. Sharing is blocked.")
              : (locale === "ar" ? "اختر حقولاً لتحميل المعاينة." : "Choose fields to load the exact preview.")}
          </p>
        )}
        <p className="rounded-xl bg-canvas p-3 text-sm font-medium">
          {locale === "ar" ? "مدة الوصول: " : "Access lasts: "}{t(`share.duration.${duration}` as TranslationKey)}
        </p>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" checked={disclosureConsent} disabled={!preview || !validRecipient} onChange={(e) => setDisclosureConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-brand" />
          {locale === "ar"
            ? "راجعت البيانات وأسمح لحساب المستلم هذا بالاطلاع عليها خلال المدة المحددة."
            : "I’ve reviewed this data and allow this recipient account to view it for the selected duration."}
        </label>
        <p className="text-xs text-muted">
          {locale === "ar"
            ? "الإلغاء يمنع الوصول الجديد ولا يسترجع النسخ التي سبق تنزيلها."
            : "Revocation blocks new access; it cannot retrieve copies already downloaded."}
        </p>
      </section>

      <button
        type="button"
        onClick={generate}
        disabled={busy || !preview || !disclosureConsent || !validRecipient}
        className="press w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-deep disabled:opacity-50"
      >
        {busy ? t("share.generating") : t("share.generate")}
      </button>
      {(!validRecipient || !preview || !disclosureConsent) && (
        <p className="text-center text-xs text-muted" role="status">
          {!validRecipient
            ? (locale === "ar" ? "أضف رمز حساب المستلم في الخطوة ٤ للمتابعة." : "Add the recipient’s account code in step 4 to continue.")
            : !preview
              ? (locale === "ar" ? "اختر البيانات وانتظر تحميل المعاينة." : "Choose your data and wait for the preview to load.")
              : (locale === "ar" ? "راجع البيانات وحدد مربع الموافقة لإنشاء الرابط." : "Review the data and tick the confirmation to create your link.")}
        </p>
      )}

      {/* Result card */}
      {result && (
        <div className="card pop p-5">
          {result.revoked ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <MascotNote state="neutral" size={56}>
                {t("mascot.shareRevoked")}
              </MascotNote>
              <p className="text-center font-semibold text-bad">{t("share.revoked")}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <MascotNote state="success" size={56}>
                  {t("mascot.shareReady")}
                </MascotNote>
              </div>
              <div className="mt-3">
                <SectionTitle>{t("share.yourLink")}</SectionTitle>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  dir="ltr"
                  className="w-full rounded-lg border border-line bg-canvas px-2 py-1.5 font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm transition hover:bg-canvas"
                >
                  {copied ? t("share.copied") : t("share.copy")}
                </button>
              </div>
              <section className="mt-5 border-t border-line pt-4">
                <SectionTitle>{t("share.sendToInsurer")}</SectionTitle>
                <p className="mt-1 text-xs text-muted">{t("share.sendToInsurerHint")}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {INSURERS.map((insurer) => {
                    const sent = (result.sentTo ?? []).some(
                      (recipient) => recipient.insurerId === insurer.id,
                    );
                    const selected = selectedInsurers.has(insurer.id);
                    return (
                      <button
                        key={insurer.id}
                        type="button"
                        disabled={sent}
                        aria-pressed={selected}
                        onClick={() => toggleInsurer(insurer.id)}
                        className={`press relative flex min-h-20 items-center gap-2 rounded-2xl bg-white p-2.5 text-start ring-1 transition ${
                          sent
                            ? "cursor-default bg-good-soft ring-good/30"
                            : selected
                              ? "ring-2 ring-brand"
                              : "ring-line hover:ring-brand"
                        }`}
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: insurer.color }}
                        >
                          {insurer.monogram}
                        </span>
                        <span className="min-w-0 text-xs font-semibold leading-tight">
                          {locale === "ar" ? insurer.nameAr : insurer.name}
                          {sent && (
                            <span className="mt-1 block text-[10px] font-medium text-good">
                              {t("share.sentLabel")} ✓
                            </span>
                          )}
                        </span>
                        {selected && (
                          <span
                            aria-hidden
                            className="absolute end-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-brand text-[10px] font-bold text-white"
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedInsurers.size > 0 && (
                  <label className="press mt-3 flex items-start gap-2.5 rounded-2xl bg-canvas p-3 text-xs text-ink-2">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => {
                        setConsent(e.target.checked);
                        if (e.target.checked) setConsentMissing(false);
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand/40"
                    />
                    <span>{t("share.consentLabel")}</span>
                  </label>
                )}
                <button
                  type="button"
                  onClick={sendToInsurers}
                  disabled={selectedInsurers.size === 0 || sending}
                  className="press mt-3 w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-deep disabled:opacity-50"
                >
                  {sending
                    ? t("share.sending")
                    : t("share.sendReport", { count: selectedInsurers.size })}
                </button>
                {consentMissing && (
                  <p className="mt-2 text-center text-sm text-bad">{t("share.consentRequired")}</p>
                )}
                {sendFeedback && (
                  <p className={`mt-2 text-center text-sm ${sendFailed ? "text-bad" : "text-good"}`}>
                    {sendFeedback}
                  </p>
                )}
                {!!result.sentTo?.length && (
                  <div className="mt-4 rounded-2xl bg-canvas p-3.5">
                    <p className="text-xs font-semibold text-ink-2">{t("share.auditTitle")}</p>
                    <ul className="mt-2 space-y-2.5">
                      {resolveRecipients(result.sentTo).map(({ recipient, insurer }) => (
                        <li key={recipient.insurerId} className="text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate font-medium text-ink-2">
                              {locale === "ar" ? insurer.nameAr : insurer.name}
                            </span>
                            {recipient.consented && (
                              <span className="shrink-0 rounded-full bg-good-soft px-2 py-0.5 font-medium text-good">
                                {t("share.auditConsented")}
                              </span>
                            )}
                          </div>
                          <p dir="ltr" className="mt-0.5 truncate font-mono text-[11px] text-muted">
                            {recipient.deliveryRef}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2.5 text-[11px] text-muted">{t("share.auditNote")}</p>
                  </div>
                )}
              </section>
              <div className="mt-4 flex justify-center">
                <LockedFeature
                  variant="overlay"
                  feature="qrSharing"
                  title={t("membership.gate.qrTitle")}
                  description={t("membership.gate.qrDesc")}
                >
                  <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-line">
                    <QRCodeSVG value={link} size={200} />
                  </div>
                </LockedFeature>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                <span aria-hidden>🔒</span>
                {t("share.qrNote")}
              </p>
              <p className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-deep">
                  {t("share.validUntil")}:{" "}
                  {d(result.expiresAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press flex-1 rounded-xl bg-white px-4 py-2.5 text-center text-sm font-medium text-brand ring-1 ring-brand transition hover:bg-brand-soft"
                >
                  {t("share.openRecipient")}
                </a>
                <button
                  type="button"
                  onClick={() => revoke(result.id)}
                  className="press flex-1 rounded-xl bg-bad px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("share.revoke")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active shares */}
      <div className="surface p-5">
        <SectionTitle>{t("share.activeShares")}</SectionTitle>
        <div className="mt-3 space-y-2">
          {shares.length === 0 && <p className="py-1 text-sm text-muted">{t("share.noShares")}</p>}
          {activeShares.map(renderShareRow)}
          {pastShares.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none py-1 text-sm font-medium text-muted transition hover:text-ink-2 [&::-webkit-details-marker]:hidden">
                {t("share.history", { count: pastShares.length })}
                <span aria-hidden className="ms-1 inline-block transition group-open:rotate-90">
                  ›
                </span>
              </summary>
              <div className="mt-2 space-y-2">{pastShares.map(renderShareRow)}</div>
            </details>
          )}
        </div>
      </div>

      <div className="pb-2">
        <button
          type="button"
          onClick={resetDemo}
          className="press rounded-full bg-white px-3.5 py-2 text-sm text-muted ring-1 ring-line transition hover:bg-sage"
        >
          {t("share.reset")}
        </button>
      </div>
    </div>
  );
}
