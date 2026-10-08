"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LEGAL_CONTACT_EMAIL, legalDoc, localized } from "@/lib/legal";

/**
 * Renders one legal document (privacy | terms) in the active locale.
 * Chrome (brand header, language toggle) comes from the AppShell bare layout.
 */
export function LegalDocument({ kind }: { kind: "privacy" | "terms" }) {
  const { t, locale } = useLocale();
  const doc = legalDoc(kind);
  const other = kind === "privacy" ? "/terms" : "/privacy";
  const otherLabel = kind === "privacy" ? t("legal.terms") : t("legal.privacy");

  return (
    <article className="space-y-6">
      <header className="rise" style={{ ["--i" as string]: 0 }}>
        <h1 className="display text-4xl md:text-5xl">{localized(doc.title, locale)}</h1>
        <p className="mt-2 text-sm text-muted">{localized(doc.updated, locale)}</p>
      </header>

      <div className="space-y-5">
        {doc.sections.map((section, i) => (
          <section key={i} className="card rise p-5 md:p-6" style={{ ["--i" as string]: Math.min(i + 1, 10) }}>
            <h2 className="text-base font-semibold text-ink">{localized(section.heading, locale)}</h2>
            <div className="mt-2.5 space-y-2.5 text-sm leading-relaxed text-ink-2">
              {section.paragraphs.map((p, j) => (
                <p key={j}>{localized(p, locale)}</p>
              ))}
              {section.bullets && (
                <ul className="list-disc space-y-1.5 ps-5 marker:text-brand">
                  {section.bullets.map((b, j) => (
                    <li key={j}>{localized(b, locale)}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="rise space-y-2 pb-4 text-sm text-muted" style={{ ["--i" as string]: 10 }}>
        <p>
          {t("legal.contact")}: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} dir="ltr" className="font-medium text-brand">{LEGAL_CONTACT_EMAIL}</a>
        </p>
        <p>
          <Link href={other} className="font-medium text-brand">
            {otherLabel}
          </Link>
        </p>
      </footer>
    </article>
  );
}
