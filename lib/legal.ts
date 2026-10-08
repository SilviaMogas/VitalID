import type { Locale } from "@/types";

/**
 * Legal content for Vital ID (vitalid.site) — privacy policy + terms of service.
 *
 * Honest template for a real lawyer to review before launch. Every `TODO-LEGAL`
 * marker flags a decision that needs professional legal review (real controller
 * entity, DPO, jurisdiction, DPIA, retention periods, transfer mechanism).
 *
 * Each document is one plain-text source per locale — easy for a lawyer to read
 * and redline. Format: `## ` starts a numbered section, blank lines separate
 * blocks, and lines starting `- ` become bullets.
 */

export const PRIVACY_VERSION = "2026-10-08";

/** Browser flag for the demo session's health-data consent (no server account). */
export const HEALTH_CONSENT_STORAGE_KEY = "vitalid.consent.healthData";
export const TERMS_VERSION = "2026-10-08";
export const LEGAL_CONTACT_EMAIL = "hello@vitalid.site";

export type LegalDocKind = "privacy" | "terms";

export function isLegalDoc(slug: string): slug is LegalDocKind {
  return slug === "privacy" || slug === "terms";
}

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

export interface RenderedSection {
  heading: string;
  blocks: LegalBlock[];
}

const PRIVACY_EN = `## 1. Who we are
Vital ID ("Vital ID", "we", "us") is a portable health-identity web application available at vitalid.site. It lets you aggregate wearable and manually entered health signals, view them against your own baseline, and share selected fields through temporary, revocable links.

Vital ID acts as the data controller for the personal data described in this policy. // TODO-LEGAL: replace with the legal entity name and registered address.

Contact: ${LEGAL_CONTACT_EMAIL}. // TODO-LEGAL: appoint and publish a real DPO / privacy contact if required.

## 2. Data we collect
We collect only the data needed to run the service:

- Account data: first name, last name, email address, country and city, and authentication credentials (passwords are handled by Supabase Auth and are never visible to us).
- Profile data you enter: date of birth, gender, nationality, height, weight and an optional profile photo.
- Health data you enter or connect: allergies, medications, medical conditions, blood type, emergency contact, lifestyle baseline (sleep, resting heart rate, steps, workouts, hydration and calorie targets), and signals received from connected sources (currently WHOOP via OAuth; other providers are marked as sample data until real integrations exist).
- Technical data: session cookies, your chosen language, and product analytics (Vercel Analytics).
- Payment data: processed entirely by Stripe. We never see or store your card number — we only store your plan and payment status.

## 3. Legal bases (GDPR)
Where the GDPR applies, we rely on:

- Contract (Art. 6(1)(b)): creating and running your account, plan and Vital ID.
- Explicit consent (Art. 9(2)(a)): processing health data — the fields you enter, your baseline, and data synced from connected wearables. You give this consent via an unchecked checkbox at sign-up and before connecting a wearable, and we store a timestamped record of it (vital_id_consents). You can withdraw it at any time by contacting us; withdrawal does not affect processing already performed.
- Legitimate interest (Art. 6(1)(f)): securing the service, preventing abuse and improving the product.
- Legal obligation (Art. 6(1)(c)): records we must keep for tax or accounting reasons (e.g. Stripe payment records).

## 4. How we use your data
We use your data to operate the service: build your baseline and trends, render your dashboard and insights, run the AI coach (explainable recommendations against your own data — never medical advice), process your plan and payments, and create the temporary share links you explicitly request. We do not sell your data and we do not use health data for advertising.

## 5. Third parties
We share data only with the processors needed to run Vital ID:

- Supabase — database and authentication hosting.
- Vercel — application hosting and privacy-friendly product analytics.
- Stripe — payment processing (your card data goes to Stripe directly).
- WHOOP — data source you optionally connect via OAuth; their own privacy policy applies to data they hold.
- Insurers or recipients you choose — only through a temporary share link you create yourself, with only the fields you selected, for as long as the link is valid. // TODO-LEGAL: confirm the full sub-processor list and add DPAs where required.

## 6. Temporary sharing
Sharing is a core, consent-first feature: a link contains only the fields you select, expires at the time you choose (15 minutes to 24 hours), and can be revoked at any time. Insurers or other recipients get secure, read-only access to that link — we do not transmit your health data to them by any other channel. Each access and consent confirmation is logged in the app.

## 7. Retention
We keep your account and health data for as long as your account is active. Temporary share links are deleted or expire automatically. // TODO-LEGAL: define exact retention periods per data category and a deletion schedule.

When you ask us to delete your account, we delete or anonymize your personal data within a reasonable period, except records we must keep by law.

## 8. Your rights
Where the GDPR applies you have the right to: access your data; rectify it; erase it; restrict or object to processing; data portability; withdraw consent at any time (including your Art. 9 health-data consent); and lodge a complaint with your supervisory authority. To exercise any right, email us at the contact address above. // TODO-LEGAL: add a self-service export/delete flow.

## 9. International transfers
Our processors (Supabase, Vercel, Stripe, WHOOP) may process data outside your country. // TODO-LEGAL: document regions, transfer mechanism (e.g. SCCs) and UAE PDPL alignment.

## 10. Security
Sessions use httpOnly cookies; health tables are reachable only through server-side service keys with row-level security enabled and no public policies; share tokens are 128-bit random strings; and share payloads contain only the fields you selected. No method is 100% secure — email us immediately if you suspect a breach.

## 11. Children
Vital ID is not directed at children. // TODO-LEGAL: set a minimum age (13/16 depending on market) and add age assurance if needed.

## 12. Demo and sample data
The "Fatima" demo profile and connectors marked "sample data" display synthetic data bundled with the app for demonstration. Do not rely on them; they are not your data and are not real medical records.

## 13. Changes
We may update this policy; the version date above always shows the current one. Material changes will be flagged in the app. Continuing to use Vital ID after an update means you accept the new policy.`;

