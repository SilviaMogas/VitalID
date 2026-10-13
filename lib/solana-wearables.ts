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

const createFeaturedWearable = (
  id: string,
  name: string,
  mark: string,
  categoryKey: TranslationKey,
  descriptionKey: TranslationKey,
  availabilityKey: TranslationKey,
  integrationKey: TranslationKey,
  url: string,
  sourceUrl: string,
): FeaturedWearable => ({
  id,
  name,
  mark,
  categoryKey,
  descriptionKey,
  availabilityKey,
  integrationKey,
  url,
  sourceUrl,
});

export const SOLANA_WEARABLES = [
  createFeaturedWearable(
    "cudis",
    "CUDIS Ring",
    "CU",
    "solanaWearables.category.wellness",
    "solanaWearables.cudis.description",
    "solanaWearables.status.product",
    "solanaWearables.cudis.integration",
    "https://www.cudis.xyz/",
    "https://developer.cudis.xyz/infrastructure/cudis-apis/api-v1",
  ),
  createFeaturedWearable(
    "showtime",
    "Showtime Watch",
    "ST",
    "solanaWearables.category.smartwatch",
    "solanaWearables.showtime.description",
    "solanaWearables.status.preorder",
    "solanaWearables.integration.none",
    "https://show.watch/",
    "https://show.watch/",
  ),
  createFeaturedWearable(
    "solwear",
    "SolWear",
    "SW",
    "solanaWearables.category.signer",
    "solanaWearables.solwear.description",
    "solanaWearables.status.prototype",
    "solanaWearables.integration.nonHealth",
    "https://solwear.tech/",
    "https://github.com/solwear/solwear",
  ),
  createFeaturedWearable(
    "solana-glasses",
    "Solana Glasses",
    "SG",
    "solanaWearables.category.glasses",
    "solanaWearables.glasses.description",
    "solanaWearables.status.waitlist",
    "solanaWearables.integration.nonHealth",
    "https://solanaglasses.com/",
    "https://solanaglasses.com/",
  ),
  createFeaturedWearable(
    "franck-muller",
    "Franck Muller × Solana",
    "FM",
    "solanaWearables.category.collectible",
    "solanaWearables.franckMuller.description",
    "solanaWearables.status.limited",
    "solanaWearables.integration.nonHealth",
    "https://solanaxfranckmuller.com/",
    "https://solanaxfranckmuller.com/",
  ),
] as const satisfies readonly FeaturedWearable[];
