import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { formatBytes } from "@/utils/format";
import {
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Zap,
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

const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)" };
const card: React.CSSProperties = {
  background: "#0F0F0F",
  border: "0.5px solid #1E1E1E",
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 10,
};
const lbl: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#444",
  marginBottom: 10,
  ...mono,
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "7px 0",
  borderBottom: "0.5px solid #161616",
};

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
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => setConfirm(false)}
          style={{
            height: 22,
            padding: "0 8px",
            borderRadius: 4,
            border: "0.5px solid #2A2A2A",
            background: "transparent",
            color: "#555",
            fontSize: 10,
            cursor: "pointer",
            ...mono,
          }}
        >
          cancel
        </button>
        <button
          onClick={() => {
            setConfirm(false);
            onDelete();
          }}
          style={{
            height: 22,
            padding: "0 8px",
            borderRadius: 4,
            border: "0.5px solid #2A1800",
            background: "#0D0900",
            color: "#633806",
            fontSize: 10,
            cursor: "pointer",
            ...mono,
          }}
        >
          confirm
        </button>
      </div>
    );
  return (
    <button
      onClick={() => setConfirm(true)}
      style={{
        height: 22,
        padding: "0 8px",
        borderRadius: 4,
        border: "0.5px solid #1E1E1E",
        background: "transparent",
        color: "#444",
        fontSize: 10,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        ...mono,
      }}
    >
      <Trash2 style={{ width: 11, height: 11 }} strokeWidth={1.6} />
      {size ? formatBytes(size) : "delete"}
    </button>
  );
}

