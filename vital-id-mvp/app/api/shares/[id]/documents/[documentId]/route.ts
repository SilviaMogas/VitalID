import { NextResponse } from "next/server";
import { getShare } from "@/lib/shareStore";
import { readPack } from "@/lib/informationPack";
export const dynamic = "force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{id:string;documentId:string}>}) {
  const {id,documentId}=await params;
  const {status,record}=await getShare(id,new URL(req.url).searchParams.get("t"),{countView:false});
  const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
  if(status!=="active"||!record)return NextResponse.json({status},{status:status==="expired"?410:status==="revoked"?403:404,headers});
  const doc=readPack(record.fields)?.documents.find(d=>d.id===documentId);
  if(!doc)return NextResponse.json({error:"not_found"},{status:404,headers});
  const name=doc.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  return new Response(new Uint8Array(Buffer.from(doc.base64,"base64")),{headers:{...headers,"Content-Type":doc.mime,"Content-Disposition":`attachment; filename="${name}"`,"Content-Security-Policy":"sandbox"}});
}
