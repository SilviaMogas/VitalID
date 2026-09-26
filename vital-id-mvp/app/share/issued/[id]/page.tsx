"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { guideCopy } from "@/lib/guide";
import { useLang } from "@/app/providers";
import RequireConsent from "@/components/RequireConsent";
import { getItem, setItem, STORAGE_KEYS, type IssuedLink } from "@/lib/storage";
import { viewsLabel } from "@/lib/i18n";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function IssuedPage() {
  const { t, lang } = useLang();
  const [revokeError, setRevokeError] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const params = useParams<{ id: string }>();
  const [link, setLink] = useState<IssuedLink | null>(null);
  const [qr, setQr] = useState("");
  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState<"active" | "expired" | "revoked">("active");
  const [views, setViews] = useState<number[]>([]);
  const [audit, setAudit] = useState<{createdAt?:number;revokedAt?:number|null}>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const list = getItem<IssuedLink[]>(STORAGE_KEYS.shares) ?? [];
    setLink(list.find((l) => l.id === params.id) ?? null);
  }, [params.id]);

  const absoluteUrl = useMemo(() => {
    if (!link || typeof window === "undefined") return "";
    const base = process.env.NEXT_PUBLIC_SHARE_BASE_URL || window.location.origin;
    return `${base.replace(/\/$/, "")}${link.url}`;
  }, [link]);

  useEffect(() => {
    if (!absoluteUrl) return;
    QRCode.toDataURL(absoluteUrl, { width: 280, margin: 2 }).then(setQr).catch(() => setQr(""));
  }, [absoluteUrl]);

  useEffect(() => {
    if (!link || status === "revoked") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [link, status]);

  useEffect(() => {
    if (link && status === "active" && now >= link.expiresAt) setStatus("expired");
  }, [now, link, status]);

  useEffect(() => {
    if (!link) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/shares/${link.id}/status?t=${link.token}`, { cache: "no-store" });
        if (!res.ok) return;
        const d = (await res.json()) as { status: "active" | "expired" | "revoked"; views: number[]; createdAt: number; revokedAt: number | null };
        setViews(d.views);
        setAudit({createdAt:d.createdAt,revokedAt:d.revokedAt});
        if (d.status !== "active") setStatus(d.status);
      } catch {
        // keep last state
      }
    };
    fetchStatus();
    const poll = setInterval(fetchStatus, 5000);
    return () => clearInterval(poll);
  }, [link]);

  const revoke = async () => {
    if (!link) return;
    if (!window.confirm(t("issued.revoke.confirm"))) return;
    if (revoking) return;
    setRevoking(true);
    setRevokeError(false);
    try {
    const response = await fetch(`/api/shares/${link.id}/revoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: link.token }),
    });
    if (!response.ok) throw new Error("Revocation failed");
    setStatus("revoked");
    setAudit(old=>({...old,revokedAt:Date.now()}));
    const list = (getItem<IssuedLink[]>(STORAGE_KEYS.shares) ?? []).map((l) =>
      l.id === link.id ? { ...l, revokedAt: Date.now() } : l
    );
    setItem(STORAGE_KEYS.shares, list);
    } catch { setRevokeError(true); }
    finally { setRevoking(false); }
  };

  if (!link) return <RequireConsent><div className="pt-6">…</div></RequireConsent>;

  const remaining = link.expiresAt - now;
  const shownStatus = status === "active" && remaining <= 0 ? "expired" : status;

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-5 items-center text-center">
        {revokeError && <p role="alert">{guideCopy[lang].revokeFailed}</p>}
        <h1 className="text-2xl font-bold">{t("issued.title")}</h1>
        <p>
          {t("issued.for")} <strong>{link.recipientLabel}</strong>
        </p>
        <span
          className="badge"
          data-testid="issued-status"
          style={{
            background: shownStatus === "active" ? "#e2f3ef" : "#fbe4e2",
            color: shownStatus === "active" ? "var(--accent)" : "var(--error)",
            border: "1px solid currentColor",
          }}
        >
          {t(`status.${shownStatus}` as "status.active")}
        </span>
        {qr && shownStatus === "active" && <img src={qr} alt={lang === "ar" ? "رمز QR للمشاركة" : "Sharing QR code"} width={280} height={280} style={{ maxWidth: "100%", height: "auto" }} data-testid="qr" />}
        {shownStatus === "active" && (
          <p className="text-2xl font-bold" data-testid="countdown">
            {t("issued.expires")} {fmt(remaining)}
          </p>
        )}
        <p className="text-sm" style={{ color: "var(--muted)" }} aria-live="polite" data-testid="view-count">
          {views.length === 0
            ? t("share.views.none")
            : `${viewsLabel(views.length, lang, t)} · ${t("share.views.last", {
                time: new Date(views[views.length - 1]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              })}`}
        </p>
        <section className="card w-full" style={{textAlign:"start"}} data-testid="share-audit">
          <h2 className="font-bold">{lang==="ar"?"سجل الوصول":"Access history"}</h2>
          <p className="text-sm">{lang==="ar"?"يسجل فتح الرابط، ولا يثبت هوية من فتحه. قد تشمل الزيارات فتحك أنت للرابط.":"Records link opens, not the identity of the person opening it. Opens may include your own visits."}</p>
          <ul>
            {audit.createdAt&&<li>{lang==="ar"?"تم الإنشاء":"Created"} · {new Date(audit.createdAt).toLocaleString(lang==="ar"?"ar-AE":"en-GB")}</li>}
            {views.map((at,i)=><li key={i}>{lang==="ar"?"تم الفتح":"Opened"} · {new Date(at).toLocaleString(lang==="ar"?"ar-AE":"en-GB")}</li>)}
            {shownStatus==="expired"&&<li>{lang==="ar"?"انتهت الصلاحية (من الموعد المحدد)":"Expired (from scheduled deadline)"} · {new Date(link.expiresAt).toLocaleString(lang==="ar"?"ar-AE":"en-GB")}</li>}
            {audit.revokedAt&&<li>{lang==="ar"?"تم الإلغاء":"Revoked"} · {new Date(audit.revokedAt).toLocaleString(lang==="ar"?"ar-AE":"en-GB")}</li>}
          </ul>
          <p className="text-sm">{lang==="ar"?"قد يكون السجل محدوداً؛ يحتفظ مخزن Redis به ليوم واحد بعد انتهاء الصلاحية.":"History can be limited; Redis retains records for one day after expiry."}</p>
        </section>
        <div className="w-full card text-left" dir="ltr">
          <p className="text-sm break-all" style={{ direction: "ltr" }}>{absoluteUrl}</p>
          <button
            className="btn btn-outline w-full mt-3"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(absoluteUrl);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? t("issued.copied") : t("issued.copy")}
          </button>
        </div>
        <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full">
          {t("issued.open")}
        </a>
        {shownStatus === "active" ? (
          <button className="btn btn-danger w-full" onClick={revoke} disabled={revoking}>
            {t("issued.revoke")}
          </button>
        ) : (
          <Link href="/share" className="btn btn-primary w-full">
            {t("issued.newlink")}
          </Link>
        )}
      </div>
    </RequireConsent>
  );
}
