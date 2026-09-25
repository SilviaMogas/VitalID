import { NextResponse } from 'next/server';
import { SHARE_BACKEND } from '@/lib/share-store';
import { checkSupabaseConnection } from '@/lib/supabase/health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Reports which share backend is active and (for Supabase) whether the table is reachable. */
export async function GET() {
  const supabase = SHARE_BACKEND === 'supabase' ? await checkSupabaseConnection() : null;
  return NextResponse.json(
    { backend: SHARE_BACKEND, supabase },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
