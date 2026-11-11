import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/cairo";
import "./globals.css";
import "./app-theme.css";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { T } from "@/components/i18n/T";
import {
  DEFAULT_TIMEZONE,
  LANG_COOKIE,
  LOCALE_CONFIG,
  TIMEZONE_COOKIE,
} from "@/lib/i18n/core";
import { serverPreferences } from "@/lib/i18n/server";

// The root layout reads the locale cookies (serverPreferences) so <html
// lang/dir> — which is part of the shell and cannot be streamed into a
// Suspense boundary — renders in the user's language. With cacheComponents
// that makes every shell runtime data; opting out of the static-shell
// prerender here is what allows the language to resolve per request without
// a hydration mismatch (the site streams its data behind Suspense in every
// page, so the shell is all that is affected).
export const instant = false;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  keywords: [
    "football scores",
    "soccer scores",
    "live football",
    "league tables",
    "football fixtures",
    "FIFA rankings",
    "football calendar",
    "ESPN soccer data",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#060c09" },
  ],
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('touchline.theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

// Boot the interface to the stored language before first paint (no LTR
// flash for Arabic users) and mirror language + time zone into cookies. The
// root layout reads these cookies (`serverPreferences`) so the server renders
// the same dictionary the client will hydrate with — without the cookie
// mirror, the Suspense sections streaming in after mount hydrate against
// stale HTML and React regenerates them (hydration mismatch).
const LANG_BOOT = `(function(){try{var p=JSON.parse(localStorage.getItem('touchline.preferences.v1')||'{}')||{};var l=p.lang==='ar'?'ar':'en';var tz=(typeof p.timezone==='string'&&p.timezone)||((Intl.DateTimeFormat().resolvedOptions()||{}).timeZone||'${DEFAULT_TIMEZONE}');var r=document.documentElement;r.lang=l;r.dir=l==='ar'?'rtl':'ltr';var c=';path=/;max-age=31536000;samesite=Lax';document.cookie='${LANG_COOKIE}='+l+c;document.cookie='${TIMEZONE_COOKIE}='+encodeURIComponent(tz)+c;}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang, timeZone } = await serverPreferences();

  return (
    <html
      lang={lang}
      dir={LOCALE_CONFIG[lang].dir}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body>
        <ToastProvider>
          <PreferencesProvider initialLang={lang} initialTimeZone={timeZone}>
            <a className="skip-link" href="#main">
              <T k="common.skipToContent" />
            </a>
            <div className="app-shell">
              <SiteHeader />
              <main id="main" className="site-main">
                {children}
              </main>
              <SiteFooter />
              <MobileTabBar />
            </div>
          </PreferencesProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
