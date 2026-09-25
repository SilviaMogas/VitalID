import type { Locale } from "@/types";

export const LOCALES: Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "vitalid.locale";

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

const shareStrings = {
  "share.title": ["Share your Vital ID", "شارك معرّفك الحيوي"],
  "share.subtitle": ["Create a secure, temporary link to selected health information.", "أنشئ رابطًا آمنًا ومؤقتًا لمعلومات صحية مختارة."],
  "share.stepPurpose": ["1. Purpose", "١. الغرض"],
  "share.stepInfo": ["2. Information", "٢. المعلومات"],
  "share.stepExpiry": ["3. Expiration", "٣. مدة الصلاحية"],
  "share.purpose.emergency": ["Emergency", "طوارئ"],
  "share.purpose.doctor": ["Doctor visit", "زيارة طبيب"],
  "share.purpose.travel": ["Travel", "سفر"],
  "share.purpose.caregiver": ["Caregiver", "مقدّم رعاية"],
  "share.purpose.custom": ["Custom", "مخصص"],
  "share.field.identity": ["Identity", "الهوية"],
  "share.field.emergencyInfo": ["Emergency Information", "معلومات الطوارئ"],
  "share.field.currentSignals": ["Current Health Signals", "المؤشرات الصحية الحالية"],
  "share.field.recentTrends": ["Recent Trends", "الاتجاهات الأخيرة"],
  "share.field.healthProfile": ["Selected Health Profile Information", "معلومات مختارة من الملف الصحي"],
  "share.preview.identity": ["Name, date of birth, blood type, Vital ID.", "الاسم وتاريخ الميلاد وفصيلة الدم والمعرّف الحيوي."],
  "share.preview.emergencyInfo": ["Emergency contact, allergies, conditions.", "جهة اتصال الطوارئ والحساسية والحالات."],
  "share.preview.currentSignals": ["Latest recovery, sleep, HRV and activity readings.", "أحدث قراءات التعافي والنوم وتقلب النبض والنشاط."],
  "share.preview.recentTrends": ["Trend insights against your own baseline.", "رؤى الاتجاهات مقارنة بخط أساسك الشخصي."],
  "share.preview.healthProfile": ["Height, weight, medications.", "الطول والوزن والأدوية."],
  "share.duration.15": ["15 minutes", "١٥ دقيقة"],
  "share.duration.60": ["1 hour", "ساعة واحدة"],
  "share.duration.1440": ["24 hours", "٢٤ ساعة"],
  "share.generate": ["Generate secure link", "إنشاء رابط آمن"],
  "share.generating": ["Generating…", "جارٍ الإنشاء…"],
  "share.yourLink": ["Your secure link", "رابطك الآمن"],
  "share.copy": ["Copy", "نسخ"],
  "share.copied": ["Copied", "تم النسخ"],
  "share.validUntil": ["Valid until", "صالح حتى"],
  "share.openRecipient": ["Open recipient view", "فتح عرض المستلم"],
  "share.revoke": ["Revoke Access", "إلغاء الوصول"],
  "share.revoked": ["Access revoked", "تم إلغاء الوصول"],
  "share.selectAtLeastOne": ["Select at least one information category.", "اختر فئة معلومات واحدة على الأقل."],
  "share.activeShares": ["Active shares", "المشاركات النشطة"],
  "share.noShares": ["No shares yet.", "لا توجد مشاركات بعد."],
  "share.status.active": ["active", "نشط"],
  "share.status.expired": ["expired", "منتهٍ"],
  "share.status.revoked": ["revoked", "ملغى"],
  "share.reset": ["Reset Demo", "إعادة تعيين العرض"],
  "share.resetConfirm": ["Clear all demo shares? This cannot be undone.", "مسح جميع المشاركات التجريبية؟ لا يمكن التراجع."],
  "share.qrNote": ["The QR contains only a temporary link — never health data.", "يحتوي رمز QR على رابط مؤقت فقط — وليس بيانات صحية أبدًا."],
  "share.recipientTitle": ["Vital ID — shared view", "المعرّف الحيوي — عرض مشترك"],
  "share.sharedBy": ["Shared by", "شاركه"],
  "share.purposeLabel": ["Purpose", "الغرض"],
  "share.unavailable": ["This Vital ID access has expired or been revoked.", "انتهت صلاحية هذا الوصول إلى المعرّف الحيوي أو تم إلغاؤه."],
  "share.readonlyFooter": ["Read-only. Data source: demo dataset (synthetic)", "للقراءة فقط. مصدر البيانات: مجموعة بيانات تجريبية (اصطناعية)"],
} as const satisfies Record<string, readonly [string, string]>;

