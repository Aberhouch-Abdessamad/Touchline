import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchState } from "@/lib/types";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "live" | "muted" | "warning";
  className?: string;
}) {
  return (
    <span className={cn("badge", `badge--${tone}`, className)}>{children}</span>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { href: string; label: string };
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("empty-state", className)}>
      <span className="empty-state__icon" aria-hidden="true">
        {icon ?? <Inbox size={22} />}
      </span>
      <h3 className="empty-state__title">{title}</h3>
      {description ? <p className="empty-state__body">{description}</p> : null}
      {action ? (
        <Link href={action.href} className="btn btn--ghost empty-state__action">
          {action.label}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
      {children}
    </div>
  );
}

export function SectionHeader({
  kicker,
  title,
  description,
  action,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("section-head", className)}>
      <div className="section-head__text">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h2 className="section-head__title">{title}</h2>
        {description ? (
          <p className="section-head__description">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link href={action.href} className="section-head__link">
          {action.label}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

const STATE_LABELS: Record<MatchState, { label: string; tone: string }> = {
  live: { label: "Live", tone: "live" },
  halftime: { label: "Half-time", tone: "live" },
  finished: { label: "Full time", tone: "muted" },
  scheduled: { label: "Scheduled", tone: "neutral" },
  postponed: { label: "Postponed", tone: "warning" },
  canceled: { label: "Cancelled", tone: "warning" },
  unknown: { label: "Update", tone: "neutral" },
};

export function StatusPill({
  state,
  label,
  className,
}: {
  state: MatchState;
  label?: string;
  className?: string;
}) {
  const meta = STATE_LABELS[state] ?? STATE_LABELS.unknown;
  return (
    <span className={cn("status-pill", `status-pill--${meta.tone}`, className)}>
      {(state === "live" || state === "halftime") && (
        <span className="status-pill__dot" aria-hidden="true" />
      )}
      {label ?? meta.label}
    </span>
  );
}

export function Skeleton({
  width,
  height = 14,
  className,
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("skeleton", className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("page-header", className)}>
      <div className="page-header__main">
        {eyebrow ? <p className="kicker">{eyebrow}</p> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? (
          <p className="page-header__description">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
