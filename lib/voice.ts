/** Picks the first available browser voice matching a locale (e.g. "en", "ar"). */
export function selectVoice<T extends { lang: string }>(voices: T[], locale: "en" | "ar"): T | undefined {
  return voices.find((v) => v.lang.toLowerCase().replaceAll("_", "-").split("-")[0] === locale);
}
