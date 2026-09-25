"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { CONNECTORS } from "@/lib/connectors";
import { useConnectorSelection } from "@/lib/connectors-state";
import { ConnectorCard } from "@/components/connectors/ConnectorCard";
import { LogoMark } from "@/components/layout/Logo";
import { LangButton } from "@/components/layout/AppShell";

export function ConnectorPicker() {
  const { t } = useLocale();
  const router = useRouter();
  const { count, limit } = useConnectorSelection();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8 md:max-w-2xl">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-base font-semibold tracking-tight text-brand">{t("app.name")}</span>
        </div>
        <LangButton />
      </header>

      <main className="mt-8 pb-24">
        <h1 className="text-2xl font-semibold tracking-tight">{t("onboarding.connectors.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("onboarding.connectors.subtitle")}</p>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {CONNECTORS.map((c) => (
            <ConnectorCard key={c.id} connector={c} compact />
          ))}
        </div>
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/92 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-5 py-3 md:max-w-2xl">
          <span className="text-xs font-medium text-muted">
            {t("onboarding.connectors.selectedCount", {
              count,
              limit: limit === null ? "∞" : limit,
            })}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="press rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-ink-2"
            >
              {t("onboarding.connectors.skip")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="press rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-deep"
            >
              {t("onboarding.connectors.continue")}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
