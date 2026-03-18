import Link from "next/link";
import { RiTwitterXLine } from "react-icons/ri";
import { HiHeart } from "react-icons/hi";

export function Footer() {
  return (
    <footer className="border-t border-n-border bg-black">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/nook.png"
                alt="Nook Logo"
                className="w-6 h-6 rounded"
              />
              <span className="text-sm font-medium text-n-text">nook</span>
            </div>
            <p className="text-xs text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              The smartest way to clean your Mac. Reclaim wasted space in
              seconds.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://twitter.com/fiynraj"
                className="text-n-muted hover:text-n-text transition-colors"
              >
                <RiTwitterXLine size={16} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-medium text-n-text mb-4 font-inter">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-xs text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#download"
                  className="text-xs text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                >
                  Download
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-xs text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-medium text-n-text mb-4 font-inter">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/about"
                  className="text-xs text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                >
                  About
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-xs text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-xs text-n-muted hover:text-n-text transition-colors font-[system-ui] font-light"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-n-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-n-dim font-[system-ui] font-light">
            <span>© {new Date().getFullYear()} nook</span>
            <span>
              Made with <HiHeart className="text-red-500 inline" />
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-n-dim font-[system-ui] font-light">
            <span>Notarized by Apple</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