const PRIVACY_AR = `## ١. من نحن
Vital ID («Vital ID»، «نحن») تطبيق ويب للهوية الصحية المحمولة متاح على vitalid.site. يتيح لك تجميع المؤشرات الصحية من الأجهزة القابلة للارتداء أو المُدخلة يدويًا، وعرضها مقابل خط أساسك الشخصي، ومشاركة حقول مختارة عبر روابط مؤقتة قابلة للإلغاء.

يعمل Vital ID كمسؤول عن البيانات الشخصية الموصوفة في هذه السياسة. // TODO-LEGAL: استبدال باسم الكيان القانوني والعنوان المسجّل.

للتواصل: ${LEGAL_CONTACT_EMAIL}. // TODO-LEGAL: تعيين ونشر مسؤول حقيقي لحماية البيانات / جهة اتصال للخصوصية إذا لزم الأمر.

## ٢. البيانات التي نجمعها
نجمع فقط البيانات اللازمة لتشغيل الخدمة:

- بيانات الحساب: الاسم الأول واسم العائلة والبريد الإلكتروني والبلد والمدينة وبيانات اعتماد المصادقة (تُدار كلمات المرور عبر Supabase Auth ولا تكون مرئية لنا أبدًا).
- بيانات الملف التي تدخلها: تاريخ الميلاد والجنس والجنسية والطول والوزن وصورة ملف اختيارية.
- البيانات الصحية التي تدخلها أو تربطها: الحساسية والأدوية والحالات الطبية وفصيلة الدم وجهة اتصال الطوارئ وخط أساس نمط الحياة (النوم ونبض القلب أثناء الراحة والخطوات والتمارين وأهداف الترطيب والسعرات)، والمؤشرات الواردة من المصادر المتصلة (حاليًا WHOOP عبر OAuth؛ أما المزودون الآخرون فمُعَدّون كبيانات نموذجية حتى تتوفر تكاملات حقيقية).
- البيانات التقنية: ملفات تعريف جلسة الارتباط واللغة المختارة وتحليلات المنتج (Vercel Analytics).
- بيانات الدفع: تُعالَج بالكامل عبر Stripe. لا نرى رقم بطاقتك ولا نخزّنه — نخزّن فقط خطتك وحالة الدفع.

## ٣. الأسس القانونية (اللائحة العامة لحماية البيانات)
عند انطباق اللائحة العامة لحماية البيانات (GDPR)، نعتمد على:

- العقد (المادة 6(1)(ب)): إنشاء وتشغيل حسابك وخطتك ومعرّفك الحيوي.
- الموافقة الصريحة (المادة 9(2)(أ)): معالجة البيانات الصحية — الحقول التي تدخلها وخط أساسك والبيانات المتزامنة من الأجهزة المتصلة. تمنح هذه الموافقة عبر خانة غير محددة مسبقًا عند التسجيل وقبل ربط أي جهاز، ونخزّن سجلًا مختومًا بالوقت لها (vital_id_consents). يمكنك سحبها في أي وقت بالتواصل معنا؛ ولا يؤثر السحب على المعالجة التي تمت سابقًا.
- المصلحة المشروعة (المادة 6(1)(و)): تأمين الخدمة ومنع إساءة الاستخدام وتحسين المنتج.
- الالتزام القانوني (المادة 6(1)(ج)): السجلات التي يجب علينا الاحتفاظ بها لأسباب ضريبية أو محاسبية (مثل سجلات مدفوعات Stripe).

## ٤. كيف نستخدم بياناتك
نستخدم بياناتك لتشغيل الخدمة: بناء خط أساسك واتجاهاتك، وعرض لوحتك ورؤاك، وتشغيل المدرّب الذكي (توصيات قابلة للتفسير مبنية على بياناتك — وليست نصيحة طبية أبدًا)، ومعالجة خطتك ومدفوعاتك، وإنشاء روابط المشاركة المؤقتة التي تطلبها صراحةً. لا نبيع بياناتك ولا نستخدم البيانات الصحية للإعلانات.

## ٥. الأطراف الثالثة
نشارك البيانات فقط مع المعالجين اللازمين لتشغيل Vital ID:

- Supabase — استضافة قاعدة البيانات والمصادقة.
- Vercel — استضافة التطبيق وتحليلات منتج مراعية للخصوصية.
- Stripe — معالجة المدفوعات (تذهب بيانات بطاقتك إلى Stripe مباشرة).
- WHOOP — مصدر بيانات تربطه اختياريًا عبر OAuth؛ وتنطبق سياسة خصوصيتهم على البيانات التي يحتفظون بها.
- شركات التأمين أو المستلمين الذين تختارهم — فقط عبر رابط مشاركة مؤقت تنشئه بنفسك، وبالحقول التي حددتها فقط، وللمدة التي يكون فيها الرابط صالحًا. // TODO-LEGAL: تأكيد قائمة المعالجين الفرعيين الكاملة وإضافة اتفاقيات معالجة البيانات عند الحاجة.

## ٦. المشاركة المؤقتة
المشاركة ميزة أساسية تُبنى على الموافقة: يحتوي الرابط فقط على الحقول التي تختارها، وينتهي في الوقت الذي تحدده (من ١٥ دقيقة إلى ٢٤ ساعة)، ويمكن إلغاؤه في أي وقت. تحصل شركات التأمين أو المستلمون الآخرون على وصول آمن للقراءة فقط إلى ذلك الرابط — لا ننقل بياناتك الصحية إليهم بأي قناة أخرى. ويُسجَّل كل وصول وتأكيد موافقة في التطبيق.

## ٧. الاحتفاظ بالبيانات
نحتفظ ببيانات حسابك وبياناتك الصحية ما دام حسابك نشطًا. تُحذف روابط المشاركة المؤقتة أو تنتهي صلاحيتها تلقائيًا. // TODO-LEGAL: تحديد فترات احتفاظ دقيقة لكل فئة بيانات وجدول حذف.

عندما تطلب حذف حسابك، نحذف بياناتك الشخصية أو نجعلها مجهولة خلال فترة معقولة، باستثناء السجلات التي يفرض القانون الاحتفاظ بها.

## ٨. حقوقك
عند انطباق GDPR يحق لك: الوصول إلى بياناتك؛ وتصحيحها؛ ومحوها؛ وتقييد معالجتها أو الاعتراض عليها؛ ونقلها؛ وسحب موافقتك في أي وقت (بما فيها موافقة المادة ٩ على البيانات الصحية)؛ وتقديم شكوى لدى السلطة الرقابية. لممارسة أي حق، راسلنا على عنوان التواصل أعلاه. // TODO-LEGAL: إضافة مسار تصدير/حذف ذاتي الخدمة.

## ٩. عمليات النقل الدولية
قد تعالج الجهات المُعالِجة لدينا (Supabase وVercel وStripe وWHOOP) البيانات خارج بلدك. // TODO-LEGAL: توثيق المناطق وآلية النقل (مثل البنود التعاقدية القياسية) والتوافق مع القانون الاتحادي الإماراتي لحماية البيانات الشخصية.

## ١٠. الأمان
تستخدم الجلسات ملفات تعريف ارتباط httpOnly؛ ولا يمكن الوصول إلى جداول الصحة إلا عبر مفاتيح خدمة من جهة الخادم مع تفعيل أمان مستوى الصف ودون سياسات عامة؛ ورموز المشاركة سلاسل عشوائية بطول 128 بت؛ ولا تحتوي حمولات المشاركة إلا على الحقول التي اخترتها. لا توجد طريقة آمنة بنسبة ١٠٠٪ — راسلنا فورًا إذا اشتبهت في اختراق.

## ١١. الأطفال
Vital ID غير موجّه للأطفال. // TODO-LEGAL: تحديد حد أدنى للعمر (13/16 حسب السوق) وإضافة تحقق من العمر إذا لزم الأمر.

## ١٢. البيانات التجريبية والنموذجية
يعرض ملف «فاطمة» التجريبي والموصلات الموسومة «بيانات نموذجية» بيانات اصطناعية مرفقة بالتطبيق لأغراض العرض. لا تعتمد عليها؛ فهي ليست بياناتك وليست سجلات طبية حقيقية.

## ١٣. التغييرات
قد نحدّث هذه السياسة؛ ويُظهر تاريخ الإصدار أعلاه النسخة الحالية دائمًا. ستُعلَم التغييرات الجوهرية داخل التطبيق. استمرارك في استخدام Vital ID بعد التحديث يعني قبولك السياسة الجديدة.`;

