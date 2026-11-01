import type { Metadata } from "next";
import Link from "next/link";
import { HardDrive, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Choose a theme and time zone, enable kick-off alerts, manage favourite teams, competitions and matches, and export or import your local preferences.",
  alternates: { canonical: "/settings" },
  robots: { index: false, follow: true },
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="Make Touchline yours"
        description="Theme, time zone, alerts and favourites — all stored in this browser. No account, no tracking, no profile on a server."
      />

      <SettingsPanel />

      <section className="section section--tight">
        <div className="two-col">
          <article className="card">
            <span className="empty-state__icon" aria-hidden="true">
              <HardDrive size={20} />
            </span>
            <h2 className="settings-row__title" style={{ marginTop: 12 }}>
              Local by design
            </h2>
            <p className="settings-row__description">
              Favourites and reminders are written to localStorage under{" "}
              <code>touchline.preferences.v1</code>. Clearing site data resets
              them, which is why the export button exists.
            </p>
          </article>
          <article className="card">
            <span className="empty-state__icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <h2 className="settings-row__title" style={{ marginTop: 12 }}>
              Nothing to sign up for
            </h2>
            <p className="settings-row__description">
              Touchline has no registration, no newsletter and no analytics
              identifier. Read the{" "}
              <Link href="/privacy">privacy note</Link> for the short version of
              what the browser stores.
            </p>
          </article>
        </div>

        <p className="small text-muted" style={{ marginTop: 18 }}>
          <Sparkles size={12} aria-hidden="true" /> Tip: export your preferences
          before clearing browsing data, then import the file on another device.
        </p>
      </section>
    </>
  );
}
