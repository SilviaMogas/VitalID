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

export const SOLANA_WEARABLES = [
  {
    id: "cudis",
    name: "CUDIS Ring",
    mark: "CU",
    categoryKey: "solanaWearables.category.wellness",
    descriptionKey: "solanaWearables.cudis.description",
    availabilityKey: "solanaWearables.status.product",
    integrationKey: "solanaWearables.cudis.integration",
    url: "https://www.cudis.xyz/",
    sourceUrl: "https://developer.cudis.xyz/infrastructure/cudis-apis/api-v1",
  },
  {
    id: "showtime",
    name: "Showtime Watch",
    mark: "ST",
    categoryKey: "solanaWearables.category.smartwatch",
    descriptionKey: "solanaWearables.showtime.description",
    availabilityKey: "solanaWearables.status.preorder",
    integrationKey: "solanaWearables.integration.none",
    url: "https://show.watch/",
    sourceUrl: "https://show.watch/",
  },
  {
    id: "solwear",
    name: "SolWear",
    mark: "SW",
    categoryKey: "solanaWearables.category.signer",
    descriptionKey: "solanaWearables.solwear.description",
    availabilityKey: "solanaWearables.status.prototype",
    integrationKey: "solanaWearables.integration.nonHealth",
    url: "https://solwear.tech/",
    sourceUrl: "https://github.com/solwear/solwear",
  },
  {
    id: "solana-glasses",
    name: "Solana Glasses",
    mark: "SG",
    categoryKey: "solanaWearables.category.glasses",
    descriptionKey: "solanaWearables.glasses.description",
    availabilityKey: "solanaWearables.status.waitlist",
    integrationKey: "solanaWearables.integration.nonHealth",
    url: "https://solanaglasses.com/",
    sourceUrl: "https://solanaglasses.com/",
  },
  {
    id: "franck-muller",
    name: "Franck Muller × Solana",
    mark: "FM",
    categoryKey: "solanaWearables.category.collectible",
    descriptionKey: "solanaWearables.franckMuller.description",
    availabilityKey: "solanaWearables.status.limited",
    integrationKey: "solanaWearables.integration.nonHealth",
    url: "https://solanaxfranckmuller.com/",
    sourceUrl: "https://solanaxfranckmuller.com/",
  },
] as const satisfies readonly FeaturedWearable[];
