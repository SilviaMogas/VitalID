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

const pricingStrings = {
  "pricing.title": ["Choose your plan", "اختر خطتك"],
  "pricing.subtitle": ["Unlock more of Vital ID — pick the plan that fits you.", "افتح المزيد من Vital ID — اختر الخطة المناسبة لك."],
  "pricing.plan.free.name": ["Free", "مجاني"],
  "pricing.plan.plus.name": ["Plus", "Plus"],
  "pricing.plan.pro.name": ["Pro", "Pro"],
  "pricing.billing.free": ["Free forever", "مجاني دائمًا"],
  "pricing.billing.monthly": ["/month", "/شهريًا"],
  "pricing.recommended": ["Recommended", "موصى به"],
  "pricing.yourPlan": ["Your plan", "خطتك"],
  "pricing.currentPlan": ["Current plan", "الخطة الحالية"],
  "pricing.included": ["Included", "مشمول"],
  "pricing.getPlan": ["Get {plan}", "احصل على {plan}"],
  "pricing.continueFree": ["Continue with Free", "المتابعة بالخطة المجانية"],
  "pricing.upgrade": ["Upgrade", "ترقية"],
  "pricing.upgradeTo": ["Upgrade to {plan}", "الترقية إلى {plan}"],
  "pricing.stripeNotConfigured": ["Payments are not configured yet — Stripe keys are missing.", "المدفوعات غير مهيأة بعد — مفاتيح Stripe غير موجودة."],
  "pricing.smallPrint": [
    "Hackathon launch offer: Plus and Pro are displayed at their intended monthly pricing. During this demo, a one-time $1 payment is charged. No recurring subscription is created.",
    "عرض إطلاق الهاكاثون: تُعرض خطتا Plus وPro بأسعارهما الشهرية المقصودة. خلال هذا العرض التجريبي، يُحصَّل مبلغ $1 لمرة واحدة فقط. لا يتم إنشاء أي اشتراك متكرر.",
  ],
  "pricing.smallPrint.short": ["Demo: one-time $1 charge today", "عرض تجريبي: دفعة $1 لمرة واحدة اليوم"],

  "pricing.feature.free.vitalId": ["Vital ID profile", "ملف Vital ID"],
  "pricing.feature.free.dashboard": ["Dashboard", "لوحة التحكم"],
  "pricing.feature.free.basicMetrics": ["Basic health metrics", "المؤشرات الصحية الأساسية"],
  "pricing.feature.free.basicTrends": ["Basic trends", "الاتجاهات الأساسية"],
  "pricing.feature.free.basicSharing": ["Basic sharing", "المشاركة الأساسية"],
  "pricing.feature.free.connectors": ["Up to 2 connectors", "حتى موصلَين"],
  "pricing.feature.plus.everythingFree": ["Everything in Free", "كل ما في الخطة المجانية"],
  "pricing.feature.plus.connectors": ["Up to 5 connectors", "حتى 5 موصلات"],
  "pricing.feature.plus.advancedTrends": ["Advanced trends", "اتجاهات متقدمة"],
  "pricing.feature.plus.qrSharing": ["QR sharing", "المشاركة عبر QR"],
  "pricing.feature.plus.configurableExpiry": ["Configurable link expiry", "مدة صلاحية قابلة للتخصيص"],
  "pricing.feature.plus.advancedInsights": ["Advanced insights", "رؤى متقدمة"],
  "pricing.feature.plus.detailedHealthProfile": ["More detailed health profile", "ملف صحي أكثر تفصيلًا"],
  "pricing.feature.pro.everythingPlus": ["Everything in Plus", "كل ما في خطة Plus"],
  "pricing.feature.pro.connectors": ["Unlimited connectors", "موصلات غير محدودة"],
  "pricing.feature.pro.nutrition": ["Nutrition & macros", "التغذية والعناصر الغذائية"],
  "pricing.feature.pro.advancedConsent": ["Advanced consent controls", "ضوابط موافقة متقدمة"],
  "pricing.feature.pro.caregiverAccess": ["Caregiver / family access", "وصول مقدّم الرعاية / العائلة"],
  "pricing.feature.pro.completeTimeline": ["Complete health timeline", "الجدول الزمني الصحي الكامل"],
  "pricing.feature.pro.priorityIntegrations": ["Priority future integrations", "أولوية في التكاملات المستقبلية"],

  "signup.title": ["Create your Vital ID", "أنشئ معرّفك الحيوي"],
  "signup.subtitle": ["One quick step before choosing your plan.", "خطوة سريعة واحدة قبل اختيار خطتك."],
  "signup.name": ["Name", "الاسم"],
  "signup.email": ["Email", "البريد الإلكتروني"],
  "signup.continue": ["Continue to plans", "المتابعة إلى الخطط"],
  "signup.exploreDemo": ["Explore the demo as Fatima", "استكشف العرض التجريبي بحساب فاطمة"],

  "checkout.welcome": ["Welcome to {plan}", "مرحبًا بك في {plan}"],
  "checkout.active": ["Your membership is active.", "عضويتك نشطة."],
  "checkout.goDashboard": ["Go to dashboard", "الانتقال إلى لوحة التحكم"],
  "checkout.managePlan": ["Manage plan", "إدارة الخطة"],
  "checkout.failedTitle": ["Payment not completed", "لم يكتمل الدفع"],
  "checkout.failedBody": ["We could not confirm your payment. If you were charged, your plan will activate automatically.", "تعذّر تأكيد الدفع. إذا تم خصم المبلغ، ستُفعَّل خطتك تلقائيًا."],
  "checkout.cancelledTitle": ["Checkout cancelled", "تم إلغاء الدفع"],
  "checkout.cancelledBody": ["No charge was made.", "لم يتم خصم أي مبلغ."],
  "checkout.backToPricing": ["Back to plans", "العودة إلى الخطط"],

  "membership.showcase.title": ["Included in your plan", "ضمن خطتك"],
  "membership.showcase.connectors": ["Data connectors", "موصلات البيانات"],
  "membership.showcase.connectorsUsed": ["{used} of {limit} connectors", "{used} من {limit} موصلات"],
  "membership.showcase.connectorsUnlimited": ["{used} connectors — unlimited", "{used} موصلات — غير محدود"],
  "membership.showcase.connectorsOver": ["You are over your plan's connector limit.", "لقد تجاوزت حد الموصلات في خطتك."],
  "membership.showcase.advancedInsights": ["Advanced insights", "رؤى متقدمة"],
  "membership.showcase.advancedInsightsDesc": ["Deeper analysis of your trends and signals.", "تحليل أعمق لاتجاهاتك ومؤشراتك."],
  "membership.showcase.nutrition": ["Nutrition & macros", "التغذية والعناصر الغذائية"],
  "membership.showcase.nutritionDesc": ["Track nutrition and macronutrients.", "تتبّع التغذية والعناصر الغذائية الكبرى."],
  "membership.showcase.caregiver": ["Caregiver / family access", "وصول مقدّم الرعاية / العائلة"],
  "membership.showcase.caregiverDesc": ["Share access with a caregiver or family member.", "شارك الوصول مع مقدّم رعاية أو فرد من العائلة."],
  "membership.showcase.consent": ["Advanced consent controls", "ضوابط موافقة متقدمة"],
  "membership.showcase.consentDesc": ["Fine-grained control over who sees what.", "تحكم دقيق في من يرى ماذا."],
  "membership.showcase.timeline": ["Complete health timeline", "الجدول الزمني الصحي الكامل"],
  "membership.showcase.timelineDesc": ["Your full health history in one place.", "سجلك الصحي الكامل في مكان واحد."],
  "membership.showcase.active": ["Active", "نشط"],

  "membership.gate.qrTitle": ["QR sharing is a Plus feature", "المشاركة عبر QR من ميزات Plus"],
  "membership.gate.qrDesc": ["Upgrade to share via QR code.", "قم بالترقية للمشاركة عبر رمز QR."],
} as const satisfies Record<string, readonly [string, string]>;

function pickLocale<T extends Record<string, readonly [string, string]>>(table: T, index: 0 | 1): { [K in keyof T]: string } {
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v[index]])) as { [K in keyof T]: string };
}

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
  ...pickLocale(pricingStrings, 0),
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
  ...pickLocale(pricingStrings, 1),
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
