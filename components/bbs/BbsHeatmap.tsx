"use client";

import { useState, useEffect, useCallback } from "react";
import type { HeatItem, HeatmapData } from "@/lib/bbs/heatmap";
import CommentDrawer from "./CommentDrawer";

interface BbsHeatmapProps {
  initialData?: HeatmapData;
}

type HeatLevel = "cold" | "warm" | "hot" | "fire" | "explosion";

function getHeatLevel(velocity: number): HeatLevel {
  if (velocity >= 8) return "explosion";
  if (velocity >= 4) return "fire";
  if (velocity >= 2) return "hot";
  if (velocity >= 1) return "warm";
  return "cold";
}

const HEAT_STYLES: Record<
  HeatLevel,
  { card: string; bar: string; badge: string; label: string }
> = {
  cold: {
    card: "bg-gray-50 border-gray-200 hover:border-gray-300",
    bar: "bg-gray-300",
    badge: "bg-gray-400 text-white",
    label: "普通",
  },
  warm: {
    card: "bg-yellow-50 border-yellow-300 hover:border-yellow-400",
    bar: "bg-yellow-400",
    badge: "bg-yellow-400 text-yellow-900",
    label: "やや活発",
  },
  hot: {
    card: "bg-orange-50 border-orange-300 hover:border-orange-500",
    bar: "bg-orange-400",
    badge: "bg-orange-500 text-white",
    label: "活発",
  },
  fire: {
    card: "bg-red-50 border-red-300 hover:border-red-500",
    bar: "bg-red-500",
    badge: "bg-red-500 text-white",
    label: "盛り上がり",
  },
  explosion: {
    card: "bg-rose-100 border-rose-400 hover:border-rose-600",
    bar: "bg-rose-600",
    badge: "bg-rose-600 text-white",
    label: "大盛り上がり",
  },
};

function HeatCard({
  item,
  onClick,
}: {
  item: HeatItem;
  onClick: () => void;
}) {
  const level = getHeatLevel(item.velocity);
  const styles = HEAT_STYLES[level];
  const barWidth = Math.min((item.velocity / 10) * 100, 100);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-800 truncate leading-tight">
            {item.company_name || item.code}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">{item.code}</p>
        </div>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${styles.badge}`}
        >
          {styles.label}
        </span>
      </div>

      {/* Velocity bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${styles.bar}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">{item.count_1h}</span>
          件/時間
        </span>
        <span className="text-[10px] text-gray-400">
          {item.velocity.toFixed(1)}x
        </span>
      </div>
    </button>
  );
}

function HeatmapSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border-2 border-gray-100 p-3 h-[88px] animate-pulse bg-gray-50"
        >
          <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
          <div className="h-2 bg-gray-100 rounded w-1/2 mb-2" />
          <div className="h-1.5 bg-gray-200 rounded mb-2" />
          <div className="h-2 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function BbsHeatmap({ initialData }: BbsHeatmapProps) {
  const [data, setData] = useState<HeatmapData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialData ? new Date() : null
  );

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
    if (!initialData) {
      fetchData();
    }
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [initialData, fetchData]);

  const selectedItem = data?.items.find((i) => i.code === selectedCode) ?? null;

  if (loading) return <HeatmapSkeleton />;

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl">
        現在データがありません
      </div>
    );
  }

  return (
    <>
      {/* Legend & meta */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">
          {data.items.length}銘柄
          {lastUpdated && (
            <span className="ml-2 text-xs text-gray-300">
              更新:{" "}
              {lastUpdated.toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          普通
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block ml-1" />
          活発
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block ml-1" />
          盛り上がり
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1" />
          大盛り上がり
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {data.items.map((item) => (
          <HeatCard
            key={item.code}
            item={item}
            onClick={() => setSelectedCode(item.code)}
          />
        ))}
      </div>

      {/* Comment drawer */}
      {selectedCode && (
        <CommentDrawer
          code={selectedCode}
          companyName={selectedItem?.company_name ?? selectedCode}
          onClose={() => setSelectedCode(null)}
        />
      )}
    </>
  );
}
