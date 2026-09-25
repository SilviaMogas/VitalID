import SharedViewClient from '@/components/share/SharedViewClient';
import type { Lang } from '@/lib/share-i18n';

export const dynamic = 'force-dynamic';

export default async function SharedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const { lang } = await searchParams;
  const l: Lang = lang === 'ar' ? 'ar' : 'en';
  return <SharedViewClient id={token} lang={l} />;
}
