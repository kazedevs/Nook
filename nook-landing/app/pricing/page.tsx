"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  RiAppleLine,
  RiCpuLine,
  RiDownloadLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiArrowRightLine,
} from "react-icons/ri";

const schema = z.object({
  name: z.string().min(2, "at least 2 characters"),
  email: z.string().email("invalid email"),
  model: z.enum(["apple-silicon", "intel"], { message: "select a model" }),
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

export default function PricingPage() {
  const [plan, setPlan] = useState<"free" | "paid" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onChange" });

  const model = watch("model");

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError("");
    try {
      if (plan === "free") {
        // Save free trial user before redirecting to download
        await fetch("/api/users/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        setSuccess(true);
        setTimeout(() => {
          window.location.href = `/download?model=${data.model}&email=${encodeURIComponent(data.email)}`;
        }, 800);
        return;
      }

      // Paid — call our API which returns a Dodo checkout URL
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok || !result.url) {
        setError(result.error ?? "payment setup failed — please try again");
        return;
      }

      document.cookie = `nook_model=${result.model}; path=/; max-age=3600; SameSite=Lax`;
      setSuccess(true);
      setTimeout(() => {
        window.location.href = result.url;
      }, 800);
    } catch (e) {
      setError("something went wrong — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FormData) =>
    `w-full h-10 px-3 rounded-lg border bg-n-card2 text-n-text text-[13px] font-mono placeholder:text-n-dim outline-none transition-colors ${
      errors[field]
        ? "border-[#712B13]"
        : touchedFields[field] && !errors[field]
          ? "border-n-border2"
          : "border-n-border focus:border-n-border2"
    }`;

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
          <p className="text-[13px] text-n-muted">
            start free, upgrade when you're ready
          </p>
        </div>

        {!plan ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Free */}
            <button
              onClick={() => setPlan("free")}
              className="bg-n-card border border-n-border rounded-xl p-6 text-left hover:border-n-border2 transition-all group cursor-pointer"
            >
              <p className="text-[9px] tracking-widest text-n-dim uppercase mb-4">
                free trial
              </p>
              <div className="text-[36px] font-medium tracking-[-0.04em] text-n-text mb-1">
                $0
              </div>
              <p className="text-[11px] text-n-muted mb-6">
                7 days · no card required
              </p>
              <ul className="space-y-2.5 mb-6">
                {TRIAL_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-[11px] text-n-muted"
                  >
                    <RiCheckLine size={12} className="text-n-dim shrink-0" />{" "}
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-[11px] text-n-muted group-hover:text-n-text transition-colors">
                start free trial <RiArrowRightLine size={12} />
              </div>
            </button>

            {/* Pro */}
            <button
              onClick={() => setPlan("paid")}
              className="bg-n-card border border-n-green-brd rounded-xl p-6 text-left hover:border-n-green-text transition-all group cursor-pointer relative"
            >
              <div className="absolute top-4 right-4 text-[9px] tracking-[0.08em] text-n-green-text bg-n-green-bg border border-n-green-brd rounded-full px-2.5 py-0.5">
                popular
              </div>
              <p className="text-[9px] tracking-widest text-n-dim uppercase mb-4">
                pro
              </p>
              <div className="text-[36px] font-medium tracking-[-0.04em] text-n-text mb-1">
                $5
              </div>
              <p className="text-[11px] text-n-muted mb-6">
                one-time · lifetime access
              </p>
              <ul className="space-y-2.5 mb-6">
                {PRO_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-[11px] text-n-muted"
                  >
                    <RiCheckLine
                      size={12}
                      className="text-n-green-text shrink-0"
                    />{" "}
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-[11px] text-n-green-text group-hover:opacity-80 transition-opacity">
                buy nook <RiArrowRightLine size={12} />
              </div>
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setPlan(null);
                setError("");
                setSuccess(false);
              }}
              className="flex items-center gap-2 text-[11px] text-n-muted hover:text-n-text transition-colors mb-8 cursor-pointer bg-transparent border-0"
            >
              <RiArrowLeftLine size={13} /> back to plans
            </button>

            <div className="bg-n-card border border-n-border rounded-xl p-8">
              <p className="text-[9px] tracking-widest text-n-dim uppercase mb-2">
                {plan === "free" ? "free trial" : "nook pro — $5"}
              </p>
              <h2 className="text-[18px] font-medium text-n-text mb-7">
                {plan === "free"
                  ? "start your free trial"
                  : "complete your purchase"}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-[10px] tracking-[0.08em] text-n-dim uppercase mb-2">
                    full name
                  </label>
                  <input
                    {...register("name")}
                    type="text"
                    placeholder="your name"
                    className={inputClass("name")}
                  />
                  {errors.name ? (
                    <p className="mt-1.5 text-[10px] text-[#712B13]">
                      ⚠ {errors.name.message}
                    </p>
                  ) : (
                    touchedFields.name && (
                      <p className="mt-1.5 text-[10px] text-n-dim">
                        ✓ looks good
                      </p>
                    )
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] tracking-[0.08em] text-n-dim uppercase mb-2">
                    email address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    className={inputClass("email")}
                  />
                  {errors.email ? (
                    <p className="mt-1.5 text-[10px] text-[#712B13]">
                      ⚠ {errors.email.message}
                    </p>
                  ) : (
                    touchedFields.email && (
                      <p className="mt-1.5 text-[10px] text-n-dim">
                        ✓ valid email
                      </p>
                    )
                  )}
                </div>

                {/* Model */}
                <div>
                  <label className="block text-[10px] tracking-[0.08em] text-n-dim uppercase mb-2">
                    mac model
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        value: "apple-silicon",
                        label: "Apple Silicon",
                        sub: "M1 / M2 / M3",
                        Icon: RiAppleLine,
                      },
                      {
                        value: "intel",
                        label: "Intel",
                        sub: "Intel chips",
                        Icon: RiCpuLine,
                      },
                    ].map(({ value, label, sub, Icon }) => (
                      <label
                        key={value}
                        className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                          model === value
                            ? "border-n-border2 bg-n-card2"
                            : "border-n-border hover:border-n-border2"
                        }`}
                      >
                        <input
                          {...register("model")}
                          type="radio"
                          value={value}
                          className="sr-only"
                        />
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            model === value
                              ? "bg-n-border2 text-n-text"
                              : "bg-n-card text-n-dim"
                          }`}
                        >
                          <Icon size={14} />
                        </div>
                        <div>
                          <p
                            className={`text-[12px] font-medium ${model === value ? "text-n-text" : "text-n-muted"}`}
                          >
                            {label}
                          </p>
                          <p className="text-[10px] text-n-dim">{sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.model && (
                    <p className="mt-1.5 text-[10px] text-[#712B13]">
                      ⚠ {errors.model.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !isValid}
                  className="w-full h-11 rounded-lg bg-n-text text-n-bg text-[12px] font-semibold tracking-[0.06em] cursor-pointer border-0 font-mono flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 mt-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />{" "}
                      processing…
                    </>
                  ) : plan === "free" ? (
                    <>
                      <RiDownloadLine size={14} /> START FREE TRIAL
                    </>
                  ) : (
                    "PROCEED TO PAYMENT →"
                  )}
                </button>

                {success && (
                  <div className="p-3 rounded-lg bg-n-green-bg border border-n-green-brd text-n-green-text text-[11px] font-mono text-center">
                    ✓{" "}
                    {plan === "free"
                      ? "redirecting to download…"
                      : "redirecting to dodo checkout…"}
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-n-amber-bg border border-n-amber-brd text-n-amber-text text-[11px] font-mono text-center">
                    ⚠ {error}
                  </div>
                )}

                {plan === "paid" && !success && !error && (
                  <p className="text-[10px] text-n-dim text-center">
                    you'll be redirected to dodo's secure checkout · license key
                    emailed after purchase
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
