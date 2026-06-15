"use client";

import { useEffect, useState, type FormEvent } from "react";
import Header from "@/components/Header";
import { submitContact } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection, useUiString } from "@/lib/SiteContentContext";
import Turnstile from "@/components/Turnstile";
import Icon from "@/components/Icon";

const TURNSTILE_ENABLED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 120;
const EMAIL_MAX = 254;
const SUBJECT_MAX = 200;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "İletişim",
    line1: "Bir iş, bir ortaklık,",
    line2: "bir soru.",
    lead: "Mesajınızı doğrudan ilgili departmana ileteceğiz. Her iletinin geri dönüşü yapılır.",
  },
  en: {
    eyebrow: "Contact",
    line1: "A project, a partnership,",
    line2: "a question.",
    lead: "Your message is routed straight to the right team. Every message gets a reply.",
  },
};

const INFO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    hqHead: "Genel Merkez",
    hq_line1: "Kombos meydanı Cengizhan Sk No: 25",
    hq_line2: "Gazimağusa, KKTC",
    linesHead: "Doğrudan iletişim",
    landline_label: "Sabit Telefon", landline_value: "",
    mobile_label:   "Cep Telefonu",  mobile_value:   "",
    whatsapp_label: "Whatsapp Hattı", whatsapp_value: "",
    email_label:    "İletişim E-postası", email_value: "info@oztemur.com",
    bottomEyebrow: "Çalışma saatleri",
    bottom_line1: "Pazartesi – Cuma",
    bottom_line2: "09:00 – 18:00 (GMT+3)",
  },
  en: {
    hqHead: "Headquarters",
    hq_line1: "Kombos Square, Cengizhan Street No: 25",
    hq_line2: "Famagusta, North Cyprus",
    linesHead: "Direct lines",
    landline_label: "Landline",  landline_value: "",
    mobile_label:   "Mobile",    mobile_value:   "",
    whatsapp_label: "WhatsApp",  whatsapp_value: "",
    email_label:    "Contact Email", email_value: "info@oztemur.com",
    bottomEyebrow: "Office hours",
    bottom_line1: "Monday – Friday",
    bottom_line2: "09:00 – 18:00 (GMT+3)",
  },
};

const FORM_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    formTitle: "Mesajınızı bırakın",
    formSubtitle: "Bilgilerinizi paylaşın, en kısa sürede size geri dönelim.",
    name: "Ad Soyad",
    email: "E-posta",
    subject: "Konu",
    message: "Mesaj",
    messagePlaceholder: "Mesajınız...",
    submit: "Gönder",
    submitting: "Gönderiliyor...",
    successDefault: "Mesajınız iletildi. Teşekkür ederiz.",
    failureDefault: "Mesaj iletilemedi. Lütfen tekrar deneyin.",
  },
  en: {
    formTitle: "Leave a message",
    formSubtitle: "Share your details — we'll get back to you shortly.",
    name: "Full name",
    email: "Email",
    subject: "Subject",
    message: "Message",
    messagePlaceholder: "Your message...",
    submit: "Send Message",
    submitting: "Sending...",
    successDefault: "Message sent. Thank you.",
    failureDefault: "Could not send message. Please try again.",
  },
};

