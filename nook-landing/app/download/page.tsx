"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RiDownloadLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiFileCopyLine,
  RiAppleLine,
} from "react-icons/ri";

const DOWNLOAD_URL =
  "https://github.com/kazedevs/Nook/releases/download/v0.1.0/Nook_0.1.0_aarch64.dmg";

const STEPS = [
  "download Nook.dmg",
  "double-click to mount",
  "drag to Applications",
  "open Nook · grant permissions",
];

export default function DownloadPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const QUARANTINE_CMD =
    "xattr -rd com.apple.quarantine /Applications/Nook.app";

  useEffect(() => {
    const em = searchParams.get("email");
    if (em) setEmail(decodeURIComponent(em));
  }, [searchParams]);

  const copy = async () => {
    await navigator.clipboard.writeText(QUARANTINE_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-n-bg flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[11px] text-n-muted hover:text-n-text transition-colors mb-10 font-mono tracking-[0.04em]"
        >
          <RiArrowLeftLine size={13} /> back
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-[14px] border border-n-border bg-n-card2 flex items-center justify-center mx-auto mb-5 text-n-muted">
            <RiAppleLine size={26} />
          </div>
          <h1 className="text-[22px] font-medium text-n-text mb-2">
            download nook
          </h1>
          <p className="text-[12px] text-n-muted">
            {email ? (
              <>
                trial started for <span className="text-n-text">{email}</span>
              </>
            ) : (
              "macOS disk analyzer"
            )}
          </p>
        </div>

        {/* Download card */}
        <div className="bg-n-card border border-n-border rounded-xl p-6 mb-4">
          {/* Main download button */}
          <a
            href={DOWNLOAD_URL}
            download
            onClick={() => setDownloading(true)}
            className="block mb-5"
          >
            <button className="w-full h-12 rounded-lg bg-n-text text-n-bg text-[12px] font-semibold tracking-[0.06em] font-mono cursor-pointer border-0 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              {downloading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />{" "}
                  downloading…
                </>
              ) : (
                <>
                  <RiDownloadLine size={15} /> DOWNLOAD NOOK.DMG
                </>
              )}
            </button>
          </a>

          <div className="flex items-center justify-between text-[10px] text-n-dim font-mono">
            <span>v0.1.0 · ~8 MB</span>
            <span>Apple Silicon + Intel (Rosetta)</span>
          </div>
        </div>

        {/* Installation steps */}
        <div className="bg-n-card border border-n-border rounded-xl p-5 mb-4">
          <p className="text-[9px] tracking-widest text-n-dim uppercase mb-4">
            installation
          </p>
          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 py-2.5 ${i < STEPS.length - 1 ? "border-b border-n-border" : ""}`}
              >
                <div className="w-5 h-5 rounded-full border border-n-border2 bg-n-card2 flex items-center justify-center shrink-0">
                  <span className="text-[9px] text-n-dim font-mono">
                    {i + 1}
                  </span>
                </div>
                <span className="text-[12px] text-n-muted">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gatekeeper warning */}
        <div className="bg-n-card border border-n-border rounded-xl p-5 mb-6">
          <p className="text-[9px] tracking-widest text-n-dim uppercase mb-3">
            if macOS blocks the app
          </p>
          <p className="text-[11px] text-n-muted mb-3 leading-relaxed">
            macOS may show a security warning since nook isn't notarized yet.
            run this command to fix it:
          </p>
          <div className="flex items-center gap-2 bg-n-card2 border border-n-border rounded-lg p-3">
            <code className="flex-1 text-[11px] text-white font-mono break-all">
              {QUARANTINE_CMD}
            </code>
            <button
              onClick={copy}
              className={`shrink-0 h-7 px-2.5 rounded border text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? "border-n-green-brd text-n-green-text bg-n-green-bg"
                  : "border-n-border2 text-n-muted hover:text-n-text"
              }`}
            >
              <RiFileCopyLine size={11} />
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>

        {/* System requirements */}
        <div className="bg-n-card border border-n-border rounded-xl p-5 mb-8">
          <p className="text-[9px] tracking-widest text-n-dim uppercase mb-3">
            requirements
          </p>
          {[
            ["os", "macOS 12 Monterey or later"],
            ["chip", "Apple Silicon or Intel (Rosetta 2)"],
            ["ram", "4 GB minimum"],
            ["storage", "~8 MB"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between py-1.5 text-[11px]"
            >
              <span className="text-n-dim font-mono">{k}</span>
              <span className="text-n-muted">{v}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-n-dim">
          want full access?{" "}
          <Link
            href="/pricing"
            className="text-n-muted hover:text-n-text transition-colors underline underline-offset-2"
          >
            upgrade to pro — $5
          </Link>
        </p>
      </div>
    </div>
  );
}
