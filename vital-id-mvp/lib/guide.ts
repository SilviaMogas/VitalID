export const guideCopy = {
  ar: {
    title: "دليلك في Vital ID",
    welcome: "أهلاً بك. اضغط على «ابدأ» لنتابع خطوة بخطوة.",
    consent: "اقرأ كيف تُستخدم البيانات، ثم اختر إن كنت توافق على المتابعة.",
    checkin: "كيف تشعر اليوم؟ تحدّث أو اكتب، ثم أضف طاقتك وحركتك وطعامك.",
    signals: "راجع إشارات الجهاز واختر إن كنت تريد تضمينها؛ هذه الأرقام ليست تشخيصاً.",
    summary: "راجع الملخص، وعدّل أو احذف أي عبارة قبل المشاركة.",
    share: "اختر فقط المعلومات التي تريد مشاركتها.",
    create: "اختر المستلم ومدة الوصول، ثم اضغط على «أنشئ رابطاً آمناً».",
    qr: "الرابط جاهز. يمكن للمستلم مسح رمز QR؛ ولإيقاف المشاركة اضغط على «إلغاء الوصول الآن».",
    history: "هذا سجل أيامك. اختر تحدّياً صغيراً اليوم، وسأحتفل معك عند إنجازه.",
    revoked: "تم إلغاء الوصول إلى هذا الرابط. يمكنك إنشاء رابط جديد إذا أردت.",
    expired: "انتهت صلاحية الرابط. يمكنك إنشاء رابط جديد إذا أردت.",
    listening: "الإملاء قيد التشغيل. عند الانتهاء، اضغط على زر الإيقاف وراجع النص.",
    demo: "هذا الدليل لا يقدم تشخيصاً أو نصيحة طبية.",
    listen: "استمع إلى الدليل",
    stop: "أوقف القراءة",
    mute: "كتم الصوت طوال الرحلة",
    unmute: "إتاحة الصوت عند الطلب",
    unavailable: "لا يتوفر صوت لهذه اللغة في المتصفح الآن. يمكنك قراءة النص والمتابعة.",
    failed: "تعذّر تشغيل الصوت. يمكنك قراءة النص والمتابعة.",
    revokeFailed: "تعذّر تأكيد إلغاء الوصول. حاول مرة أخرى.",
  },
  en: {
    title: "Your Vital ID guide",
    welcome: "Welcome. Choose Start and we will go one step at a time.",
    consent: "Read how the data is used, then choose whether to agree and continue.",
    checkin: "How are you feeling today? Speak or type, then add energy, movement and food.",
    signals: "Review the wearable signals and choose whether to include them; these numbers are not a diagnosis.",
    summary: "Review your summary and edit or remove any sentence before sharing.",
    share: "Choose only the information you want to share.",
    create: "Choose the recipient and access duration, then select Create secure link.",
    qr: "Your link is ready. The recipient can scan the QR code; choose Revoke access now to stop sharing.",
    history: "This is your daily story. Choose one small challenge and I’ll celebrate when you complete it.",
    revoked: "Access to this link has been revoked. You can create a new link if you wish.",
    expired: "This link has expired. You can create a new link if you wish.",
    listening: "Dictation is on. When you finish, choose Stop and review the text.",
    demo: "This guide does not provide diagnoses or medical advice.",
    listen: "Listen to the guide",
    stop: "Stop reading",
    mute: "Mute voice for this journey",
    unmute: "Enable voice on request",
    unavailable: "No voice for this language is available in this browser right now. You can read the text and continue.",
    failed: "Audio could not play. You can read the text and continue.",
    revokeFailed: "We could not confirm revocation. Please try again.",
  },
} as const;

export type GuideStep = "welcome" | "consent" | "checkin" | "signals" | "summary" | "share" | "create" | "qr" | "history" | "revoked" | "expired";

export function guideStepForPath(path: string): GuideStep | null {
  const steps: Record<string, GuideStep> = {
    "/": "welcome", "/consent": "consent", "/checkin": "checkin", "/history": "history",
    "/signals": "signals", "/summary": "summary",
  };
  return steps[path] ?? null;
}

export function selectVoice<T extends { lang: string }>(voices: T[], lang: "ar" | "en"): T | undefined {
  return voices.find(v => v.lang.toLowerCase().replaceAll("_", "-").split("-")[0] === lang);
}
