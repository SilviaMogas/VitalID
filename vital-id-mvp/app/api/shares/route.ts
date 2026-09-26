import { NextResponse } from "next/server";
import { createShare } from "@/lib/shareStore";
import { readCookie } from "@/lib/whoop";
import { backendName } from "@/lib/shareBackend";
import { PACK_KEY,validatePack } from "@/lib/informationPack";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  let body: {fields?:Record<string,string|number>;recipientLabel?:string;ttlMinutes?:number;expiresAt?:number;confirmed?:boolean};
  try {
    const raw=await req.text();
    if(raw.length>900_000)return NextResponse.json({error:"body too large"},{status:413});
    body=JSON.parse(raw);
  } catch {return NextResponse.json({error:"invalid body"},{status:400});}
  const fields=body?.fields;
  if(!fields||typeof fields!=="object"||Array.isArray(fields)||!Object.keys(fields).length
    ||Object.keys(fields).length>50||Object.keys(fields).some(k=>k==="pack:owner")
    ||Object.values(fields).some(v=>typeof v!=="string"&&typeof v!=="number")
    ||!Number.isFinite(body.ttlMinutes)||typeof body.ttlMinutes!=="number"||body.ttlMinutes<=0
    ||(body.recipientLabel!==undefined&&(typeof body.recipientLabel!=="string"||body.recipientLabel.length>120))) {
    return NextResponse.json({error:"Invalid fields, recipient or expiry"},{status:400});
  }
  const isPack=PACK_KEY in fields;
  if(isPack){
    if(readCookie(req.headers.get("cookie"),"vitalid_pack_consent")!=="1")return NextResponse.json({error:"Consent required"},{status:403});
    let pack:unknown;try{pack=JSON.parse(String(fields[PACK_KEY]));}catch{return NextResponse.json({error:"Invalid pack"},{status:400});}
    if(Object.keys(fields).length!==1||!validatePack(pack)||body.confirmed!==true||!body.recipientLabel?.trim()
      ||!Number.isFinite(body.expiresAt)||!body.expiresAt||body.expiresAt<=Date.now()||body.expiresAt>Date.now()+7*86400000)
      return NextResponse.json({error:"Review, named recipient and valid expiry required"},{status:400});
    if(process.env.VERCEL&&backendName()==="file"&&!pack.demo)return NextResponse.json({error:"Persistent sharing storage required for personal records"},{status:503});
  }
  const record=await createShare({fields,recipientLabel:body.recipientLabel?.trim()||"Recipient",ttlMinutes:body.ttlMinutes,expiresAt:isPack?body.expiresAt:undefined,managed:isPack});
  return NextResponse.json({id:record.id,token:record.fields["pack:owner"]||record.token,expiresAt:record.expiresAt,url:`/share/${record.id}?t=${record.token}`},{headers:{"Cache-Control":"no-store"}});
}
