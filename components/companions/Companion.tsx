import Image from "next/image";
import type { CompanionMood, CompanionName } from "@/lib/companions";

export function Companion({
  name,
  mood = "idle",
  size = 64,
  label,
  className = "",
}: {
  name: CompanionName;
  mood?: CompanionMood;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`companion companion--${mood} inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/companions/${name}.png`}
        width={size}
        height={size}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        draggable={false}
        className="companion-img select-none"
        style={{ objectFit: "contain" }}
      />
    </span>
  );
}
