export const PACK_KEY = "pack:v1";
export type Purpose = "appointment" | "caregiver" | "insurer";
export interface PackField {
  id: string; label: string; value: string;
  source: "manual" | "whoop" | "demo";
  date: string; dateKind: "entered" | "retrieved" | "sample";
  verification: "unverified" | "device-reported" | "fictional";
}
export interface PackDocument {
  id: string; name: string; mime: "text/plain" | "application/pdf" | "image/png" | "image/jpeg";
  base64: string; source: "manual" | "demo"; date: string;
  verification: "unverified" | "fictional";
}
export interface InformationPack {
  version: 1; purpose: Purpose; demo: boolean; fields: PackField[]; documents: PackDocument[];
}
export const MAX_DOCUMENT_BYTES = 250_000;
export const MAX_PACK_BYTES = 600_000;
const text = (v: unknown, max: number): boolean => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const date = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) && Number.isFinite(Date.parse(v));
export function validatePack(value: unknown, draft = false): value is InformationPack {
  if (!value || typeof value !== "object") return false;
  const p = value as InformationPack;
  if (p.version !== 1 || !["appointment","caregiver","insurer"].includes(p.purpose) || typeof p.demo !== "boolean"
    || !Array.isArray(p.fields) || !Array.isArray(p.documents) || p.fields.length > 20 || p.documents.length > 3
    || (!draft && p.fields.length + p.documents.length === 0)) return false;
  const ids = new Set<string>();
  let bytes = 0;
  for (const f of p.fields) {
    if (!f || !text(f.id,80) || ids.has(f.id) || !(text(f.label,120) || (draft && f.label === "")) || !(text(f.value,2000) || (draft && typeof f.value === "string" && f.value.length <= 2000)) || !date(f.date)
      || !["entered","retrieved","sample"].includes(f.dateKind)
      || !["manual","whoop","demo"].includes(f.source)
      || f.verification !== (f.source === "demo" ? "fictional" : f.source === "whoop" ? "device-reported" : "unverified")
      || (p.demo && f.source !== "demo") || (!p.demo && f.source === "demo")) return false;
    ids.add(f.id);
  }
  for (const d of p.documents) {
    if (!d || !text(d.id,80) || ids.has(d.id) || !text(d.name,180) || !date(d.date)
      || !["text/plain","application/pdf","image/png","image/jpeg"].includes(d.mime)
      || !["manual","demo"].includes(d.source) || d.verification !== (d.source === "demo" ? "fictional" : "unverified")
      || (p.demo && d.source !== "demo") || (!p.demo && d.source === "demo")
      || typeof d.base64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(d.base64)) return false;
    const size = d.base64.length * 3 / 4 - (d.base64.endsWith("==") ? 2 : d.base64.endsWith("=") ? 1 : 0);
    if (size <= 0 || size > MAX_DOCUMENT_BYTES) return false;
    bytes += size;
    if (d.mime === "application/pdf" && !d.base64.startsWith("JVBERi0")) return false;
    if (d.mime === "image/png" && !d.base64.startsWith("iVBORw0KGgo")) return false;
    if (d.mime === "image/jpeg" && !d.base64.startsWith("/9j/")) return false;
    ids.add(d.id);
  }
  return bytes <= MAX_PACK_BYTES;
}
export function readPack(fields: Record<string,string | number>): InformationPack | null {
  if (typeof fields[PACK_KEY] !== "string") return null;
  try { const p: unknown = JSON.parse(fields[PACK_KEY]); return validatePack(p) ? p : null; } catch { return null; }
}
export function demoPack(ar: boolean, purpose: Purpose): InformationPack {
  const stamp = "2026-09-23";
  const fields: PackField[] = [
    {id:"name",label:ar?"الاسم":"Name",value:"Fátima (fictional)",source:"demo",date:stamp,dateKind:"sample",verification:"fictional"},
    {id:"medication",label:ar?"الأدوية المبلّغ عنها":"Reported medication",value:ar?"لا توجد أدوية مبلّغ عنها في هذا المثال":"No medication reported in this example",source:"demo",date:stamp,dateKind:"sample",verification:"fictional"},
    {id:"sleep",label:ar?"مدة النوم":"Sleep duration",value:"6h 22m",source:"demo",date:stamp,dateKind:"sample",verification:"fictional"},
  ];
  // Plain-text fictional supporting document, never a clinical record.
  const note = "FICTIONAL DEMO DOCUMENT\nFátima's self-reported appointment notes. No real patient or insurer. Not medically verified.";
  return {version:1,purpose,demo:true,fields,documents:[{id:"demo-note",name:"fictional-appointment-notes.txt",mime:"text/plain",base64:btoa(String.fromCharCode(...new TextEncoder().encode(note))),source:"demo",date:stamp,verification:"fictional"}]};
}
