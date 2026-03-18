"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  RiDownloadLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiArrowRightLine,
  RiErrorWarningLine,
  RiLoader4Line,
} from "react-icons/ri";

const schema = z.object({
  name: z.string().min(2, "at least 2 characters"),
  email: z.string().email("invalid email address"),
});
type FormData = z.infer<typeof schema>;

const TRIAL_FEATURES = [
  "full disk scanner + treemap",
  "7-day free trial",
  "no card required",
];
const PRO_FEATURES = [
  "full disk scanner + treemap",
  "duplicate file finder",
  "developer junk cleaner",
  "old large file detection",
  "one-click cleanup",
  "lifetime updates",
];

function FieldStatus({
  error,
  touched,
  checking,
  serverError,
  okText,
}: {
  error?: string;
  touched?: boolean;
  checking?: boolean;
  serverError?: string;
  okText?: string;
}) {
  if (error)
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#C0392B] font-mono">
        <RiErrorWarningLine size={11} className="shrink-0" /> {error}
      </p>
    );
  if (serverError)
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#C0392B] font-mono">
        <RiErrorWarningLine size={11} className="shrink-0" /> {serverError}
      </p>
    );
  if (checking)
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-n-dim font-mono">
        <RiLoader4Line size={11} className="shrink-0 animate-spin" /> checking…
      </p>
    );
  if (touched && !error && !serverError)
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-n-dim font-mono">
        <RiCheckLine size={11} className="shrink-0 text-n-green-text" />{" "}
        {okText}
      </p>
    );
  return null;
}

