"use client";

import { Star } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useToast } from "@/components/providers/ToastProvider";
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

  const toggle = () => {
    if (kind === "team") preferences.toggleTeamFavorite(item);
    else if (kind === "league") preferences.toggleLeagueFavorite(item);
    else preferences.toggleMatchFavorite(item);
    push(
      active ? `${name} removed from favourites.` : `${name} added to favourites.`,
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
      aria-label={
        active ? `Remove ${name} from favourites` : `Add ${name} to favourites`
      }
      title={active ? "Remove from favourites" : "Add to favourites"}
    >
      <Star size={withLabel ? 16 : 18} aria-hidden="true" />
      {withLabel ? <span>{active ? "Favourited" : "Favourite"}</span> : null}
    </button>
  );
}