const TERMS_EN = `## 1. Agreement
These Terms of Service govern your use of Vital ID (vitalid.site). By creating an account or using the service you accept them. If you do not agree, do not use the service.

Last updated: ${TERMS_VERSION}.

## 2. The service
Vital ID is a portable health-identity app: it aggregates health signals you enter or sync, compares them with your own baseline, and lets you share selected fields through temporary, revocable links. The AI coach produces explainable recommendations from your own data.

Vital ID is not a medical device and does not provide medical advice, diagnosis or treatment. Insights and coach output are informational only — always consult a qualified healthcare professional for medical questions or emergencies.

## 3. Accounts and eligibility
You must provide accurate signup information, keep your credentials confidential and be legally able to consent to health-data processing. // TODO-LEGAL: confirm minimum age per market.

## 4. Health data and consent
By signing up you explicitly consent to the processing of your health data as described in the Privacy Policy, including data synced from wearables you connect. You can withdraw consent at any time; some features will stop working without it.

## 5. Demo and sample data
The "Login as Fatima" demo and providers marked "sample data" are for demonstration only and show synthetic data. The demo login can be disabled per deployment.

## 6. Payments
Paid plans are processed by Stripe. During the current demo period, a one-time $1 USD charge is made; no recurring subscription is created. Prices, plans and billing are described at checkout and may change with notice. // TODO-LEGAL: add refund and invoicing terms before real subscriptions go live.

## 7. Acceptable use
Do not misuse the service: no attempts to access other users' data or share links, no scraping, no unlawful content, and no use of Vital ID as a substitute for professional care. You are responsible for the share links you create and the recipients you authorize.

## 8. Intellectual property
The Vital ID app, brand and content belong to us. Your data remains yours: you grant us only the rights needed to operate the service. // TODO-LEGAL: confirm entity that owns the IP.

## 9. Disclaimers
The service is provided "as is" without warranties of any kind. Wearable and third-party data (e.g. WHOOP) is provided by their APIs; we are not responsible for their accuracy or availability. Sample and demo data is synthetic.

## 10. Liability
To the extent permitted by law, we are not liable for indirect, incidental or consequential damages, nor for decisions made on the basis of insights or coach output. // TODO-LEGAL: align the cap and exclusions with local law.

## 11. Termination
You may stop using Vital ID and request account deletion at any time. We may suspend accounts that breach these terms. On deletion your data is handled per the Privacy Policy.

## 12. Governing law
// TODO-LEGAL: choose governing law and venue (UAE onshore, DIFC/ADGM, or other) and whether a DPIA and local registration are required.`;