export default function PricingPage() {
  const [plan, setPlan] = useState<"free" | "paid" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailTaken, setEmailTaken] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    watch,
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onChange" });

  const emailVal = watch("email");

  useEffect(() => {
    setEmailTaken("");
    if (!emailVal || !emailVal.includes("@") || errors.email) return;
    const t = setTimeout(async () => {
      setEmailChecking(true);
      try {
        const res = await fetch("/api/users/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal }),
        });
        const result = await res.json();
        if (result.exists) setEmailTaken("email already registered");
      } catch {
      } finally {
        setEmailChecking(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [emailVal, errors.email]);

  const onSubmit = async (data: FormData) => {
    if (emailTaken) {
      setFormError("please use a different email");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      if (plan === "free") {
        await fetch("/api/users/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, model: "apple-silicon" }),
        });
        setSuccess(true);
        setTimeout(() => {
          window.location.href = `/download?email=${encodeURIComponent(data.email)}`;
        }, 800);
        return;
      }

      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, model: "apple-silicon" }),
      });
      const result = await res.json();
      if (!res.ok || !result.url) {
        setFormError(result.error ?? "payment setup failed — try again");
        return;
      }
      document.cookie = `nook_model=apple-silicon; path=/; max-age=3600; SameSite=Lax`;
      setSuccess(true);
      setTimeout(() => {
        window.location.href = result.url;
      }, 800);
    } catch {
      setFormError("something went wrong — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: keyof FormData) =>
    [
      "w-full h-11 px-4 rounded-xl border text-[13px] font-mono",
      "bg-n-card2 text-n-text placeholder:text-n-dim",
      "outline-none transition-all duration-200",
      "focus:ring-2 focus:ring-n-border2/20 focus:border-n-border2",
      errors[field]
        ? "border-red-500/50 bg-red-500/5"
        : touchedFields[field] && !errors[field]
          ? "border-n-border2 bg-n-card2"
          : "border-n-border hover:border-n-border2",
    ].join(" ");

  return (
    <div className="min-h-screen bg-n-bg px-6 py-20">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[9px] tracking-[0.14em] text-n-dim uppercase mb-4">
            pricing
          </p>
          <h1 className="text-[clamp(22px,4vw,32px)] font-medium tracking-[-0.03em] text-n-text mb-3">
            choose your plan
          </h1>
          <p className="text-[14px] font-[system-ui] font-light text-n-muted">
            start free, upgrade when you're ready
          </p>
        </div>

        {!plan ? (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Free */}
            <div
              onClick={() => setPlan("free")}
              className="group relative bg-linear-to-br from-n-card to-n-card2 border border-n-border rounded-2xl p-8 text-left hover:border-n-border2 hover:shadow-lg hover:shadow-n-border/10 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-linear-to-br from-n-dim/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] tracking-widest text-n-dim uppercase font-semibold">
                    free trial
                  </p>
                  <div className="w-8 h-8 rounded-full bg-n-dim/10 flex items-center justify-center">
                    <RiDownloadLine size={16} className="text-n-dim" />
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-[48px] font-bold tracking-tight text-n-text mb-2">
                    $0
                    <span className="text-[14px] font-normal text-n-muted ml-2">
                      forever
                    </span>
                  </div>
                  <p className="text-[13px] font-[system-ui] font-light text-n-muted leading-relaxed">
                    Start with full features · upgrade anytime
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  {TRIAL_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-n-dim/10 flex items-center justify-center shrink-0">
                        <RiCheckLine size={12} className="text-n-dim" />
                      </div>
                      <span className="text-[13px] text-n-muted">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[13px] text-n-text font-medium group-hover:gap-3 transition-all duration-200">
                  start free trial{" "}
                  <RiArrowRightLine
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Pro */}
            <div
              onClick={() => setPlan("paid")}
              className="group relative bg-linear-to-br from-n-green-bg/20 to-n-card border-2 border-n-green-brd rounded-2xl p-8 text-left hover:border-n-green-text hover:shadow-lg hover:shadow-n-green-text/20 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-linear-to-br from-n-green-text/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] tracking-widest text-n-green-text uppercase font-semibold">
                    pro
                  </p>
                  <div className="w-8 h-8 rounded-full bg-n-green-text/20 flex items-center justify-center">
                    <RiCheckLine size={16} className="text-n-green-text" />
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-[48px] font-bold tracking-tight text-n-text mb-2">
                    $5
                    <span className="text-[14px] font-normal text-n-muted ml-2">
                      one-time
                    </span>
                  </div>
                  <p className="text-[13px] font-[system-ui] font-light text-n-muted leading-relaxed">
                    Lifetime access · all features included
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  {PRO_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-n-green-text/20 flex items-center justify-center shrink-0">
                        <RiCheckLine size={12} className="text-n-green-text" />
                      </div>
                      <span className="text-[13px] text-n-muted">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[13px] text-n-green-text font-medium group-hover:gap-3 transition-all duration-200">
                  buy nook{" "}
                  <RiArrowRightLine
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setPlan(null);
                setFormError("");
                setSuccess(false);
                reset();
              }}
              className="flex items-center gap-2 text-[11px] text-n-muted hover:text-n-text transition-colors mb-8 cursor-pointer bg-transparent border-0"
            >
              <RiArrowLeftLine size={13} /> back to plans
            </button>

            <div className="bg-linear-to-br from-n-card to-n-card2 border border-n-border rounded-2xl p-10 shadow-xl shadow-n-border/5">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-n-dim/10 mb-4">
                  {plan === "free" ? (
                    <RiDownloadLine size={24} className="text-n-dim" />
                  ) : (
                    <RiCheckLine size={24} className="text-n-green-text" />
                  )}
                </div>
                <p className="text-[11px] tracking-widest text-n-dim uppercase mb-3">
                  {plan === "free" ? "free trial" : "nook pro — $5"}
                </p>
                <h2 className="text-[24px] font-bold text-n-text mb-2">
                  {plan === "free"
                    ? "start your free trial"
                    : "complete your purchase"}
                </h2>
                <p className="text-[13px] font-[system-ui] font-light text-n-muted">
                  {plan === "free"
                    ? "7 days of full access · no credit card required"
                    : "One-time payment · lifetime license key"}
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
              >
                <div>
                  <label className="block text-[11px] tracking-widest text-n-dim uppercase mb-3 font-semibold">
                    full name
                  </label>
                  <input
                    {...register("name")}
                    type="text"
                    placeholder="Enter your full name"
                    className={inputCls("name")}
                    autoComplete="name"
                  />
                  <FieldStatus
                    error={errors.name?.message}
                    touched={touchedFields.name}
                    okText="looks good"
                  />
                </div>

                <div>
                  <label className="block text-[11px] tracking-widest text-n-dim uppercase mb-3 font-semibold">
                    email address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    className={inputCls("email")}
                    autoComplete="email"
                  />
                  <FieldStatus
                    error={errors.email?.message}
                    touched={touchedFields.email}
                    checking={emailChecking}
                    serverError={emailTaken}
                    okText="valid email"
                  />
                </div>

                {/* Form-level error */}
                {formError && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <RiErrorWarningLine
                      size={16}
                      className="text-red-500 shrink-0 mt-0.5"
                    />
                    <p className="text-[12px] text-red-500 font-mono">
                      {formError}
                    </p>
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-n-green-bg border border-n-green-brd">
                    <RiCheckLine
                      size={16}
                      className="text-n-green-text shrink-0"
                    />
                    <p className="text-[12px] text-n-green-text font-mono">
                      {plan === "free"
                        ? "redirecting to download…"
                        : "redirecting to dodo checkout…"}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    submitting || !isValid || !!emailTaken || emailChecking
                  }
                  className="w-full h-13 rounded-xl bg-n-text text-n-bg text-[14px] font-bold tracking-widest cursor-pointer border-0 font-mono flex items-center justify-center gap-3 hover:bg-n-green-text transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-n-green-text/30"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-n-bg/30 border-t-n-bg rounded-full animate-spin" />
                      processing…
                    </>
                  ) : plan === "free" ? (
                    <>
                      <RiDownloadLine size={18} /> START FREE TRIAL
                    </>
                  ) : (
                    "PROCEED TO PAYMENT →"
                  )}
                </button>

                {plan === "paid" && !success && !formError && (
                  <p className="text-[10px] text-n-dim text-center leading-relaxed">
                    redirected to dodo's secure checkout · license key emailed
                  </p>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
