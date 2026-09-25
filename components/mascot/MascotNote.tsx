import { Broccoli, type MascotState } from "@/components/mascot/Broccoli";

/** Broccoli + one line of contextual microcopy. Keep copy to one short sentence. */
export function MascotNote({
  state = "neutral",
  children,
  size = 56,
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
      <Broccoli state={state} size={size} className="anim-float shrink-0" />
      <p
        className={`relative rounded-2xl px-3.5 py-2 text-sm font-medium leading-snug ${
          tone === "dark" ? "bg-white/15 text-white" : "bg-sage text-ink-2"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
