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
    headerBorder: string;
    badgeBg: string;
    badgeText: string;
    sectionBorder: string;
    icon: string;
    upColor: string;
    downColor: string;
  }
> = {
  market_up: {
    borderColor: "border-l-green-500",
    headerBorder: "border-l-4 border-l-green-500",
    badgeBg: "bg-green-50 border border-green-200",
    badgeText: "text-green-700",
    sectionBorder: "border-l-4 border-green-500",
    icon: "📈",
    upColor: "text-green-700 bg-green-50 border border-green-200",
    downColor: "text-red-700 bg-red-50 border border-red-200",
  },
  trading_value: {
    borderColor: "border-l-blue-500",
    headerBorder: "border-l-4 border-l-blue-500",
    badgeBg: "bg-blue-50 border border-blue-200",
    badgeText: "text-blue-700",
    sectionBorder: "border-l-4 border-blue-500",
    icon: "💹",
    upColor: "text-green-700 bg-green-50 border border-green-200",
    downColor: "text-red-700 bg-red-50 border border-red-200",
  },
  stop_high: {
    borderColor: "border-l-rose-500",
    headerBorder: "border-l-4 border-l-rose-500",
    badgeBg: "bg-rose-50 border border-rose-200",
    badgeText: "text-rose-700",
    sectionBorder: "border-l-4 border-rose-500",
    icon: "🔺",
    upColor: "text-green-700 bg-green-50 border border-green-200",
    downColor: "text-red-700 bg-red-50 border border-red-200",
  },
  pts: {
    borderColor: "border-l-violet-500",
    headerBorder: "border-l-4 border-l-violet-500",
    badgeBg: "bg-violet-50 border border-violet-200",
    badgeText: "text-violet-700",
    sectionBorder: "border-l-4 border-violet-500",
    icon: "🌙",
    upColor: "text-green-700 bg-green-50 border border-green-200",
    downColor: "text-red-700 bg-red-50 border border-red-200",
  },
  yahoo_buzz: {
    borderColor: "border-l-amber-500",
    headerBorder: "border-l-4 border-l-amber-500",
    badgeBg: "bg-amber-50 border border-amber-200",
    badgeText: "text-amber-700",
    sectionBorder: "border-l-4 border-amber-500",
    icon: "💬",
    upColor: "text-green-700 bg-green-50 border border-green-200",
    downColor: "text-red-700 bg-red-50 border border-red-200",
  },
  latest_ai: {
    borderColor: "border-l-slate-400",
    headerBorder: "border-l-4 border-l-slate-400",
    badgeBg: "bg-slate-50 border border-slate-200",
    badgeText: "text-slate-600",
    sectionBorder: "border-l-4 border-slate-400",
    icon: "📰",
    upColor: "text-green-700 bg-green-50 border border-green-200",
    downColor: "text-red-700 bg-red-50 border border-red-200",
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

// タイトル先頭の【...】を除去
function stripLeadingBrackets(title: string): string {
  return title.replace(/^【[^】]*】\s*/, "").trim();
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
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
        pos ? upColor : downColor
      }`}
    >
      {pos ? "▲" : "▼"} {Math.abs(rate).toFixed(1)}%
    </span>
  );
}

function LogoIcon({ code }: { code: string }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) return null;

  return (
    <Image
      src={`/images/logos/${code}.png`}
      alt=""
      width={28}
      height={28}
      className="w-7 h-7 rounded bg-white object-contain flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
}

function TrendingCard({
  item,
  type,
  sparklines,
}: {
  item: TrendingItem;
  type: ContentType;
  sparklines: Record<string, { prices: number[]; change: number | null }>;
}) {
  const styles = TYPE_STYLES[type];
  const title = stripLeadingBrackets(item.title || "タイトルなし");

  return (
    <Link href={item.post_url} className="block group h-full">
      <article className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150 overflow-hidden h-full flex flex-col">
        {/* Company header — left accent border */}
        <div
          className={`flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border-b border-gray-200 ${styles.headerBorder}`}
        >
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            {item.code && <LogoIcon code={item.code} />}
            {item.company_name && (
              <span className="text-[11px] sm:text-xs font-bold text-gray-700 truncate">
                {item.company_name}
              </span>
            )}
            {item.code && (
              <span className="text-[11px] sm:text-xs text-gray-400 flex-shrink-0 font-mono">
                {item.code}
              </span>
            )}
          </div>
          <ChangeRateBadge
            rate={item.change_rate}
            upColor={styles.upColor}
            downColor={styles.downColor}
          />
        </div>

        {/* Content */}
        <div className="px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col flex-grow gap-1">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors leading-snug">
            {title}
          </h3>
          {item.excerpt && (
            <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 leading-relaxed">
              {item.excerpt}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-t border-gray-100 bg-gray-50">
          <span className="text-[11px] sm:text-xs text-gray-400">
            {formatTimeAgo(item.created_at)}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-gray-400 hidden sm:inline">AI分析</span>
            {item.code && (
              <SparklineChart
                code={item.code}
                width={60}
                height={18}
                data={sparklines[item.code] ?? null}
              />
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="mb-4 sm:mb-6">
      {/* section header — matches SectionBlock header exactly */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 sm:pb-2.5 border-b-2 border-gray-200 pl-2 sm:pl-3 border-l-4 border-l-gray-200">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 sm:h-4 bg-gray-100 rounded w-24 sm:w-32 animate-pulse" />
        </div>
        <div className="h-4 sm:h-5 bg-gray-100 rounded w-12 sm:w-14 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col"
          >
            {/* company header row */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border-b border-gray-200 border-l-4 border-l-gray-200">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                <div className="h-3 bg-gray-100 rounded w-16 sm:w-20 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-7 sm:w-8 animate-pulse" />
              </div>
              <div className="h-4 sm:h-5 bg-gray-100 rounded w-10 sm:w-12 animate-pulse flex-shrink-0" />
            </div>
            {/* content */}
            <div className="px-2 sm:px-3 py-2 sm:py-2.5 flex flex-col gap-1 flex-grow">
              <div className="h-3 sm:h-3.5 bg-gray-100 rounded w-full animate-pulse" />
              <div className="h-3 sm:h-3.5 bg-gray-100 rounded w-4/5 animate-pulse" />
              <div className="h-2.5 bg-gray-100 rounded w-3/5 animate-pulse mt-0.5" />
            </div>
            {/* footer */}
            <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-t border-gray-100 bg-gray-50">
              <div className="h-2.5 bg-gray-100 rounded w-8 sm:w-10 animate-pulse" />
              <div className="h-4 sm:h-5 bg-gray-100 rounded w-16 sm:w-20 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  sparklines,
}: {
  section: TrendingSectionData;
  sparklines: Record<string, { prices: number[]; change: number | null }>;
}) {
  const styles = TYPE_STYLES[section.type];
  return (
    <div className="mb-4 sm:mb-6">
      {/* Section header */}
      <div
        className={`flex items-center justify-between mb-2 sm:mb-3 pb-2 sm:pb-2.5 border-b-2 border-gray-200 pl-2 sm:pl-3 ${styles.sectionBorder}`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base leading-none">{styles.icon}</span>
          <h2 className="text-xs sm:text-sm font-bold text-gray-800 tracking-wide">
            {section.label}
          </h2>
        </div>
        <span
          className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2.5 py-0.5 rounded ${styles.badgeBg} ${styles.badgeText}`}
        >
          {section.time_label}
        </span>
      </div>

      {/* Cards */}
      {section.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {section.items.map((item) => (
            <TrendingCard
              key={item.post_id}
              item={item}
              type={section.type}
              sparklines={sparklines}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-lg border border-gray-200">
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
  const [sparklines, setSparklines] = useState<
    Record<string, { prices: number[]; change: number | null }>
  >({});

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

  useEffect(() => {
    if (!data) return;
    const codes = new Set<string>();
    [...data.section1.items, ...data.section2.items].forEach((item) => {
      if (item.code && /^[0-9A-Z]{4}$/.test(item.code)) codes.add(item.code);
    });
    if (codes.size === 0) return;
    fetch(`/api/stocks/sparklines?codes=${[...codes].join(",")}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setSparklines)
      .catch(() => {});
  }, [data]);

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
      <SectionBlock section={data.section1} sparklines={sparklines} />
      <SectionBlock section={data.section2} sparklines={sparklines} />
    </>
  );
}
