"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export function DateJump({
  date,
  basePath = "/matches",
  label,
}: {
  date: string;
  basePath?: string;
  /** Optional override for the accessible label; defaults to the dictionary. */
  label?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <input
      type="date"
      value={date}
      aria-label={label ?? t.matches.dateNav.jump}
      onChange={(event) => {
        const next = event.target.value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(next)) {
          router.push(`${basePath}?date=${next}`);
        }
      }}
    />
  );
}
