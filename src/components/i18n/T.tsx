"use client";

import type { CSSProperties } from "react";
import { interpolate } from "@/lib/i18n/core";
import { resolveValue } from "@/lib/i18n/dict";
import { useDict } from "@/components/providers/PreferencesProvider";

/**
 * Render a dictionary string by dot-path from anywhere — including inside
 * server components (it executes client-side). Prefer direct `t` access in
 * client components; use `<T>` only where the markup itself is server-rendered.
 *
 * ```tsx
 * <T k="matches.errors.loadFailed" />
 * <T k="matches.competitionsTracked" vars={{ total: leagues.length }} />
 * <T as="p" k="home.hero.lede" className="lede" />
 * ```
 */
export function T({
  k,
  vars,
  className,
  style,
  as,
  ...rest
}: {
  /** Dot-path key into the active dictionary, e.g. "matches.errors.loadFailed". */
  k: string;
  /** Interpolation variables for `{token}` placeholders. */
  vars?: Record<string, string | number>;
  className?: string;
  style?: CSSProperties;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "strong";
} & Record<string, unknown>) {
  const t = useDict();
  const value = resolveValue(t, k);
  const text = typeof value === "string" ? interpolate(value, vars) : k;
  const Tag = as ?? "span";
  return (
    <Tag className={className} style={style} {...rest}>
      {text}
    </Tag>
  );
}
