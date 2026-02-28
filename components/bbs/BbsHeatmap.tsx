"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { HeatItem, HeatmapData } from "@/lib/bbs/heatmap";

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

// ─── Single treemap cell ─────────────────────────────────────────────────────

function Cell({
  cell,
  onClick,
  onHover,
  onLeave,
}: {
  cell: TreeCell;
  onClick: () => void;
  onHover: (item: HeatItem, x: number, y: number) => void;
  onLeave: () => void;
}) {
  const { item, x, y, w, h } = cell;
  const { bg, text } = velocityColor(item.velocity);
  const minDim = Math.min(w, h);
  const pad = minDim < 50 ? 2 : minDim < 80 ? 4 : 7;
  const nameSize = minDim > 100 ? 13 : minDim > 60 ? 11 : 9;
  const codeSize = 9;
  const countSize = minDim > 80 ? 12 : 10;

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
        transition: "filter 0.12s",
      }}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={(e) => onHover(item, e.clientX, e.clientY)}
      onMouseLeave={onLeave}
      className="hover:brightness-90 active:brightness-75"
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
        {h >= 70 && w >= 50 && item.close !== null && (
          <p
            style={{
              fontSize: 9,
              lineHeight: 1.3,
              marginTop: 2,
              opacity: 0.85,
            }}
          >
            {fmtPrice(item.close)}
            {item.change_pct !== null && (
              <span
                style={{
                  marginLeft: 3,
                  color: item.change_pct >= 0 ? "#fca5a5" : "#93c5fd",
                }}
              >
                {item.change_pct >= 0 ? "+" : ""}
                {item.change_pct.toFixed(2)}%
              </span>
            )}
          </p>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  const containerH = containerW > 0 ? (containerW < 480 ? 340 : 500) : 500;

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/api/bbs/heatmap");
      const json: HeatmapData = await r.json();
      setData(json);
      setLastUpdated(new Date());
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [initialData, fetchData]);

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

  const cells =
    containerW > 0 && data
      ? computeTreemap(data.items, containerW, containerH)
      : [];

  if (loading) return <Skeleton height={containerH} />;

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl">
        現在データがありません
      </div>
    );
  }

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
              })}
            </span>
          )}
        </div>
        <ColorLegend />
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
        {cells.map((cell, i) => (
          <Cell
            key={`${cell.item.code}-${i}`}
            cell={cell}
            onClick={() => {}}
            onHover={(item, x, y) => setTooltip({ item, clientX: x, clientY: y })}
            onLeave={() => setTooltip(null)}
          />
        ))}
      </div>

      {tooltip && <Tooltip tooltip={tooltip} />}
    </>
  );
}
