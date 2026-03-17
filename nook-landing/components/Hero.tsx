"use client";

import { RiDownloadLine, RiArrowRightLine } from "react-icons/ri";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[180px] pb-[120px] bg-black">
      <div className="max-w-[1040px] mx-auto px-6">
        {/* Headline */}
        <h1
          className="font-bold tracking-[-0.03em] leading-[1.05] mb-6 font-inter"
          style={{ fontSize: "clamp(44px, 6vw, 70px)", color: "#fff" }}
        >
          Reclaim your Mac's
          <br />
          <span style={{ color: "rgba(255,255,255,0.28)" }}>wasted space.</span>
        </h1>

        {/* Sub */}
        <p
          className="text-[17px] leading-[1.65] max-w-[400px] mb-10 font-[system-ui] font-light"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Find duplicates, clear dev junk, remove old files. Thousands of
          developers have freed up GBs in seconds.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <a href="#download">
            <button
              className="h-[42px] px-[22px] flex items-center gap-2 rounded-lg text-[11px] font-bold tracking-[0.07em] font-[system-ui] border-none cursor-pointer transition-opacity duration-150 hover:opacity-85"
              style={{ background: "#fff", color: "#000" }}
            >
              <RiDownloadLine size={13} />
              DOWNLOAD FREE TRIAL
            </button>
          </a>
          <a href="#features">
            <button
              className="h-[42px] px-[18px] flex items-center gap-2 rounded-lg text-[11px] tracking-[0.05em] font-[system-ui] cursor-pointer transition-colors duration-150 hover:border-white/20 hover:text-white/60 bg-transparent"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              learn more
              <RiArrowRightLine size={12} />
            </button>
          </a>
        </div>

        {/* Social proof + fine print — same line */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="#5a9e22"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span
              className="text-[12px] font-[system-ui] ml-1"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              4.9 · 20+ reviews
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
          <p
            className="text-[11px] font-[system-ui] tracking-[0.06em]"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            no card required · 7 days free
          </p>
        </div>
      </div>
    </section>
  );
}
