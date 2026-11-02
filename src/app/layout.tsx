import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/cairo";
import "./globals.css";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { T } from "@/components/i18n/T";

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
    { media: "(prefers-color-scheme: light)", color: "#f5f3ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1410" },
  ],
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('touchline.theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

// Apply the stored language before first paint so Arabic users don't get an
// LTR flash. The PreferencesProvider effect keeps it in sync afterwards.
const LANG_BOOT = `(function(){try{var p=JSON.parse(localStorage.getItem('touchline.preferences.v1')||'{}');var l=p&&p.lang==='ar'?'ar':'en';var r=document.documentElement;r.lang=l;r.dir=l==='ar'?'rtl':'ltr';}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body>
        <ToastProvider>
          <PreferencesProvider>
            <a className="skip-link" href="#main">
              <T k="common.skipToContent" />
            </a>
            <div className="app-shell">
              <SiteHeader />
              <main id="main" className="site-main">
                {children}
              </main>
              <SiteFooter />
            </div>
          </PreferencesProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
