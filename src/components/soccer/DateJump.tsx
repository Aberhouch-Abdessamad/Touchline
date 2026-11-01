"use client";

import { useRouter } from "next/navigation";

export function DateJump({
  date,
  basePath = "/matches",
  label = "Jump to a date",
}: {
  date: string;
  basePath?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={date}
      aria-label={label}
      onChange={(event) => {
        const next = event.target.value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(next)) {
          router.push(`${basePath}?date=${next}`);
        }
      }}
    />
  );
}
