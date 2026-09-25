"use client";

/**
 * Circular member avatar: photo when available, initials otherwise.
 * Uses a plain <img> so data URLs (client-resized uploads) work.
 */
export function UserAvatar({
  name,
  photoUrl,
  size = 40,
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand ring-1 ring-line ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
