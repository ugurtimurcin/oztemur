"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getJobById, submitApplication, type JobRequisitionDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection, useUiString } from "@/lib/SiteContentContext";
import Turnstile from "@/components/Turnstile";
import Icon from "@/components/Icon";

const TURNSTILE_ENABLED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /^https?:\/\/(?:[a-z0-9-]+\.)*linkedin\.com\/[^\s]*$/i;
const NAME_MAX = 120;
const EMAIL_MAX = 254;
const LINKEDIN_MAX = 200;
const SUMMARY_MAX = 5000;
const CV_MAX_BYTES = 10 * 1024 * 1024;

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    back: "Tüm pozisyonlara dön",
    referenceCode: "Referans kodu",
    overview: "Pozisyon özeti",
    objectives: "Temel sorumluluklar",
    requirements: "Aradığımız nitelikler",
    apply: "Başvur",
    applyTitle: "Başvuru formu",
    applySubtitle: "Bilgileriniz doğrudan ilgili departmana iletilecektir.",
    name: "Ad Soyad",
    email: "E-posta adresi",
    linkedin: "LinkedIn / portfolyo",
    cv: "Özgeçmiş (PDF)",
    summary: "Kısa özet",
    summaryPlaceholder: "Kendinizden ve neden bu pozisyon için uygun olduğunuzdan kısaca bahsedin...",
    consent: "Başvurum kapsamında verilerimin işlenmesini kabul ediyorum.",
    submit: "Başvuruyu Gönder",
    submitting: "Gönderiliyor...",
    successTitle: "Başvurunuz alındı.",
    successBody: "Ekibimiz, profilinizin bu pozisyona uygunluğunu değerlendirip sizinle iletişime geçecektir.",
    backToList: "Pozisyonlara dön",
    error: "Başvuru gönderilemedi.",
    notFound: "Pozisyon bulunamadı.",
  },
  en: {
    back: "Back to all positions",
    referenceCode: "Reference code",
    overview: "Role overview",
    objectives: "Core responsibilities",
    requirements: "What we're looking for",
    apply: "Apply",
    applyTitle: "Application form",
    applySubtitle: "Your details will be sent directly to the relevant team.",
    name: "Full name",
    email: "Email address",
    linkedin: "LinkedIn / portfolio",
    cv: "Curriculum vitae (PDF)",
    summary: "Brief summary",
    summaryPlaceholder: "Tell us briefly about yourself and why you're a good fit for this role...",
    consent: "I agree to the processing of my data as part of this application.",
    submit: "Submit Application",
    submitting: "Submitting...",
    successTitle: "Application received.",
    successBody: "Our team will review your profile and get back to you if you're a fit.",
    backToList: "Back to positions",
    error: "Failed to submit application.",
    notFound: "Position not found.",
  },
};

