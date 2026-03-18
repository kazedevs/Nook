"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RiCheckLine, RiFileCopyLine, RiDownloadLine } from "react-icons/ri";
import { DOWNLOAD_URLS } from "@/lib/constants";

export default function ReturnPage() {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [model, setModel] = useState("apple-silicon");
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("status");
    const key = p.get("license_key");
    const em = p.get("email");
    const mdl = p.get("model");
    const paymentId = p.get("payment_id");

    console.log("return params:", { status, key, em, mdl, paymentId });

    if (!key || status !== "succeeded") {
      setError(true);
      return;
    }

    setLicenseKey(key);
    if (em) setEmail(decodeURIComponent(em));
    if (mdl) setModel(mdl);

    sessionStorage.setItem("nook_license_key", key);
    // Clear model cookie if it was set
    document.cookie = "nook_model=; path=/; max-age=0";
  }, []);

  const copy = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (error)
    return (
      <div className="min-h-screen bg-n-bg flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-n-amber-bg border border-n-amber-brd rounded-xl p-9 text-center">
          <p className="text-[16px] font-medium text-n-amber-text mb-3">
            something went wrong
          </p>
          <p className="text-[12px] text-[#633806] leading-relaxed mb-6">
            your payment went through but we couldn't read the license key.
            <br />
            check your email or{" "}
            <a href="mailto:support@nookapp.com" className="underline">
              contact support
            </a>
            .
          </p>
          <Link
            href="/pricing"
            className="text-[11px] text-n-muted hover:text-n-text transition-colors"
          >
            ← back to pricing
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-n-bg flex items-center justify-center px-6">
      <div className="w-full max-w-[460px] bg-n-card border border-n-border rounded-xl p-9">
        <div className="w-11 h-11 rounded-full bg-n-green-bg border border-n-green-brd flex items-center justify-center mx-auto mb-6">
          <RiCheckLine size={20} className="text-n-green-text" />
        </div>

        <h1 className="text-[18px] font-medium text-center mb-2">
          purchase complete
        </h1>
        <p className="text-[12px] text-n-muted text-center leading-relaxed mb-8">
          thanks for buying nook. your license key is below — also sent to{" "}
          {email ?? "your email"}.
        </p>

        <p className="text-[9px] tracking-[0.12em] text-n-dim uppercase mb-2">
          your license key
        </p>
        <div
          className={`bg-n-card2 border rounded-lg p-3.5 flex items-center justify-between gap-3 mb-2 transition-colors ${
            copied ? "border-n-green-brd" : "border-n-border"
          }`}
        >
          <span className="text-[12px] font-medium tracking-[0.04em] break-all text-n-text">
            {licenseKey ?? "—"}
          </span>
          <button
            onClick={copy}
            className={`h-[26px] px-3 rounded border text-[10px] tracking-[0.04em] cursor-pointer shrink-0 transition-all font-mono flex items-center gap-1.5 ${
              copied
                ? "border-n-green-brd text-n-green-text bg-n-green-bg"
                : "border-n-border text-n-muted hover:border-n-border2 hover:text-n-text"
            }`}
          >
            <RiFileCopyLine size={11} />
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>
        <p className="text-[10px] text-n-dim mb-7">
          paste into nook → settings → license → activate
        </p>

        <div className="bg-n-card2 border border-n-border rounded-lg p-4 mb-6">
          {[
            {
              n: "1",
              text: (
                <>
                  <strong className="text-n-text">download nook</strong> using
                  the button below
                </>
              ),
            },
            {
              n: "2",
              text: (
                <>
                  open the app · go to{" "}
                  <strong className="text-n-text">settings → license</strong>
                </>
              ),
            },
            {
              n: "3",
              text: (
                <>
                  paste your key · click{" "}
                  <strong className="text-n-text">activate</strong>
                </>
              ),
            },
          ].map((s, i, arr) => (
            <div
              key={s.n}
              className={`flex gap-3 py-2 ${i < arr.length - 1 ? "border-b border-n-border" : ""}`}
            >
              <span className="text-[10px] text-n-dim w-3.5 shrink-0 pt-px">
                {s.n}
              </span>
              <span className="text-[12px] text-n-muted leading-relaxed">
                {s.text}
              </span>
            </div>
          ))}
        </div>

        <a
          href={
            DOWNLOAD_URLS[model as keyof typeof DOWNLOAD_URLS] ??
            DOWNLOAD_URLS["apple-silicon"]
          }
          download
          className="block mb-2.5"
        >
          <button className="w-full h-10 rounded-lg bg-n-text text-n-bg text-[12px] font-semibold tracking-[0.06em] cursor-pointer border-0 font-mono flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <RiDownloadLine size={14} />
            DOWNLOAD NOOK {model === "intel" ? "(INTEL)" : "(APPLE SILICON)"}
          </button>
        </a>

        <p className="text-[10px] text-n-dim text-center">
          key also sent to {email ?? "your email"} · need help?
          support@nookapp.com
        </p>
      </div>
    </div>
  );
}
