"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { SharePayload } from "@/lib/sharing";
import type { TranslationKey } from "@/lib/i18n";

const LABELS: Record<string, readonly [string, string]> = {
  identity: ["Personal details", "البيانات الشخصية"],
  emergencyInfo: ["Emergency information", "معلومات الطوارئ"],
  currentSignals: ["Health measurements", "القياسات الصحية"],
  recentTrends: ["Recent trends", "الاتجاهات الأخيرة"],
  healthProfile: ["Health profile", "الملف الصحي"],
  sources: ["Data sources", "مصادر البيانات"],
  fullName: ["Full name", "الاسم الكامل"],
  localizedName: ["Names in other languages", "الأسماء بلغات أخرى"],
  vitalId: ["Vital ID", "معرّف Vital ID"],
  dateOfBirth: ["Date of birth", "تاريخ الميلاد"],
  sex: ["Sex", "الجنس"],
  nationality: ["Nationality", "الجنسية"],
  bloodType: ["Blood type", "فصيلة الدم"],
  allergies: ["Recorded allergies", "الحساسية المسجلة"],
  conditions: ["Recorded conditions", "الحالات المسجلة"],
  emergencyContact: ["Emergency contact", "جهة اتصال الطوارئ"],
  name: ["Name", "الاسم"],
  relation: ["Relationship", "صلة القرابة"],
  phone: ["Phone", "الهاتف"],
  heightCm: ["Height (cm)", "الطول (سم)"],
  weightKg: ["Weight (kg)", "الوزن (كغ)"],
  maxHeartRate: ["Maximum heart rate (bpm)", "أقصى معدل لنبض القلب (نبضة/دقيقة)"],
  medications: ["Recorded medications", "الأدوية المسجلة"],
  metric: ["Measurement", "القياس"],
  value: ["Value", "القيمة"],
  unit: ["Unit", "الوحدة"],
  timestamp: ["Recorded at", "وقت التسجيل"],
  source: ["Source", "المصدر"],
  baseline: ["Personal baseline", "خط الأساس الشخصي"],
  baselineDays: ["Days in baseline", "عدد أيام خط الأساس"],
  sevenDayAverage: ["7-day average", "متوسط ٧ أيام"],
  delta: ["Change from baseline", "التغير عن خط الأساس"],
  deltaPercent: ["Change (%)", "التغير (%)"],
  status: ["Trend", "الاتجاه"],
  polarity: ["Trend direction", "اتجاه التحسن"],
  id: ["Reference", "المرجع"],
  key: ["Summary reference", "مرجع الملخص"],
  params: ["Summary values", "قيم الملخص"],
  days: ["Days", "الأيام"],
  minutes: ["Minutes", "الدقائق"],
  percent: ["Percent", "النسبة المئوية"],
  severity: ["Attention level", "مستوى الانتباه"],
  en: ["English", "الإنجليزية"],
  ar: ["Arabic", "العربية"],
};

function ReadableValue({ value, field }: { value: unknown; field: string }) {
  const { locale, t } = useLocale();
  const ar = locale === "ar";
  const label = (key: string) => LABELS[key]?.[ar ? 1 : 0] ?? key;
  if (value === null || value === undefined || value === "" || value === "-" || value === "—") {
    return <span className="text-muted">{ar ? "غير مسجل" : "Not recorded"}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">{ar ? "لا توجد بيانات مسجلة" : "No entries recorded"}</span>;
    return (
      <ul className="space-y-3">
        {value.map((item, index) => (
          <li key={index} className={typeof item === "object" ? "rounded-xl border border-line p-3" : ""}>
            <ReadableValue value={item} field={field === "sources" ? "source" : field} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <dl className="divide-y divide-line">
        {Object.entries(value).map(([key, item]) => {
          const nested = item !== null && typeof item === "object";
          return (
            <div key={key} className={`py-2.5 first:pt-0 last:pb-0 ${nested ? "space-y-2" : "flex flex-wrap justify-between gap-x-4 gap-y-1"}`}>
              <dt className="text-muted">{label(key)}</dt>
              <dd className={`min-w-0 break-words font-medium [overflow-wrap:anywhere] ${nested ? "" : "max-w-full"}`}>
                <ReadableValue value={item} field={key} />
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }
  const namespaces: Record<string, string> = {
    sex: "vitalId.sex", relation: "vitalId.relation", metric: "metric",
    source: "source", unit: "unit", status: "status",
  };
  const descriptions: Record<string, readonly [string, string]> = field === "polarity" ? {
    higherIsBetter: ["Higher is better", "الأعلى أفضل"],
    lowerIsBetter: ["Lower is better", "الأقل أفضل"],
  } : field === "severity" ? {
    info: ["Information", "معلومات"],
    attention: ["Needs attention", "يحتاج إلى انتباه"],
  } : {};
  const key = namespaces[field] ? `${namespaces[field]}.${value}` as TranslationKey : null;
  const translated = key ? t(key) : null;
  return <bdi>{descriptions[String(value)]?.[ar ? 1 : 0] ?? (translated && translated !== key ? translated : String(value))}</bdi>;
}

export function DisclosurePreview({ snapshot }: { snapshot: SharePayload["snapshot"] }) {
  const { locale, t } = useLocale();
  return (
    <div className="space-y-3" data-testid="disclosure-preview">
      {Object.entries(snapshot).map(([field, value]) => (
        <details key={field} open={field === "identity" || field === "emergencyInfo" || field === "healthProfile"}
          className="rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            {LABELS[field]?.[locale === "ar" ? 1 : 0] ?? field}
            {Array.isArray(value) && <span className="ms-2 font-normal text-muted">({value.length})</span>}
          </summary>
          <div className="mt-4 text-sm">
            {field === "recentTrends" && snapshot.recentTrends?.map((insight) => (
              <p key={insight.id} className="mb-3 text-ink-2">
                {t(insight.key as TranslationKey, { ...insight.params, metric: t(`metric.${insight.metric}` as TranslationKey) })}
              </p>
            ))}
            <ReadableValue value={value} field={field} />
          </div>
        </details>
      ))}
    </div>
  );
}