const TERMS_AR = `## ١. الاتفاقية
تحكم شروط الخدمة هذه استخدامك لـ Vital ID (vitalid.site). بإنشائك حسابًا أو استخدامك الخدمة فأنت تقبلها. إذا لم توافق، فلا تستخدم الخدمة.

آخر تحديث: ${TERMS_VERSION}.

## ٢. الخدمة
Vital ID تطبيق هوية صحية محمولة: يجمع المؤشرات الصحية التي تدخلها أو تزامنها، ويقارنها بخط أساسك الشخصي، ويتيح لك مشاركة حقول مختارة عبر روابط مؤقتة قابلة للإلغاء. ويقدّم المدرّب الذكي توصيات قابلة للتفسير مستندة إلى بياناتك.

Vital ID ليس جهازًا طبيًا ولا يقدّم استشارة أو تشخيصًا أو علاجًا طبيًا. الرؤى ومخرجات المدرّب معلوماتية فقط — استشر دائمًا مختصًا صحيًا مؤهلًا للأسئلة الطبية أو الحالات الطارئة.

## ٣. الحسابات والأهلية
يجب أن تقدّم معلومات تسجيل دقيقة وأن تحافظ على سرية بيانات اعتمادك وأن تكون مؤهلًا قانونًا للموافقة على معالجة البيانات الصحية. // TODO-LEGAL: تأكيد الحد الأدنى للعمر لكل سوق.

## ٤. البيانات الصحية والموافقة
بالتسجيل فأنت توافق صراحةً على معالجة بياناتك الصحية كما هو موصوف في سياسة الخصوصية، بما فيها البيانات المتزامنة من الأجهزة القابلة للارتداء التي تربطها. يمكنك سحب الموافقة في أي وقت؛ وقد تتوقف بعض الميزات عن العمل دونها.

## ٥. البيانات التجريبية والنموذجية
الدخول التجريبي «كفاطمة» والمزودون الموسومون «بيانات نموذجية» مخصصان للعرض فقط ويعرضان بيانات اصطناعية. ويمكن تعطيل الدخول التجريبي لكل عملية نشر.

## ٦. المدفوعات
تُعالَج الخطط المدفوعة عبر Stripe. خلال فترة العرض التجريبي الحالية، تُحصَّل دفعة واحدة قدرها $1 دولار أمريكي؛ ولا يُنشأ أي اشتراك متكرر. تُوصَف الأسعار والخطط والفوترة عند الدفع وقد تتغير بإشعار. // TODO-LEGAL: إضافة شروط الاسترداد والفوترة قبل إطلاق الاشتراكات الحقيقية.

## ٧. الاستخدام المقبول
لا تسيء استخدام الخدمة: لا محاولات للوصول إلى بيانات مستخدمين آخرين أو روابط مشاركتهم، ولا جمع آلي للبيانات، ولا محتوى غير قانوني، ولا استخدام لـ Vital ID كبديل عن الرعاية المهنية. أنت مسؤول عن روابط المشاركة التي تنشئها والمستلمين الذين تخوّلهم.

## ٨. الملكية الفكرية
تطبيق Vital ID وعلامته ومحتواه ملك لنا. تبقى بياناتك ملكًا لك: تمنحنا فقط الحقوق اللازمة لتشغيل الخدمة. // TODO-LEGAL: تأكيد الكيان المالك للملكية الفكرية.

## ٩. إخلاء المسؤولية
تُقدَّم الخدمة «كما هي» دون ضمانات من أي نوع. بيانات الأجهزة القابلة للارتداء والأطراف الثالثة (مثل WHOOP) مقدّمة عبر واجهاتها البرمجية؛ ولسنا مسؤولين عن دقتها أو توفرها. والبيانات النموذجية والتجريبية اصطناعية.

## ١٠. المسؤولية
بالقدر الذي يسمح به القانون، لا نتحمل مسؤولية الأضرار غير المباشرة أو العرضية أو التبعية، ولا عن القرارات المتخذة بناءً على الرؤى أو مخرجات المدرّب. // TODO-LEGAL: مواءمة سقف المسؤولية والاستثناءات مع القانون المحلي.

## ١١. الإنهاء
يمكنك التوقف عن استخدام Vital ID وطلب حذف حسابك في أي وقت. وقد نعلّق الحسابات التي تخالف هذه الشروط. عند الحذف تُعالَج بياناتك وفقًا لسياسة الخصوصية.

## ١٢. القانون الواجب التطبيق
// TODO-LEGAL: اختيار القانون الواجب التطبيق والاختصاص القضائي (الإمارات داخل الدولة، أو DIFC/ADGM، أو غيرها) وما إذا كان يلزم تقييم أثر حماية البيانات وتسجيل محلي.`;