function pickLocale<T extends Record<string, readonly [string, string]>>(table: T, index: 0 | 1): { [K in keyof T]: string } {
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v[index]])) as { [K in keyof T]: string };
}

const brandStrings = {
  "onboarding.splashLine": ["A healthier tomorrow, together", "غدٌ أكثر صحة، معًا"],
  "onboarding.splashFoot": ["Your signals. Your baseline. Your control.", "مؤشراتك. خط أساسك. أنت المتحكم."],
  "onboarding.getStarted": ["Get started", "ابدأ الآن"],
  "onboarding.skip": ["Skip intro", "تخطّي المقدمة"],
  "onboarding.welcome": ["Welcome to Vital ID", "مرحبًا بك في Vital ID"],
  "onboarding.welcomeSub": ["Access your health identity securely", "ادخل إلى هويتك الصحية بأمان"],
  "onboarding.signIn": ["Sign in", "تسجيل الدخول"],
  "onboarding.signUp": ["Sign up", "إنشاء حساب"],
  "onboarding.demoCta": ["Login as Fatima", "الدخول كفاطمة"],
  "onboarding.demoHint": ["Explore the demo instantly as Fatima", "استكشف النسخة التجريبية فورًا كفاطمة"],
  "onboarding.demoOnly": ["Accounts are not part of this demo — continue as Fatima.", "الحسابات ليست جزءًا من هذه النسخة التجريبية — تابع كفاطمة."],
  "onboarding.previewTag": ["Health has a new identity", "للصحة هوية جديدة"],
  "onboarding.pill.verified": ["Verified", "موثّق"],
  "onboarding.pill.private": ["Private", "خاص"],
  "onboarding.pill.portable": ["Portable", "محمول"],
  "onboarding.foot.privacy": ["Your data, your control", "بياناتك، تحت سيطرتك"],
  "onboarding.foot.demo": ["Synthetic demo data", "بيانات تجريبية اصطناعية"],
  "onboarding.signOut": ["Sign out", "تسجيل الخروج"],
  "mascot.insightAttention": ["Worth a look — compared with your own baseline.", "يستحق نظرة — مقارنةً بخط أساسك."],
  "mascot.insightCalm": ["Looking steady. Nice work.", "الأمور مستقرة. أحسنت."],
  "mascot.metricUnusual": ["This one moved more than usual.", "هذا المؤشر تحرّك أكثر من المعتاد."],
  "mascot.metricStable": ["Right in your usual range.", "ضمن نطاقك المعتاد تمامًا."],
  "mascot.shareIntro": ["Share only what matters — for as long as you choose.", "شارك ما يهم فقط — وللمدة التي تختارها."],
  "mascot.shareReady": ["Your secure link is ready.", "رابطك الآمن جاهز."],
  "mascot.shareRevoked": ["Access closed. You are back in control.", "تم إغلاق الوصول. أنت المتحكم من جديد."],
  "mascot.recipient": ["Shared temporarily by the Vital ID holder.", "تمت المشاركة مؤقتًا من صاحب Vital ID."],
  "mascot.vitalId": ["Your identity travels with you.", "هويتك تسافر معك."],
} as const satisfies Record<string, readonly [string, string]>;

