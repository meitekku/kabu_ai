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

const TYPE_STYLES: Record<
  ContentType,
  {
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    icon: string;
  }
> = {
  market_up: {
    accentColor: "border-l-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    icon: "📈",
  },
  trading_value: {
    accentColor: "border-l-[#1a1a1a]",
    badgeBg: "bg-accent",
    badgeText: "text-primary",
    icon: "💹",
  },
  stop_high: {
    accentColor: "border-l-[#1a1a1a]",
    badgeBg: "bg-[#cc0000]/10",
    badgeText: "text-[#cc0000]",
    icon: "🔺",
  },
  pts: {
    accentColor: "border-l-[#666666]",
    badgeBg: "bg-[#666666]/10",
    badgeText: "text-[#666666]",
    icon: "🌙",
  },
  yahoo_buzz: {
    accentColor: "border-l-[#1a1a1a]",
    badgeBg: "bg-[#cc0000]/10",
    badgeText: "text-[#cc0000]",
    icon: "💬",
  },
  latest_ai: {
    accentColor: "border-l-[#333333]",
    badgeBg: "bg-[#333333]/10",
    badgeText: "text-[#333333]",
    icon: "📰",
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

function stripLeadingBrackets(title: string): string {
  return title.replace(/^【[^】]*】\s*/, "").trim();
}

function ChangeRateBadge({ rate }: { rate: number | null }) {
  if (rate === null) return null;
  const pos = rate >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 tabular-nums text-right ${
        pos ? "text-shikiho-positive bg-shikiho-positive/10" : "text-shikiho-negative bg-shikiho-negative/10"
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
      className="w-7 h-7 rounded-md bg-white object-contain flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
}

function RankBadge({ rank }: { rank: number }) {
  const bg =
    rank === 1
      ? "bg-[#cc0000] text-white"
      : rank <= 3
        ? "bg-[#333] text-white"
        : "bg-[#999] text-white";
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold flex-shrink-0 ${bg}`}
    >
      {rank}
    </span>
  );
}

function TrendingCard({
  item,
  type,
  sparklines,
  rank,
}: {
  item: TrendingItem;
  type: ContentType;
  sparklines: Record<string, { prices: number[]; change: number | null }>;
  rank: number;
}) {
  const styles = TYPE_STYLES[type];
  const title = stripLeadingBrackets(item.title || "タイトルなし");

  return (
    <Link href={item.post_url} className="block group">
      <article className={`bg-card rounded-xl border border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col hover:-translate-y-0.5 hover:bg-[#f5f5f5] cursor-pointer`}>
        <div
          className={`flex items-center justify-between gap-1.5 sm:gap-2 px-3 py-2 bg-muted/80 border-b border-border border-l-[3px] ${styles.accentColor}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <RankBadge rank={rank} />
            {item.code && <LogoIcon code={item.code} />}
            {item.company_name && (
              <span className="text-[11px] sm:text-xs font-semibold text-foreground truncate">
                {item.company_name}
              </span>
            )}
            {item.code && (
              <span className="text-[10px] text-[#999] flex-shrink-0 font-mono tabular-nums">
                {item.code}
              </span>
            )}
          </div>
          <ChangeRateBadge rate={item.change_rate} />
        </div>

        <div className="px-3 py-2 flex flex-col gap-0">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-[#cc0000] transition-colors leading-snug">
            {title}
          </h3>
          {item.excerpt && (
            <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 leading-tight mt-0.5">
              {item.excerpt}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground">
            {formatTimeAgo(item.created_at)}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] text-muted-foreground/50 hidden sm:inline">AI分析</span>
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
    <div className="mb-4 sm:mb-5">
      <div className="flex items-center justify-between mb-2 sm:mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-secondary rounded animate-pulse" />
          <div className="h-4 bg-secondary rounded w-28 animate-pulse" />
        </div>
        <div className="h-5 bg-secondary rounded w-14 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/80 border-b border-border border-l-[3px] border-l-border">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 bg-secondary rounded-md animate-pulse flex-shrink-0" />
                <div className="h-3 bg-secondary rounded w-20 animate-pulse" />
                <div className="h-3 bg-secondary rounded w-8 animate-pulse" />
              </div>
              <div className="h-5 bg-secondary rounded w-12 animate-pulse flex-shrink-0" />
            </div>
            <div className="px-3 py-2.5 flex flex-col gap-1 flex-grow">
              <div className="h-3.5 bg-secondary rounded w-full animate-pulse" />
              <div className="h-3.5 bg-secondary rounded w-4/5 animate-pulse" />
              <div className="h-2.5 bg-secondary rounded w-3/5 animate-pulse mt-0.5" />
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
              <div className="h-2.5 bg-secondary rounded w-10 animate-pulse" />
              <div className="h-4 bg-secondary rounded w-20 animate-pulse" />
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
  const displayItems = section.items;
  return (
    <div className="mb-4 sm:mb-5">
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayItems.map((item, idx) => (
            <TrendingCard
              key={item.post_id}
              item={item}
              type={section.type}
              sparklines={sparklines}
              rank={idx + 1}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-8 text-center bg-muted rounded-xl border border-border">
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
    <div>
      <div className="border border-[#e5e5e5] rounded p-3">
        {data.section1.items.length > 0 && (
          <SectionBlock section={data.section1} sparklines={sparklines} />
        )}
        {data.section2.items.length > 0 && (
          <SectionBlock section={data.section2} sparklines={sparklines} />
        )}
      </div>
    </div>
  );
}
