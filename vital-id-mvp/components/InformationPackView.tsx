"use client";
import { useLang } from "@/app/providers";
import type { InformationPack } from "@/lib/informationPack";
export default function InformationPackView({pack,recipient,expiresAt,download}:{pack:InformationPack;recipient:string;expiresAt:number;download?:(id:string)=>string}) {
  const {lang}=useLang(); const ar=lang==="ar";
  const date=(v:string|number)=>new Date(v).toLocaleString(ar?"ar-AE":"en-GB");
  const source={manual:ar?"أدخلتها أنت":"Entered by you",whoop:ar?"WHOOP":"WHOOP",demo:ar?"مثال خيالي":"Fictional demo"};
  const verify={unverified:ar?"غير متحقق منها":"Unverified", "device-reported":ar?"أبلغ عنها الجهاز، غير متحقق منها طبياً":"Device-reported, not medically verified",fictional:ar?"خيالية، غير متحقق منها طبياً":"Fictional, not medically verified"};
  const kind={entered:ar?"تاريخ الإدخال":"Entered",retrieved:ar?"تاريخ الاسترجاع؛ تاريخ القياس غير متاح":"Retrieved; measurement date unavailable",sample:ar?"تاريخ المثال":"Sample date"};
  return <section className="pack-view flex flex-col gap-3" data-testid="pack-preview">
    <h2 className="text-xl font-bold">{pack.purpose==="insurer"?(ar?"حزمة معلومات لشركة التأمين":"Insurer information pack"):(ar?"حزمة معلومات صحية":"Health information pack")}</h2>
    <p>{ar?"المستلم المحدد: ":"Intended recipient: "}<strong>{recipient}</strong></p>
    <p>{ar?"للقراءة فقط · ينتهي الوصول في ":"Read-only · Access ends "}{date(expiresAt)}</p>
    {pack.demo&&<p className="card" data-testid="pack-fictional">{ar?"مثال خيالي بالكامل. المستلم التجريبي والسجلات خيالية.":"Entirely fictional demo. The demo recipient and records are fictional."}</p>}
    {pack.fields.map(f=><article className="card" key={f.id} data-testid={`pack-field-${f.id}`}>
      <h3 className="font-bold">{f.label}</h3><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{f.value}</p>
      <p className="text-sm">{source[f.source]} · {kind[f.dateKind]}: {date(f.date)} · {verify[f.verification]}</p>
    </article>)}
    {pack.documents.length>0&&<section><h3 className="font-bold">{ar?"المستندات المختارة":"Selected supporting documents"}</h3>
      {pack.documents.map(d=><article className="card mt-2" key={d.id} data-testid={`pack-document-${d.id}`}>
        <strong style={{overflowWrap:"anywhere"}}>{d.name}</strong>
        <p className="text-sm">{source[d.source]} · {ar?"أضيف في":"Added"} {date(d.date)} · {verify[d.verification]}</p>
        {download&&<a className="underline" href={download(d.id)} download={d.name}>{ar?"تنزيل المستند":"Download document"}</a>}
      </article>)}</section>}
    <p className="text-sm">{ar?"أداة لإعداد المعلومات ومشاركتها باختيارك. لا تعني قبول شركة التأمين أو التحقق الطبي أو الأهلية أو تغيّر الأقساط. لا توجد شراكة مع المستلم.":"A user-controlled preparation and sharing tool. This does not imply insurer acceptance, medical verification, eligibility or premium changes. No recipient partnership is implied."}</p>
  </section>;
}
