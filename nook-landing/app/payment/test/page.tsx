"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RiArrowLeftLine,
  RiBankCardLine,
  RiCheckLine,
  RiLoader4Line,
} from "react-icons/ri";

export default function TestPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const sessionId = searchParams.get("session_id");
  const name = searchParams.get("name");
  const email = searchParams.get("email");
  const model = searchParams.get("model");

  useEffect(() => {
    if (!sessionId || !name || !email || !model) {
      router.push("/pricing");
    }
  }, [sessionId, name, email, model, router]);

  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Trigger webhook to create user and license
    try {
      const response = await fetch("/api/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment.completed",
          data: {
            session_id: sessionId,
            name: decodeURIComponent(name || ""),
            email: decodeURIComponent(email || ""),
            model: model,
            amount: 500,
            currency: "USD",
          },
        }),
      });

      if (response.ok) {
        setPaymentComplete(true);
        // Redirect to success page after a short delay
        setTimeout(() => {
          router.push(`/payment/success?session_id=${sessionId}`);
        }, 1500);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setIsProcessing(false);
    }
  };

  if (!sessionId || !name || !email || !model) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-n-muted">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center text-n-muted hover:text-n-text mb-8 transition-colors text-sm font-mono tracking-[0.04em]"
          >
            <RiArrowLeftLine className="w-4 h-4 mr-2" />
            BACK TO PRICING
          </Link>

          <div className="w-16 h-16 rounded-xl border border-n-border bg-n-card flex items-center justify-center mx-auto mb-6">
            <RiCreditCardLine className="w-8 h-8 text-n-text" />
          </div>

          <h1 className="text-2xl font-bold text-n-text mb-2 tracking-tight">
            Test Payment
          </h1>
          <p className="text-lg text-n-muted font-light mb-8">
            Complete your purchase for Nook Pro
          </p>

          <div className="border border-n-border rounded-xl p-6 mb-8 bg-n-card text-left">
            <h2 className="text-lg font-medium text-n-text mb-4">
              Order Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-n-muted">Product</span>
                <span className="text-sm text-n-text">Nook Pro - Lifetime</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-n-muted">Email</span>
                <span className="text-sm text-n-muted">
                  {decodeURIComponent(email || "")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-n-muted">Mac Model</span>
                <span className="text-sm text-n-muted">
                  {model === "apple-silicon" ? "Apple Silicon" : "Intel"}
                </span>
              </div>

              <div className="border-t border-n-border pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-n-text">Total</span>
                  <span className="text-lg font-bold text-n-text">$5.00</span>
                </div>
              </div>
            </div>
          </div>

          {paymentComplete ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl border border-n-green-brd bg-n-green-bg flex items-center justify-center mx-auto mb-6">
                <RiCheckLine className="w-8 h-8 text-n-green-text" />
              </div>
              <h2 className="text-xl font-medium text-n-text mb-2">
                Payment Successful!
              </h2>
              <p className="text-sm text-n-muted">
                Redirecting to your license...
              </p>
            </div>
          ) : (
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-n-text text-black px-6 py-3 rounded-lg font-medium hover:bg-n-dim transition-colors flex items-center justify-center gap-2 font-mono tracking-[0.04em] text-sm disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RiLoader4Line className="w-4 h-4 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                "COMPLETE PAYMENT - $5"
              )}
            </button>
          )}

          <p className="text-xs text-n-dim text-center mt-4">
            This is a test payment flow for development purposes
          </p>
        </div>
      </div>
    </div>
  );
}
