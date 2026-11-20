import type { Locale } from "@/types";
import type { ConsentType } from "@/lib/consent";

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
const PRIVACY_LAST_UPDATED = "2026-11-20";

/** Browser flag for the demo session's health-data consent (no server account). */
export const HEALTH_CONSENT_STORAGE_KEY = "vitalid.consent.healthData";
export const TERMS_VERSION = "2026-10-08";

/**
 * Current policy version the server stamps per consent type. Owned by the
 * server — a client can never assert a version; when a policy is updated the
 * version here bumps and older consent records no longer satisfy the gates
 * (users re-consent). health_data is granted under the privacy policy.
 */
export const CONSENT_POLICY_VERSIONS: Record<ConsentType, string> = {
  privacy_policy: PRIVACY_VERSION,
  terms_of_service: TERMS_VERSION,
  health_data: PRIVACY_VERSION,
};
export const LEGAL_CONTACT_EMAIL = "hello@vitalid.site";
const DATA_CONTROLLER = "BMBWeb3 Global FZCO";

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
Vital ID ("Vital ID", "we", "us") is a portable health-identity service available at vitalid.site and through the Vital ID Android app for Solana Seeker. It lets you view wearable and manually entered health signals against your own baseline and share selected fields through temporary, revocable links.

${DATA_CONTROLLER} is the controller for the personal data described in this policy. Its registered office is IFZA Business Park, Building A1, Dubai Silicon Oasis, P.O. Box 342001, Dubai, United Arab Emirates.

Privacy and account deletion requests: ${LEGAL_CONTACT_EMAIL}. // TODO-LEGAL: appoint and publish DPO details if required.

## 2. Data we collect
We collect only the data needed to run the service:

- Account data: first name, last name, email address, country and city, and sign-in credentials (authentication is managed by Supabase Auth; Vital ID does not store your password).
- Optional Solana wallet sign-in: your public wallet address, a short-lived sign-in message, and the signature you approve are sent to Vital ID to verify control of the wallet. We keep the public wallet address linked to your Vital ID account in Supabase Auth so we can recognise your account the next time you sign in with the wallet. Sign-in does not send a blockchain transaction or require your private key or recovery phrase. Vital ID does not write your health data to Solana.
- Profile data you enter: date of birth, gender, nationality, height, weight and an optional profile photo.
- Health data you enter or connect: allergies, medications, medical conditions, blood type, emergency contact, lifestyle baseline (sleep, resting heart rate, steps, workouts, hydration and calorie targets), and signals received from connected sources (currently WHOOP via OAuth; other providers are marked as sample data until real integrations exist).
- Technical data: website session cookies, Android session tokens, and your chosen language.
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
- Cloudflare — hosts the website and API used by the Android app.
- Stripe — payment processing (your card data goes to Stripe directly).
- WHOOP — data source you optionally connect via OAuth; their own privacy policy applies to data they hold.
- Insurers or recipients you choose — only through a temporary share link you create yourself, with only the fields you selected, for as long as the link is valid. // TODO-LEGAL: confirm the full sub-processor list and add DPAs where required.

## 6. Temporary sharing
Sharing is a core, consent-first feature: a link contains only the fields you select, expires at the time you choose (15 minutes to 24 hours), and can be revoked at any time. Expiry or revocation stops access through Vital ID — it cannot recall copies recipients may have already saved, and expiry is not deletion of stored records.

## 7. Retention
We keep your account and health data for as long as your account is active. Temporary share links are deleted or expire automatically. // TODO-LEGAL: define exact retention periods per data category and a deletion schedule.

You can ask us to delete your account via the contact above; the process is currently manual. // TODO-LEGAL: implement a self-service deletion flow and document exact timelines and the statutory records we must keep.

## 8. Your rights
Where the GDPR applies you have the right to: access your data; rectify it; erase it; restrict or object to processing; data portability; withdraw consent at any time (including your Art. 9 health-data consent); and lodge a complaint with your supervisory authority. To exercise any right, email us at the contact address above. // TODO-LEGAL: add a self-service export/delete flow.

## 9. International transfers
Our providers (Supabase, Cloudflare, Stripe, WHOOP) may process data outside your country. // TODO-LEGAL: document regions, transfer mechanism (e.g. SCCs) and UAE PDPL alignment.

## 10. Security
Website sessions use HttpOnly cookies. The Android app keeps the access token in memory and saves the refresh token in the device's secure storage. Health tables are reachable only through server-side service keys with row-level security enabled and no public policies. Share tokens are 128-bit random strings, and share payloads contain only the fields you selected. No method is 100% secure — email us immediately if you suspect a breach.

## 11. Children
Vital ID is not directed at children. // TODO-LEGAL: set a minimum age (13/16 depending on market) and add age assurance if needed.

## 12. Demo and sample data
The "Fatima" demo profile and connectors marked "sample data" display synthetic data bundled with the app for demonstration. Do not rely on them; they are not your data and are not real medical records.

