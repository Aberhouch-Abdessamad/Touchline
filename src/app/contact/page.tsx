import type { Metadata } from "next";
import { ContactView } from "./ContactView";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Report a data problem, request a competition, or send feedback about Touchline. The form opens a real email in your own mail app.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return <ContactView contactEmail={contactEmail} />;
}