export default function CareerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { locale } = useLanguage();
  const c = useSection("career_detail", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const turnstileError = useUiString("form.turnstile.incomplete", "Please complete the security verification.");

  const [job, setJob] = useState<JobRequisitionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    linkedIn: "",
    summary: "",
    cvBase64: "",
  });
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Invalid fields are flagged visually only (terracotta border) — no error text.
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const setField = (field: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setInvalid(prev => (prev[field] ? { ...prev, [field]: false } : prev));
  };
  const fieldCls = (field: string, extra = "") =>
    `w-full bg-midnight-soft border px-4 py-3 text-ivory focus:outline-none transition-colors text-sm ${extra} ${
      invalid[field] ? "border-danger focus:border-danger" : "border-ivory/15 focus:border-champagne"
    }`;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getJobById(id, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setJob(res.data);
      else setError(res.message || c.notFound);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, locale, c.notFound]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > CV_MAX_BYTES) {
      setInvalid(prev => ({ ...prev, cv: true }));
      e.target.value = "";
      setForm((f) => ({ ...f, cvBase64: "" }));
      return;
    }
    setInvalid(prev => (prev.cv ? { ...prev, cv: false } : prev));
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, cvBase64: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setFormError(null);
    const bad: Record<string, boolean> = {};
    const nameTrim = form.name.trim();
    const emailTrim = form.email.trim();
    const linkedInTrim = form.linkedIn.trim();
    const summaryTrim = form.summary.trim();
    if (!nameTrim || nameTrim.length > NAME_MAX) bad.name = true;
    if (emailTrim.length > EMAIL_MAX || !EMAIL_RE.test(emailTrim)) bad.email = true;
    if (linkedInTrim && (linkedInTrim.length > LINKEDIN_MAX || !LINKEDIN_RE.test(linkedInTrim))) bad.linkedIn = true;
    if (summaryTrim.length > SUMMARY_MAX) bad.summary = true;
    if (!form.cvBase64) bad.cv = true;
    if (!consent) bad.consent = true;
    setInvalid(bad);
    if (Object.keys(bad).length > 0) return;

    if (TURNSTILE_ENABLED && !turnstileToken) {
      setFormError(turnstileError);
      return;
    }
    setSubmitting(true);
    const res = await submitApplication({
      jobRequisitionId: job.id,
      candidateName: form.name,
      email: form.email,
      linkedInUrl: form.linkedIn,
      executiveSummary: form.summary,
      base64CvData: form.cvBase64,
      turnstileToken,
    });
    if (res.success) setSubmitted(true);
    else setFormError(c.error);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="bg-cream min-h-screen flex items-center justify-center">
        <Header variant="solid" />
        <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="bg-cream text-charcoal min-h-screen pt-44 pb-24 px-6">
        <Header variant="solid" />
        <div className="max-w-2xl mx-auto text-center">
          <span className="eyebrow text-on-muted">404</span>
          <h1 className="font-display text-4xl mt-5 mb-4">{error || c.notFound}</h1>
          <Link href="/careers" className="btn-solid btn-solid-midnight press-98">
            {c.backToList}
          </Link>
        </div>
      </main>
    );
  }

  const parseList = (v: any): string[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try { return JSON.parse(v); } catch { return []; }
    }
    return [];
  };
  const requirements = parseList((job as any).requirements || (job as any).requirementsJson);
  const objectives = parseList((job as any).coreObjectives || (job as any).coreObjectivesJson);

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="solid" />

      {/* ── Job hero ────────────────────────────────── */}
      <section className="bg-surface pt-40 pb-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <Link
            href="/careers"
            className="inline-flex items-center gap-3 mb-12 text-[11px] font-semibold uppercase tracking-[0.24em] text-on-muted hover:text-champagne transition-colors"
          >
            <Icon name="west" className="text-base" />
            {c.back}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-9">
              <span className="eyebrow text-champagne block mb-5">{job.department}</span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-[3.75rem] text-charcoal leading-[1.1] mb-8">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.28em] text-on-muted">
                <span className="flex items-center gap-1.5">
                  <Icon name="location_on" className="text-base text-champagne" />
                  {job.location}
                </span>
                {job.type && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-on-muted/40" />
                    <span className="flex items-center gap-1.5">
                      <Icon name="work" className="text-base text-champagne" />
                      {job.type}
                    </span>
                  </>
                )}
              </div>
            </div>
            {job.referenceCode && (
              <div className="lg:col-span-3 lg:text-end">
                <span className="block text-[10px] uppercase tracking-[0.28em] text-on-muted/65 mb-2">{c.referenceCode}</span>
                <span className="font-display text-lg text-charcoal tracking-wider">{job.referenceCode}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Body + form ─────────────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20">
          <div className="lg:col-span-7">
            <span className="eyebrow">{c.overview}</span>
            <div className="gold-rule mt-5 mb-8" />
            <p className="text-on-muted text-lg font-light leading-loose whitespace-pre-wrap mb-14">
              {job.description}
            </p>

            {objectives.length > 0 && (
              <>
                <span className="eyebrow">{c.objectives}</span>
                <div className="gold-rule mt-5 mb-8" />
                <ul className="mb-14 space-y-4">
                  {objectives.map((obj, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <Icon name="arrow_forward" className="text-base text-champagne mt-1.5 flex-shrink-0" />
                      <span className="text-on-muted font-light leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {requirements.length > 0 && (
              <>
                <span className="eyebrow">{c.requirements}</span>
                <div className="gold-rule mt-5 mb-8" />
                <ul className="space-y-4">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <Icon name="check" className="text-base text-champagne mt-1.5 flex-shrink-0" />
                      <span className="text-on-muted font-light leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Application form */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-32 bg-midnight text-ivory p-8 md:p-10 relative overflow-hidden">
              <div className="texture-grain absolute inset-0 opacity-15 pointer-events-none" />
              <div className="relative">
                {!submitted ? (
                  <>
                    <span className="eyebrow text-champagne block mb-4">{c.apply}</span>
                    <h3 className="font-display text-2xl md:text-3xl text-ivory mb-3">{c.applyTitle}</h3>
                    <p className="text-ivory/65 text-sm font-light mb-8">{c.applySubtitle}</p>

                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ivory/55">{c.name}</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setField("name", e.target.value)}
                          maxLength={NAME_MAX}
                          required
                          className={fieldCls("name")}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ivory/55">{c.email}</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          maxLength={EMAIL_MAX}
                          required
                          className={fieldCls("email")}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ivory/55">{c.linkedin}</label>
                        <input
                          type="url"
                          value={form.linkedIn}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, linkedIn: e.target.value }));
                            setInvalid(prev => (prev.linkedIn ? { ...prev, linkedIn: false } : prev));
                          }}
                          maxLength={LINKEDIN_MAX}
                          className={`w-full bg-midnight-soft border px-4 py-3 text-ivory focus:outline-none transition-colors text-sm ${
                            invalid.linkedIn ? "border-danger focus:border-danger" : "border-ivory/15 focus:border-champagne"
                          }`}
                          placeholder="https://www.linkedin.com/in/..."
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ivory/55">{c.cv}</label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFile}
                          className={`w-full bg-midnight-soft border p-2.5 text-ivory text-sm font-light file:me-4 file:px-4 file:py-1.5 file:bg-midnight file:text-ivory file:border file:border-ivory/20 file:text-[10px] file:font-semibold file:uppercase file:tracking-[0.24em] file:cursor-pointer hover:file:border-champagne hover:file:text-champagne file:transition-colors focus:outline-none transition-colors ${invalid.cv ? "border-danger focus:border-danger" : "border-ivory/15 focus:border-champagne"}`}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ivory/55">{c.summary}</label>
                        <textarea
                          rows={4}
                          value={form.summary}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, summary: e.target.value }));
                            setInvalid(prev => (prev.summary ? { ...prev, summary: false } : prev));
                          }}
                          maxLength={SUMMARY_MAX}
                          className={`w-full bg-midnight-soft border px-4 py-3 text-ivory focus:outline-none transition-colors text-sm font-light resize-none ${
                            invalid.summary ? "border-danger focus:border-danger" : "border-ivory/15 focus:border-champagne"
                          }`}
                          placeholder={c.summaryPlaceholder}
                        />
                      </div>

                      <label className="flex gap-3 items-start mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => {
                            setConsent(e.target.checked);
                            setInvalid(prev => (prev.consent ? { ...prev, consent: false } : prev));
                          }}
                          className={`mt-1 accent-champagne flex-shrink-0 ${invalid.consent ? "outline outline-2 outline-offset-2 outline-danger" : ""}`}
                        />
                        <span className="text-xs text-ivory/65 font-light leading-relaxed">{c.consent}</span>
                      </label>

                      {TURNSTILE_ENABLED && (
                        <div className="mt-2">
                          <Turnstile theme="dark" onVerify={setTurnstileToken} />
                        </div>
                      )}

                      {formError && (
                        <div className="border border-danger bg-danger/10 text-danger px-4 py-3 text-sm">
                          {formError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting || (TURNSTILE_ENABLED && !turnstileToken)}
                        className="mt-3 btn-solid btn-solid-gold press-98 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border border-midnight/30 border-t-midnight rounded-full animate-spin" />
                            {c.submitting}
                          </>
                        ) : (
                          <>
                            {c.submit}
                            <Icon name="arrow_forward" className="text-base" />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-20 h-20 border border-champagne flex items-center justify-center mx-auto mb-8">
                      <Icon name="check" className="text-champagne text-3xl" />
                    </div>
                    <h3 className="font-display text-2xl text-ivory mb-4">{c.successTitle}</h3>
                    <p className="text-ivory/65 font-light text-sm mb-10 leading-relaxed">{c.successBody}</p>
                    <button
                      onClick={() => router.push("/careers")}
                      className="btn-solid btn-solid-gold press-98 w-full"
                    >
                      {c.backToList}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
