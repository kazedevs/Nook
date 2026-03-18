"use client";

import {
  RiGridLine,
  RiDeleteBinLine,
  RiSpeedLine,
  RiShieldLine,
  RiSearchLine,
  RiTimeLine,
} from "react-icons/ri";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: RiGridLine,
    title: "Visual Disk TreeMap",
    desc: "Interactive visual map shows exactly what's eating your space. Bigger blocks = bigger files. Click to drill down.",
    highlight: "Save hours of manual searching",
  },
  {
    icon: RiSearchLine,
    title: "Smart Duplicate Finder",
    desc: "Advanced algorithms find identical files across your entire drive. Keeps the best version, safely removes the rest.",
    highlight: "Recover up to 5GB of duplicates",
  },
  {
    icon: RiDeleteBinLine,
    title: "Dev Junk Cleaner",
    desc: "Clears node_modules, Xcode caches, pnpm stores, and other dev artifacts that quietly accumulate over time.",
    highlight: "Free up 10GB+ of dev clutter",
  },
  {
    icon: RiTimeLine,
    title: "Old Files Hunter",
    desc: "Identifies files you haven't touched in 6+ months — large, forgotten downloads taking up precious space.",
    highlight: "Find forgotten space hogs",
  },
  {
    icon: RiSpeedLine,
    title: "Lightning Fast Engine",
    desc: "Parallel processing scans your entire drive in under 15 seconds. Minimal CPU usage, no waiting around.",
    highlight: "15-second average scan time",
  },
  {
    icon: RiShieldLine,
    title: "Privacy-First Design",
    desc: "Everything runs locally on your Mac. No uploads, no tracking, no data collection. Ever.",
    highlight: "100% private and secure",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-28 px-6 bg-black"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-[1040px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p
            className="text-[10px] tracking-[0.18em] uppercase font-[system-ui] mb-4"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Features
          </p>
          <h2
            className="font-bold tracking-[-0.025em] leading-[1.08] font-inter"
            style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "#fff" }}
          >
            Everything you need to
            <br />
            <span style={{ color: "rgba(255,255,255,0.28)" }}>
              take back your storage.
            </span>
          </h2>
        </motion.div>

        {/* Grid — gap-px connected surface */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {FEATURES.map(({ icon: Icon, title, desc, highlight }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col p-7"
              style={{ background: "#000" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-6 shrink-0"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                <Icon size={15} />
              </div>
              <h3
                className="text-[14px] font-semibold mb-2 font-inter"
                style={{ color: "#fff" }}
              >
                {title}
              </h3>
              <p
                className="text-[13px] font-[system-ui] font-light leading-relaxed grow mb-5"
                style={{ color: "rgba(255,255,255,0.38)" }}
              >
                {desc}
              </p>
              <div
                className="inline-flex items-center gap-1.5 self-start px-2 py-1 rounded text-[11px] font-[system-ui] mt-auto"
                style={{
                  background: "rgba(90,158,34,0.08)",
                  border: "1px solid rgba(90,158,34,0.2)",
                  color: "rgba(120,190,50,0.8)",
                }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "rgba(120,190,50,0.7)" }}
                />
                {highlight}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
