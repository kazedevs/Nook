import { useState, useEffect } from "react";
import {
  Download,
  FolderOpen,
  Info,
  ExternalLink,
  CreditCard,
  Shield,
  RefreshCw,
  Mail,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import { SystemInfo, UpdateInfo } from "@/types";
import { useLicense } from "@/contexts/LicenseContext";

const PREFS_KEY = "nook_prefs";

interface Prefs {
  ignoreHidden: boolean;
  ignoreSystem: boolean;
  defaultDepth: number;
  theme: "dark" | "light" | "system";
  autoUpdate: boolean;
  defaultPath: string;
}

const DEFAULT_PREFS: Prefs = {
  ignoreHidden: true,
  ignoreSystem: true,
  defaultDepth: 3,
  theme: "dark",
  autoUpdate: true,
  defaultPath: "",
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`relative w-[42px] h-5 rounded-[10px] cursor-pointer transition-all duration-200 flex-shrink-0 ${
        on
          ? "border border-[#27500A] bg-[#0A1A08]"
          : "border border-[#2A2A2A] bg-[#141414]"
      }`}
    >
      <div
        className={`absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all duration-200 ${
          on ? "left-[22px] bg-[#3B6D11]" : "left-[3px] bg-[#2A2A2A]"
        }`}
      />
    </div>
  );
}