const SOURCES: Record<LegalDocKind, { title: [string, string]; updated: [string, string]; version: string; text: [string, string] }> = {
  privacy: {
    title: ["Privacy Policy", "سياسة الخصوصية"],
    updated: [`Last updated: ${PRIVACY_VERSION}.`, `آخر تحديث: ${PRIVACY_VERSION}.`],
    version: PRIVACY_VERSION,
    text: [PRIVACY_EN, PRIVACY_AR],
  },
  terms: {
    title: ["Terms of Service", "شروط الخدمة"],
    updated: [`Last updated: ${TERMS_VERSION}.`, `آخر تحديث: ${TERMS_VERSION}.`],
    version: TERMS_VERSION,
    text: [TERMS_EN, TERMS_AR],
  },
};

/** Pick the localized string for a [en, ar] tuple. */
export function localized(pair: readonly [string, string], locale: Locale): string {
  return pair[locale === "ar" ? 1 : 0];
}

/** English doc title for <title>/metadata (page copy itself follows the UI locale). */
export function legalTitle(kind: LegalDocKind): string {
  return SOURCES[kind].title[0];
}

/** Parse one plain-text document into renderable sections. */
function parseSections(text: string): RenderedSection[] {
  const sections: RenderedSection[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0];
    if (head?.startsWith("## ")) {
      sections.push({ heading: head.slice(3).trim(), blocks: [] });
      lines.shift();
    }
    const section = sections.at(-1);
    if (!section || lines.length === 0) continue;
    if (lines.every((l) => l.startsWith("- "))) {
      section.blocks.push({ kind: "ul", items: lines.map((l) => l.slice(2)) });
    } else {
      section.blocks.push({ kind: "p", text: lines.join(" ") });
    }
  }
  return sections;
}

/** Fully localized document for rendering. */
export function legalDoc(kind: LegalDocKind, locale: Locale) {
  const src = SOURCES[kind];
  return {
    title: localized(src.title, locale),
    updated: localized(src.updated, locale),
    version: src.version,
    sections: parseSections(localized(src.text, locale)),
  };
}
