"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import type { HeatItem, HeatmapData } from "@/lib/bbs/heatmap";
import CommentDrawer from "./CommentDrawer";

interface BbsHeatmapProps {
  initialData?: HeatmapData;
}

// ─── Squarify treemap algorithm ────────────────────────────────────────────

interface TreeCell {
  item: HeatItem;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DisplayCell extends TreeCell {
  entering: boolean;
  exiting: boolean;
}

/**
 * Worst aspect ratio in a candidate row.
 * shortSide: the shorter dimension of the current remaining rectangle
 */
function worstAspect(rowVals: number[], shortSide: number): number {
  const s = rowVals.reduce((a, b) => a + b, 0);
  if (s === 0 || shortSide === 0) return Infinity;
  const rMax = Math.max(...rowVals);
  const rMin = Math.min(...rowVals);
  return Math.max(
    (shortSide * shortSide * rMax) / (s * s),
    (s * s) / (shortSide * shortSide * rMin)
  );
}

/**
 * Place a committed row in the current rectangle.
 * Wide rect → vertical strip (items stacked top→bottom, each with same width).
 * Tall rect → horizontal strip (items left→right, each with same height).
 */
function commitRow(
  row: { item: HeatItem; val: number }[],
  result: TreeCell[],
  x: number,
  y: number,
  w: number,
  h: number
): { nx: number; ny: number; nw: number; nh: number } {
  const rowSum = row.reduce((s, r) => s + r.val, 0);

  if (w >= h) {
    // wide → vertical strip
    const stripW = rowSum / h;
    let py = y;
    for (const { item, val } of row) {
      const cellH = val / stripW;
      result.push({ item, x, y: py, w: stripW, h: cellH });
      py += cellH;
    }
    return { nx: x + stripW, ny: y, nw: w - stripW, nh: h };
  } else {
    // tall → horizontal strip
    const stripH = rowSum / w;
    let px = x;
    for (const { item, val } of row) {
      const cellW = val / stripH;
      result.push({ item, x: px, y, w: cellW, h: stripH });
      px += cellW;
    }
    return { nx: x, ny: y + stripH, nw: w, nh: h - stripH };
  }
}

function computeTreemap(
  items: HeatItem[],
  containerW: number,
  containerH: number
): TreeCell[] {
  if (items.length === 0 || containerW <= 0 || containerH <= 0) return [];

  const sorted = [...items].sort((a, b) => b.count_today - a.count_today);
  const totalCount = sorted.reduce((s, i) => s + Math.max(i.count_today, 1), 0);
  const totalArea = containerW * containerH;

  const entries = sorted.map((item) => ({
    item,
    val: (Math.max(item.count_today, 1) / totalCount) * totalArea,
  }));

  const result: TreeCell[] = [];
  const remaining = [...entries];
  let cx = 0,
    cy = 0,
    cw = containerW,
    ch = containerH;
  let row: typeof entries = [];

  while (remaining.length > 0) {
    if (cw <= 0.5 || ch <= 0.5) break;

    const next = remaining[0];
    const shortSide = Math.min(cw, ch);
    const newRow = [...row, next];
    const newWorst = worstAspect(
      newRow.map((r) => r.val),
      shortSide
    );
    const curWorst =
      row.length > 0
        ? worstAspect(
            row.map((r) => r.val),
            shortSide
          )
        : Infinity;

    if (row.length === 0 || newWorst <= curWorst) {
      row.push(next);
      remaining.shift();
    } else {
      const { nx, ny, nw, nh } = commitRow(row, result, cx, cy, cw, ch);
      cx = nx;
      cy = ny;
      cw = nw;
      ch = nh;
      row = [];
    }
  }

  if (row.length > 0 && cw > 0.5 && ch > 0.5) {
    commitRow(row, result, cx, cy, cw, ch);
  }

  return result;
}

// ─── Color scale ────────────────────────────────────────────────────────────
// velocity 0 = gray (no buzz), 8+ = deep red (massive spike)

function velocityColor(velocity: number): { bg: string; text: string } {
  const v = Math.min(velocity, 8);

  if (v < 0.5) return { bg: "#F3F4F6", text: "#9CA3AF" }; // gray

  if (v < 1) {
    const t = (v - 0.5) / 0.5;
    return {
      bg: `hsl(42, ${Math.round(50 * t)}%, ${Math.round(92 - 10 * t)}%)`,
      text: "#374151",
    };
  }

  if (v < 2) {
    const t = v - 1;
    return {
      bg: `hsl(${Math.round(38 - 18 * t)}, ${Math.round(80 + 10 * t)}%, ${Math.round(78 - 23 * t)}%)`,
      text: "#1F2937",
    };
  }

  if (v < 4) {
    const t = (v - 2) / 2;
    return {
      bg: `hsl(${Math.round(20 - 20 * t)}, 92%, ${Math.round(55 - 10 * t)}%)`,
      text: "white",
    };
  }

  {
    const t = Math.min((v - 4) / 4, 1);
    return {
      bg: `hsl(0, 92%, ${Math.round(45 - 10 * t)}%)`,
      text: "white",
    };
  }
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipState {
  item: HeatItem;
  clientX: number;
  clientY: number;
}

function fmtPrice(v: number | null): string {
  if (v === null) return "-";
  return "¥" + v.toLocaleString("ja-JP");
}

function fmtChange(v: number | null): { text: string; color: string } {
  if (v === null) return { text: "", color: "#9CA3AF" };
  const sign = v >= 0 ? "+" : "";
  return {
    text: sign + v.toFixed(2) + "%",
    color: v >= 0 ? "#ef4444" : "#3b82f6",
  };
}

function Tooltip({ tooltip }: { tooltip: TooltipState }) {
  const { item, clientX, clientY } = tooltip;
  const { bg, text } = velocityColor(item.velocity);
  const change = fmtChange(item.change_pct);

  return (
    <div
      style={{
        position: "fixed",
        left: clientX + 14,
        top: clientY - 8,
        zIndex: 200,
        pointerEvents: "none",
        backgroundColor: "white",
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.13)",
        minWidth: 160,
      }}
    >
      <p
        style={{
          fontWeight: 700,
          fontSize: 13,
          color: "#111827",
          marginBottom: 2,
        }}
      >
        {item.company_name}
      </p>
      <p
        style={{
          fontSize: 10,
          color: "#9CA3AF",
          fontFamily: "monospace",
          marginBottom: 6,
        }}
      >
        {item.code}
      </p>
      {item.close !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
            {fmtPrice(item.close)}
          </span>
          {change.text && (
            <span style={{ fontSize: 12, fontWeight: 600, color: change.color }}>
              {change.text}
            </span>
          )}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            background: bg,
            color: text,
            padding: "2px 7px",
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {item.velocity.toFixed(1)}x
        </span>
        <span style={{ fontSize: 12, color: "#4B5563" }}>
          {item.count_today}件/今日
        </span>
      </div>
      <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
        24h合計: {item.count_24h}件
      </p>
    </div>
  );
}

// ─── ChangeBadge ─────────────────────────────────────────────────────────────

function ChangeBadge({ value, darkBg, fontSize = 11 }: { value: number; darkBg: boolean; fontSize?: number }) {
  const pos = value >= 0;
  const sign = pos ? "+" : "";
  const arrow = pos ? "↑" : "↓";
  const textColor = pos ? "#dc2626" : "#2563eb";
  const bg = darkBg ? "rgba(255,255,255,0.9)" : pos ? "#fef2f2" : "#eff6ff";
  return (
    <span
      style={{
        fontSize,
        fontWeight: 700,
        padding: "1px 5px",
        borderRadius: 4,
        backgroundColor: bg,
        color: textColor,
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {arrow} {sign}
      {value.toFixed(2)}%
    </span>
  );
}

// ─── CommentList ─────────────────────────────────────────────────────────────
// Shows multiple comments stacked, with the first one cycling through all

function CommentList({
  comments,
  maxLines,
  darkBg,
  fontSize = 10,
}: {
  comments: string[];
  maxLines: number;
  darkBg: boolean;
  fontSize?: number;
}) {
  const [cycleIdx, setCycleIdx] = useState(0);
  const [cycleVisible, setCycleVisible] = useState(true);

  // Cycle the first slot through remaining comments if there are more than maxLines
  useEffect(() => {
    if (comments.length <= maxLines) return;
    const interval = setInterval(() => {
      setCycleVisible(false);
      setTimeout(() => {
        setCycleIdx((i) => (i + 1) % comments.length);
        setCycleVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [comments.length, maxLines]);

  if (comments.length === 0) return null;

  // Show up to maxLines comments; first slot cycles if more comments exist
  const staticComments = comments.slice(1, maxLines);
  const firstComment = comments[cycleIdx];
  const dividerColor = darkBg ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <p
        style={{
          fontSize,
          lineHeight: 1.4,
          opacity: cycleVisible ? 0.82 : 0,
          transition: "opacity 0.3s ease",
          fontStyle: "italic",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {firstComment}
      </p>
      {staticComments.map((c, i) => (
        <p
          key={i}
          style={{
            fontSize,
            lineHeight: 1.4,
            opacity: 0.68,
            fontStyle: "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            borderTop: `1px solid ${dividerColor}`,
            paddingTop: 3,
          }}
        >
          {c}
        </p>
      ))}
    </div>
  );
}

// ─── Single treemap cell ─────────────────────────────────────────────────────

const CELL_TRANSITION =
  "left 0.6s cubic-bezier(0.4,0,0.2,1), top 0.6s cubic-bezier(0.4,0,0.2,1), width 0.6s cubic-bezier(0.4,0,0.2,1), height 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease";

function Cell({
  cell,
  opacity,
  onClick,
  onHover,
  onLeave,
  totalArea,
}: {
  cell: DisplayCell;
  opacity: number;
  onClick: () => void;
  onHover: (item: HeatItem, x: number, y: number) => void;
  onLeave: () => void;
  totalArea: number;
}) {
  const { item, x, y, w, h } = cell;
  const { bg, text } = velocityColor(item.velocity);
  const minDim = Math.min(w, h);
  const avgDim = (w + h) / 2; // use average to prevent wide-short cells from getting tiny text
  const pad = minDim < 50 ? 2 : minDim < 80 ? 5 : 8;
  // Font sizes based on avgDim so wide-short cells get readable text.
  // Caps are tuned to leave room for comments in comment-eligible cells.
  const nameSize = Math.round(Math.min(Math.max(avgDim / 7, 10), 28));
  const codeSize = Math.round(Math.min(Math.max(avgDim / 11, 9), 15));
  const countSize = Math.round(Math.min(Math.max(avgDim / 9, 10), 20));
  const priceSize = Math.round(Math.min(Math.max(avgDim / 10, 10), 15));
  const commentSize = Math.round(Math.min(Math.max(avgDim / 16, 9), 12));
  // Show comments if cell occupies >= 10% of total area
  const areaRatio = totalArea > 0 ? (w * h) / totalArea : 0;

  // Dynamically compute how many comment lines fit in remaining vertical space
  const nameH = h >= 28 && w >= 40 ? nameSize * 1.2 + 1 : 0;
  const codeH = h >= 42 && w >= 42 ? codeSize + 2 : 0;
  const countH = h >= 55 && w >= 38 ? countSize : 0;
  const priceH = h >= 65 && w >= 50 && item.close !== null ? priceSize * 1.7 + 2 : 0;
  const commentOverhead = 10; // marginTop:5 + borderTop:1 + paddingTop:4
  const commentLineH = commentSize * 1.4 + 3;
  const availForComments = h - pad * 2 - nameH - codeH - countH - priceH - commentOverhead;
  const maxLines = Math.min(5, Math.max(0, Math.floor(availForComments / commentLineH)));
  const showComments = areaRatio >= 0.05 && maxLines >= 1 && w >= 100 && item.top_comments.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: bg,
        border: "1.5px solid rgba(255,255,255,0.55)",
        boxSizing: "border-box",
        cursor: "pointer",
        overflow: "hidden",
        opacity,
        transition: CELL_TRANSITION,
      }}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={(e) => onHover(item, e.clientX, e.clientY)}
      onMouseLeave={onLeave}
      className="hover:brightness-90 active:brightness-75 active:scale-[0.97]"
    >
      <div
        style={{
          padding: pad,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          color: text,
        }}
      >
        {h >= 28 && w >= 40 && (
          <p
            style={{
              fontSize: nameSize,
              fontWeight: 700,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 1,
            }}
          >
            {item.company_name || item.code}
          </p>
        )}
        {h >= 42 && w >= 42 && (
          <p
            style={{
              fontSize: codeSize,
              fontFamily: "monospace",
              opacity: 0.7,
              lineHeight: 1,
              marginBottom: 2,
            }}
          >
            {item.code}
          </p>
        )}
        {h >= 55 && w >= 38 && (
          <p
            style={{
              fontSize: countSize,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {item.count_today}件/今日
          </p>
        )}
        {h >= 65 && w >= 50 && item.close !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ fontSize: priceSize, opacity: 0.88, fontWeight: 600 }}>
              {fmtPrice(item.close)}
            </span>
            {item.change_pct !== null && (
              <ChangeBadge value={item.change_pct} darkBg={item.velocity >= 2} fontSize={priceSize} />
            )}
          </div>
        )}
        {showComments && (
          <div
            style={{
              marginTop: 5,
              borderTop: `1px solid ${item.velocity >= 2 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.1)"}`,
              paddingTop: 4,
            }}
          >
            <CommentList
              comments={item.top_comments}
              maxLines={maxLines}
              darkBg={item.velocity >= 2}
              fontSize={commentSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="w-full bg-gray-100 rounded-xl animate-pulse flex items-center justify-center"
    >
      <p className="text-gray-400 text-sm">データ読み込み中...</p>
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

const LEGEND_POINTS = [0.2, 0.8, 1.5, 2.5, 4, 6] as const;

function ColorLegend() {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-gray-400 mr-1">普通</span>
      {LEGEND_POINTS.map((v) => (
        <span
          key={v}
          style={{ backgroundColor: velocityColor(v).bg }}
          className="w-5 h-3 rounded-sm inline-block"
        />
      ))}
      <span className="text-[10px] text-gray-400 ml-1">大盛り上がり</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function BbsHeatmap({ initialData }: BbsHeatmapProps) {
  const [data, setData] = useState<HeatmapData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialData ? new Date() : null
  );
  const [selectedItem, setSelectedItem] = useState<{ code: string; companyName: string } | null>(null);
  const [countdown, setCountdown] = useState(30);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  // Animation state: Map<code, DisplayCell>
  const [displayCells, setDisplayCells] = useState<Map<string, DisplayCell>>(new Map());
  const exitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastFetchRef = useRef<number>(0);

  const containerH = containerW > 0 ? (containerW < 480 ? 340 : 500) : 500;

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/api/bbs/heatmap");
      const json: HeatmapData = await r.json();
      setData(json);
      setLastUpdated(new Date());
      setCountdown(30);
      lastFetchRef.current = Date.now();
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling with tab visibility
  useEffect(() => {
    if (!initialData) fetchData();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastFetchRef.current >= 30_000) {
          fetchData();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [initialData, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerW(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute treemap and reconcile with displayCells for animation
  const newCells =
    containerW > 0 && data
      ? computeTreemap(data.items, containerW, containerH)
      : [];

  useEffect(() => {
    const newCellMap = new Map<string, TreeCell>();
    for (const cell of newCells) {
      newCellMap.set(cell.item.code, cell);
    }

    setDisplayCells((prev) => {
      const next = new Map<string, DisplayCell>();

      // Cells present in new data: update position, clear entering/exiting
      for (const [code, cell] of newCellMap) {
        const existing = prev.get(code);
        // Cancel any pending exit timer for this code
        const exitTimer = exitTimersRef.current.get(code);
        if (exitTimer) {
          clearTimeout(exitTimer);
          exitTimersRef.current.delete(code);
        }

        if (existing && !existing.entering) {
          // Existing cell: update position/size
          next.set(code, { ...cell, entering: false, exiting: false });
        } else {
          // New cell: start with entering=true for fade-in
          next.set(code, { ...cell, entering: true, exiting: false });
        }
      }

      // Cells no longer in new data: mark as exiting
      for (const [code, cell] of prev) {
        if (!newCellMap.has(code) && !cell.exiting) {
          next.set(code, { ...cell, exiting: true });
        } else if (!newCellMap.has(code) && cell.exiting) {
          // Already exiting, keep it
          next.set(code, cell);
        }
      }

      return next;
    });

    // Trigger entering -> false on next frame (fade-in)
    const enteringCodes: string[] = [];
    for (const cell of newCells) {
      enteringCodes.push(cell.item.code);
    }

    const rafId = requestAnimationFrame(() => {
      setDisplayCells((prev) => {
        let changed = false;
        for (const code of enteringCodes) {
          const cell = prev.get(code);
          if (cell?.entering) {
            changed = true;
            break;
          }
        }
        if (!changed) return prev;

        const next = new Map(prev);
        for (const code of enteringCodes) {
          const cell = next.get(code);
          if (cell?.entering) {
            next.set(code, { ...cell, entering: false });
          }
        }
        return next;
      });
    });

    // Schedule removal of exiting cells after transition
    setDisplayCells((prev) => {
      for (const [code, cell] of prev) {
        if (cell.exiting && !exitTimersRef.current.has(code)) {
          const timer = setTimeout(() => {
            setDisplayCells((current) => {
              const updated = new Map(current);
              updated.delete(code);
              return updated;
            });
            exitTimersRef.current.delete(code);
          }, 600);
          exitTimersRef.current.set(code, timer);
        }
      }
      return prev;
    });

    return () => cancelAnimationFrame(rafId);
    // We use a JSON key derived from item codes + positions to detect actual changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCells.map((c) => `${c.item.code}:${c.x.toFixed(1)},${c.y.toFixed(1)},${c.w.toFixed(1)},${c.h.toFixed(1)}`).join("|")]);

  // Cleanup exit timers on unmount
  useEffect(() => {
    const timers = exitTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  if (loading) return <Skeleton height={containerH} />;

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl">
        現在データがありません
      </div>
    );
  }

  const cellsToRender = Array.from(displayCells.values());
  const totalArea = containerW * containerH;

  return (
    <>
      {/* Meta bar */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{data.items.length}銘柄</span>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              更新:{" "}
              {lastUpdated.toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {countdown}秒後に更新
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ColorLegend />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">シェア</span>
            {/* X (Twitter) */}
            <button
              onClick={() => {
                const top3 = data.items.slice(0, 3).map((it) => `${it.company_name}(${it.code})`).join("、");
                const text = `掲示板が盛り上がっている銘柄🔥 ${top3} #株AI`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://kabu-ai.jp/bbs")}`, "_blank");
              }}
              className="w-7 h-7 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors"
              aria-label="Xでシェア"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            {/* LINE */}
            <button
              onClick={() => {
                window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent("https://kabu-ai.jp/bbs")}`, "_blank");
              }}
              className="w-7 h-7 rounded-full bg-[#06C755] hover:bg-green-600 flex items-center justify-center transition-colors"
              aria-label="LINEでシェア"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.066-.023.132-.033.2-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.28-.63.63-.63.349 0 .63.285.63.63v4.771h-.006zM9.973 8.108c0-.345-.282-.63-.631-.63-.345 0-.627.285-.627.63v4.771c0 .346.282.629.63.629.346 0 .628-.283.628-.629V8.108zm-4.418 5.4h-.59l.004-.002.004-.002h.582c.346 0 .629-.285.629-.63 0-.345-.285-.63-.631-.63H3.624a.669.669 0 0 0-.199.031c-.256.086-.43.325-.43.595v4.772c0 .346.282.629.63.629.348 0 .63-.283.63-.629V16.1h1.297c.348 0 .629-.283.629-.63 0-.345-.282-.63-.63-.63H4.255v-1.332h1.3zm14.916-11.113c-5.031-5.031-13.199-5.031-18.232 0-5.031 5.031-5.031 13.199 0 18.232 5.031 5.031 13.199 5.031 18.232 0 5.031-5.033 5.031-13.201 0-18.232z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Treemap */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: containerH,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#F9FAFB",
        }}
      >
        {cellsToRender.map((cell) => (
          <Cell
            key={cell.item.code}
            cell={cell}
            opacity={cell.entering || cell.exiting ? 0 : 1}
            onClick={() => setSelectedItem({ code: cell.item.code, companyName: cell.item.company_name || cell.item.code })}
            onHover={(item, x, y) => setTooltip({ item, clientX: x, clientY: y })}
            onLeave={() => setTooltip(null)}
            totalArea={totalArea}
          />
        ))}
      </div>

      {tooltip && <Tooltip tooltip={tooltip} />}

      {selectedItem && (
        <CommentDrawer
          code={selectedItem.code}
          companyName={selectedItem.companyName}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
