"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { guideCopy } from "@/lib/guide";
import { useLang } from "@/app/providers";
import RequireConsent from "@/components/RequireConsent";
import { getItem, setItem, STORAGE_KEYS, type IssuedLink } from "@/lib/storage";
import { viewsLabel } from "@/lib/i18n";

type Status = "active" | "expired" | "revoked" | "not_found";
type StatusInfo = { status: Status; views: number[] };

export default function HistoryPage() {
  const { t, lang } = useLang();
  const [revokeError, setRevokeError] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [links, setLinks] = useState<IssuedLink[]>([]);
  const [statuses, setStatuses] = useState<Record<string, StatusInfo>>({});

  const refresh = async (list: IssuedLink[]) => {
    const out: Record<string, StatusInfo> = {};
    await Promise.all(
      list.map(async (l) => {
        try {
          const res = await fetch(`/api/shares/${l.id}/status?t=${l.token}`, { cache: "no-store" });
          if (!res.ok) throw new Error();
          const data = (await res.json()) as { status: Status; views: number[] };
          out[l.id] = { status: data.status, views: data.views ?? [] };
        } catch {
          out[l.id] = { status: "not_found", views: [] };
        }
      })
    );
    setStatuses(out);
  };

  useEffect(() => {
    const list = getItem<IssuedLink[]>(STORAGE_KEYS.shares) ?? [];
    setLinks(list);
    refresh(list);
  }, []);

  const revoke = async (l: IssuedLink) => {
    if (revoking || !window.confirm(t("issued.revoke.confirm"))) return;
    setRevoking(true);
    setRevokeError(false);
    try {
    const response = await fetch(`/api/shares/${l.id}/revoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: l.token }),
    });
    if (!response.ok) throw new Error("Revocation failed");
    const list = (getItem<IssuedLink[]>(STORAGE_KEYS.shares) ?? []).map((x) =>
      x.id === l.id ? { ...x, revokedAt: Date.now() } : x
    );
    setItem(STORAGE_KEYS.shares, list);
    setLinks(list);
    await refresh(list);
    } catch { setRevokeError(true); }
    finally { setRevoking(false); }
  };

  return (
    <RequireConsent>
      <div className="pt-6 flex flex-col gap-5">
        {revokeError && <p role="alert">{guideCopy[lang].revokeFailed}</p>}
        <h1 className="text-2xl font-bold">{t("share.history")}</h1>
        {links.length === 0 && <p style={{ color: "var(--muted)" }}>{t("share.none")}</p>}
        <ul className="flex flex-col gap-3">
          {links.map((l) => {
            const st = statuses[l.id]?.status;
            const views = statuses[l.id]?.views ?? [];
            return (
              <li key={l.id} className="card flex flex-col gap-2">
                <p className="font-semibold">{l.recipientLabel}</p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {new Date(l.expiresAt).toLocaleString(lang === "ar" ? "ar-AE" : "en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                {st && (
                  <span
                    className="badge"
                    style={{
                      alignSelf: "flex-start",
                      background: st === "active" ? "#e2f3ef" : "#fbe4e2",
                      color: st === "active" ? "var(--accent)" : "var(--error)",
                      border: "1px solid currentColor",
                    }}
                  >
                    {st === "not_found" ? "?" : t(`status.${st}` as "status.active")}
                  </span>
                )}
                {st && (
                  <p className="text-sm" style={{ color: "var(--muted)" }} data-testid="view-count">
                    {views.length === 0
                      ? t("share.views.none")
                      : `${viewsLabel(views.length, lang, t)} · ${t("share.views.last", {
                          time: new Date(views[views.length - 1]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        })}`}
                  </p>
                )}
                {st === "active" && (
                  <button className="btn btn-danger" style={{ minHeight: 48 }} disabled={revoking} onClick={() => revoke(l)}>
                    {t("issued.revoke")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <Link href="/share" className="btn btn-outline w-full text-center">
          {t("nav.back")}
        </Link>
      </div>
    </RequireConsent>
  );
}
