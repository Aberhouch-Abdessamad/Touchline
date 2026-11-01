"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, Send } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface FormState {
  name: string;
  email: string;
  topic: string;
  reference: string;
  message: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const TOPICS = [
  "Data question",
  "Bug report",
  "Competition request",
  "Accessibility feedback",
  "Privacy request",
  "Something else",
] as const;

const EMPTY: FormState = {
  name: "",
  email: "",
  topic: TOPICS[0],
  reference: "",
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values: FormState): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) {
    errors.name = "Please enter at least two characters.";
  }
  if (values.name.trim().length > 80) {
    errors.name = "Please keep your name under 80 characters.";
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address so a reply is possible.";
  }
  if (!TOPICS.includes(values.topic as (typeof TOPICS)[number])) {
    errors.topic = "Choose one of the listed topics.";
  }
  if (values.reference.trim().length > 200) {
    errors.reference = "Keep the reference under 200 characters.";
  }
  if (values.message.trim().length < 20) {
    errors.message = "Add a little more detail — at least 20 characters.";
  }
  if (values.message.trim().length > 1500) {
    errors.message = "Please keep the message under 1500 characters.";
  }
  return errors;
}

export function ContactForm({ contactEmail }: { contactEmail?: string }) {
  const [values, setValues] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [composed, setComposed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  const count = values.message.trim().length;

  const mailto = useMemo(() => {
    if (!contactEmail) return "";
    const subject = `[Touchline] ${values.topic}${
      values.reference.trim() ? ` — ${values.reference.trim()}` : ""
    }`;
    const header = [
      `From: ${values.name.trim()} <${values.email.trim()}>`,
      `Topic: ${values.topic}`,
      values.reference.trim() ? `Reference: ${values.reference.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const body = `${header}\n\n${values.message.trim()}\n\n—\nSent from the Touchline contact form`;
    return `mailto:${contactEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }, [contactEmail, values]);

  const set = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const next = { ...values, [field]: event.target.value };
    setValues(next);
    if (touched[field]) setErrors(validate(next));
    setComposed(false);
  };

  const blur = (field: keyof FormState) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validate(values));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validate(values);
    setErrors(next);
    setTouched({
      name: true,
      email: true,
      topic: true,
      reference: true,
      message: true,
    });
    if (Object.keys(next).length > 0) {
      push("Check the highlighted fields before sending.", "error");
      return;
    }
    if (!contactEmail) {
      push("No contact address is configured for this deployment.", "error");
      return;
    }
    setComposed(true);
    window.location.href = mailto;
  };

  const copyAddress = async () => {
    if (!contactEmail) return;
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      push("Contact address copied.", "success");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      push("Could not access the clipboard. Select the address manually.", "error");
    }
  };

  if (!contactEmail) {
    return (
      <div className="form-card">
        <h2 className="settings-section__title">Contact is not configured</h2>
        <p className="settings-row__description" style={{ marginTop: 8 }}>
          This deployment has no contact address, so the form cannot compose a
          message. The site owner can enable it by setting{" "}
          <code>NEXT_PUBLIC_CONTACT_EMAIL</code> and restarting the app.
        </p>
        <p className="form-status form-status--info">
          The form is intentionally not a fake submission endpoint: nothing is
          stored on a server, and no email is sent from this page.
        </p>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={onSubmit} noValidate>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="contact-name">Your name</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={set("name")}
            onBlur={blur("name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            maxLength={80}
            required
          />
          {errors.name ? (
            <p className="field__error" id="contact-name-error">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="contact-email">Email address</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={set("email")}
            onBlur={blur("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            maxLength={120}
            required
          />
          {errors.email ? (
            <p className="field__error" id="contact-email-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="contact-topic">Topic</label>
          <select
            id="contact-topic"
            name="topic"
            value={values.topic}
            onChange={set("topic")}
            onBlur={blur("topic")}
            aria-invalid={Boolean(errors.topic)}
          >
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
          {errors.topic ? <p className="field__error">{errors.topic}</p> : null}
        </div>

        <div className="field">
          <label htmlFor="contact-reference">
            Match or competition <span className="field__hint">(optional)</span>
          </label>
          <input
            id="contact-reference"
            name="reference"
            type="text"
            value={values.reference}
            onChange={set("reference")}
            onBlur={blur("reference")}
            aria-invalid={Boolean(errors.reference)}
            placeholder="e.g. Premier League table, 1 Nov"
            maxLength={200}
          />
          {errors.reference ? (
            <p className="field__error">{errors.reference}</p>
          ) : (
            <p className="field__hint">
              A link or page name helps us find the exact data.
            </p>
          )}
        </div>

        <div className="field field--full">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            name="message"
            value={values.message}
            onChange={set("message")}
            onBlur={blur("message")}
            aria-invalid={Boolean(errors.message)}
            aria-describedby="contact-message-hint"
            maxLength={1500}
            required
          />
          <p className="field__hint" id="contact-message-hint">
            {count}/1500 characters · at least 20
          </p>
          {errors.message ? (
            <p className="field__error">{errors.message}</p>
          ) : null}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn--accent">
          <Send size={16} aria-hidden="true" />
          Open in mail app
        </button>
        <button type="button" className="btn btn--ghost" onClick={copyAddress}>
          {copied ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Copy size={15} aria-hidden="true" />
          )}
          {copied ? "Address copied" : "Copy address"}
        </button>
        <span className="small text-muted">
          <Mail size={12} aria-hidden="true" /> {contactEmail}
        </span>
      </div>

      {composed ? (
        <p className="form-status form-status--ok" role="status">
          Your mail app should have opened with the message ready to send. If
          nothing happened, copy the address above and send it manually — this
          page never sends or stores the message itself.
        </p>
      ) : (
        <p className="form-status form-status--info">
          This form does not submit to a server. It validates your message and
          opens it in your own email client, addressed to {contactEmail}.
        </p>
      )}
    </form>
  );
}