export default function ContactPage() {
  const { locale } = useLanguage();
  const hero = useSection("contact", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const info = useSection("contact", "info", INFO_FALLBACK[locale] ?? INFO_FALLBACK.en);
  const form = useSection("contact", "form", FORM_FALLBACK[locale] ?? FORM_FALLBACK.en);
  const turnstileError = useUiString("form.turnstile.incomplete", "Please complete the security verification.");
  // Direct lines — only rendered when a value is set (admin leaves
  // unused slots blank). Each kind builds its own URL scheme: tel:,
  // wa.me/<digits>, mailto:.
  const contactLines = [
    { label: info.landline_label, value: info.landline_value, href: `tel:${info.landline_value}` },
    { label: info.mobile_label,   value: info.mobile_value,   href: `tel:${info.mobile_value}` },
    { label: info.whatsapp_label, value: info.whatsapp_value, href: `https://wa.me/${(info.whatsapp_value ?? "").replace(/\D/g, "")}` },
    { label: info.email_label,    value: info.email_value,    href: `mailto:${info.email_value}` },
  ].filter(l => l.value);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  // Show the green-check confirmation for a few seconds, then return to a
  // cleared form so the user can send another message if they want.
  useEffect(() => {
    if (!sent) return;
    const id = setTimeout(() => setSent(false), 4000);
    return () => clearTimeout(id);
  }, [sent]);
  // Invalid fields are flagged visually only (terracotta border) — no error text.
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const setField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setInvalid(prev => (prev[field] ? { ...prev, [field]: false } : prev));
  };
  const fieldCls = (field: string, extra = "") =>
    `w-full bg-cream border px-4 py-3.5 text-charcoal focus:outline-none transition-colors ${extra} ${
      invalid[field] ? "border-danger focus:border-danger" : "border-border focus:border-champagne"
    }`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const bad: Record<string, boolean> = {};
    const nameTrim = formData.name.trim();
    const emailTrim = formData.email.trim();
    const subjectTrim = formData.subject.trim();
    const messageTrim = formData.message.trim();
    if (!nameTrim || nameTrim.length > NAME_MAX) bad.name = true;
    if (emailTrim.length > EMAIL_MAX || !EMAIL_RE.test(emailTrim)) bad.email = true;
    if (!subjectTrim || subjectTrim.length > SUBJECT_MAX) bad.subject = true;
    if (messageTrim.length < MESSAGE_MIN || messageTrim.length > MESSAGE_MAX) bad.message = true;
    setInvalid(bad);
    if (Object.keys(bad).length > 0) return;

    if (TURNSTILE_ENABLED && !turnstileToken) {
      setResult({ success: false, message: turnstileError });
      return;
    }
    setSubmitting(true);
    setResult(null);
    // directorate is kept in the API contract for historical compatibility
    // but no longer collected from the user — pass an empty string.
    const res = await submitContact({ ...formData, directorate: "", turnstileToken });
    setSubmitting(false);
    if (res.success) {
      setResult(null);
      setSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } else {
      // Keep failure messaging inline so the user can fix and retry.
      setResult({ success: false, message: form.failureDefault });
    }
  };

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-soft via-midnight to-midnight-deep" />
          <div className="texture-grain absolute inset-0 opacity-25" />
          <div className="pattern-dots absolute inset-0 opacity-50" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-20 pt-44">
          <div className="flex items-center gap-4 mb-10 opacity-0 animate-fade-up">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{hero.eyebrow}</span>
          </div>
          <h1 className="text-display-xl text-ivory mb-10 max-w-4xl opacity-0 animate-fade-up-slow">
            {hero.line1}
            <br />
            <span className="italic font-light text-champagne">{hero.line2}</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-ivory/75 font-light leading-relaxed opacity-0 animate-fade-up-slow">
            {hero.lead}
          </p>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20">
          {/* Info sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-12">
            <div>
              <span className="eyebrow">{info.hqHead}</span>
              <div className="gold-rule mt-5 mb-6" />
              <p className="font-display text-xl text-charcoal leading-snug mb-3">
                Öztemur Group Of Companies
              </p>
              <p className="text-on-muted font-light leading-relaxed">
                {info.hq_line1}
                <br />
                {info.hq_line2}
              </p>
            </div>

            <div>
              <span className="eyebrow-muted">{info.linesHead}</span>
              <div className="charcoal-rule mt-5 mb-6" />
              <ul className="space-y-5">
                {contactLines.map((line) => (
                  <li key={line.label}>
                    <span className="block text-[10px] uppercase tracking-[0.28em] text-on-muted mb-1.5">
                      {line.label}
                    </span>
                    <a
                      href={line.href}
                      className="text-charcoal hover:text-champagne transition-colors"
                    >
                      {line.value}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface-muted px-7 py-7 border-s-2 border-champagne">
              <span className="eyebrow text-champagne block mb-3">{info.bottomEyebrow}</span>
              <p className="text-on-muted font-light leading-relaxed">
                {info.bottom_line1}
                <br />
                {info.bottom_line2}
              </p>
            </div>
          </aside>

          {/* Form */}
          <div className="lg:col-span-8">
            <div className="bg-surface border border-border p-8 md:p-12 lg:p-14">
              {sent ? (
                <div className="flex items-center justify-center py-24 animate-fade-up">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(27,125,62,0.12)" }}
                  >
                    <Icon name="check" style={{ fontSize: 44, color: "#1B7D3E" }} />
                  </div>
                </div>
              ) : (
              <>
              <span className="eyebrow text-champagne block mb-4">{form.formTitle}</span>
              <h2 className="font-display text-3xl md:text-4xl text-charcoal mb-3">
                {form.formTitle}
              </h2>
              <p className="text-on-muted font-light mb-10">{form.formSubtitle}</p>

              {result && (
                <div
                  className={`mb-8 px-5 py-4 border text-sm ${
                    result.success
                      ? "border-champagne bg-champagne/10 text-champagne-dim"
                      : "border-on-muted/30 bg-on-muted/5 text-on-muted"
                  }`}
                >
                  {result.message}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-on-muted">
                      {form.name}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setField("name", e.target.value)}
                      maxLength={NAME_MAX}
                      required
                      className={fieldCls("name")}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-on-muted">
                      {form.email}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setField("email", e.target.value)}
                      maxLength={EMAIL_MAX}
                      required
                      className={fieldCls("email")}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-on-muted">
                    {form.subject}
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setField("subject", e.target.value)}
                    maxLength={SUBJECT_MAX}
                    required
                    className={fieldCls("subject")}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-on-muted">
                    {form.message}
                  </label>
                  <textarea
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setField("message", e.target.value)}
                    placeholder={form.messagePlaceholder}
                    minLength={MESSAGE_MIN}
                    maxLength={MESSAGE_MAX}
                    required
                    className={fieldCls("message", "resize-none font-light")}
                  />
                </div>

                {TURNSTILE_ENABLED && (
                  <div className="pt-2">
                    <Turnstile onVerify={setTurnstileToken} />
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={submitting || (TURNSTILE_ENABLED && !turnstileToken)}
                    className="btn-solid btn-solid-midnight press-98 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border border-ivory/30 border-t-ivory rounded-full animate-spin" />
                        {form.submitting}
                      </>
                    ) : (
                      <>
                        {form.submit}
                        <Icon name="arrow_forward" className="text-base" />
                      </>
                    )}
                  </button>
                </div>
              </form>
              </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
