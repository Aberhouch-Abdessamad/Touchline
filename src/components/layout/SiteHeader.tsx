"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Menu,
  Newspaper,
  Search,
  Settings,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { NAV_ITEMS, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { BrandMark } from "./BrandMark";
import { usePreferences } from "@/components/providers/PreferencesProvider";

const ICONS: Record<string, typeof CalendarDays> = {
  "/matches": CalendarDays,
  "/competitions": Trophy,
  "/news": Newspaper,
  "/rankings": Star,
  "/calendar": CalendarDays,
  "/search": Search,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The active route is URL data, so reading it must happen in a leaf inside a
 * <Suspense> boundary. Keeping the rest of the header static means the shell
 * renders immediately and the highlight fills in without a layout shift.
 */
function DesktopLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("desktop-nav__link", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function DesktopLinksFallback() {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className="desktop-nav__link">
          {item.label}
        </Link>
      ))}
    </>
  );
}

function MobilePanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const initialPath = useRef(pathname);

  // Close the panel after a navigation, but not on the render that opened it.
  useEffect(() => {
    if (initialPath.current !== pathname) onClose();
  }, [pathname, onClose]);

  return (
    <div className="mobile-nav" id="mobile-navigation">
      <nav aria-label="Mobile">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.href] ?? Search;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-nav__link", active && "is-active")}
              aria-current={active ? "page" : undefined}
              onClick={onClose}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={cn(
            "mobile-nav__link",
            isActive(pathname, "/settings") && "is-active",
          )}
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          onClick={onClose}
        >
          <Settings size={18} aria-hidden="true" />
          <span>Settings &amp; favourites</span>
        </Link>
      </nav>
      <p className="mobile-nav__note">
        All times follow your saved timezone. Preferences stay in this browser.
      </p>
    </div>
  );
}

export function SiteHeader() {
  const { favorites } = usePreferences();
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const favouriteCount =
    favorites.teams.length +
    favorites.leagues.length +
    favorites.matches.length;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">{SITE_NAME}</span>
            <span className="brand__tag">Football, without the noise</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary">
          <Suspense fallback={<DesktopLinksFallback />}>
            <DesktopLinks />
          </Suspense>
        </nav>

        <div className="header-actions">
          <ThemeToggle className="icon-button header-actions__theme" />
          <Link
            href="/settings"
            className="icon-button header-actions__settings"
            aria-label={`Settings${favouriteCount ? `, ${favouriteCount} favourites saved` : ""}`}
            title="Settings and favourites"
          >
            <Settings size={18} aria-hidden="true" />
            {favouriteCount > 0 ? (
              <span className="icon-button__badge" aria-hidden="true">
                {favouriteCount > 9 ? "9+" : favouriteCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            className="icon-button mobile-menu-button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? <MobilePanel onClose={closeMenu} /> : null}
    </header>
  );
}