## 13. Changes
We may update this policy. The “Last updated” date above shows when this notice was last revised. It is separate from the policy version recorded with your consent. Material changes will be flagged in the app and we may ask you to review them.`;

const PRIVACY_AR = `## ١. من نحن
Vital ID («Vital ID»، «نحن») خدمة للهوية الصحية المحمولة متاحة على vitalid.site وعبر تطبيق Vital ID لنظام أندرويد على جهاز Solana Seeker. تتيح لك عرض المؤشرات الصحية الواردة من الأجهزة القابلة للارتداء أو المُدخلة يدويًا ومقارنتها بمستواك المرجعي الشخصي، ومشاركة الحقول التي تختارها عبر روابط مؤقتة قابلة للإلغاء.

الجهة المسؤولة عن معالجة البيانات الشخصية الموضّحة في هذه السياسة هي ${DATA_CONTROLLER}. مقرّها المسجّل في مجمّع IFZA للأعمال، المبنى A1، واحة دبي للسيليكون، ص. ب. 342001، دبي، الإمارات العربية المتحدة.

للاستفسارات المتعلقة بالخصوصية وطلبات حذف الحساب، راسلنا على ${LEGAL_CONTACT_EMAIL}. // TODO-LEGAL: تعيين مسؤول لحماية البيانات ونشر بيانات التواصل معه إذا لزم الأمر.

## ٢. البيانات التي نجمعها
نجمع فقط البيانات اللازمة لتشغيل الخدمة:

- بيانات الحساب: الاسم الأول واسم العائلة والبريد الإلكتروني والبلد والمدينة وبيانات اعتماد الدخول (تُدار المصادقة عبر Supabase Auth؛ ولا يخزّن Vital ID كلمة مرورك).
- تسجيل الدخول الاختياري بمحفظة Solana: نتحقق من تحكمك في المحفظة باستخدام عنوانها العام ورسالة تسجيل دخول قصيرة الصلاحية والتوقيع الذي توافق عليه. نحتفظ بعنوان المحفظة العام مرتبطًا بحسابك في Vital ID ضمن Supabase Auth لنتعرّف على حسابك عند تسجيل الدخول مجددًا بالمحفظة. لا يتطلب تسجيل الدخول إرسال معاملة على البلوكتشين أو مشاركة مفتاحك الخاص أو عبارة الاسترداد. لا يكتب Vital ID بياناتك الصحية على شبكة Solana.
- بيانات الملف التي تدخلها: تاريخ الميلاد والجنس والجنسية والطول والوزن وصورة ملف اختيارية.
- البيانات الصحية التي تدخلها أو تربطها: الحساسية والأدوية والحالات الطبية وفصيلة الدم وجهة اتصال الطوارئ وخط أساس نمط الحياة (النوم ونبض القلب أثناء الراحة والخطوات والتمارين وأهداف الترطيب والسعرات)، والمؤشرات الواردة من المصادر المتصلة (حاليًا WHOOP عبر OAuth؛ أما المزودون الآخرون فمُعَدّون كبيانات نموذجية حتى تتوفر تكاملات حقيقية).
- البيانات التقنية: ملفات تعريف الارتباط لجلسة الموقع، ورموز جلسة أندرويد، واللغة التي اخترتها.
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
- Cloudflare — استضافة الموقع وواجهة برمجة التطبيقات التي يستخدمها تطبيق أندرويد.
- Stripe — معالجة المدفوعات (تذهب بيانات بطاقتك إلى Stripe مباشرة).
- WHOOP — مصدر بيانات تربطه اختياريًا عبر OAuth؛ وتنطبق سياسة خصوصيتهم على البيانات التي يحتفظون بها.
- شركات التأمين أو المستلمين الذين تختارهم — فقط عبر رابط مشاركة مؤقت تنشئه بنفسك، وبالحقول التي حددتها فقط، وللمدة التي يكون فيها الرابط صالحًا. // TODO-LEGAL: تأكيد قائمة المعالجين الفرعيين الكاملة وإضافة اتفاقيات معالجة البيانات عند الحاجة.

## ٦. المشاركة المؤقتة
المشاركة ميزة أساسية تُبنى على الموافقة: يحتوي الرابط فقط على الحقول التي تختارها، وينتهي في الوقت الذي تحدده (من ١٥ دقيقة إلى ٢٤ ساعة)، ويمكن إلغاؤه في أي وقت. انتهاء الصلاحية أو الإلغاء يوقف الوصول عبر Vital ID — ولا يمكنه استرجاع النسخ التي قد يكون المستلمون قد حفظوها مسبقًا، والانتهاء ليس حذفًا للسجلات المخزنة.

## ٧. الاحتفاظ بالبيانات
نحتفظ ببيانات حسابك وبياناتك الصحية ما دام حسابك نشطًا. تُحذف روابط المشاركة المؤقتة أو تنتهي صلاحيتها تلقائيًا. // TODO-LEGAL: تحديد فترات احتفاظ دقيقة لكل فئة بيانات وجدول حذف.

