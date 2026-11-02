"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, Send } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { RichText } from "@/components/pages/RichText";
import { useI18n } from "@/lib/i18n";

interface FormState {
  name: string;
  email: string;
  topic: string;
  reference: string;
  message: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

interface FieldMessages {
  nameShort: string;
  nameLong: string;
  emailInvalid: string;
  topicInvalid: string;
  referenceLong: string;
  messageShort: string;
  messageLong: string;
}

/** Stable English select values; the visible labels come from the dictionary. */
const TOPIC_VALUES = [
  "Data question",
  "Bug report",
  "Competition request",
  "Accessibility feedback",
  "Privacy request",
  "Something else",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values: FormState, messages: FieldMessages): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) {
    errors.name = messages.nameShort;
  }
  if (values.name.trim().length > 80) {
    errors.name = messages.nameLong;
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = messages.emailInvalid;
  }
  if (!TOPIC_VALUES.includes(values.topic as (typeof TOPIC_VALUES)[number])) {
    errors.topic = messages.topicInvalid;
  }
  if (values.reference.trim().length > 200) {
    errors.reference = messages.referenceLong;
  }
  if (values.message.trim().length < 20) {
    errors.message = messages.messageShort;
  }
  if (values.message.trim().length > 1500) {
    errors.message = messages.messageLong;
  }
  return errors;
}

export function ContactForm({ contactEmail }: { contactEmail?: string }) {
  const { t, f } = useI18n();
  const form = t.content.contact.form;
  const fieldMessages: FieldMessages = {
    nameShort: form.nameShort,
    nameLong: form.nameLong,
    emailInvalid: form.emailInvalid,
    topicInvalid: form.topicInvalid,
    referenceLong: form.referenceLong,
    messageShort: form.messageShort,
    messageLong: form.messageLong,
  };

  const [values, setValues] = useState<FormState>({
    name: "",
    email: "",
    topic: TOPIC_VALUES[0],
    reference: "",
    message: "",
  });
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
    const body = `${header}\n\n${values.message.trim()}\n\n—\n${form.mailFooter}`;
    return `mailto:${contactEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }, [contactEmail, values, form.mailFooter]);

  const set = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const next = { ...values, [field]: event.target.value };
    setValues(next);
    if (touched[field]) setErrors(validate(next, fieldMessages));
    setComposed(false);
  };

  const blur = (field: keyof FormState) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validate(values, fieldMessages));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validate(values, fieldMessages);
    setErrors(next);
    setTouched({
      name: true,
      email: true,
      topic: true,
      reference: true,
      message: true,
    });
    if (Object.keys(next).length > 0) {
      push(form.toastValidation, "error");
      return;
    }
    if (!contactEmail) {
      push(form.toastNoAddress, "error");
      return;
    }
    setComposed(true);
    window.location.assign(mailto);
  };

  const copyAddress = async () => {
    if (!contactEmail) return;
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      push(form.toastCopied, "success");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      push(form.toastClipboardFailed, "error");
    }
  };

  if (!contactEmail) {
    return (
      <div className="form-card">
        <h2 className="settings-section__title">{form.notConfigured.title}</h2>
        <p className="settings-row__description" style={{ marginTop: 8 }}>
          <RichText text={form.notConfigured.body} />
        </p>
        <p className="form-status form-status--info">{form.notConfigured.note}</p>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={onSubmit} noValidate>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="contact-name">{form.nameLabel}</label>
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
          <label htmlFor="contact-email">{form.emailLabel}</label>
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
          <label htmlFor="contact-topic">{form.topicLabel}</label>
          <select
            id="contact-topic"
            name="topic"
            value={values.topic}
            onChange={set("topic")}
            onBlur={blur("topic")}
            aria-invalid={Boolean(errors.topic)}
          >
            {TOPIC_VALUES.map((topic, index) => (
              <option key={topic} value={topic}>
                {form.topics[index]}
              </option>
            ))}
          </select>
          {errors.topic ? <p className="field__error">{errors.topic}</p> : null}
        </div>

        <div className="field">
          <label htmlFor="contact-reference">
            {form.referenceLabel}{" "}
            <span className="field__hint">{form.optional}</span>
          </label>
          <input
            id="contact-reference"
            name="reference"
            type="text"
            value={values.reference}
            onChange={set("reference")}
            onBlur={blur("reference")}
            aria-invalid={Boolean(errors.reference)}
            placeholder={form.referencePlaceholder}
            maxLength={200}
          />
          {errors.reference ? (
            <p className="field__error">{errors.reference}</p>
          ) : (
            <p className="field__hint">{form.referenceHint}</p>
          )}
        </div>

        <div className="field field--full">
          <label htmlFor="contact-message">{form.messageLabel}</label>
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
            <span className="u-dir-ltr">{f(form.messageCounter, { count })}</span> ·{" "}
            {form.messageCounterMin}
          </p>
          {errors.message ? (
            <p className="field__error">{errors.message}</p>
          ) : null}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn--accent">
          <Send size={16} aria-hidden="true" />
          {form.submit}
        </button>
        <button type="button" className="btn btn--ghost" onClick={copyAddress}>
          {copied ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Copy size={15} aria-hidden="true" />
          )}
          {copied ? form.addressCopied : form.copyAddress}
        </button>
        <span className="small text-muted">
          <Mail size={12} aria-hidden="true" /> {contactEmail}
        </span>
      </div>

      {composed ? (
        <p className="form-status form-status--ok" role="status">
          {form.composedStatus}
        </p>
      ) : (
        <p className="form-status form-status--info">
          {f(form.infoStatus, { email: contactEmail })}
        </p>
      )}
    </form>
  );
}
