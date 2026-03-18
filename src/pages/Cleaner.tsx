import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { formatBytes } from "@/utils/format";
import {
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface DuplicateFile {
  path: string;
  name: string;
  modified?: string;
}
interface DuplicateGroup {
  hash: string;
  size: number;
  total_wasted: number;
  files: DuplicateFile[];
}
interface OldLargeFile {
  path: string;
  name: string;
  size: number;
  last_accessed_days: number;
  category: string;
  modified?: string;
}
interface DevJunkItem {
  path: string;
  name: string;
  kind: string;
  size: number;
  safe_to_delete: boolean;
}
interface DevJunkReport {
  items: DevJunkItem[];
  total_size: number;
  by_kind: Record<string, number>;
}
interface AnalysisReport {
  duplicate_groups: DuplicateGroup[];
  total_duplicate_waste: number;
  old_large_files: OldLargeFile[];
  total_old_file_size: number;
  dev_junk: DevJunkReport;
  total_reclaimable: number;
}

const DEV_KIND_LABEL: Record<string, string> = {
  node_modules: "node_modules",
  package_manager: "npm / pnpm / yarn cache",
  xcode: "xcode derived data",
  python: "python cache",
  rust: "rust build cache",
  gradle: "gradle build cache",
  system_cache: "system caches",
  other: "other",
};

function DeleteButton({
  onDelete,
  size,
}: {
  onDelete: () => void;
  size?: number;
}) {
  const [confirm, setConfirm] = useState(false);
  if (confirm)
    return (
      <div className="flex gap-1">
        <button
          onClick={() => setConfirm(false)}
          className="h-[22px] px-2 rounded border border-[#2A2A2A] bg-transparent text-[#555] text-[10px] cursor-pointer font-mono"
        >
          cancel
        </button>
        <button
          onClick={() => {
            setConfirm(false);
            onDelete();
          }}
          className="h-[22px] px-2 rounded border border-[#2A1800] bg-[#0D0900] text-[#633806] text-[10px] cursor-pointer font-mono"
        >
          confirm
        </button>
      </div>
    );
  return (
    <button
      onClick={() => setConfirm(true)}
      className="h-[22px] px-2 rounded border border-[#1E1E1E] bg-transparent text-[#444] text-[10px] cursor-pointer flex items-center gap-1 font-mono"
    >
      <Trash2 className="w-[11px] h-[11px]" strokeWidth={1.6} />
      {size ? formatBytes(size) : "delete"}
    </button>
  );
}

interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
  files_processed: number;
}

