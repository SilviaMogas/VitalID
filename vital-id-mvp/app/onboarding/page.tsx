"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/providers";
import { getItem,setItem,STORAGE_KEYS,type IssuedLink } from "@/lib/storage";
import { demoPack,validatePack,MAX_DOCUMENT_BYTES,PACK_KEY,type Purpose,type InformationPack,type PackField,type PackDocument } from "@/lib/informationPack";
import InformationPackView from "@/components/InformationPackView";
const DRAFT="vitalid.packDraft";
export default function Onboarding() {
  const {lang}=useLang();const ar=lang==="ar";const router=useRouter();
  const [step,setStep]=useState(0);const [purpose,setPurpose]=useState<Purpose>("appointment");
  const [essential,setEssential]=useState(false);const [optional,setOptional]=useState(false);
  const [accepted,setAccepted]=useState(false);const [mode,setMode]=useState<"manual"|"demo"|"whoop">("manual");
  const [fields,setFields]=useState<PackField[]>([]);const [documents,setDocuments]=useState<PackDocument[]>([]);
  const [selected,setSelected]=useState<string[]>([]);const [recipient,setRecipient]=useState("");
  const [ttl,setTtl]=useState(60);const [expiresAt,setExpiresAt]=useState(0);
  const [config,setConfig]=useState<{whoopConfigured:boolean;persistentShares:boolean}|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [ready,setReady]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);
  const say=(en:string,arabic:string)=>ar?arabic:en;
  useEffect(()=>{
    fetch("/api/onboarding/config",{cache:"no-store"}).then(r=>r.json()).then(setConfig).catch(()=>setConfig({whoopConfigured:false,persistentShares:false}));
    try {
      const saved=JSON.parse(sessionStorage.getItem(DRAFT)||"null") as {pack:InformationPack;recipient:string;ttl:number;optional:boolean;accepted:boolean;selected:string[]}|null;
      if(saved?.accepted&&validatePack(saved.pack,true)){
        setPurpose(saved.pack.purpose);setMode(saved.pack.demo?"demo":"manual");setFields(saved.pack.fields);setDocuments(saved.pack.documents);
        setRecipient(saved.recipient);setTtl(saved.ttl);setOptional(saved.optional);setSelected(saved.selected);setAccepted(true);setEssential(true);setStep(3);
      }
    } catch { sessionStorage.removeItem(DRAFT); }
    setReady(true);
  },[]);
  useEffect(()=>{if(ready)heading.current?.focus();},[step,ready]);
  useEffect(()=>{
    if(!ready||!accepted)return;
    try {sessionStorage.setItem(DRAFT,JSON.stringify({pack:{version:1,purpose,demo:mode==="demo",fields,documents},recipient,ttl,optional,accepted,selected}));}
    catch {setError(ar?"تعذر حفظ المسودة في المتصفح. قلّل حجم المستندات.":"Could not save this browser-session draft. Reduce document sizes.");}
  },[ready,accepted,purpose,mode,fields,documents,recipient,ttl,optional,selected,ar]);
  const consent=async()=>{
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/onboarding/consent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({essential,whoop:optional})});
      if(!r.ok)throw new Error();
      // Persist before rendering an external-connection action so OAuth cannot outrun the draft.
      sessionStorage.setItem(DRAFT,JSON.stringify({pack:{version:1,purpose,demo:mode==="demo",fields,documents},recipient,ttl,optional,accepted:true,selected}));
      setAccepted(true);setItem(STORAGE_KEYS.consent,{at:Date.now(),essential:true,optionalWhoop:optional});setStep(2);
    }catch{setError(say("Could not record consent. Please try again.","تعذر تسجيل الموافقة. حاول مجدداً."));}finally{setBusy(false);}
  };
  const start=(source:"manual"|"demo")=>{
    setMode(source);setError("");setFields([]);setDocuments([]);setSelected([]);setRecipient("");
    if(source==="demo"){
      const p=demoPack(ar,purpose);setFields(p.fields);setDocuments(p.documents);
      setRecipient(purpose==="insurer"?"Cedar Example Insurance (fictional)":say("Alex Example (fictional)","أليكس مثال (خيالي)"));
    }
    setStep(3);
  };
  const importWhoop=async()=>{
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/whoop/signals?journey=onboarding",{cache:"no-store"});const d=await r.json();
      if(!r.ok)throw new Error();
      if(!d.connected){window.location.assign("/api/whoop/connect?journey=onboarding");return;}
      if(d.simulated){setError(say("WHOOP is in test mode. Use the fictional demo instead.","WHOOP في وضع الاختبار. استخدم المثال الخيالي."));return;}
      const s=d.signals as {fetchedAt:number;sleepMinutes:number|null;rhr:number|null;hrv:number|null};
      const values=[["sleep",say("Sleep duration (minutes)","مدة النوم بالدقائق"),s.sleepMinutes],["rhr",say("Resting heart rate (bpm)","نبض الراحة"),s.rhr],["hrv",say("HRV (ms)","تباين نبض القلب"),s.hrv]] as const;
      const imported:PackField[]=values.filter(([, ,v])=>v!==null).map(([id,label,v])=>({id,label,value:String(v),source:"whoop",date:new Date(s.fetchedAt).toISOString(),dateKind:"retrieved",verification:"device-reported"}));
      if(!imported.length)throw new Error();
      setMode("whoop");setFields(imported);setDocuments([]);setSelected([]);setStep(3);
    }catch{setError(say("WHOOP could not be imported. You can enter information manually.","تعذر استيراد WHOOP. يمكنك إدخال المعلومات يدوياً."));}finally{setBusy(false);}
  };
  // OAuth returns here; health data is fetched only after the separate connection consent.
  useEffect(()=>{
    if(!ready||!accepted||!optional)return;
    const result=new URLSearchParams(window.location.search).get("whoop");
    if(result==="connected"){window.history.replaceState(null,"","/onboarding");void importWhoop();}
    if(result==="error"){setError(ar?"تعذر توصيل WHOOP. يمكنك البدء يدوياً.":"WHOOP connection failed. You can begin manually.");setStep(2);}
    // Import runs once on OAuth return, using the restored consent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready,accepted,optional]);
  const toggle=(id:string)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const add=()=>{
    const f:PackField={id:crypto.randomUUID(),label:say("Health note","ملاحظة صحية"),value:"",date:new Date().toISOString(),dateKind:mode==="demo"?"sample":"entered",source:mode==="demo"?"demo":"manual",verification:mode==="demo"?"fictional":"unverified"};
    setFields(old=>[...old,f]);
  };
  const upload=async(file:File)=>{
    setError("");setBusy(true);
    try{
      if(file.size>MAX_DOCUMENT_BYTES||file.size===0||documents.length>=3)throw new Error();
      const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);
      const doc:PackDocument={id:crypto.randomUUID(),name:file.name,mime:file.type as PackDocument["mime"],base64:btoa(binary),source:"manual",date:new Date().toISOString(),verification:"unverified"};
      const trial:InformationPack={version:1,purpose,demo:false,fields:fields.filter(f=>f.value.trim()),documents:[...documents,doc]};
      if(!validatePack({...trial,fields:[]}))throw new Error();
      setDocuments(trial.documents);
    }catch{setError(say("Use PDF, PNG, JPEG or plain text: up to 250 KB each, 3 documents and 600 KB total.","استخدم PDF أو PNG أو JPEG أو نصاً عادياً: 250 كيلوبايت للمستند، 3 مستندات، و600 كيلوبايت إجمالاً."));}finally{setBusy(false);}
  };
  const pack:InformationPack={version:1,purpose,demo:mode==="demo",fields:fields.filter(f=>selected.includes(f.id)),documents:documents.filter(d=>selected.includes(d.id))};
  const review=()=>{
    if(!validatePack(pack)){setError(say("Choose at least one complete field or document. Complete or deselect empty fields.","اختر حقلاً مكتملاً أو مستنداً واحداً على الأقل. أكمل الحقول الفارغة أو ألغ تحديدها."));return;}
    setError("");setExpiresAt(Date.now()+ttl*60000);setStep(4);
  };
  const create=async()=>{
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/shares",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:{[PACK_KEY]:JSON.stringify(pack)},recipientLabel:recipient.trim(),ttlMinutes:ttl,expiresAt,confirmed:true})});
      if(!r.ok){if(r.status===403){setAccepted(false);setStep(1);}throw new Error();}
      const d=await r.json() as {id:string;token:string;expiresAt:number;url:string};
      const link:IssuedLink={...d,recipientLabel:recipient.trim(),revokedAt:null};
      setItem(STORAGE_KEYS.shares,[link,...(getItem<IssuedLink[]>(STORAGE_KEYS.shares)||[])]);
      sessionStorage.removeItem(DRAFT);router.push("/share/issued/"+d.id);
    }catch{setError(say("Link was not created. Check consent and expiry, then try again.","لم يتم إنشاء الرابط. تحقق من الموافقة والصلاحية ثم حاول مجدداً."));}finally{setBusy(false);}
  };
  const titles=[say("Your health information, organised and shared on your terms.","معلوماتك الصحية، منظّمة وتُشارك وفق شروطك."),
    say("You stay in control","أنت تتحكم"),say("Choose how to begin","اختر كيف تبدأ"),say("Review and select","راجع واختر"),say("Preview before sharing","عاين قبل المشاركة")];
  if(!ready)return <p role="status">{say("Loading…","جارٍ التحميل…")}</p>;
  return <div className="pack-onboarding flex flex-col gap-5 pt-6" data-testid="pack-onboarding">
    <p className="eyebrow">Vital ID · {say("About 2 minutes","حوالي دقيقتين")} · {step+1}/5</p>
    <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">{titles[step]}</h1>
    {step===0&&<>
      <p>{say("Keep a clear record, choose what to share, and stop access whenever you need. Nothing is sent automatically.","احتفظ بسجل واضح، واختر ما تشاركه، وأوقف الوصول متى أردت. لا نرسل شيئاً تلقائياً.")}</p>
      <fieldset className="flex flex-col gap-3"><legend className="font-bold mb-2">{say("What would help you today?","ما الذي سيساعدك اليوم؟")}</legend>
        {(["appointment","caregiver","insurer"] as const).map((v,i)=><label className="field-check card" key={v}><input type="radio" name="purpose" checked={purpose===v} onChange={()=>setPurpose(v)}/>
          <span>{[say("Prepare for a medical appointment","الاستعداد لموعد طبي"),say("Share with a caregiver","المشاركة مع مقدم رعاية"),say("Prepare an insurer information pack","إعداد حزمة معلومات لشركة التأمين")][i]}</span></label>)}
      </fieldset>
      <p className="text-sm">{say("These are your chosen recipients, not integrated partners.","هؤلاء مستلمون تختارهم، وليسوا شركاء متكاملين.")}</p>
      <button className="btn btn-primary" onClick={()=>setStep(1)}>{say("Continue","متابعة")}</button>
      <Link className="underline" href="/register">{say("Existing account or Fátima dashboard demo","حساب قائم أو لوحة فاطمة التجريبية")}</Link>
    </>}
    {step===1&&<>
      <div className="card"><h2 className="font-bold">{say("Where information goes","أين تُحفظ المعلومات")}</h2>
        <p>{say("Drafts stay in this browser tab. When you confirm a link, only your selection is uploaded to Vital ID’s share store. Clear draft removes your browser copy.","تبقى المسودة في علامة تبويب المتصفح. عند تأكيد الرابط، تُرفع اختياراتك فقط إلى مخزن مشاركة Vital ID. مسح المسودة يزيل نسخة المتصفح.")}</p></div>
      <div className="card"><h2 className="font-bold">{say("Who can see it","من يمكنه الاطلاع")}</h2><p>{say("Nothing is sent automatically. Anyone with the link can read your selected pack until expiry or revocation. The name labels your intended recipient; it does not verify identity.","لا يُرسل شيء تلقائياً. يمكن لأي شخص يحمل الرابط قراءة الحزمة المختارة حتى انتهاء الصلاحية أو الإلغاء. اسم المستلم تسمية، وليس تحققاً من هويته.")}</p></div>
      <div className="card"><h2 className="font-bold">{say("Stop access","إيقاف الوصول")}</h2><p>{say("Revoke access now blocks future reads and downloads. It cannot erase saved copies or delete the server record. Find it on the link page or Share history. Clearing a draft does not revoke links.","«إلغاء الوصول الآن» يمنع القراءة والتنزيل مستقبلاً، لكنه لا يمحو النسخ المحفوظة أو سجل الخادم. ستجده في صفحة الرابط أو سجل المشاركة. مسح المسودة لا يلغي الروابط.")}</p></div>
      <label className="field-check card"><input data-testid="pack-essential" type="checkbox" checked={essential} onChange={e=>setEssential(e.target.checked)}/><span>{say("I agree to essential processing of my draft and storage of only what I confirm for sharing. I understand link access and revocation.","أوافق على معالجة مسودتي وحفظ ما أؤكد مشاركته فقط. أفهم الوصول بالرابط وإلغاءه.")}</span></label>
      <label className="field-check card"><input data-testid="pack-whoop-consent" type="checkbox" checked={optional} disabled={!config?.whoopConfigured} onChange={e=>setOptional(e.target.checked)}/><span>{say("Optional: import WHOOP data after separate WHOOP authorisation. Manual entry works without this.","اختياري: استيراد بيانات WHOOP بعد تفويض منفصل له. الإدخال اليدوي متاح دون ذلك.")}</span></label>
      {!config?.whoopConfigured&&<p>{say("WHOOP is unavailable until configured.","WHOOP غير متاح حتى يتم إعداده.")}</p>}
      <button className="btn btn-primary" disabled={!essential||busy} onClick={consent}>{say("Agree and continue","أوافق وأتابع")}</button>
    </>}
    {step===2&&<>
      <button data-testid="pack-start-manual" className="btn btn-primary" onClick={()=>start("manual")}>{say("Enter information manually","إدخال المعلومات يدوياً")}</button>
      <p>{say("Your own information, marked unverified. You can correct or remove it.","معلوماتك، موسومة بأنها غير متحقق منها. يمكنك تصحيحها أو حذفها.")}</p>
      <button data-testid="pack-start-demo" className="btn btn-outline" onClick={()=>start("demo")}>{say("Explore a fictional demo","استكشاف مثال خيالي")}</button>
      <p>{say("Synthetic records and a fictional recipient. No actual device connection.","سجلات اصطناعية ومستلم خيالي. لا يوجد اتصال فعلي بجهاز.")}</p>
      <button className="btn btn-outline" disabled={!config?.whoopConfigured||!optional||busy} onClick={importWhoop}>{say("Connect / import WHOOP","توصيل / استيراد WHOOP")}</button>
      <p>{config?.whoopConfigured?say("Optional consent is required. WHOOP authorisation is separate; no information is shared with a recipient.","يلزم تفويض اختياري. تفويض WHOOP منفصل؛ لا تُشارك المعلومات مع مستلم."):say("WHOOP: unavailable in this deployment.","WHOOP: غير متاح في هذا الإصدار.")}</p>
      <p className="card">{say("Future / unavailable: Circular, Oura, RENPHO, Apple Health, PLAUD and other devices. No connection is claimed.","مستقبلاً / غير متاح: Circular وOura وRENPHO وApple Health وPLAUD والأجهزة الأخرى. لا ندّعي اتصالها.")}</p>
    </>}
    {step===3&&<>
      {mode==="demo"&&<p className="card">{say("Fictional demo: all fields and documents below are synthetic.","مثال خيالي: جميع الحقول والمستندات التالية اصطناعية.")}</p>}
      <p>{say("Nothing is selected by default. Choose only what this recipient needs. Every entry carries its source, date and verification status.","لا يوجد تحديد تلقائي. اختر فقط ما يحتاجه هذا المستلم. لكل مدخل مصدر وتاريخ وحالة تحقق.")}</p>
      {fields.map(f=><article className="card flex flex-col gap-2" key={f.id}>
        <label className="field-check"><input type="checkbox" aria-label={say("Include ","تضمين ")+f.label} checked={selected.includes(f.id)} onChange={()=>toggle(f.id)}/><strong>{f.label}</strong></label>
        {f.source==="whoop"?<p>{f.value}</p>:<>
          <label>{say("Field name","اسم الحقل")}<input type="text" maxLength={120} value={f.label} onChange={e=>setFields(old=>old.map(x=>x.id===f.id?{...x,label:e.target.value}:x))}/></label>
          <label>{say("Value","القيمة")}<textarea aria-label={say("Value","القيمة")} maxLength={2000} value={f.value} onChange={e=>setFields(old=>old.map(x=>x.id===f.id?{...x,value:e.target.value,date:new Date().toISOString()}:x))}/></label>
        </>}
        <p className="text-sm">{f.source==="demo"?say("Fictional demo · Sample date","مثال خيالي · تاريخ المثال"):f.source==="whoop"?say("WHOOP · Retrieved (measurement date unavailable)","WHOOP · تم الاسترجاع (تاريخ القياس غير متاح)"):say("Entered by you · Entered","أدخلتها أنت · تاريخ الإدخال")} {new Date(f.date).toLocaleString(ar?"ar-AE":"en-GB")} · {f.source==="demo"?say("Fictional, not medically verified","خيالية، غير متحقق منها طبياً"):f.source==="whoop"?say("Device-reported, not medically verified","أبلغ عنها الجهاز، غير متحقق منها طبياً"):say("Unverified","غير متحقق منها")}</p>
        <button className="btn btn-outline" onClick={()=>{setFields(old=>old.filter(x=>x.id!==f.id));setSelected(old=>old.filter(x=>x!==f.id));}}>{say("Remove ","حذف ")+f.label}</button>
      </article>)}
      <button className="btn btn-outline" onClick={add} disabled={fields.length>=20}>{say("Add a field","إضافة حقل")}</button>
      <h2 className="text-xl font-bold">{say("Supporting documents","المستندات الداعمة")}</h2>
      {mode!=="demo"&&<label>{say("Add PDF, PNG, JPEG or text (250 KB each; 3 documents maximum)","أضف PDF أو PNG أو JPEG أو نصاً (250 كيلوبايت لكل ملف؛ 3 مستندات كحد أقصى)")}
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" disabled={busy||documents.length>=3} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value="";}}/></label>}
      {documents.map(d=><article className="card" key={d.id}>
        <label className="field-check"><input type="checkbox" checked={selected.includes(d.id)} onChange={()=>toggle(d.id)}/><span>{d.name}</span></label>
        <p className="text-sm">{d.source==="demo"?say("Fictional demo · Fictional","مثال خيالي · خيالي"):say("Uploaded by you · Unverified","رفعته أنت · غير متحقق منه")} · {say("Added","أضيف")} {new Date(d.date).toLocaleString(ar?"ar-AE":"en-GB")}</p>
        <button className="btn btn-outline" onClick={()=>{setDocuments(old=>old.filter(x=>x.id!==d.id));setSelected(old=>old.filter(x=>x!==d.id));}}>{say("Remove ","حذف ")+d.name}</button>
      </article>)}
      <label>{say("Named recipient","اسم المستلم")}<input type="text" data-testid="pack-recipient" maxLength={120} value={recipient} onChange={e=>setRecipient(e.target.value)}/></label>
      <label>{say("Access expires after","تنتهي صلاحية الوصول بعد")}<select value={ttl} onChange={e=>setTtl(Number(e.target.value))}>
        {[15,60,1440,10080].map(n=><option key={n} value={n}>{n===15?say("15 minutes","15 دقيقة"):n===60?say("1 hour","ساعة واحدة"):n===1440?say("1 day","يوم واحد"):say("7 days","7 أيام")}</option>)}</select></label>
      <button data-testid="pack-review" className="btn btn-primary" disabled={busy||!recipient.trim()||selected.length===0} onClick={review}>{say("Preview recipient view","معاينة عرض المستلم")}</button>
    </>}
    {step===4&&<>
      <p>{say("This is exactly the selected content your recipient will see. The link is not created yet.","هذا هو المحتوى المحدد الذي سيراه المستلم. لم يتم إنشاء الرابط بعد.")}</p>
      <InformationPackView pack={pack} recipient={recipient.trim()} expiresAt={expiresAt} download={id=>{const d=pack.documents.find(x=>x.id===id)!;return `data:${d.mime};base64,${d.base64}`;}}/>
      <p className="card">{say("Anyone holding this link can read the pack. Share it yourself with the intended recipient. You can revoke it from the next screen or Share history.","يمكن لأي شخص يحمل الرابط قراءة الحزمة. شاركه بنفسك مع المستلم المقصود. يمكنك إلغاؤه في الشاشة التالية أو سجل المشاركة.")}</p>
      {config?.persistentShares===false&&<p role="status">{say("This deployment has no persistent share store. Reliable cross-device links and retained history require setup. Do not upload real health records here.","هذا الإصدار لا يحتوي على مخزن مشاركة دائم. الروابط الموثوقة بين الأجهزة والسجل المستمر يتطلبان إعداداً. لا ترفع سجلات صحية حقيقية هنا.")}</p>}
      <button data-testid="pack-confirm" className="btn btn-primary" disabled={busy||(config?.persistentShares===false&&mode!=="demo")} onClick={create}>{say("Confirm and create read-only link","تأكيد وإنشاء رابط للقراءة فقط")}</button>
      <button className="btn btn-outline" onClick={()=>setStep(3)}>{say("Edit selection","تعديل الاختيار")}</button>
    </>}
    {error&&<p role="alert">{error}</p>}
    {step>0&&step<4&&<button className="btn btn-outline" disabled={busy} onClick={()=>{setError("");setStep(step-1);}}>{say("Back","رجوع")}</button>}
    <button className="underline" onClick={()=>{sessionStorage.removeItem(DRAFT);setFields([]);setDocuments([]);setSelected([]);setRecipient("");setStep(0);setError("");}}>{say("Clear this draft","مسح هذه المسودة")}</button>
    <Link className="underline" href="/share/history">{say("Share history & revoke access","سجل المشاركة وإلغاء الوصول")}</Link>
  </div>;
}
