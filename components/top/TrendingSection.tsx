"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import SparklineChart from "@/components/news/SparklineChart";
import type {
  TrendingContent,
  TrendingItem,
  TrendingSectionData,
  ContentType,
} from "@/lib/top/trending";

// Full Tailwind class strings — must be static for JIT
const TYPE_STYLES: Record<
  ContentType,
  {
    borderColor: string;
    badgeBg: string;
    badgeText: string;
    icon: string;
    upColor: string;
    downColor: string;
  }
> = {
  market_up: {
    borderColor: "border-l-green-500",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    icon: "📈",
    upColor: "text-green-600 bg-green-50",
    downColor: "text-red-600 bg-red-50",
  },
  trading_value: {
    borderColor: "border-l-blue-500",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    icon: "💹",
    upColor: "text-green-600 bg-green-50",
    downColor: "text-red-600 bg-red-50",
  },
  stop_high: {
    borderColor: "border-l-rose-500",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    icon: "🔺",
    upColor: "text-green-600 bg-green-50",
    downColor: "text-red-600 bg-red-50",
  },
  pts: {
    borderColor: "border-l-violet-500",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    icon: "🌙",
    upColor: "text-green-600 bg-green-50",
    downColor: "text-red-600 bg-red-50",
  },
  yahoo_buzz: {
    borderColor: "border-l-amber-500",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    icon: "💬",
    upColor: "text-green-600 bg-green-50",
    downColor: "text-red-600 bg-red-50",
  },
  latest_ai: {
    borderColor: "border-l-slate-400",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    icon: "📰",
    upColor: "text-green-600 bg-green-50",
    downColor: "text-red-600 bg-red-50",
  },
};

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "たった今";
    if (min < 60) return `${min}分前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}時間前`;
    return `${Math.floor(h / 24)}日前`;
  } catch {
    return "";
  }
}

function ChangeRateBadge({
  rate,
  upColor,
  downColor,
}: {
  rate: number | null;
  upColor: string;
  downColor: string;
}) {
  if (rate === null) return null;
  const pos = rate >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
        pos ? upColor : downColor
      }`}
    >
      {pos ? "↑" : "↓"} {Math.abs(rate).toFixed(1)}%
    </span>
  );
}

function CompanyLogo({
  item,
}: {
  item: TrendingItem;
}) {
  const [imgError, setImgError] = useState(false);

  if (item.logo_url && !imgError) {
    return (
      <Image
        src={item.logo_url}
        alt=""
        width={32}
        height={32}
        className="w-8 h-8 rounded bg-gray-100 object-contain flex-shrink-0"
        unoptimized
        onError={() => setImgError(true)}
      />
    );
  }

  const initial = item.company_name?.charAt(0) || item.code?.slice(0, 2) || "";
  return (
    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-gray-400">{initial}</span>
    </div>
  );
}

function TrendingCard({
  item,
  type,
}: {
  item: TrendingItem;
  type: ContentType;
}) {
  const styles = TYPE_STYLES[type];
  return (
    <Link href={item.post_url} className="block group h-full">
      <article
        className={`bg-white rounded-xl border border-gray-100 shadow hover:shadow-md transition-all duration-200 overflow-hidden h-full flex flex-col border-l-4 ${styles.borderColor}`}
      >
        <div className="p-3.5 flex flex-col flex-grow gap-2">
          {/* Company row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CompanyLogo item={item} />
              {item.company_name ? (
                <span className="text-xs font-semibold text-gray-700 truncate">
                  {item.company_name}
                </span>
              ) : null}
              {item.code ? (
                <span className="text-xs text-gray-400 flex-shrink-0 font-mono">
                  {item.code}
                </span>
              ) : null}
            </div>
            <ChangeRateBadge
              rate={item.change_rate}
              upColor={styles.upColor}
              downColor={styles.downColor}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-50" />

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors leading-snug flex-grow">
            {item.title || "タイトルなし"}
          </h3>

          {/* Excerpt */}
          {item.excerpt && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {item.excerpt}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 mt-auto">
            <span className="text-xs text-gray-400">
              {formatTimeAgo(item.created_at)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300">AI分析</span>
              {item.code && (
                <SparklineChart code={item.code} width={72} height={22} />
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-gray-100 rounded-md w-40 animate-pulse" />
        <div className="h-5 bg-gray-100 rounded-full w-12 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow p-3.5 h-[120px] border-l-4 border-l-gray-200"
          >
            <div className="flex justify-between mb-2">
              <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-12 animate-pulse" />
            </div>
            <div className="border-t border-gray-50 mb-2" />
            <div className="h-3.5 bg-gray-100 rounded w-full mb-1.5 animate-pulse" />
            <div className="h-3.5 bg-gray-100 rounded w-4/5 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: TrendingSectionData }) {
  const styles = TYPE_STYLES[section.type];
  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{styles.icon}</span>
          <h2 className="text-base font-bold text-gray-800">{section.label}</h2>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles.badgeBg} ${styles.badgeText}`}
        >
          {section.time_label}
        </span>
      </div>

      {/* Cards */}
      {section.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {section.items.map((item) => (
            <TrendingCard key={item.post_id} item={item} type={section.type} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-xl">
          現在データがありません
        </div>
      )}
    </div>
  );
}

interface TrendingSectionProps {
  initialData?: TrendingContent;
}

export default function TrendingSection({
  initialData,
}: TrendingSectionProps) {
  const [data, setData] = useState<TrendingContent | null>(
    initialData ?? null
  );
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    fetch("/api/top/trending")
      .then((r) => r.json())
      .then((json: TrendingContent) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [initialData]);

  if (loading) {
    return (
      <>
        <SectionSkeleton />
        <SectionSkeleton />
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <SectionBlock section={data.section1} />
      <SectionBlock section={data.section2} />
    </>
  );
}