export function Cleaner() {
  const [homePath, setHomePath] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [freed, setFreed] = useState(0);
  const [expandedDups, setExpandedDups] = useState<Set<string>>(new Set());
  const [deletedPaths, setDeletedPaths] = useState<Set<string>>(new Set());
  const [analysisProgress, setAnalysisProgress] =
    useState<AnalysisProgress | null>(null);

  useEffect(() => {
    invoke<string>("get_user_home").then(setHomePath).catch(console.error);

    // Set up progress listener
    const unlisten = listen<AnalysisProgress>("analysis_progress", (event) => {
      setAnalysisProgress(event.payload);
    });

    return () => {
      unlisten.then((unlistenFn) => unlistenFn?.()).catch(console.error);
    };
  }, []);

  const runAnalysis = async () => {
    if (!homePath) return;
    setRunning(true);
    setError("");
    setReport(null);
    setFreed(0);
    setDeletedPaths(new Set());
    setAnalysisProgress(null);

    try {
      const result = await invoke<AnalysisReport>("run_analysis", {
        request: {
          root: homePath,
          min_duplicate_size_mb: 1,
          old_file_days: 180,
          old_file_min_size_mb: 50,
        },
      });
      setReport(result);
      setAnalysisProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setAnalysisProgress(null);
    } finally {
      setRunning(false);
    }
  };

  const deletePaths = async (paths: string[]) => {
    try {
      const resp = await invoke<{ freed_bytes: number; deleted_count: number }>(
        "delete_paths",
        { request: { paths } },
      );
      setFreed((f) => f + resp.freed_bytes);
      setDeletedPaths((prev) => {
        const next = new Set(prev);
        paths.forEach((p) => next.add(p));
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const reveal = (path: string) =>
    invoke("reveal_in_finder", { path }).catch(console.error);

  const toggleDup = (hash: string) =>
    setExpandedDups((prev) => {
      const next = new Set(prev);
      next.has(hash) ? next.delete(hash) : next.add(hash);
      return next;
    });

  return (
    <div className="flex flex-col gap-2.5 max-w-xl mx-auto p-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-medium text-[#E8E6E1] font-mono">
            cleaner
          </p>
          <p className="text-[10px] text-[#444] mt-0.5 font-mono">
            {report ? `scanning ${homePath}` : "find wasted space"}
          </p>
        </div>
        {report && freed > 0 && (
          <span className="text-[11px] text-[#3B6D11] font-mono">
            +{formatBytes(freed)} freed
          </span>
        )}
      </div>

      {/* Run button / summary */}
      {!report && !running && (
        <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg flex flex-col items-center px-5 py-8 gap-3">
          <p className="text-[13px] text-[#555] font-mono">
            ready to scan {homePath || "home directory"}
          </p>
          <p className="text-[11px] text-[#333] text-center leading-[1.7] max-w-[360px] font-mono">
            finds duplicate files, old large files, and developer junk
          </p>
          <button
            onClick={runAnalysis}
            className="h-[34px] px-5 rounded border border-[#2A2A2A] bg-[#1A1A1A] text-[#E8E6E1] text-xs cursor-pointer font-mono"
          >
            run analysis
          </button>
        </div>
      )}

      {running && (
        <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
          <div className="flex items-center gap-2.5 justify-center py-5">
            <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#222] border-t-[#555] animate-spin flex-shrink-0" />
            <p className="text-xs text-[#555] font-mono">
              {analysisProgress
                ? analysisProgress.message
                : `analysing ${homePath}…`}
            </p>
          </div>
          {analysisProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#444]">{analysisProgress.stage}</span>
                <span className="text-[#555]">
                  {analysisProgress.progress}%
                </span>
              </div>
              <div className="w-full bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#3B6D11] transition-all duration-300 ease-out"
                  style={{ width: `${analysisProgress.progress}%` }}
                />
              </div>
              {analysisProgress.files_processed > 0 && (
                <p className="text-[9px] text-[#333] text-center font-mono">
                  {analysisProgress.files_processed.toLocaleString()} files
                  processed
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-[#0D0900] border border-[#2A1800] rounded-lg px-3.5 py-2.5 flex gap-2 items-center">
          <AlertCircle
            className="w-[13px] h-[13px] text-[#633806] flex-shrink-0"
            strokeWidth={1.6}
          />
          <p className="text-[11px] text-[#633806] font-mono">{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Summary banner */}
          <div className="bg-[#0A1A08] border border-[#27500A] rounded-lg px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#3B6D11] font-mono">
                nook found {formatBytes(report.total_reclaimable)} you can clean
              </p>
              <p className="text-[10px] text-[#27500A] mt-[3px] font-mono">
                {report.duplicate_groups.length} duplicate groups ·{" "}
                {report.old_large_files.length} old large files ·{" "}
                {report.dev_junk.items.length} dev junk items
              </p>
            </div>
            <button
              onClick={runAnalysis}
              className="h-7 px-3 rounded border border-[#27500A] bg-transparent text-[#3B6D11] text-[10px] cursor-pointer font-mono"
            >
              rescan
            </button>
          </div>

          {/* ── Duplicates ── */}
          {report.duplicate_groups.length > 0 && (
            <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] font-mono">
                  duplicate files
                </p>
                <span className="text-[10px] text-[#3B6D11] font-mono">
                  {formatBytes(report.total_duplicate_waste)} wasted
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {report.duplicate_groups.slice(0, 20).map((group) => {
                  const expanded = expandedDups.has(group.hash);
                  const allDeleted = group.files.every((f) =>
                    deletedPaths.has(f.path),
                  );
                  if (allDeleted) return null;
                  return (
                    <div
                      key={group.hash}
                      className="bg-[#141414] border border-[#1E1E1E] rounded-md overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer"
                        onClick={() => toggleDup(group.hash)}
                      >
                        {expanded ? (
                          <ChevronDown className="w-[11px] h-[11px] text-[#444] flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-[11px] h-[11px] text-[#444] flex-shrink-0" />
                        )}
                        <span className="flex-1 text-xs text-[#888] overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                          {group.files[0].name}
                        </span>
                        <span className="text-[10px] text-[#444] flex-shrink-0 font-mono">
                          {group.files.length}x · {formatBytes(group.size)} each
                        </span>
                        <DeleteButton
                          size={group.total_wasted}
                          onDelete={() => {
                            const toDelete = group.files
                              .slice(1)
                              .map((f) => f.path);
                            deletePaths(toDelete);
                          }}
                        />
                      </div>

                      {expanded && (
                        <div className="border-t border-[#1E1E1E]">
                          {group.files.map((file, i) => (
                            <div
                              key={file.path}
                              className={`flex items-center gap-2 py-1.5 px-2.5 pl-7 ${
                                i < group.files.length - 1
                                  ? "border-b border-[#1A1A1A]"
                                  : ""
                              } ${deletedPaths.has(file.path) ? "opacity-30" : "opacity-100"}`}
                            >
                              {i === 0 ? (
                                <span className="text-[9px] text-[#3B6D11] w-8 flex-shrink-0 font-mono">
                                  keep
                                </span>
                              ) : (
                                <span className="text-[9px] text-[#444] w-8 flex-shrink-0 font-mono">
                                  dupe
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-[#666] overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                                  {file.path}
                                </p>
                                {file.modified && (
                                  <p className="text-[9px] text-[#333] font-mono">
                                    modified {file.modified.slice(0, 10)}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => reveal(file.path)}
                                className="bg-transparent border-none text-[#333] cursor-pointer p-0.5"
                              >
                                <ExternalLink
                                  className="w-[11px] h-[11px]"
                                  strokeWidth={1.6}
                                />
                              </button>
                              {i > 0 && !deletedPaths.has(file.path) && (
                                <DeleteButton
                                  onDelete={() => deletePaths([file.path])}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const toDelete = report.duplicate_groups
                    .flatMap((g) => g.files.slice(1).map((f) => f.path))
                    .filter((p) => !deletedPaths.has(p));
                  deletePaths(toDelete);
                }}
                className="mt-2.5 w-full h-[30px] rounded border border-[#2A1800] bg-[#0D0900] text-[#633806] text-[10px] cursor-pointer font-mono"
              >
                delete all duplicates (keep originals)
              </button>
            </div>
          )}

          {/* ── Old large files ── */}
          {report.old_large_files.length > 0 && (
            <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] font-mono">
                  old large files
                </p>
                <span className="text-[10px] text-[#854F0B] font-mono">
                  not opened in 6+ months
                </span>
              </div>

              <div>
                {report.old_large_files
                  .slice(0, 20)
                  .filter((f) => !deletedPaths.has(f.path))
                  .map((file, i, arr) => (
                    <div
                      key={file.path}
                      className={`flex items-center py-2 ${
                        i < arr.length - 1 ? "border-b border-[#161616]" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs text-[#888] overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                          {file.name}
                        </p>
                        <p className="text-[9px] text-[#333] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                          {file.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[#444] font-mono">
                          {file.last_accessed_days}d ago
                        </span>
                        <span className="text-[10px] text-[#555] font-mono">
                          {formatBytes(file.size)}
                        </span>
                        <button
                          onClick={() => reveal(file.path)}
                          className="bg-transparent border-none text-[#333] cursor-pointer p-0.5"
                        >
                          <ExternalLink
                            className="w-[11px] h-[11px]"
                            strokeWidth={1.6}
                          />
                        </button>
                        <DeleteButton
                          onDelete={() => deletePaths([file.path])}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Developer junk ── */}
          {report.dev_junk.items.length > 0 && (
            <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-lg px-4 py-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] tracking-[0.08em] uppercase text-[#333] font-mono">
                  developer junk
                </p>
                <span className="text-[10px] text-[#854F0B] font-mono">
                  {formatBytes(report.dev_junk.total_size)} total
                </span>
              </div>

              {/* By-kind summary */}
              <div className="flex flex-col gap-1.5 mb-3">
                {Object.entries(report.dev_junk.by_kind)
                  .sort(([, a], [, b]) => b - a)
                  .map(([kind, size]) => (
                    <div key={kind} className="flex items-center gap-2.5">
                      <span className="text-[11px] text-[#555] w-[200px] flex-shrink-0 font-mono">
                        {DEV_KIND_LABEL[kind] ?? kind}
                      </span>
                      <div className="flex-1 bg-[#161616] rounded-sm h-[3px] overflow-hidden">
                        <div
                          className="h-full bg-[#2A2A2A]"
                          style={{
                            width: `${Math.round((size / report.dev_junk.total_size) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#444] w-[52px] text-right flex-shrink-0 font-mono">
                        {formatBytes(size)}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Individual items */}
              <div>
                {report.dev_junk.items
                  .filter((i) => !deletedPaths.has(i.path))
                  .map((item, i, arr) => (
                    <div
                      key={item.path}
                      className={`flex items-center py-2 ${
                        i < arr.length - 1 ? "border-b border-[#161616]" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs text-[#888] font-mono">
                          {item.name}
                        </p>
                        <p className="text-[9px] text-[#333] overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                          {item.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] text-[#333] bg-[#1A1A1A] border border-[#2A2A2A] rounded px-1.5 py-0.5 font-mono">
                          {DEV_KIND_LABEL[item.kind] ?? item.kind}
                        </span>
                        <span className="text-[10px] text-[#555] font-mono">
                          {formatBytes(item.size)}
                        </span>
                        <button
                          onClick={() => reveal(item.path)}
                          className="bg-transparent border-none text-[#333] cursor-pointer p-0.5"
                        >
                          <ExternalLink
                            className="w-[11px] h-[11px]"
                            strokeWidth={1.6}
                          />
                        </button>
                        <DeleteButton
                          onDelete={() => deletePaths([item.path])}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              <button
                onClick={() =>
                  deletePaths(
                    report.dev_junk.items
                      .filter(
                        (i) => i.safe_to_delete && !deletedPaths.has(i.path),
                      )
                      .map((i) => i.path),
                  )
                }
                className="mt-2.5 w-full h-[30px] rounded border border-[#2A1800] bg-[#0D0900] text-[#633806] text-[10px] cursor-pointer font-mono"
              >
                clean all developer junk
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
