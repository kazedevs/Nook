import { useState, useEffect } from "react";
import { CreditCard, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";

export function Settings() {
  const [licenseKey, setLicenseKey] = useState("");
  const [isLicensed, setIsLicensed] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);

  useEffect(() => {
    invoke<boolean>("check_license", { licenseKey: "" })
      .then(setIsLicensed)
      .catch(console.error);
  }, []);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setMessage("Enter a license key");
      setMessageOk(false);
      return;
    }
    setIsActivating(true);
    setMessage("");
    try {
      const ok = await invoke<boolean>("activate_license", {
        licenseKey: licenseKey.trim(),
      });
      if (ok) {
        setIsLicensed(true);
        setMessage("License activated.");
        setMessageOk(true);
        setLicenseKey("");
      } else {
        setMessage("Invalid license key.");
        setMessageOk(false);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Activation failed.");
      setMessageOk(false);
    } finally {
      setIsActivating(false);
    }
  };

  const features = [
    "Delete files and directories",
    "Unlimited scanning depth",
    "Advanced cleanup suggestions",
    "Priority support",
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="mb-5">
        <h1 className="text-lg font-medium text-secondary-900">Settings</h1>
        <p className="text-xs text-secondary-400 mt-0.5">
          License and app preferences
        </p>
      </div>

      <div className="bg-white border border-secondary-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-secondary-500">License</p>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
              isLicensed
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-secondary-200 text-secondary-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLicensed ? "bg-green-500" : "bg-secondary-300"}`}
            />
            {isLicensed ? "Pro active" : "Free version"}
          </span>
        </div>

        {isLicensed ? (
          <div className="text-xs text-secondary-500 bg-secondary-50 rounded-lg px-4 py-3">
            Premium features are unlocked. Thanks for supporting Nook.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-secondary-400">
              Scanning is free. Upgrade to unlock file deletion and advanced
              cleanup.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                placeholder="NOOK-XXXX-XXXX-XXXX-XXXX"
                className="flex-1 h-9 px-3 rounded-lg border border-secondary-200 text-sm text-secondary-800 placeholder-secondary-300 outline-none focus:border-secondary-400 bg-white"
              />
              <button
                onClick={handleActivate}
                disabled={isActivating}
                className="h-9 px-4 rounded-lg bg-secondary-900 text-white text-sm font-medium hover:bg-secondary-800 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {isActivating ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Activating…
                  </>
                ) : (
                  "Activate"
                )}
              </button>
            </div>
            {message && (
              <p
                className={`text-xs ${messageOk ? "text-green-600" : "text-red-500"}`}
              >
                {message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-secondary-100 rounded-xl p-5">
        <p className="text-xs font-medium text-secondary-500 mb-3">
          Premium features
        </p>
        <div className="divide-y divide-secondary-50">
          {features.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2.5 py-2.5 text-sm text-secondary-600"
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isLicensed ? "bg-green-100" : "border border-secondary-200"
                }`}
              >
                {isLicensed && (
                  <Check
                    className="w-2.5 h-2.5 text-green-600"
                    strokeWidth={2.5}
                  />
                )}
              </div>
              {f}
            </div>
          ))}
        </div>

        {!isLicensed && (
          <div className="mt-4 flex items-center justify-between bg-secondary-50 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-secondary-900">
                $5 one-time
              </p>
              <p className="text-[11px] text-secondary-400">
                No subscription, ever.
              </p>
            </div>
            <a
              href="https://dodo-payments.example.com/buy/nook"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-4 rounded-lg bg-secondary-900 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-secondary-800 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" strokeWidth={1.8} />
              Buy Nook Pro
            </a>
          </div>
        )}
      </div>

      <div className="bg-white border border-secondary-100 rounded-xl p-5">
        <p className="text-xs font-medium text-secondary-500 mb-3">About</p>
        <div className="divide-y divide-secondary-50 text-sm">
          {[
            { k: "Version", v: "0.1.0" },
            { k: "Platform", v: "macOS" },
            { k: "Built with", v: "Tauri + React" },
          ].map(({ k, v }) => (
            <div key={k} className="flex justify-between py-2">
              <span className="text-secondary-400">{k}</span>
              <span className="text-secondary-700">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
