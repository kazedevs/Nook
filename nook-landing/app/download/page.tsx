"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RiDownloadLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiFileCopyLine,
} from "react-icons/ri";

export default function DownloadPage() {
  const searchParams = useSearchParams();
  const [userData, setUserData] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
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

  useEffect(() => {
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const model = searchParams.get("model");

    if (name && email && model) {
      registerFreeTrial({ name, email, model });
    }
  }, [searchParams]);

  const registerFreeTrial = async (data: any) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, plan: "free" }),
      });

      const result = await response.json();
      if (result.success) {
        setUserData(result.user);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center text-n-muted hover:text-n-text mb-8 transition-colors text-sm font-mono tracking-[0.04em]"
          >
            <RiArrowLeftLine className="w-4 h-4 mr-2" />
            BACK
          </Link>

          <div className="w-12 h-12 rounded-xl border border-n-border bg-n-card flex items-center justify-center mx-auto mb-6">
            <img src="/nook.png" alt="Nook Logo" className="w-8 h-8 rounded" />
          </div>

          <h1 className="text-2xl font-medium text-n-text mb-2 tracking-tight">
            Download Nook
          </h1>
          <p className="text-sm text-n-muted font-light">Get Nook for macOS</p>

          {isRegistered && userData && (
            <div className="mt-6 p-3 bg-n-green-bg border border-n-green-brd rounded-lg">
              <p className="text-n-green-text text-sm flex items-center justify-center gap-2">
                <RiCheckLine className="w-4 h-4" />
                Free trial activated for {userData.name}
              </p>
            </div>
          )}
        </div>

        <div className="border border-n-border rounded-xl p-6 mb-8 bg-n-card">
          <div className="text-center">
            <h2 className="text-lg mb-10 font-medium text-n-text">
              Nook for macOS
            </h2>

            <button className="w-full bg-n-text text-black px-6 py-3 rounded-lg font-medium cursor-pointer hover:bg-n-dim transition-colors flex items-center justify-center gap-2 font-mono tracking-[0.04em] text-sm">
              <RiDownloadLine className="w-4 h-4" />
              DOWNLOAD NOOK.DMG
            </button>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <div className="border border-n-border rounded-lg p-4 bg-n-card">
            <h3 className="text-sm font-medium text-n-text mb-3">
              Requirements
            </h3>
            <ul className="space-y-2 text-xs text-n-muted">
              <li>• macOS 10.15 or later</li>
              <li>• 4GB RAM minimum</li>
              <li>• Apple Silicon or Intel</li>
            </ul>
          </div>

          <div className="border border-n-border rounded-lg p-4 bg-n-card">
            <h3 className="text-sm font-medium text-n-text mb-3">
              Installation
            </h3>
            <ol className="space-y-2 text-xs text-n-muted">
              <li>1. Download Nook.dmg</li>
              <li>2. Double-click to mount</li>
              <li>3. Drag to Applications</li>
              <li>4. Launch and grant permissions</li>
            </ol>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center text-n-muted hover:text-n-text transition-colors text-xs font-mono tracking-[0.04em]"
          >
            Upgrade to Pro - $5
          </Link>
        </div>
      </div>
    </div>
  );
}
