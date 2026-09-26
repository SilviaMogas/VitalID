import { NextResponse } from "next/server";
export async function POST(req: Request) {
  if (req.headers.get("origin") && req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({error:"origin"},{status:403});
  let body: {essential?:boolean;whoop?:boolean};
  try { body = await req.json(); } catch { return NextResponse.json({error:"body"},{status:400}); }
  if (body.essential !== true) return NextResponse.json({error:"Consent required"},{status:400});
  const res = NextResponse.json({accepted:true});
  const secure = new URL(req.url).protocol === "https:";
  res.cookies.set("vitalid_pack_consent","1",{httpOnly:true,sameSite:"lax",secure,path:"/",maxAge:86400});
  res.cookies.set("vitalid_pack_whoop",body.whoop === true ? "1" : "",{httpOnly:true,sameSite:"lax",secure,path:"/",maxAge:body.whoop === true ? 86400 : 0});
  return res;
}