const en = {
  "app.name": "Vital ID",
  "app.tagline": "Your portable health identity",
  "app.demoBadge": "Demo data",

  "nav.home": "Home",
  "nav.trends": "Trends",
  "nav.vitalId": "Vital ID",
  "nav.share": "Share",
  "lang.switch": "العربية",
  "lang.label": "Language",

  "home.greeting.morning": "Good morning, {name}",
  "home.greeting.afternoon": "Good afternoon, {name}",
  "home.greeting.evening": "Good evening, {name}",
  "home.subtitle": "Here is what is happening today",
  "home.todaysInsight": "Today's insight",
  "home.signals": "Today's signals",
  "home.viewTrends": "View trends",
  "home.openVitalId": "Open Vital ID",
  "home.question.today": "What is happening today?",

  "metric.recovery": "Recovery",
  "metric.sleep": "Sleep",
  "metric.hrv": "HRV",
  "metric.hrv.long": "Heart rate variability",
  "metric.restingHeartRate": "Resting heart rate",
  "metric.activity": "Activity",

  "unit.%": "%",
  "unit.h": "h",
  "unit.ms": "ms",
  "unit.bpm": "bpm",
  "unit.min": "min",

  "baseline.30day": "30-day baseline",
  "baseline.7dayAvg": "7-day average",
  "baseline.today": "Today",
  "baseline.vsBaseline": "vs baseline",

  "status.stable": "Stable",
  "status.improving": "Improving",
  "status.declining": "Declining",
  "status.unusual": "Unusual deviation",
  "range.below": "Below usual range",
  "range.above": "Above usual range",
  "range.within": "Within usual range",

  "source.demoWearable": "Demo wearable",
  "source.manualProfile": "Manual profile",
  "source.label": "Source",

  "trends.title": "Trends",
  "trends.subtitle": "How your signals are changing against your own baseline",
  "trends.range.7d": "7 days",
  "trends.range.30d": "30 days",
  "trends.question": "How is it changing?",
  "trends.baselineLine": "Baseline",
  "trends.high": "High",
  "trends.low": "Low",
  "trends.whatItMeans": "What it means",
  "trends.noData": "No data for this period yet.",

  "insight.title": "Insight",
  "insight.disclaimer": "Insights compare your signals with your own baseline. They are not medical advice.",
  "insight.sleepBelowBaselineStreak":
    "Your sleep has been below your 30-day baseline for {days} consecutive nights.",
  "insight.recoveryBelowBaseline":
    "Your recovery is {percent}% below your 30-day baseline.",
  "insight.hrvDownRhrUp":
    "Your HRV is trending down while your resting heart rate is trending up — a shift worth noticing.",
  "insight.activityStable":
    "Your activity has stayed steady at around {minutes} active minutes a day.",
  "insight.allStable": "All your signals are within your usual range.",
  "insight.metricStable": "Your {metric} is within your usual range, close to your 30-day baseline.",
  "insight.metricAbove": "Your {metric} is {percent}% above your 30-day baseline.",
  "insight.metricBelow": "Your {metric} is {percent}% below your 30-day baseline.",

  "vitalId.title": "Vital ID",
  "vitalId.subtitle": "A portable snapshot of your health identity",
  "vitalId.cardLabel": "Portable health identity",
  "vitalId.idLabel": "Vital ID",
  "vitalId.holder": "Holder",
  "vitalId.dob": "Date of birth",
  "vitalId.sex": "Sex",
  "vitalId.sex.female": "Female",
  "vitalId.sex.male": "Male",
  "vitalId.nationality": "Nationality",
  "vitalId.nationality.AE": "United Arab Emirates",
  "vitalId.emergency": "Emergency information",
  "vitalId.bloodType": "Blood type",
  "vitalId.allergies": "Allergies",
  "vitalId.allergy.penicillin": "Penicillin",
  "vitalId.conditions": "Conditions",
  "vitalId.none": "None recorded",
  "vitalId.emergencyContact": "Emergency contact",
  "vitalId.relation.brother": "Brother",
  "vitalId.currentSignals": "Current signals",
  "vitalId.recentTrends": "Recent trends",
  "vitalId.healthProfile": "Health profile",
  "vitalId.height": "Height",
  "vitalId.weight": "Weight",
  "vitalId.medications": "Medications",
  "vitalId.cm": "cm",
  "vitalId.kg": "kg",
  "vitalId.dataSources": "Data sources",
  "vitalId.lastUpdated": "Last updated",
  "vitalId.today": "Today",
  "vitalId.shareCta": "Share securely",
  "vitalId.shareHint": "Choose exactly what to share, for how long.",
  "vitalId.question": "What can I securely share?",

  "common.today": "Today",
  "common.yesterday": "Yesterday",
  "common.daysAgo": "{days} days ago",
  "common.back": "Back",
  "common.loading": "Loading…",
  "common.error": "Something went wrong. Please try again.",
  "common.empty": "Nothing to show yet.",
  "common.notFound": "This page does not exist.",
  "common.goHome": "Go to Home",

  ...pickLocale(shareStrings, 0),
  ...pickLocale(brandStrings, 0),
} as const;

