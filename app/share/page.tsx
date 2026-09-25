import ShareClient from '@/components/share/ShareClient';
import type { Lang } from '@/lib/share-i18n';

export const dynamic = 'force-dynamic';

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const l: Lang = lang === 'ar' ? 'ar' : 'en';
  return <ShareClient lang={l} />;
}
