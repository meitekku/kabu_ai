"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  PlusIcon,
  RocketIcon,
  ScaleIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RiskLevel = "stable" | "balanced" | "growth";

export interface BuilderStock {
  id: string;
  name: string;
}

interface PortfolioBuilderProps {
  risk: RiskLevel | null;
  setRisk: (r: RiskLevel) => void;
  stocks: BuilderStock[];
  onAddStock: (s: BuilderStock) => void;
  onRemoveStock: (id: string) => void;
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

const RISK_OPTIONS: Array<{
  id: RiskLevel;
  label: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
}> = [
  {
    id: "stable",
    label: "安定",
    desc: "配当・大型株中心。値動きを抑えて長期保有したい方向け",
    icon: <ShieldCheckIcon className="size-5" />,
  },
  {
    id: "balanced",
    label: "バランス",
    desc: "成長と安定のミックス。標準的なリスクで運用したい方向け",
    icon: <ScaleIcon className="size-5" />,
    badge: "推奨",
  },
  {
    id: "growth",
    label: "成長",
    desc: "成長株・中小型も許容。値動きはあるがリターンを狙う方向け",
    icon: <RocketIcon className="size-5" />,
  },
];

const RISK_LABEL_JA: Record<RiskLevel, string> = {
  stable: "安定",
  balanced: "バランス",
  growth: "成長",
};

const MAX_STOCKS = 5;

export function PortfolioBuilder({
  risk,
  setRisk,
  stocks,
  onAddStock,
  onRemoveStock,
  onSubmit,
  disabled,
}: PortfolioBuilderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSubmit = () => {
    if (!risk) return;
    const stocksLine =
      stocks.length > 0
        ? `含めたい銘柄: ${stocks.map((s) => `${s.id} ${s.name}`).join(", ")}\n`
        : "";
    const prompt =
      `リスク許容度: ${RISK_LABEL_JA[risk]}\n` +
      stocksLine +
      `上記の条件で日本株のポートフォリオを組んでください。` +
      `セクター分散・各銘柄の選定理由・配分比率(合計100%)を出してください。`;
    onSubmit(prompt);
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
          <SparklesIcon className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">AIにポートフォリオを組ませる</h3>
          <p className="text-muted-foreground text-sm">
            リスク許容度を選んで送るだけで、AIが日本株から最適な配分を提案します
          </p>
        </div>
      </div>

      {/* Step 1 */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            STEP 1
          </span>
          <span className="text-sm font-medium">リスク許容度を選択(必須)</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {RISK_OPTIONS.map((opt) => {
            const active = risk === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => setRisk(opt.id)}
                aria-pressed={active}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-card hover:border-accent-foreground/20 hover:bg-accent/40",
                )}
              >
                {opt.badge && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {opt.badge}
                  </span>
                )}
                <span
                  className={cn(
                    "transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {opt.icon}
                </span>
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            STEP 2
          </span>
          <span className="text-sm font-medium">
            含めたい銘柄(任意・最大{MAX_STOCKS}件)
          </span>
        </div>

        {stocks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stocks.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/20"
              >
                <span className="font-mono tabular-nums opacity-70">{s.id}</span>
                <span className="max-w-[10rem] truncate">{s.name}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemoveStock(s.id)}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20 disabled:opacity-50"
                  aria-label={`${s.name} を外す`}
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <BuilderStockSearch
          existing={stocks}
          onAdd={onAddStock}
          disabled={disabled || stocks.length >= MAX_STOCKS}
          open={searchOpen}
          setOpen={setSearchOpen}
        />
        {stocks.length >= MAX_STOCKS && (
          <p className="text-[11px] text-muted-foreground">
            最大{MAX_STOCKS}銘柄までです
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={disabled || !risk}
          onClick={handleSubmit}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors",
            "hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          AIにポートフォリオを組ませる
          <ArrowRightIcon className="size-4" />
        </button>
        <p className="text-center text-[10px] text-muted-foreground/70">
          ※ 提案は参考情報であり、投資判断は自己責任です
        </p>
      </div>
    </div>
  );
}

interface Company {
  id: string;
  name: string;
}

let companyCachePromise: Promise<Company[]> | null = null;

function loadCompanies(): Promise<Company[]> {
  if (companyCachePromise) return companyCachePromise;
  companyCachePromise = (async () => {
    try {
      const res = await fetch("/company.csv");
      const text = await res.text();
      const rows = text.split("\n").slice(1);
      return rows
        .filter((r) => r.trim())
        .map((row) => {
          const [id, name] = row.split(",");
          return {
            id: id?.trim() ?? "",
            name: toHalfWidth((name ?? "").trim()),
          };
        })
        .filter((c) => c.id);
    } catch (error) {
      console.error("[PortfolioBuilder] company.csv load failed:", error);
      companyCachePromise = null;
      return [];
    }
  })();
  return companyCachePromise;
}

function toHalfWidth(str: string): string {
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0),
  );
}

interface BuilderStockSearchProps {
  existing: BuilderStock[];
  onAdd: (s: BuilderStock) => void;
  disabled?: boolean;
  open: boolean;
  setOpen: (b: boolean) => void;
}

function BuilderStockSearch({
  existing,
  onAdd,
  disabled,
  open,
  setOpen,
}: BuilderStockSearchProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    loadCompanies().then((list) => {
      if (active) setCompanies(list);
    });
    return () => {
      active = false;
    };
  }, [open]);

  const suggestions = (() => {
    if (!query.trim() || companies.length === 0) return [];
    const q = toHalfWidth(query).toLowerCase();
    return companies
      .filter(
        (c) =>
          !existing.some((e) => e.id === c.id) &&
          (c.name.toLowerCase().includes(q) || c.id.includes(q)),
      )
      .slice(0, 8);
  })();

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors",
          "hover:border-foreground/40 hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <PlusIcon className="size-3.5" />
        銘柄を追加
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => {
            // 候補クリック確定を待つため少し遅延
            setTimeout(() => {
              if (!query.trim()) setOpen(false);
            }, 150);
          }}
          placeholder="銘柄名・コードで検索"
          className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-3 text-sm focus:border-border focus:bg-card focus:outline-none focus:ring-1 focus:ring-border"
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                onAdd(s);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="min-w-[3rem] font-mono text-xs tabular-nums text-muted-foreground">
                {s.id}
              </span>
              <span className="truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
