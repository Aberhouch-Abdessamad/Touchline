import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LinkTab {
  key: string;
  label: string;
  count?: number;
}

export function LinkTabs({
  tabs,
  active,
  baseHref,
  params = {},
  ariaLabel = "Sections",
  className,
}: {
  tabs: LinkTab[];
  active: string;
  baseHref: string;
  params?: Record<string, string | undefined>;
  ariaLabel?: string;
  className?: string;
}) {
  const hrefFor = (key: string) => {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) {
      if (value) query.set(name, value);
    }
    query.set("tab", key);
    return `${baseHref}?${query.toString()}`;
  };

  return (
    <nav className={cn("link-tabs", className)} aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={hrefFor(tab.key)}
          className={cn("link-tabs__item", active === tab.key && "is-active")}
          aria-current={active === tab.key ? "page" : undefined}
        >
          <span>{tab.label}</span>
          {typeof tab.count === "number" ? (
            <span className="link-tabs__count">{tab.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
