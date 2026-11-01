"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export interface QueryOption {
  value: string;
  label: string;
}

/**
 * A native select that writes a single query parameter. Keeps shareable,
 * server-rendered filter state without shipping the dataset to the browser.
 */
export function QuerySelect({
  param,
  value,
  options,
  label,
  ariaLabel,
  className,
}: {
  param: string;
  value: string;
  options: QueryOption[];
  label: string;
  ariaLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className={className ?? "season-select"}>
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        disabled={pending}
        aria-label={ariaLabel ?? label}
        onChange={(event) => {
          const next = event.target.value;
          const query = new URLSearchParams(window.location.search);
          query.set(param, next);
          startTransition(() => {
            router.push(`${pathname}?${query.toString()}`);
          });
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
