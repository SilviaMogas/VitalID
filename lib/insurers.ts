export type InsurerId =
  | "daman"
  | "gig"
  | "sukoon"
  | "adnic"
  | "orient"
  | "bupa"
  | "allianz"
  | "cigna"
  | "metlife";

export interface Insurer {
  id: InsurerId;
  name: string;
  nameAr: string;
  monogram: string;
  color: string;
}

export const INSURERS: Insurer[] = [
  { id: "daman", name: "Daman", nameAr: "ضمان", monogram: "D", color: "#087F5B" },
  { id: "gig", name: "GIG Gulf (AXA)", nameAr: "جي آي جي الخليج (أكسا)", monogram: "G", color: "#1769AA" },
  { id: "sukoon", name: "Sukoon", nameAr: "سكون", monogram: "S", color: "#6F42C1" },
  { id: "adnic", name: "ADNIC", nameAr: "أبوظبي الوطنية للتأمين", monogram: "A", color: "#C0392B" },
  { id: "orient", name: "Orient Insurance", nameAr: "أورينت للتأمين", monogram: "O", color: "#C47A13" },
  { id: "bupa", name: "Bupa", nameAr: "بوبا", monogram: "B", color: "#D72D68" },
  { id: "allianz", name: "Allianz Care", nameAr: "أليانز كير", monogram: "A", color: "#0876B9" },
  { id: "cigna", name: "Cigna", nameAr: "سيغنا", monogram: "C", color: "#168A9B" },
  { id: "metlife", name: "MetLife", nameAr: "ميتلايف", monogram: "M", color: "#3763A8" },
];

export const INSURER_IDS: InsurerId[] = INSURERS.map((insurer) => insurer.id);

export function getInsurer(id: string): Insurer | undefined {
  return INSURERS.find((insurer) => insurer.id === id);
}