export type TranslationKey = keyof typeof en;

const ar: Record<TranslationKey, string> = {
  "app.name": "Vital ID",
  "app.tagline": "هويتك الصحية المحمولة",
  "app.demoBadge": "بيانات تجريبية",

  "nav.home": "الرئيسية",
  "nav.trends": "الاتجاهات",
  "nav.vitalId": "Vital ID",
  "nav.share": "المشاركة",
  "lang.switch": "English",
  "lang.label": "اللغة",

  "home.greeting.morning": "صباح الخير، {name}",
  "home.greeting.afternoon": "مساء الخير، {name}",
  "home.greeting.evening": "مساء الخير، {name}",
  "home.subtitle": "هذا ما يحدث اليوم",
  "home.todaysInsight": "رؤية اليوم",
  "home.signals": "مؤشرات اليوم",
  "home.viewTrends": "عرض الاتجاهات",
  "home.openVitalId": "افتح Vital ID",
  "home.question.today": "ماذا يحدث اليوم؟",

  "metric.recovery": "التعافي",
  "metric.sleep": "النوم",
  "metric.hrv": "تقلب معدل ضربات القلب",
  "metric.hrv.long": "تقلب معدل ضربات القلب",
  "metric.restingHeartRate": "معدل ضربات القلب أثناء الراحة",
  "metric.activity": "النشاط",

  "unit.%": "%",
  "unit.h": "س",
  "unit.ms": "م.ث",
  "unit.bpm": "نبضة/د",
  "unit.min": "د",

  "baseline.30day": "خط الأساس لـ 30 يومًا",
  "baseline.7dayAvg": "متوسط 7 أيام",
  "baseline.today": "اليوم",
  "baseline.vsBaseline": "مقابل خط الأساس",

  "status.stable": "مستقر",
  "status.improving": "في تحسّن",
  "status.declining": "في تراجع",
  "status.unusual": "انحراف غير معتاد",
  "range.below": "أقل من النطاق المعتاد",
  "range.above": "أعلى من النطاق المعتاد",
  "range.within": "ضمن النطاق المعتاد",

  "source.demoWearable": "جهاز قابل للارتداء تجريبي",
  "source.manualProfile": "ملف يدوي",
  "source.label": "المصدر",

  "trends.title": "الاتجاهات",
  "trends.subtitle": "كيف تتغير مؤشراتك مقارنة بخط أساسك الشخصي",
  "trends.range.7d": "7 أيام",
  "trends.range.30d": "30 يومًا",
  "trends.question": "كيف تتغير؟",
  "trends.baselineLine": "خط الأساس",
  "trends.high": "الأعلى",
  "trends.low": "الأدنى",
  "trends.whatItMeans": "ماذا يعني ذلك",
  "trends.noData": "لا توجد بيانات لهذه الفترة بعد.",

  "insight.title": "رؤية",
  "insight.disclaimer": "تقارن الرؤى مؤشراتك بخط أساسك الشخصي، وهي ليست نصيحة طبية.",
  "insight.sleepBelowBaselineStreak":
    "كان نومك أقل من خط أساسك لـ 30 يومًا خلال {days} ليالٍ متتالية.",
  "insight.recoveryBelowBaseline":
    "تعافيك أقل بنسبة {percent}% من خط أساسك لـ 30 يومًا.",
  "insight.hrvDownRhrUp":
    "تقلب معدل ضربات قلبك يتراجع بينما يرتفع معدل ضربات القلب أثناء الراحة — تغيّر يستحق الملاحظة.",
  "insight.activityStable":
    "بقي نشاطك ثابتًا عند نحو {minutes} دقيقة نشطة يوميًا.",
  "insight.allStable": "جميع مؤشراتك ضمن نطاقك المعتاد.",
  "insight.metricStable": "{metric} ضمن نطاقك المعتاد وقريب من خط أساسك لثلاثين يومًا.",
  "insight.metricAbove": "{metric} أعلى بنسبة {percent}% من خط أساسك لثلاثين يومًا.",
  "insight.metricBelow": "{metric} أقل بنسبة {percent}% من خط أساسك لثلاثين يومًا.",

  "vitalId.title": "Vital ID",
  "vitalId.subtitle": "لقطة محمولة لهويتك الصحية",
  "vitalId.cardLabel": "هوية صحية محمولة",
  "vitalId.idLabel": "Vital ID",
  "vitalId.holder": "صاحب الهوية",
  "vitalId.dob": "تاريخ الميلاد",
  "vitalId.sex": "الجنس",
  "vitalId.sex.female": "أنثى",
  "vitalId.sex.male": "ذكر",
  "vitalId.nationality": "الجنسية",
  "vitalId.nationality.AE": "الإمارات العربية المتحدة",
  "vitalId.emergency": "معلومات الطوارئ",
  "vitalId.bloodType": "فصيلة الدم",
  "vitalId.allergies": "الحساسية",
  "vitalId.allergy.penicillin": "البنسلين",
  "vitalId.conditions": "الحالات",
  "vitalId.none": "لا يوجد",
  "vitalId.emergencyContact": "جهة اتصال الطوارئ",
  "vitalId.relation.brother": "الأخ",
  "vitalId.currentSignals": "المؤشرات الحالية",
  "vitalId.recentTrends": "الاتجاهات الأخيرة",
  "vitalId.healthProfile": "الملف الصحي",
  "vitalId.height": "الطول",
  "vitalId.weight": "الوزن",
  "vitalId.medications": "الأدوية",
  "vitalId.cm": "سم",
  "vitalId.kg": "كغ",
  "vitalId.dataSources": "مصادر البيانات",
  "vitalId.lastUpdated": "آخر تحديث",
  "vitalId.today": "اليوم",
  "vitalId.shareCta": "مشاركة آمنة",
  "vitalId.shareHint": "اختر بالضبط ما تشاركه ولأي مدة.",
  "vitalId.question": "ماذا يمكنني مشاركته بأمان؟",

  "common.today": "اليوم",
  "common.yesterday": "أمس",
  "common.daysAgo": "قبل {days} أيام",
  "common.back": "رجوع",
  "common.loading": "جارٍ التحميل…",
  "common.error": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  "common.empty": "لا يوجد شيء لعرضه بعد.",
  "common.notFound": "هذه الصفحة غير موجودة.",
  "common.goHome": "الانتقال إلى الرئيسية",

  ...pickLocale(shareStrings, 1),
  ...pickLocale(brandStrings, 1),
};

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, ar };

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let text: string = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function formatNumber(locale: Locale, value: number, decimals = 0): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(locale: Locale, iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-GB", {
    day: "numeric",
    month: "short",
    ...opts,
  }).format(new Date(iso));
}
