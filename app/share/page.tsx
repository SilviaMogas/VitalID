import Link from "next/link";
import ShareClient from "@/components/share/ShareClient";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  if (!await getCurrentUser()) {
    return (
      <section className="card space-y-3 p-5">
        <h1 className="text-xl font-semibold">Demo sharing is disabled / مشاركة العرض التجريبي غير متاحة</h1>
        <p>Demo measurements cannot be shared as a health report. Sign in to share your own readings.</p>
        <p lang="ar" dir="rtl">لا يمكن مشاركة القياسات التجريبية كتقرير صحي. سجّل الدخول لمشاركة قياساتك.</p>
        <Link href="/connectors" className="text-brand">Explore connector demos / استكشف العروض التجريبية</Link>
      </section>
    );
  }
  return <ShareClient />;
}
