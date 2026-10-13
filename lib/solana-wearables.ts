import catalogue from "./solana-wearables.catalogue.json";
import type { TranslationKey } from "@/lib/i18n";

// Editorial discovery entries, deliberately separate from selectable connectors.
type FeaturedWearable = {
  id: string;
  name: string;
  mark: string;
  categoryKey: TranslationKey;
  descriptionKey: TranslationKey;
  availabilityKey: TranslationKey;
  integrationKey: TranslationKey;
  url: string;
  sourceUrl: string;
};

export const SOLANA_WEARABLES_REVIEWED_AT = "2026-10-13";

export const SOLANA_WEARABLES = catalogue as readonly FeaturedWearable[];
