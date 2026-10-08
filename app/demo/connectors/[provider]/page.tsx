import Link from "next/link";
import { notFound } from "next/navigation";
import { isProviderId, PROVIDERS } from "@/lib/connectors";
import { connectorDemo } from "@/lib/connector-demo";

export default async function ConnectorDemoPage({
  params,
}: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProviderId(provider) || !PROVIDERS[provider].sampleData) notFound();
  const metrics = connectorDemo(provider);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{PROVIDERS[provider].name} · Demo / عرض تجريبي</h1>
      <p className="card p-5">
        Illustrative sample data from the Vital ID demo dataset. These are not your readings
        or measurements supplied by this provider. This preview does not change your profile
        and cannot be included in a health report or shared with an insurer.
      </p>
      <p className="text-sm text-muted" lang="ar" dir="rtl">
        بيانات توضيحية من مجموعة العرض التجريبي، وليست قياساتك أو بيانات من هذا المزود.
        لا يغيّر هذا العرض ملفك ولا يمكن مشاركته في تقرير صحي أو مع شركة تأمين.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <article key={metric.metric} className="card p-5">
            <h2 className="font-semibold">{metric.metric}</h2>
            <p className="mt-2 text-xl">{metric.value} {metric.unit}</p>
            <p className="text-xs text-muted">Demo / عرض تجريبي</p>
          </article>
        ))}
      </div>
      <Link href="/connectors" className="text-brand">Back to connectors / العودة إلى الموصلات</Link>
    </section>
  );
}
