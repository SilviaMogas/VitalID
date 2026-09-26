import {afterEach,describe,expect,it,vi} from "vitest";
import {demoPack,PACK_KEY,validatePack,readPack} from "./informationPack";
import {POST} from "@/app/api/shares/route";
import {GET as download} from "@/app/api/shares/[id]/documents/[documentId]/route";
import {createShare,getShare,resetShares,revokeShare} from "./shareStore";
afterEach(async()=>{vi.useRealTimers();await resetShares();});
describe("selective information packs",()=>{
  it("requires consistent, explicit provenance and fictional demo sources",()=>{
    const p=demoPack(false,"insurer");
    expect(validatePack(p)).toBe(true);expect(readPack({[PACK_KEY]:JSON.stringify(p)})).toEqual(p);
    p.fields[0].verification="unverified";expect(validatePack(p)).toBe(false);
    expect(validatePack({...demoPack(false,"insurer"),fields:[],documents:[]})).toBe(false);
    const mixed=demoPack(false,"insurer");mixed.fields[0].source="manual";mixed.fields[0].verification="unverified";
    expect(validatePack(mixed)).toBe(false);
  });
  it("preserves incomplete drafts without allowing incomplete sharing",()=>{
    const p=demoPack(false,"insurer");p.fields[0].value="";
    expect(validatePack(p,true)).toBe(true);expect(validatePack(p)).toBe(false);
    expect(validatePack({...p,fields:[],documents:[]},true)).toBe(true);
  });
  it("rejects HTML, invalid binary signatures and oversized documents",()=>{
    const p=demoPack(false,"insurer");
    expect(validatePack({...p,documents:[{...p.documents[0],mime:"text/html"}]})).toBe(false);
    expect(validatePack({...p,documents:[{...p.documents[0],mime:"application/pdf"}]})).toBe(false);
    expect(validatePack({...p,documents:[{...p.documents[0],base64:Buffer.alloc(250001).toString("base64")}]})).toBe(false);
  });
  it("requires essential consent, explicit confirmation and a named recipient at the API",async()=>{
    const fields={[PACK_KEY]:JSON.stringify(demoPack(false,"insurer"))};
    const make=(cookie="",confirmed=true,recipientLabel="Cedar Example Insurance (fictional)")=>new Request("http://localhost/api/shares",{method:"POST",headers:{"content-type":"application/json","cookie":cookie},body:JSON.stringify({fields,confirmed,recipientLabel,ttlMinutes:15,expiresAt:Date.now()+900000})});
    expect((await POST(make())).status).toBe(403);
    expect((await POST(make("vitalid_pack_consent=1",false))).status).toBe(400);
    expect((await POST(make("vitalid_pack_consent=1",true,""))).status).toBe(400);
    expect((await POST(make("vitalid_pack_consent=1"))).status).toBe(200);
    const invalid=new Request("http://localhost/api/shares",{method:"POST",body:JSON.stringify({fields:{x:"y"},ttlMinutes:null})});
    expect((await POST(invalid)).status).toBe(400);
  });
  it("separates owner revocation from recipient access and protects documents",async()=>{
    const p=demoPack(false,"insurer");const deadline=Date.now()+900000;
    const rec=await createShare({fields:{[PACK_KEY]:JSON.stringify(p)},recipientLabel:"Example",ttlMinutes:15,expiresAt:deadline,managed:true});
    expect(rec.expiresAt).toBe(deadline);
    const owner=String(rec.fields["pack:owner"]);
    expect(owner).not.toBe(rec.token);
    expect((await getShare(rec.id,owner)).status).toBe("not_found");
    expect((await revokeShare(rec.id,rec.token)).status).toBe("not_found");
    const request=()=>new Request(`http://localhost/api/shares/${rec.id}/documents/demo-note?t=${rec.token}`);
    const params=Promise.resolve({id:rec.id,documentId:"demo-note"});
    const response=await download(request(),{params});
    expect(response.status).toBe(200);expect(response.headers.get("content-disposition")).toContain("attachment");
    const contents=await response.text();
    expect(contents).toContain("FICTIONAL DEMO DOCUMENT");expect(contents).toContain("Fátima");
    expect((await revokeShare(rec.id,owner)).status).toBe("revoked");
    expect((await download(request(),{params})).status).toBe(403);
  });
  it("expires document access and counts page opens without counting status polls",async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
    const rec=await createShare({fields:{[PACK_KEY]:JSON.stringify(demoPack(true,"insurer"))},recipientLabel:"Example",ttlMinutes:1,managed:true});
    await getShare(rec.id,rec.token,{countView:false});expect((await getShare(rec.id,rec.token)).record?.views).toHaveLength(1);
    vi.advanceTimersByTime(60000);
    const response=await download(new Request(`http://localhost/doc?t=${rec.token}`),{params:Promise.resolve({id:rec.id,documentId:"demo-note"})});
    expect(response.status).toBe(410);
  });
});
