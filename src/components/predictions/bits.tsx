"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TeamLogo, LeagueLogo } from "@/components/ui/Logos";
import type { PredictionStatus } from "@/lib/predictions/types";
import type { Outcome, Verdict } from "@/lib/predictions/types";

/** "63.4%" (English) / "63.4٪" (Arabic); null renders as an em dash. */
export function usePct() {
  const { lang } = useI18n();
  return (value: number | null | undefined, digits = 1): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    const text = Number.isInteger(value) && digits === 0 ? String(value) : value.toFixed(digits);
    return lang === "ar" ? `${text}٪` : `${text}%`;
  };
}

export function StatusChip({
  status,
  className,
}: {
  status: PredictionStatus | Verdict;
  className?: string;
}) {
  const { t } = useI18n();
  const label =
    status === "not_applicable"
      ? t.predictions.status.notApplicable
      : t.predictions.status[status];
  return <span className={cn("pl-chip", `pl-chip--${status}`, className)}>{label}</span>;
}

export function TeamBadge({
  name,
  logo,
  size = 28,
  align = "start",
  href,
}: {
  name: string;
  logo?: string;
  size?: number;
  align?: "start" | "end";
  href?: string;
}) {
  const inner = (
    <>
      <TeamLogo src={logo} name={name} size={size} />
      <span className="pl-team__name">{name}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cn("pl-team", align === "end" && "pl-team--end")}>
      {inner}
    </Link>
  ) : (
    <span className={cn("pl-team", align === "end" && "pl-team--end")}>{inner}</span>
  );
}

export function CompetitionBadge({
  name,
  logo,
  size = 22,
}: {
  name: string;
  logo?: string | null;
  size?: number;
}) {
  return (
    <span className="pl-comp">
      <LeagueLogo src={logo ?? undefined} name={name} size={size} />
      <span>{name}</span>
    </span>
  );
}

export function outcomeLabel(
  t: ReturnType<typeof useI18n>["t"],
  outcome: Outcome | null | undefined,
) {
  return outcome ? t.predictions.outcomes[outcome] : "—";
}

export function Panel({
  eyebrow,
  title,
  sub,
  children,
  className,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("pl-panel", className)}>
      <header className="pl-panel__head">
        <div>
          {eyebrow ? <p className="pl-eyebrow">{eyebrow}</p> : null}
          <h2 className="pl-panel__title">{title}</h2>
          {sub ? <p className="pl-panel__sub">{sub}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
