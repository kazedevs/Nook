"use client";

import { useState } from "react";
import Link from "next/link";
import { RiDownloadLine, RiCloseLine, RiMenu3Line } from "react-icons/ri";
import Image from "next/image";
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-n-border bg-black/90 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-[22px] h-[22px] rounded-md border border-n-border2 bg-n-card2 flex items-center justify-center shrink-0">
            <img
              src="/nook.png"
              alt="Nook Logo"
              className="w-[22px] h-[22px] rounded-md"
            />
          </div>
          <span className="text-[13px] font-medium text-n-text tracking-tight">
            nook
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 text-[14px] text-n-muted font-[system-ui] font-light">
          <a href="#features" className="hover:text-n-text transition-colors">
            features
          </a>
          <a href="/pricing" className="hover:text-n-text transition-colors">
            pricing
          </a>
          <a href="#download" className="hover:text-n-text transition-colors">
            download
          </a>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <a href="#download">
            <button className="h-[28px] px-3 flex items-center gap-1.5 rounded border border-n-border bg-n-card text-n-text text-[14px] tracking-[0.04em] hover:bg-[#161616] hover:border-n-border2 transition-all cursor-pointer font-mono">
              <RiDownloadLine size={12} />
              GET NOOK
            </button>
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden flex items-center justify-center w-8 h-8 text-n-muted hover:text-n-text transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <RiCloseLine size={20} /> : <RiMenu3Line size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-black border-b border-n-border">
          <div className="px-6 py-4 space-y-4">
            <div className="flex flex-col space-y-3">
              <a
                href="#features"
                className="text-[14px] text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                onClick={() => setIsMenuOpen(false)}
              >
                features
              </a>
              <a
                href="#pricing"
                className="text-[14px] text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                onClick={() => setIsMenuOpen(false)}
              >
                pricing
              </a>
              <a
                href="#download"
                className="text-[14px] text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                onClick={() => setIsMenuOpen(false)}
              >
                download
              </a>
            </div>

            <div className="pt-3 border-t border-n-border">
              <a href="#download" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full h-[36px] px-3 flex items-center justify-center gap-1.5 rounded border border-n-border bg-n-card text-n-text text-[14px] tracking-[0.04em] hover:bg-[#161616] hover:border-n-border2 transition-all cursor-pointer font-mono">
                  <RiDownloadLine size={12} />
                  GET NOOK
                </button>
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
