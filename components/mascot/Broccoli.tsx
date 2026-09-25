import type { CSSProperties } from "react";

export type MascotState = "neutral" | "happy" | "alert" | "encouraging" | "success";

interface Props {
  state?: MascotState;
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Idle micro-motion (blink, breathing). Off inside static contexts. */
  animate?: boolean;
}

const FLORET = "#3f9a62";
const FLORET_DARK = "#2f7d4d";
const FLORET_LIGHT = "#6cb884";
const STEM = "#a9d79b";
const STEM_DARK = "#8bc47c";
const FACE = "#1f3a2c";

/**
 * Lead mascot. Inline SVG so it ships with the bundle, recolours with CSS and
 * animates independently per instance.
 */
export function Broccoli({ state = "neutral", size = 96, className = "", style, animate = true }: Props) {
  const armL =
    state === "success" || state === "happy"
      ? "M28 66 C 18 58, 14 48, 20 40"
      : state === "encouraging"
        ? "M28 66 C 16 62, 10 54, 14 46"
        : state === "alert"
          ? "M28 66 C 18 66, 12 60, 14 54"
          : "M28 66 C 20 68, 14 66, 12 60";
  const armR =
    state === "success"
      ? "M72 66 C 82 58, 86 48, 80 40"
      : state === "happy"
        ? "M72 66 C 84 62, 88 54, 84 46"
        : state === "encouraging"
          ? "M72 66 C 80 60, 82 50, 76 44"
          : state === "alert"
            ? "M72 66 C 78 62, 82 58, 80 52"
            : "M72 66 C 80 68, 86 66, 88 60";

  const mouth =
    state === "happy" || state === "success"
      ? "M42 62 Q 50 71 58 62"
      : state === "encouraging"
        ? "M43 63 Q 50 68 57 63"
        : state === "alert"
          ? "M45 65 Q 50 62 55 65"
          : "M44 63 Q 50 67 56 63";

  const browTilt = state === "alert" ? -10 : state === "encouraging" ? 6 : 0;

  return (
    <svg
      viewBox="0 0 100 110"
      width={size}
      height={size * 1.1}
      className={className}
      style={style}
      role="img"
      aria-hidden
    >
      {/* legs */}
      <path d="M43 92 L41 104" stroke={STEM_DARK} strokeWidth="4" strokeLinecap="round" />
      <path d="M57 92 L59 104" stroke={STEM_DARK} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="40" cy="105" rx="6" ry="2.6" fill={FLORET_DARK} />
      <ellipse cx="60" cy="105" rx="6" ry="2.6" fill={FLORET_DARK} />

      {/* arms */}
      <path d={armL} className={`o-arm-l ${animate && state === "success" ? "anim-wave" : ""}`} stroke={STEM_DARK} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d={armR} className={`o-arm-r ${animate && (state === "happy" || state === "encouraging") ? "anim-wave" : ""}`} stroke={STEM_DARK} strokeWidth="4.5" fill="none" strokeLinecap="round" />

      {/* stem / body */}
      <path d="M36 56 C 34 78, 36 90, 50 94 C 64 90, 66 78, 64 56 Z" fill={STEM} />
      <path d="M50 58 C 49 76, 50 86, 50 92" stroke={STEM_DARK} strokeWidth="1.5" opacity="0.5" />

      {/* florets */}
      <g className={animate ? "anim-leaf" : ""} style={{ transformOrigin: "50px 50px" }}>
        <circle cx="50" cy="30" r="22" fill={FLORET} />
        <circle cx="30" cy="40" r="14" fill={FLORET} />
        <circle cx="70" cy="40" r="14" fill={FLORET} />
        <circle cx="38" cy="22" r="11" fill={FLORET_LIGHT} />
        <circle cx="60" cy="18" r="10" fill={FLORET_LIGHT} />
        <circle cx="50" cy="12" r="8" fill={FLORET_LIGHT} />
        <circle cx="24" cy="30" r="7" fill={FLORET_DARK} opacity="0.7" />
        <circle cx="76" cy="30" r="7" fill={FLORET_DARK} opacity="0.7" />
        <circle cx="44" cy="26" r="2.2" fill={FLORET_DARK} opacity="0.5" />
        <circle cx="58" cy="30" r="2" fill={FLORET_DARK} opacity="0.5" />
        <circle cx="34" cy="34" r="1.8" fill={FLORET_DARK} opacity="0.5" />
        <circle cx="66" cy="22" r="1.8" fill={FLORET_DARK} opacity="0.5" />
      </g>

      {/* face */}
      <g transform={`rotate(${browTilt} 43 48)`}>
        <ellipse cx="43" cy="53" rx="3" ry="3.6" fill={FACE} className={`o-eye ${animate ? "anim-blink" : ""}`} />
      </g>
      <g transform={`rotate(${-browTilt} 57 48)`}>
        <ellipse cx="57" cy="53" rx="3" ry="3.6" fill={FACE} className={`o-eye ${animate ? "anim-blink" : ""}`} style={{ ["--i" as string]: 0.15 }} />
      </g>
      <circle cx="44" cy="52" r="0.9" fill="#fff" />
      <circle cx="58" cy="52" r="0.9" fill="#fff" />
      <path d={mouth} stroke={FACE} strokeWidth="2" fill={state === "happy" || state === "success" ? "#1f3a2c" : "none"} strokeLinecap="round" />
      {(state === "happy" || state === "success") && <path d="M45 64 Q 50 68 55 64" fill="#ff8a7a" opacity="0.9" />}
      <ellipse cx="37" cy="60" rx="3" ry="1.6" fill="#ff9d8f" opacity="0.5" />
      <ellipse cx="63" cy="60" rx="3" ry="1.6" fill="#ff9d8f" opacity="0.5" />

      {state === "alert" && (
        <g fill="#f59e0b">
          <path d="M84 8 L86 22 L82 22 Z" />
          <circle cx="84" cy="27" r="2" />
        </g>
      )}
      {state === "success" && (
        <path
          d="M84 6 c -3 -4 -9 -2 -9 3 c 0 4 5 7 9 10 c 4 -3 9 -6 9 -10 c 0 -5 -6 -7 -9 -3 z"
          fill="#ff8a7a"
          className={animate ? "anim-float" : ""}
        />
      )}
    </svg>
  );
}
