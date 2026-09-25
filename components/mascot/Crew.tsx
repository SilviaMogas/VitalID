import type { CSSProperties } from "react";

interface CharProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const FACE = "#1f3a2c";
const LIMB = "#5b4636";

function Face({ cx, cy, s = 1, smile = true }: { cx: number; cy: number; s?: number; smile?: boolean }) {
  return (
    <g>
      <ellipse cx={cx - 7 * s} cy={cy} rx={2.6 * s} ry={3.2 * s} fill={FACE} className="o-eye anim-blink" />
      <ellipse cx={cx + 7 * s} cy={cy} rx={2.6 * s} ry={3.2 * s} fill={FACE} className="o-eye anim-blink" style={{ ["--i" as string]: 0.4 }} />
      <circle cx={cx - 6 * s} cy={cy - 1} r={0.8 * s} fill="#fff" />
      <circle cx={cx + 8 * s} cy={cy - 1} r={0.8 * s} fill="#fff" />
      {smile ? (
        <path d={`M${cx - 6 * s} ${cy + 8 * s} Q ${cx} ${cy + 15 * s} ${cx + 6 * s} ${cy + 8 * s}`} fill={FACE} />
      ) : (
        <path d={`M${cx - 5 * s} ${cy + 8 * s} Q ${cx} ${cy + 12 * s} ${cx + 5 * s} ${cy + 8 * s}`} stroke={FACE} strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      <ellipse cx={cx - 12 * s} cy={cy + 6 * s} rx={3 * s} ry={1.6 * s} fill="#ff9d8f" opacity="0.5" />
      <ellipse cx={cx + 12 * s} cy={cy + 6 * s} rx={3 * s} ry={1.6 * s} fill="#ff9d8f" opacity="0.5" />
    </g>
  );
}

function Limbs({ cx, y, w, color = LIMB, up = false }: { cx: number; y: number; w: number; color?: string; up?: boolean }) {
  const l = up ? `M${cx - w} ${y} C ${cx - w - 10} ${y - 6}, ${cx - w - 14} ${y - 16}, ${cx - w - 10} ${y - 22}` : `M${cx - w} ${y} C ${cx - w - 8} ${y + 4}, ${cx - w - 14} ${y + 2}, ${cx - w - 16} ${y - 4}`;
  const r = up ? `M${cx + w} ${y} C ${cx + w + 10} ${y - 6}, ${cx + w + 14} ${y - 16}, ${cx + w + 10} ${y - 22}` : `M${cx + w} ${y} C ${cx + w + 8} ${y + 4}, ${cx + w + 14} ${y + 2}, ${cx + w + 16} ${y - 4}`;
  return (
    <g stroke={color} strokeWidth="4" fill="none" strokeLinecap="round">
      <path d={l} className="o-arm-l anim-wave" style={{ animationDuration: "1.3s" }} />
      <path d={r} className="o-arm-r anim-wave" style={{ animationDuration: "1.3s", animationDelay: "-0.65s", animationDirection: "reverse" }} />
    </g>
  );
}

function Legs({ cx, y, color = LIMB }: { cx: number; y: number; color?: string }) {
  return (
    <g stroke={color} strokeWidth="4" strokeLinecap="round">
      <path d={`M${cx - 8} ${y} L${cx - 10} ${y + 12}`} />
      <path d={`M${cx + 8} ${y} L${cx + 10} ${y + 12}`} />
      <ellipse cx={cx - 11} cy={y + 13} rx="6" ry="2.5" fill={color} stroke="none" />
      <ellipse cx={cx + 11} cy={y + 13} rx="6" ry="2.5" fill={color} stroke="none" />
    </g>
  );
}

export function Apple({ size = 90, className = "", style }: CharProps) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} style={style} aria-hidden>
      <Legs cx={50} y={86} />
      <Limbs cx={50} y={62} w={30} up />
      <path d="M50 22 C 30 10, 12 26, 16 54 C 19 78, 36 92, 50 88 C 64 92, 81 78, 84 54 C 88 26, 70 10, 50 22 Z" fill="#e2453b" />
      <path d="M50 22 C 40 14, 26 20, 22 40 C 20 52, 26 60, 30 62" fill="none" stroke="#f47c6e" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
      <path d="M50 24 L52 10" stroke="#6b4a2b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M52 14 C 58 6, 68 8, 70 14 C 62 18, 56 18, 52 14 Z" fill="#4f9d5c" className="anim-leaf o-bottom" />
      <Face cx={50} cy={52} />
    </svg>
  );
}

