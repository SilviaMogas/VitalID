import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    stripe: { configured: Boolean(process.env.STRIPE_PAYMENT_LINK_PLUS && process.env.STRIPE_PAYMENT_LINK_CIRCLE) },
    supabase: { configured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) },
    auth: { configured: Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)) },
  }, { headers: { "Cache-Control": "no-store" } });
}
