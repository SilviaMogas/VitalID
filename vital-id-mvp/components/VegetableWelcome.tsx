"use client";

export default function VegetableWelcome() {
  return <div className="vegetable-stage" aria-hidden="true">
    <div className="garden-halo" />
    <svg className="garden-veg garden-broccoli" viewBox="0 0 100 120">
      <path d="M42 61h18l8 47H34z" fill="#8caf52" />
      <g fill="#307c48"><circle cx="30" cy="46" r="23"/><circle cx="52" cy="28" r="25"/><circle cx="75" cy="47" r="23"/><circle cx="52" cy="54" r="28"/></g>
      <g fill="#173d31"><circle cx="41" cy="53" r="3.5"/><circle cx="62" cy="53" r="3.5"/></g>
      <path d="M44 64q8 9 15 0" fill="none" stroke="#173d31" strokeWidth="3" strokeLinecap="round"/>
      <path d="M36 85L21 77m42 8 15-9" stroke="#6b963e" strokeWidth="6" strokeLinecap="round"/>
    </svg>
    <svg className="garden-veg garden-carrot" viewBox="0 0 100 120">
      <path d="M50 30Q22 5 32 4q19 4 18 26Q48 0 61 3q8 5-11 27Q70 9 79 19q-5 13-29 11" fill="#438b48"/>
      <path d="M26 37Q50 22 76 37Q69 78 50 113Q32 77 26 37" fill="#ed944e"/>
      <path d="M30 52h12m23 15H54m-14 16h10" stroke="#ca682f" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="41" cy="43" r="3" fill="#573520"/><circle cx="60" cy="43" r="3" fill="#573520"/>
      <path d="M44 53q7 7 12 0" fill="none" stroke="#573520" strokeWidth="3" strokeLinecap="round"/>
    </svg>
    <svg className="garden-veg garden-tomato" viewBox="0 0 100 120">
      <path d="M18 53Q10 85 36 99Q67 114 86 82Q99 47 72 41Q49 33 28 43z" fill="#df6957"/>
      <path d="M50 49L29 36l17 2 9-20 4 22 22-8-15 18 6 14-19-9-14 10z" fill="#3d8146"/>
      <circle cx="37" cy="72" r="3.5" fill="#602e2a"/><circle cx="63" cy="72" r="3.5" fill="#602e2a"/>
      <path d="M42 84q9 9 16 0" fill="none" stroke="#602e2a" strokeWidth="3" strokeLinecap="round"/>
    </svg>
    <span className="garden-spark garden-spark-one">✦</span><span className="garden-spark garden-spark-two">✦</span>
  </div>;
}
