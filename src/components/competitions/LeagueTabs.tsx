"use client";

import { LinkTabs } from "@/components/ui/LinkTabs";
import { useI18n } from "@/lib/i18n";

/** Competition detail tab bar with translated labels. */
export function LeagueTabs({
  active,
  baseHref,
  season,
}: {
  active: string;
  baseHref: string;
  season: number;
}) {
  const { t } = useI18n();
  const { tabs, tabsAria } = t.competitions.detail;

  return (
    <LinkTabs
      tabs={[
        { key: "standings", label: tabs.standings },
        { key: "scorers", label: tabs.scorers },
        { key: "fixtures", label: tabs.fixtures },
      ]}
      active={active}
      baseHref={baseHref}
      params={{ season: String(season) }}
      ariaLabel={tabsAria}
      className="league-tabs"
    />
  );
}
