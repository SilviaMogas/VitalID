"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getItem, STORAGE_KEYS } from "@/lib/storage";

export default function RequireConsent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const consent = getItem<{ at: number }>(STORAGE_KEYS.consent);
    if (consent?.at) {
      setOk(true);
    } else {
      router.replace("/consent");
      setOk(false);
    }
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
