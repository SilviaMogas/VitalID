/** Heart-leaf mark. `tone="light"` for use on green/dark surfaces. */
export function LogoMark({ size = 36, tone = "brand", className = "" }: { size?: number; tone?: "brand" | "light"; className?: string }) {
  const fill = tone === "light" ? "#ffffff" : "#0e7a5f";
  const leaf = tone === "light" ? "#b7e4c7" : "#ffffff";
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden>
      <path
        d="M24 42 C 12 33, 4 26, 4 16.5 C 4 10, 9 5.5, 15 5.5 C 19 5.5, 22 7.6, 24 10.6 C 26 7.6, 29 5.5, 33 5.5 C 39 5.5, 44 10, 44 16.5 C 44 26, 36 33, 24 42 Z"
        fill={fill}
      />
      <path
        d="M24 34 C 24 24, 29 17, 37 14 C 36 24, 31 31, 24 34 Z"
        fill={leaf}
      />
      <path d="M24 34 C 26 27, 30 21, 36 15" stroke={fill} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