export function Settings() {
  const { isLicensed, activate } = useLicense();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState("");
  const [licenseMsgOk, setLicenseMsgOk] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [activeSection, setActiveSection] = useState<string>("license");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
    } catch {}

    Promise.all([
      invoke<SystemInfo>("get_system_info"),
      invoke<string>("get_user_home"),
    ])
      .then(([info, userHome]) => {
        setSystemInfo(info);
        setPrefs((p) => ({
          ...p,
          defaultPath: p.defaultPath || `${userHome}`,
        }));
      })
      .catch(console.error);
  }, []);

  const save = (updated: Partial<Prefs>) => {
    const next = { ...prefs, ...updated };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setLicenseMsg("enter a license key");
      setLicenseMsgOk(false);
      return;
    }
    setIsActivating(true);
    setLicenseMsg("");
    try {
      const result = await activate(licenseKey.trim());
      if (result.status === "active" || result.status === "active_offline") {
        setLicenseMsg("license activated.");
        setLicenseMsgOk(true);
        setLicenseKey("");
      } else {
        setLicenseMsg("invalid license key.");
        setLicenseMsgOk(false);
      }
    } catch (err) {
      setLicenseMsg(err instanceof Error ? err.message : "activation failed.");
      setLicenseMsgOk(false);
    } finally {
      setIsActivating(false);
    }
  };

  const setHomePath = async () => {
    try {
      const homePath = await invoke<string>("get_user_home");
      save({ defaultPath: homePath });
    } catch (err) {
      console.error("Failed to get home directory:", err);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMsg("");
    try {
      const updateInfo = await invoke<UpdateInfo>("check_for_updates");
      if (updateInfo.update_available) {
        setUpdateMsg(`update available → ${updateInfo.latest_version}`);
      } else {
        setUpdateMsg(
          `you're on the latest version (${updateInfo.current_version})`,
        );
      }
    } catch (err) {
      setUpdateMsg("failed to check for updates");
      console.error(err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const usedPct = systemInfo
    ? Math.round(
        (systemInfo.used_disk_space / systemInfo.total_disk_space) * 100,
      )
    : null;

  const SECTIONS = [
    { id: "license", label: "license", icon: Shield },
    { id: "scanning", label: "scanning", icon: FolderOpen },
    { id: "updates", label: "updates", icon: Download },
    { id: "help", label: "help", icon: Mail },
    { id: "about", label: "about", icon: Info },
  ];

  // Shared row styles
  const rowClass =
    "flex items-center justify-between py-3 border-b border-[#161616]";
  const rowLastClass = "flex items-center justify-between py-3";

  return (
    <div className="flex gap-6 max-w-[920px]">
      {/* Side nav */}
      <div className="w-40 flex-shrink-0">
        <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-2.5 font-mono">
          settings
        </p>
        <div className="flex flex-col gap-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2.5 px-[11px] py-[9px] rounded-md border-none text-xs cursor-pointer text-left font-mono ${
                activeSection === id
                  ? "bg-[#161616] text-[#E8E6E1]"
                  : "bg-transparent text-[#666]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.6} />
              {label}
            </button>
          ))}
        </div>

        {/* Disk mini widget */}
        {systemInfo && (
          <div className="mt-6 px-3.5 py-3 bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg">
            <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-2.5 font-mono">
              disk
            </p>
            <div className="bg-[#161616] rounded-sm h-1 overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-500 ${
                  usedPct! > 85 ? "bg-[#712B13]" : "bg-[#2A2A2A]"
                }`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#666] font-mono">{usedPct}% used</p>
            <p className="text-[11px] text-[#555] mt-[3px] font-mono">
              {systemInfo.os_name} {systemInfo.os_version}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* LICENSE */}
        {activeSection === "license" && (
          <>
            <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
              <div className="flex items-center justify-between mb-3.5">
                <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] font-mono">
                  license status
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-[3px] rounded-full border font-mono ${
                    isLicensed
                      ? "border-[#27500A] text-[#3B6D11]"
                      : "border-[#2A2A2A] text-[#666]"
                  }`}
                >
                  <span
                    className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${
                      isLicensed ? "bg-[#3B6D11]" : "bg-[#2A2A2A]"
                    }`}
                  />
                  {isLicensed ? "pro" : "free"}
                </span>
              </div>

              {isLicensed ? (
                <div className="px-3 py-2.5 bg-[#0A1A08] border border-[#27500A] rounded-md">
                  <p className="text-[11px] text-[#3B6D11] font-mono">
                    premium features active. thanks for supporting nook.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[11px] text-[#666] font-mono">
                    scanning is free. upgrade to unlock file deletion, unlimited
                    depth, and advanced cleanup.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="flex-1 h-8 px-2.5 rounded-md border border-[#2A2A2A] bg-[#141414] text-[#C8C4BE] text-[11px] outline-none font-mono"
                    />
                    <button
                      onClick={handleActivate}
                      disabled={isActivating}
                      className={`h-8 px-3 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] text-[#E8E6E1] text-[11px] cursor-pointer flex items-center gap-1.5 flex-shrink-0 font-mono ${
                        isActivating ? "opacity-50" : "opacity-100"
                      }`}
                    >
                      {isActivating ? (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#555] border-t-[#666] animate-spin" />
                          activating…
                        </>
                      ) : (
                        "activate"
                      )}
                    </button>
                  </div>
                  {licenseMsg && (
                    <p
                      className={`text-[11px] font-mono ${
                        licenseMsgOk ? "text-[#3B6D11]" : "text-[#712B13]"
                      }`}
                    >
                      {licenseMsg}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isLicensed && (
              <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5 mt-2.5">
                <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-3 font-mono">
                  nook pro — $5 one-time
                </p>
                {[
                  "delete files and directories",
                  "unlimited scanning depth",
                  "advanced cleanup suggestions",
                  "priority support",
                ].map((f, i, arr) => (
                  <div
                    key={f}
                    className={`flex items-center justify-between gap-2.5 py-3 ${
                      i < arr.length - 1 ? "border-b border-[#161616]" : ""
                    }`}
                  >
                    <span className="text-[11px] text-[#777] font-mono">
                      {f}
                    </span>
                    <div className="w-3.5 h-3.5 rounded-full border border-[#2A2A2A] flex-shrink-0" />
                  </div>
                ))}
                <div className="mt-3.5">
                  <a
                    href="https://nook-landing.vercel.app/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 h-8 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] text-[#E8E6E1] text-[11px] no-underline font-mono"
                  >
                    <CreditCard className="w-3 h-3" strokeWidth={1.6} />
                    buy nook pro
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {/* SCANNING */}
        {activeSection === "scanning" && (
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
            <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-3 font-mono">
              scanning preferences
            </p>

            <div className={rowClass}>
              <div>
                <p className="text-xs text-[#C8C4BE] mb-0.5 font-mono">
                  default scan location
                </p>
                <p className="text-[10px] text-[#666] font-mono">
                  {prefs.defaultPath || "not set"}
                </p>
              </div>
              <button
                onClick={setHomePath}
                className="h-[26px] px-2.5 rounded-md border border-[#2A2A2A] bg-transparent text-[#777] text-[10px] cursor-pointer font-mono"
              >
                set home
              </button>
            </div>

            <div className={rowClass}>
              <div>
                <p className="text-xs text-[#C8C4BE] mb-0.5 font-mono">
                  default scan depth
                </p>
                <p className="text-[10px] text-[#666] font-mono">
                  current: {prefs.defaultDepth}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, 8].map((d) => (
                  <button
                    key={d}
                    onClick={() => save({ defaultDepth: d })}
                    className={`w-[26px] h-[26px] rounded-md text-[11px] cursor-pointer font-mono ${
                      prefs.defaultDepth === d
                        ? "border border-[#3B6D11] bg-[#0A1A08] text-[#3B6D11]"
                        : "border border-[#2A2A2A] bg-[#141414] text-[#777]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className={rowClass}>
              <p className="text-xs text-[#C8C4BE] font-mono">
                ignore hidden files
              </p>
              <Toggle
                on={prefs.ignoreHidden}
                onToggle={() => save({ ignoreHidden: !prefs.ignoreHidden })}
              />
            </div>

            <div className={rowLastClass}>
              <p className="text-xs text-[#C8C4BE] font-mono">
                ignore system folders
              </p>
              <Toggle
                on={prefs.ignoreSystem}
                onToggle={() => save({ ignoreSystem: !prefs.ignoreSystem })}
              />
            </div>
          </div>
        )}

        {/* UPDATES */}
        {activeSection === "updates" && (
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
            <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-3 font-mono">
              updates
            </p>

            <div className={rowClass}>
              <p className="text-xs text-[#C8C4BE] font-mono">
                auto-check for updates
              </p>
              <Toggle
                on={prefs.autoUpdate}
                onToggle={() => save({ autoUpdate: !prefs.autoUpdate })}
              />
            </div>

            <div className={rowLastClass}>
              <div>
                <p className="text-xs text-[#C8C4BE] mb-0.5 font-mono">
                  installed version
                </p>
                <p className="text-[10px] text-[#666] font-mono">0.1.0</p>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className={`h-7 px-3 rounded-md border border-[#2A2A2A] bg-transparent text-[#666] text-[10px] cursor-pointer flex items-center gap-[5px] font-mono ${
                  checkingUpdate ? "opacity-50" : "opacity-100"
                }`}
              >
                <RefreshCw
                  className={`w-[11px] h-[11px] ${checkingUpdate ? "animate-spin" : ""}`}
                  strokeWidth={1.6}
                />
                {checkingUpdate ? "checking…" : "check now"}
              </button>
            </div>

            {updateMsg && (
              <p className="text-[10px] text-[#3B6D11] mt-2.5 font-mono">
                {updateMsg}
              </p>
            )}
          </div>
        )}

        {/* HELP */}
        {activeSection === "help" && (
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
            <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-3 font-mono">
              get help
            </p>

            <div className={rowClass}>
              <div>
                <p className="text-xs text-[#C8C4BE] mb-0.5 font-mono">
                  support
                </p>
                <p className="text-[10px] text-[#666] font-mono">
                  get help on X
                </p>
              </div>
              <a
                href="https://x.com/fiynraj"
                className="h-7 px-3 rounded-md border border-[#2A2A2A] bg-transparent text-[#777] text-[10px] cursor-pointer flex items-center gap-[5px] no-underline font-mono"
              >
                <Mail className="w-[11px] h-[11px]" strokeWidth={1.6} />X
              </a>
            </div>

            <div className={rowLastClass}>
              <div>
                <p className="text-xs text-[#C8C4BE] mb-0.5 font-mono">
                  social media
                </p>
                <p className="text-[10px] text-[#666] font-mono">
                  follow on X (Twitter)
                </p>
              </div>
              <a
                href="https://x.com/fiynraj"
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-3 rounded-md border border-[#2A2A2A] bg-transparent text-[#777] text-[10px] cursor-pointer flex items-center gap-[5px] no-underline font-mono"
              >
                <ExternalLink className="w-[11px] h-[11px]" strokeWidth={1.6} />
                x.com
              </a>
            </div>
          </div>
        )}

        {/* ABOUT */}
        {activeSection === "about" && (
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
            <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] mb-3 font-mono">
              about nook
            </p>

            {[
              { k: "version", v: "0.1.0" },
              {
                k: "platform",
                v: systemInfo
                  ? `${systemInfo.os_name} ${systemInfo.os_version}`
                  : "macOS",
              },
              { k: "developer", v: "@fiynraj" },
            ].map(({ k, v }, i, arr) => (
              <div
                key={k}
                className={`flex items-center justify-between py-3 ${
                  i < arr.length - 1 ? "border-b border-[#161616]" : ""
                }`}
              >
                <span className="text-[11px] text-[#666] font-mono">{k}</span>
                <span className="text-[11px] text-[#666] font-mono">{v}</span>
              </div>
            ))}

            <div className="mt-3.5 flex gap-2">
              {[
                { href: "https://usenook.vercel.app", label: "usenook.vercel.app" },
                { href: "https://x.com/fiynraj", label: "@fiynraj" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-7 flex items-center justify-center gap-[5px] rounded-md border border-[#2A2A2A] bg-transparent text-[#777] text-[10px] no-underline font-mono"
                >
                  <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.6} />
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
