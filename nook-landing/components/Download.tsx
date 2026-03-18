"use client";

import { useState } from "react";
import { RiDownloadLine, RiCheckLine } from "react-icons/ri";
import { IoLogoApple } from "react-icons/io5";
import { Lock, Zap, Shield, Star } from "lucide-react";
import { DOWNLOAD_URLS } from "@/lib/constants";
import { motion } from "framer-motion";

const REQUIREMENTS = [
  "macOS 12 Monterey or later",
  "Apple Silicon (M1/M2/M3) or Intel",
  "~8 MB disk space for installation",
  "4 GB RAM minimum recommended",
];

const TRUST_INDICATORS = [
  { icon: Lock, text: "100% Private - No data collection" },
  { icon: Zap, text: "Instant download - No waiting" },
  { icon: Shield, text: "Notarized by Apple" },
  { icon: Star, text: "30-day money-back guarantee" },
];

function NookLogo() {
  return (
    <img src="/nook.png" alt="Nook Logo" className="w-12 h-12 rounded-lg" />
  );
}

export function Download() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    const command = "xattr -rd com.apple.quarantine /Applications/Nook.app";
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <section id="download" className="py-16 px-6 bg-black">
      <div className="max-w-2xl mx-auto">
        <motion.p
          initial={{ opacity: 0, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-[9px] tracking-[0.14em] text-n-dim uppercase text-center mb-5"
        >
          download
        </motion.p>

        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-n-card border border-n-border rounded-xl p-8 max-w-sm mx-auto text-center relative overflow-hidden"
        >
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-n-green-text/10 rounded-full -mr-16 -mt-16" />

          <div className="relative">
            <div className="w-14 h-14 rounded-[14px] border border-n-border bg-n-card2 flex items-center justify-center mx-auto mb-5 text-n-muted">
              <NookLogo />
            </div>

            <h2 className="text-xl font-bold mb-2 font-inter text-n-text">
              Get Nook Now
            </h2>
            <p className="text-sm text-n-muted mb-6 leading-relaxed font-[system-ui] font-light">
              Start your free 7-day trial. No credit card required.
            </p>

            {/* Trust indicators */}
            <div className="grid grid-cols-2 gap-2 mb-6 text-left">
              {TRUST_INDICATORS.slice(0, 4).map((indicator, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs text-n-muted font-[system-ui] font-light"
                >
                  <indicator.icon
                    size={12}
                    className="text-n-green-text shrink-0"
                  />
                  <span>{indicator.text}</span>
                </div>
              ))}
            </div>

            <div className="bg-n-card2 border border-n-border rounded-lg p-4 mb-6 text-left">
              <p className="text-[9px] tracking-widest text-n-dim uppercase mb-3 font-[system-ui]">
                System Requirements
              </p>
              {REQUIREMENTS.map((req, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1 text-xs text-n-muted font-[system-ui] font-light"
                >
                  <RiCheckLine
                    size={10}
                    className="text-n-green-text shrink-0"
                  />
                  {req}
                </div>
              ))}
            </div>

            <a
              href={DOWNLOAD_URLS["apple-silicon"]}
              download
              className="block mb-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full h-12 rounded-lg bg-n-text text-n-bg text-sm font-bold tracking-[0.06em] cursor-pointer border-0 font-[system-ui] flex items-center justify-center gap-2 hover:bg-n-green-text transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <IoLogoApple size={18} />
                DOWNLOAD FOR MACOS - FREE
              </motion.button>
            </a>

            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xs text-n-dim font-[system-ui] font-light">
                Apple Silicon (M1/M2/M3) only
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-n-dim font-[system-ui] font-light">
              <span>Version 0.1.1</span>
              <span>•</span>
              <span>~8 MB</span>
              <span>•</span>
              <span>Notarized </span>
            </div>
          </div>
        </motion.div>

        {/* Additional trust section */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-n-muted font-[system-ui] font-light mb-4">
            Join 100+ Mac users who've already reclaimed their disk space
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-n-dim font-[system-ui] font-light">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="#3B6D11"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span>4.9/5 • 20+ reviews</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
