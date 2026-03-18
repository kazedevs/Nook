"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiDownloadLine,
  RiKeyLine,
  RiRefreshLine,
} from "react-icons/ri";
import { Suspense } from "react";

function PaymentSuccessPageContent() {
  const searchParams = useSearchParams();
  const [licenseData, setLicenseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sessionIdParam = searchParams.get("session_id");
    const userId = searchParams.get("user_id");
    const licenseKey = searchParams.get("license_key");
    const email = searchParams.get("email");

    if (sessionIdParam) {
      setSessionId(sessionIdParam);
    }

    if (userId && licenseKey && email) {
      // Direct success with license data (for testing)
      setLicenseData({
        userId,
        licenseKey,
        email,
      });
      setIsLoading(false);

      // Set access cookie for paid users
      document.cookie = "nook_access=granted; path=/; max-age=31536000"; // 1 year
    } else if (sessionIdParam) {
      // Waiting for webhook to process payment
      pollForLicense(sessionIdParam);
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  const pollForLicense = async (sessionId: string) => {
    const maxAttempts = 10;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/license/check?session_id=${sessionId}`,
        );
        const data = await response.json();

        if (data.success && data.license) {
          setLicenseData(data.license);
          setIsLoading(false);

          // Set access cookie for paid users
          document.cookie = "nook_access=granted; path=/; max-age=31536000"; // 1 year
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error polling for license:", error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          setIsLoading(false);
        }
      }
    };

    poll();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl border border-n-border bg-n-card flex items-center justify-center mx-auto mb-6">
            <RiRefreshLine className="w-8 h-8 text-n-text animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-n-text mb-2 tracking-tight">
            Processing Payment...
          </h1>
          <p className="text-lg text-n-muted font-light">
            Please wait while we confirm your payment and generate your license.
          </p>
        </div>
      </div>
    );
  }

  if (!licenseData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-xl border border-n-amber-brd bg-n-amber-bg flex items-center justify-center mx-auto mb-6">
            <RiRefreshLine className="w-8 h-8 text-n-amber-text" />
          </div>
          <h1 className="text-2xl font-bold text-n-text mb-2 tracking-tight">
            Processing Your License
          </h1>
          <p className="text-lg text-n-muted font-light mb-8">
            We're still setting up your license. This usually takes a few
            seconds.
          </p>
          {sessionId && (
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-n-text text-black px-6 py-3 rounded-lg font-medium hover:bg-n-dim transition-colors flex items-center justify-center gap-2 font-mono tracking-[0.04em] text-sm mb-4"
            >
              <RiRefreshLine className="w-4 h-4" />
              CHECK AGAIN
            </button>
          )}
          <Link
            href="/pricing"
            className="block w-full border border-n-border text-n-text px-6 py-3 rounded-lg font-medium hover:bg-n-card hover:border-n-border2 transition-colors font-mono tracking-[0.04em] text-sm"
          >
            BACK TO PRICING
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-n-muted hover:text-n-text mb-8 transition-colors text-sm font-mono tracking-[0.04em]"
          >
            <RiArrowLeftLine className="w-4 h-4 mr-2" />
            BACK TO HOME
          </Link>

          <div className="w-16 h-16 rounded-xl border border-n-green-brd bg-n-green-bg flex items-center justify-center mx-auto mb-6">
            <RiCheckLine className="w-8 h-8 text-n-green-text" />
          </div>

          <h1 className="text-3xl font-bold text-n-text mb-2 tracking-tight">
            Payment Successful!
          </h1>
          <p className="text-lg text-n-muted font-light mb-8">
            Thank you for purchasing Nook Pro
          </p>

          <div className="border border-n-border rounded-xl p-6 mb-8 bg-n-card text-left">
            <h2 className="text-lg font-medium text-n-text mb-4 flex items-center gap-2">
              <RiKeyLine className="w-5 h-5" />
              Your License Details
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-n-dim mb-1">License Key</p>
                <code className="text-sm text-n-green-text font-mono bg-n-bg px-3 py-2 rounded block break-all">
                  {licenseData.licenseKey}
                </code>
              </div>

              <div>
                <p className="text-xs text-n-dim mb-1">Email</p>
                <p className="text-sm text-n-muted">{licenseData.email}</p>
              </div>

              <div>
                <p className="text-xs text-n-dim mb-1">Plan</p>
                <p className="text-sm text-n-text font-medium">
                  Nook Pro - Lifetime
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/download"
              className="w-full bg-n-text text-black px-6 py-3 rounded-lg font-medium hover:bg-n-dim transition-colors flex items-center justify-center gap-2 font-mono tracking-[0.04em] text-sm"
            >
              <RiDownloadLine className="w-4 h-4" />
              DOWNLOAD NOOK
            </Link>
            <Link
              href="/return"
              className="w-full border border-n-border text-n-text px-6 py-3 rounded-lg font-medium hover:bg-n-card hover:border-n-border2 transition-colors font-mono tracking-[0.04em] text-sm flex items-center justify-center"
            >
              VIEW RETURN POLICY
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessPageContent />
    </Suspense>
  );
}
