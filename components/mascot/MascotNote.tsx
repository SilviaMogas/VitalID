import type { MascotState } from "@/components/mascot/Broccoli";
import { LogoMark } from "@/components/layout/Logo";

export function MascotNote({
  children,
  size = 28,
  tone = "light",
  className = "",
}: {
  state?: MascotState;
  children: string;
  size?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={Math.min(size, 28)} tone={tone === "dark" ? "light" : "brand"} className="shrink-0" />
      <p
        className={`text-sm leading-relaxed ${
          tone === "dark" ? "text-white/90" : "text-ink-2"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