يمكنك طلب حذف حسابك عبر جهة الاتصال أعلاه؛ والعملية حاليًا يدوية. // TODO-LEGAL: تنفيذ مسار حذف ذاتي الخدمة وتوثيق الجداول الزمنية الدقيقة والسجلات القانونية الواجب الاحتفاظ بها.

## ٨. حقوقك
عند انطباق GDPR يحق لك: الوصول إلى بياناتك؛ وتصحيحها؛ ومحوها؛ وتقييد معالجتها أو الاعتراض عليها؛ ونقلها؛ وسحب موافقتك في أي وقت (بما فيها موافقة المادة ٩ على البيانات الصحية)؛ وتقديم شكوى لدى السلطة الرقابية. لممارسة أي حق، راسلنا على عنوان التواصل أعلاه. // TODO-LEGAL: إضافة مسار تصدير/حذف ذاتي الخدمة.

## ٩. عمليات النقل الدولية
قد يعالج مزوّدو الخدمات لدينا (Supabase وCloudflare وStripe وWHOOP) البيانات خارج بلدك. // TODO-LEGAL: توثيق المناطق وآلية النقل (مثل البنود التعاقدية القياسية) والتوافق مع القانون الاتحادي الإماراتي لحماية البيانات الشخصية.

## ١٠. الأمان
تستخدم جلسات الموقع ملفات تعريف ارتباط من نوع HttpOnly. يحتفظ تطبيق أندرويد برمز الوصول في الذاكرة ويحفظ رمز تحديث الجلسة في مساحة التخزين الآمنة على الجهاز. لا يمكن الوصول إلى جداول الصحة إلا عبر مفاتيح خدمة من جهة الخادم، مع تفعيل أمان مستوى الصف ودون سياسات عامة. رموز المشاركة سلاسل عشوائية بطول 128 بت، ولا تتضمن البيانات المشتركة إلا الحقول التي اخترتها. لا توجد طريقة آمنة بنسبة ١٠٠٪ — راسلنا فورًا إذا اشتبهت في اختراق.

## ١١. الأطفال
Vital ID غير موجّه للأطفال. // TODO-LEGAL: تحديد حد أدنى للعمر (13/16 حسب السوق) وإضافة تحقق من العمر إذا لزم الأمر.

## ١٢. البيانات التجريبية والنموذجية
يعرض ملف «فاطمة» التجريبي والموصلات الموسومة «بيانات نموذجية» بيانات اصطناعية مرفقة بالتطبيق لأغراض العرض. لا تعتمد عليها؛ فهي ليست بياناتك وليست سجلات طبية حقيقية.

## ١٣. التغييرات
قد نحدّث هذه السياسة. يشير تاريخ «آخر تحديث» أعلاه إلى آخر مراجعة لهذا الإشعار، وهو منفصل عن إصدار السياسة المسجّل مع موافقتك. سننبّهك إلى التغييرات الجوهرية داخل التطبيق وقد نطلب منك مراجعتها.`;

const TERMS_EN = `## 1. Agreement
These Terms of Service govern your use of Vital ID (vitalid.site). By creating an account or using the service you accept them. If you do not agree, do not use the service.

Last updated: ${TERMS_VERSION}.

## 2. The service
Vital ID is a portable health-identity app: it aggregates health signals you enter or sync, compares them with your own baseline, and lets you share selected fields through temporary, revocable links. The AI coach produces explainable recommendations from your own data.

Vital ID is not a medical device and does not provide medical advice, diagnosis or treatment. Insights and coach output are informational only — always consult a qualified healthcare professional for medical questions or emergencies.

## 3. Accounts and eligibility
You must provide accurate signup information, keep your credentials confidential and be legally able to consent to health-data processing. // TODO-LEGAL: confirm minimum age per market.

## 4. Health data and consent
Creating an account means you accept these Terms. Consent to health-data processing is a separate, explicit choice — given through its own checkbox and recorded with a timestamp and the policy version you consented to. You can withdraw it at any time via the contact above; withdrawal handling and the affected features must be finalized before launch. // TODO-LEGAL

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
إنشاء الحساب يعني قبولك هذه الشروط. أما الموافقة على معالجة البيانات الصحية فهي خيار منفصل وصريح — تُمنح عبر خانة خاصة وتُسجَّل بختم زمني وإصدار السياسة التي وافقت عليها. يمكنك سحبها في أي وقت عبر جهة الاتصال أعلاه؛ ويجب تحديد آلية السحب والميزات المتأثرة قبل الإطلاق. // TODO-LEGAL

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
    updated: [`Last updated: ${PRIVACY_LAST_UPDATED}.`, `آخر تحديث: ${PRIVACY_LAST_UPDATED}.`],
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
