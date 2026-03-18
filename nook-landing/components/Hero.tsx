"use client";

import { useState } from "react";
import {
  RiDownloadLine,
  RiArrowRightLine,
  RiFileCopyLine,
  RiCheckLine,
} from "react-icons/ri";
import { motion } from "framer-motion";

export function Hero() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        "xattr -rd com.apple.quarantine /Applications/Nook.app",
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section className="relative bg-black pt-[140px] pb-0 px-6 overflow-hidden">
      {/* Subtle top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[320px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(90,158,34,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-[1040px] mx-auto">
        {/* ── Copy ── */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8 }}
          className="max-w-[520px] mb-14"
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-bold tracking-[-0.03em] leading-[1.05] mb-5 font-inter"
            style={{ fontSize: "clamp(44px, 6vw, 68px)", color: "#fff" }}
          >
            Reclaim your Mac's{" "}
            <span style={{ color: "rgba(255,255,255,0.28)" }}>
              wasted space.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[17px] leading-[1.65] mb-8 font-[system-ui] font-light"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Find duplicates, clear dev junk, remove old files. Thousands of
            developers have freed up GBs in seconds.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex items-center gap-3 flex-wrap mb-6"
          >
            <a href="/pricing">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-[42px] px-[22px] flex items-center gap-2 rounded-lg text-[11px] font-bold tracking-[0.07em] font-[system-ui] border-none cursor-pointer hover:opacity-85 transition-opacity duration-150"
                style={{ background: "#fff", color: "#000" }}
              >
                <RiDownloadLine size={13} />
                DOWNLOAD FREE TRIAL
              </motion.button>
            </a>
            <a href="#features">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-[42px] px-[18px] flex items-center gap-2 rounded-lg text-[11px] tracking-[0.05em] font-[system-ui] cursor-pointer bg-transparent hover:border-white/20 hover:text-white/60 transition-all duration-150"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                learn more
                <RiArrowRightLine size={12} />
              </motion.button>
            </a>
          </motion.div>

          {/* Terminal snippet — Recordly style */}
          <div className="mb-6">
            <p
              className="text-[10px] mb-2 font-[system-ui]"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              Run after install if macOS says "App Damaged":
            </p>
            <div
              className="inline-flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <code
                className="text-[11px] font-mono"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                xattr -rd com.apple.quarantine /Applications/Nook.app
              </code>
              <button
                onClick={copy}
                className="flex cursor-pointer items-center gap-1 text-[11px] font-[system-ui] transition-colors shrink-0"
                style={{
                  color: copied
                    ? "rgba(90,158,34,0.9)"
                    : "rgba(255,255,255,0.3)",
                }}
              >
                {copied ? (
                  <RiCheckLine size={12} />
                ) : (
                  <RiFileCopyLine size={12} />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="#5a9e22"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span
                className="text-[12px] font-[system-ui] ml-1.5"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                4.9 · 20+ reviews
              </span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
            <p
              className="text-[11px] font-[system-ui] tracking-[0.05em]"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              no card required · 7 days free
            </p>
          </div>
        </motion.div>

        {/* ── Demo video — floats beneath copy, bleeds off bottom ── */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative rounded-xl overflow-hidden mx-auto"
          style={{
            maxWidth: 1100,
            border: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "none",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {/* Video */}
          <div className="aspect-video">
            <video
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/demo.mp4" type="video/mp4" />
            </video>
          </div>
        </motion.div>

        {/* Spacer before Features section */}
        <div className="h-20" />
      </div>
    </section>
  );
}
