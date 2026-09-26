import { type NextRequest, NextResponse } from "next/server";

const links = {
  plus: process.env.STRIPE_PAYMENT_LINK_PLUS,
  circle: process.env.STRIPE_PAYMENT_LINK_CIRCLE,
};

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan");
  const target = plan === "plus" || plan === "circle" ? links[plan] : undefined;
  if (!target) return NextResponse.redirect(new URL("/membership?billing=not-configured", request.url), 303);
  try {
    const url = new URL(target);
    if (url.protocol !== "https:") throw new Error("Payment link must use HTTPS");
    return NextResponse.redirect(url, 303);
  } catch {
    return NextResponse.redirect(new URL("/membership?billing=invalid-configuration", request.url), 303);
  }
}
