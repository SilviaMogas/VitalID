"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocale } from "@/components/providers/LocaleProvider";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const OUTPUT_SIZE = 256;

/** Cover-crop the center of an image into a 256×256 JPEG data URL. */
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      if (side === 0) {
        reject(new Error("empty image"));
        return;
      }
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no canvas"));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    img.src = url;
  });
}

export function PhotoUploader({ hasPhoto }: { hasPhoto: boolean }) {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const run = async (op: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await op();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const save = async (photoUrl: string) => {
    const res = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: { photoUrl } }),
    });
    if (!res.ok) throw new Error("save failed");
    router.refresh();
    // A failed session probe must not mark a successful upload as failed.
    void refresh().catch(() => undefined);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(true);
      return;
    }
    void run(async () => {
      const photoUrl = await resizeToDataUrl(file);
      await save(photoUrl);
    });
  };

  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("profile.photo.title")}</p>
          <p className="mt-0.5 text-xs text-muted">{t("profile.photo.hint")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasPhoto && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => save(""))}
              className="press rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-ink-2 disabled:opacity-50"
            >
              {t("profile.photo.remove")}
            </button>
          )}
          <label
            className={`press cursor-pointer rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-deep focus-within:ring-2 focus-within:ring-brand/50 focus-within:ring-offset-2 ${
              busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {t(hasPhoto ? "profile.photo.change" : "profile.photo.add")}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={onFile}
            />
          </label>
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{t("profile.photo.error")}</p>}
    </div>
  );
}
