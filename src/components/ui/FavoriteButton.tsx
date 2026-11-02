"use client";

import { Star } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  FavoriteLeague,
  FavoriteMatch,
  FavoriteTeam,
} from "@/components/providers/PreferencesProvider";

type FavoriteButtonProps =
  | {
      kind: "team";
      item: FavoriteTeam;
      className?: string;
      withLabel?: boolean;
    }
  | {
      kind: "league";
      item: FavoriteLeague;
      className?: string;
      withLabel?: boolean;
    }
  | {
      kind: "match";
      item: FavoriteMatch;
      className?: string;
      withLabel?: boolean;
    };

export function FavoriteButton(props: FavoriteButtonProps) {
  const { kind, item, className, withLabel = false } = props;
  const preferences = usePreferences();
  const { push } = useToast();
  const { t, f } = useI18n();

  const active =
    kind === "team"
      ? preferences.isTeamFavorite(item.id)
      : kind === "league"
        ? preferences.isLeagueFavorite(item.slug)
        : preferences.isMatchFavorite(item.id);

  const name =
    kind === "team"
      ? item.name
      : kind === "league"
        ? item.name
        : item.label;

  const label = active ? t.common.favouriteRemove : t.common.favouriteAdd;

  const toggle = () => {
    if (kind === "team") preferences.toggleTeamFavorite(item);
    else if (kind === "league") preferences.toggleLeagueFavorite(item);
    else preferences.toggleMatchFavorite(item);
    push(
      active ? t.common.favouriteRemoved : t.common.favouriteAdded,
      active ? "info" : "success",
    );
  };

  return (
    <button
      type="button"
      className={cn(
        "fav-button",
        active && "is-active",
        withLabel && "fav-button--labelled",
        className,
      )}
      onClick={toggle}
      aria-pressed={active}
      aria-label={f(t.matches.aria.favourite, { name, label })}
      title={label}
    >
      <Star size={withLabel ? 16 : 18} aria-hidden="true" />
      {withLabel ? (
        <span>
          {active
            ? t.matches.favouriteToggle.active
            : t.matches.favouriteToggle.inactive}
        </span>
      ) : null}
    </button>
  );
}