export function Cleaner() {
  const [homePath, setHomePath] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [freed, setFreed] = useState(0);
  const [expandedDups, setExpandedDups] = useState<Set<string>>(new Set());
  const [deletedPaths, setDeletedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    invoke<string>("get_user_home").then(setHomePath).catch(console.error);
  }, []);

  const runAnalysis = async () => {
    if (!homePath) return;
    setRunning(true);
    setError("");
    setReport(null);
    setFreed(0);
    setDeletedPaths(new Set());
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const deletePaths = async (paths: string[]) => {
    try {
      const resp = await invoke<{ freed_bytes: number; deleted_count: number }>(
        "delete_paths",
        {
          request: { paths },
        },
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 760,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{ fontSize: 16, fontWeight: 500, color: "#E8E6E1", ...mono }}
          >
            cleaner
          </p>
          <p style={{ fontSize: 10, color: "#444", marginTop: 2, ...mono }}>
            {report ? `scanning ${homePath}` : "find wasted space"}
          </p>
        </div>
        {report && freed > 0 && (
          <span style={{ fontSize: 11, color: "#3B6D11", ...mono }}>
            +{formatBytes(freed)} freed
          </span>
        )}
      </div>

      {/* Run button / summary */}
      {!report && !running && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "32px 20px",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "#555", ...mono }}>
            ready to scan {homePath || "home directory"}
          </p>
          <p
            style={{
              fontSize: 11,
              color: "#333",
              textAlign: "center",
              lineHeight: 1.7,
              maxWidth: 360,
              ...mono,
            }}
          >
            finds duplicate files, old large files, and developer junk
          </p>
          <button
            onClick={runAnalysis}
            style={{
              height: 34,
              padding: "0 20px",
              borderRadius: 6,
              border: "0.5px solid #2A2A2A",
              background: "#1A1A1A",
              color: "#E8E6E1",
              fontSize: 12,
              cursor: "pointer",
              ...mono,
            }}
          >
            run analysis
          </button>
        </div>
      )}

      {running && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "center",
              padding: "20px 0",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "1.5px solid #222",
                borderTopColor: "#555",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            <p style={{ fontSize: 12, color: "#555", ...mono }}>
              analysing {homePath}…
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#0D0900",
            border: "0.5px solid #2A1800",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <AlertCircle
            style={{ width: 13, height: 13, color: "#633806", flexShrink: 0 }}
            strokeWidth={1.6}
          />
          <p style={{ fontSize: 11, color: "#633806", ...mono }}>{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Summary banner */}
          <div
            style={{
              background: "#0A1A08",
              border: "0.5px solid #27500A",
              borderRadius: 8,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#3B6D11",
                  ...mono,
                }}
              >
                nook found {formatBytes(report.total_reclaimable)} you can clean
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "#27500A",
                  marginTop: 3,
                  ...mono,
                }}
              >
                {report.duplicate_groups.length} duplicate groups ·{" "}
                {report.old_large_files.length} old large files ·{" "}
                {report.dev_junk.items.length} dev junk items
              </p>
            </div>
            <button
              onClick={runAnalysis}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 6,
                border: "0.5px solid #27500A",
                background: "transparent",
                color: "#3B6D11",
                fontSize: 10,
                cursor: "pointer",
                ...mono,
              }}
            >
              rescan
            </button>
          </div>

          {/* ── Duplicates ── */}
          {report.duplicate_groups.length > 0 && (
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <p style={lbl}>duplicate files</p>
                <span style={{ fontSize: 10, color: "#3B6D11", ...mono }}>
                  {formatBytes(report.total_duplicate_waste)} wasted
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {report.duplicate_groups.slice(0, 20).map((group) => {
                  const expanded = expandedDups.has(group.hash);
                  const allDeleted = group.files.every((f) =>
                    deletedPaths.has(f.path),
                  );
                  if (allDeleted) return null;
                  return (
                    <div
                      key={group.hash}
                      style={{
                        background: "#141414",
                        border: "0.5px solid #1E1E1E",
                        borderRadius: 6,
                        overflow: "hidden",
                      }}
                    >
                      {/* Group header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          cursor: "pointer",
                        }}
                        onClick={() => toggleDup(group.hash)}
                      >
                        {expanded ? (
                          <ChevronDown
                            style={{
                              width: 11,
                              height: 11,
                              color: "#444",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <ChevronRight
                            style={{
                              width: 11,
                              height: 11,
                              color: "#444",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: "#888",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            ...mono,
                          }}
                        >
                          {group.files[0].name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "#444",
                            flexShrink: 0,
                            ...mono,
                          }}
                        >
                          {group.files.length}x · {formatBytes(group.size)} each
                        </span>
                        <DeleteButton
                          size={group.total_wasted}
                          onDelete={() => {
                            // Keep the first (newest/best), delete the rest
                            const toDelete = group.files
                              .slice(1)
                              .map((f) => f.path);
                            deletePaths(toDelete);
                          }}
                        />
                      </div>

                      {/* Expanded file list */}
                      {expanded && (
                        <div style={{ borderTop: "0.5px solid #1E1E1E" }}>
                          {group.files.map((file, i) => (
                            <div
                              key={file.path}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 10px 6px 28px",
                                borderBottom:
                                  i < group.files.length - 1
                                    ? "0.5px solid #1A1A1A"
                                    : "none",
                                opacity: deletedPaths.has(file.path) ? 0.3 : 1,
                              }}
                            >
                              {i === 0 && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "#3B6D11",
                                    width: 32,
                                    flexShrink: 0,
                                    ...mono,
                                  }}
                                >
                                  keep
                                </span>
                              )}
                              {i > 0 && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "#444",
                                    width: 32,
                                    flexShrink: 0,
                                    ...mono,
                                  }}
                                >
                                  dupe
                                </span>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                  style={{
                                    fontSize: 11,
                                    color: "#666",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    ...mono,
                                  }}
                                >
                                  {file.path}
                                </p>
                                {file.modified && (
                                  <p
                                    style={{
                                      fontSize: 9,
                                      color: "#333",
                                      ...mono,
                                    }}
                                  >
                                    modified {file.modified.slice(0, 10)}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => reveal(file.path)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#333",
                                  cursor: "pointer",
                                  padding: 2,
                                }}
                              >
                                <ExternalLink
                                  style={{ width: 11, height: 11 }}
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

              {/* Delete all duplicates */}
              <button
                onClick={() => {
                  const toDelete = report.duplicate_groups
                    .flatMap((g) => g.files.slice(1).map((f) => f.path))
                    .filter((p) => !deletedPaths.has(p));
                  deletePaths(toDelete);
                }}
                style={{
                  marginTop: 10,
                  width: "100%",
                  height: 30,
                  borderRadius: 6,
                  border: "0.5px solid #2A1800",
                  background: "#0D0900",
                  color: "#633806",
                  fontSize: 10,
                  cursor: "pointer",
                  ...mono,
                }}
              >
                delete all duplicates (keep originals)
              </button>
            </div>
          )}

          {/* ── Old large files ── */}
          {report.old_large_files.length > 0 && (
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <p style={lbl}>old large files</p>
                <span style={{ fontSize: 10, color: "#854F0B", ...mono }}>
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
                      style={{
                        ...row,
                        borderBottom:
                          i < arr.length - 1 ? "0.5px solid #161616" : "none",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#888",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            ...mono,
                          }}
                        >
                          {file.name}
                        </p>
                        <p
                          style={{
                            fontSize: 9,
                            color: "#333",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            ...mono,
                          }}
                        >
                          {file.path}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "#444", ...mono }}>
                          {file.last_accessed_days}d ago
                        </span>
                        <span style={{ fontSize: 10, color: "#555", ...mono }}>
                          {formatBytes(file.size)}
                        </span>
                        <button
                          onClick={() => reveal(file.path)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#333",
                            cursor: "pointer",
                            padding: 2,
                          }}
                        >
                          <ExternalLink
                            style={{ width: 11, height: 11 }}
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
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <p style={lbl}>developer junk</p>
                <span style={{ fontSize: 10, color: "#854F0B", ...mono }}>
                  {formatBytes(report.dev_junk.total_size)} total
                </span>
              </div>

              {/* By-kind summary */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                {Object.entries(report.dev_junk.by_kind)
                  .sort(([, a], [, b]) => b - a)
                  .map(([kind, size]) => (
                    <div
                      key={kind}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "#555",
                          width: 200,
                          flexShrink: 0,
                          ...mono,
                        }}
                      >
                        {DEV_KIND_LABEL[kind] ?? kind}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          background: "#161616",
                          borderRadius: 2,
                          height: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: "#2A2A2A",
                            width: `${Math.round((size / report.dev_junk.total_size) * 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#444",
                          width: 52,
                          textAlign: "right",
                          flexShrink: 0,
                          ...mono,
                        }}
                      >
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
                      style={{
                        ...row,
                        borderBottom:
                          i < arr.length - 1 ? "0.5px solid #161616" : "none",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <p style={{ fontSize: 12, color: "#888", ...mono }}>
                          {item.name}
                        </p>
                        <p
                          style={{
                            fontSize: 9,
                            color: "#333",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            ...mono,
                          }}
                        >
                          {item.path}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            color: "#333",
                            background: "#1A1A1A",
                            border: "0.5px solid #2A2A2A",
                            borderRadius: 4,
                            padding: "2px 6px",
                            ...mono,
                          }}
                        >
                          {DEV_KIND_LABEL[item.kind] ?? item.kind}
                        </span>
                        <span style={{ fontSize: 10, color: "#555", ...mono }}>
                          {formatBytes(item.size)}
                        </span>
                        <button
                          onClick={() => reveal(item.path)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#333",
                            cursor: "pointer",
                            padding: 2,
                          }}
                        >
                          <ExternalLink
                            style={{ width: 11, height: 11 }}
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
                style={{
                  marginTop: 10,
                  width: "100%",
                  height: 30,
                  borderRadius: 6,
                  border: "0.5px solid #2A1800",
                  background: "#0D0900",
                  color: "#633806",
                  fontSize: 10,
                  cursor: "pointer",
                  ...mono,
                }}
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