export function Banana({ size = 90, className = "", style }: CharProps) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} style={style} aria-hidden>
      <Legs cx={52} y={88} />
      <Limbs cx={52} y={64} w={20} up />
      <path d="M30 14 C 22 40, 26 72, 52 90 C 76 82, 84 56, 78 30 C 72 46, 62 62, 46 74 C 36 60, 32 40, 34 14 Z" fill="#f5c542" />
      <path d="M46 74 C 36 60, 32 40, 34 14 L 30 14 C 22 40, 26 72, 52 90 Z" fill="#e0a92a" opacity="0.6" />
      <path d="M30 14 L28 6" stroke="#6b4a2b" strokeWidth="4" strokeLinecap="round" />
      <path d="M52 90 L56 96" stroke="#6b4a2b" strokeWidth="3" strokeLinecap="round" />
      <Face cx={54} cy={58} s={0.9} />
    </svg>
  );
}

export function Orange({ size = 90, className = "", style }: CharProps) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} style={style} aria-hidden>
      <Legs cx={50} y={88} />
      <Limbs cx={50} y={64} w={32} up />
      <circle cx="50" cy="56" r="34" fill="#f7902f" />
      <circle cx="38" cy="42" r="12" fill="#ffb066" opacity="0.5" />
      <path d="M50 22 L50 14" stroke="#6b4a2b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 18 C 56 8, 68 10, 70 18 C 62 22, 54 22, 50 18 Z" fill="#4f9d5c" className="anim-leaf o-bottom" />
      <Face cx={50} cy={56} />
    </svg>
  );
}

export function Avocado({ size = 90, className = "", style }: CharProps) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} style={style} aria-hidden>
      <Legs cx={50} y={90} color="#3d6b3a" />
      <Limbs cx={50} y={66} w={30} color="#3d6b3a" up />
      <path d="M50 8 C 34 8, 28 26, 26 40 C 22 66, 30 92, 50 92 C 70 92, 78 66, 74 40 C 72 26, 66 8, 50 8 Z" fill="#4f8b3c" />
      <path d="M50 16 C 38 16, 33 30, 32 42 C 29 64, 36 86, 50 86 C 64 86, 71 64, 68 42 C 67 30, 62 16, 50 16 Z" fill="#c9de7a" />
      <circle cx="50" cy="66" r="12" fill="#8a5a2b" />
      <circle cx="46" cy="62" r="4" fill="#a97444" opacity="0.7" />
      <Face cx={50} cy={40} s={0.9} />
    </svg>
  );
}

export function Strawberry({ size = 90, className = "", style }: CharProps) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} style={style} aria-hidden>
      <Legs cx={50} y={90} />
      <Limbs cx={50} y={64} w={26} up />
      <path d="M50 28 C 26 28, 18 44, 22 60 C 26 78, 38 92, 50 94 C 62 92, 74 78, 78 60 C 82 44, 74 28, 50 28 Z" fill="#e63b4e" />
      <g fill="#ffe08a" opacity="0.85">
        <ellipse cx="36" cy="52" rx="1.6" ry="2.4" />
        <ellipse cx="48" cy="46" rx="1.6" ry="2.4" />
        <ellipse cx="62" cy="52" rx="1.6" ry="2.4" />
        <ellipse cx="42" cy="78" rx="1.6" ry="2.4" />
        <ellipse cx="58" cy="78" rx="1.6" ry="2.4" />
        <ellipse cx="50" cy="86" rx="1.6" ry="2.4" />
      </g>
      <g fill="#4f9d5c" className="anim-leaf o-bottom">
        <path d="M50 30 C 42 20, 30 22, 28 30 C 36 32, 44 32, 50 30 Z" />
        <path d="M50 30 C 58 20, 70 22, 72 30 C 64 32, 56 32, 50 30 Z" />
        <path d="M50 30 C 48 20, 50 12, 52 8 C 56 16, 54 24, 50 30 Z" />
      </g>
      <Face cx={50} cy={60} s={0.9} />
    </svg>
  );
}

export function Carrot({ size = 90, className = "", style }: CharProps) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} style={style} aria-hidden>
      <Legs cx={50} y={92} />
      <Limbs cx={50} y={60} w={18} up />
      <path d="M32 30 C 30 60, 40 88, 50 98 C 60 88, 70 60, 68 30 Z" fill="#f47a2a" />
      <path d="M38 44 L60 44 M40 58 L58 58 M44 72 L54 72" stroke="#e05f14" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <g fill="#4f9d5c" className="anim-leaf o-bottom">
        <path d="M50 30 C 46 20, 40 12, 34 8 C 36 18, 42 26, 50 30 Z" />
        <path d="M50 30 C 54 20, 60 12, 66 8 C 64 18, 58 26, 50 30 Z" />
        <path d="M50 30 C 49 20, 50 12, 50 4 C 54 12, 53 22, 50 30 Z" />
      </g>
      <Face cx={50} cy={48} s={0.85} />
    </svg>
  );
}

export const CREW = { Apple, Banana, Orange, Avocado, Strawberry, Carrot } as const;
