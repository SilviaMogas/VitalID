// Display-name helper for connector providers — kept separate from
// lib/connectors.ts so the registry stays free of i18n imports.
import type { ProviderDef } from "@/lib/connectors";
import type { TranslationKey } from "@/lib/i18n";

/** Localized provider name — brand names stay Latin, generic names translate. */
export function providerName(
  def: ProviderDef,
  t: (key: TranslationKey) => string,
): string {
  return def.nameKey ? t(def.nameKey as TranslationKey) : def.name;
}
