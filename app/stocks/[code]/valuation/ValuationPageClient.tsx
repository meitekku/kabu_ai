'use client';

import { useState, useEffect } from 'react';
import CompanyBasicInfo from '@/components/common/CompanyBasicInfo';
import { BarChart3, Shield } from 'lucide-react';

interface ValuationReport {
  id: number;
  code: string;
  per: number | null;
  pbr: number | null;
  industry_avg_per: number | null;
  industry_avg_pbr: number | null;
  expected_per: number | null;
  expected_pbr: number | null;
  per_evaluation: string;
  pbr_evaluation: string;
  report_content: string;
  report_type: string;
  created_at: string;
}

interface LiveCompanyInfo {
  trailing_pe: number | null;
  forward_pe: number | null;
  current_price: number | null;
}

function evaluatePerLive(value: number, avg: number | null | undefined): string {
  if (!avg || avg === 0) return 'neutral';
  if (value > avg * 1.3) return 'high';
  if (value < avg * 0.7) return 'low';
  return 'neutral';
}

function EvaluationBadge({ evaluation }: { evaluation: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: '割高', className: 'bg-red-100 text-red-700' },
    neutral: { label: '普通', className: 'bg-gray-100 text-gray-700' },
    low: { label: '割安', className: 'bg-green-100 text-green-700' },
  };
  const { label, className } = config[evaluation] ?? config.neutral;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}

// New component for summary
function ValuationSummary({
  per,
  pbr,
  perEvaluation,
  pbrEvaluation,
}: {
  per: number | null;
  pbr: number | null;
  perEvaluation: string;
  pbrEvaluation: string;
}) {
  if (per === null || pbr === null) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-6">
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div className="text-center">
          <h3 className="text-xs sm:text-sm text-gray-500 font-medium mb-1">現在のPER</h3>
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <span className="text-2xl sm:text-4xl font-black text-gray-800">{per.toFixed(2)}<span className="text-sm sm:text-lg ml-0.5 sm:ml-1 font-bold">倍</span></span>
            <EvaluationBadge evaluation={perEvaluation} />
          </div>
        </div>
        <div className="text-center border-l border-gray-100">
          <h3 className="text-xs sm:text-sm text-gray-500 font-medium mb-1">現在のPBR</h3>
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <span className="text-2xl sm:text-4xl font-black text-gray-800">{pbr.toFixed(2)}<span className="text-sm sm:text-lg ml-0.5 sm:ml-1 font-bold">倍</span></span>
            <EvaluationBadge evaluation={pbrEvaluation} />
          </div>
        </div>
      </div>
    </div>
  );
}


function ReportTypeBadge({ type }: { type: string }) {
  const isWeekly = type === 'weekly';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${isWeekly ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
      {isWeekly ? '週次' : '決算'}
    </span>
  );
}

function GapIndicator({ current, expected }: { current: number; expected: number }) {
  const diff = current - expected;
  const pct = expected > 0 ? (diff / expected) * 100 : 0;
  const isOver = diff > 0;
  const isNear = Math.abs(pct) < 10;

  const color = isNear ? 'text-gray-600' : isOver ? 'text-red-600' : 'text-green-600';
  const sign = diff > 0 ? '+' : '';

  return (
    <span className={`text-xs font-medium ${color}`}>
      {sign}{pct.toFixed(1)}%
    </span>
  );
}

function ComparisonScale({ current, expected, avg, label: _label }: { current: number; expected: number; avg: number; label: string }) {
  const values = [current, expected, avg];
  const min = Math.min(...values) * 0.8;
  const max = Math.max(...values) * 1.2;
  const range = max - min;

  const getPos = (val: number) => Math.max(5, Math.min(95, ((val - min) / range) * 100));

  return (
    <div className="space-y-4 py-2">
      <div className="relative h-2 bg-gray-100 rounded-full mt-8">
        {/* 業種平均マーカー */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${getPos(avg)}%` }}
        >
          <div className="h-4 w-0.5 bg-gray-400" />
          <span className="absolute -top-7 text-[9px] sm:text-[10px] text-gray-400 whitespace-nowrap font-medium">業種平均</span>
          <span className="absolute top-4 text-[9px] sm:text-[10px] text-gray-500 font-bold">{avg.toFixed(2)}</span>
        </div>

        {/* AI想定マーカー */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${getPos(expected)}%` }}
        >
          <div className="h-5 w-1 bg-amber-500 rounded-full shadow-sm" />
          <span className="absolute -top-7 text-[9px] sm:text-[10px] text-amber-600 whitespace-nowrap font-bold">AI想定</span>
          <span className="absolute top-4 text-[9px] sm:text-[10px] text-amber-600 font-black">{expected.toFixed(2)}</span>
        </div>

        {/* 現在値マーカー */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${getPos(current)}%` }}
        >
          <div className="h-7 w-1.5 bg-blue-600 rounded-full shadow-md z-10" />
          <span className="absolute -top-8 text-[9px] sm:text-[10px] text-blue-700 whitespace-nowrap font-black">現在</span>
          <span className="absolute top-5 text-[10px] sm:text-[11px] text-blue-800 font-black bg-blue-50 px-1 rounded border border-blue-100">{current.toFixed(2)}</span>
        </div>
      </div>
      <div className="pt-8">
        <div className="text-[11px] sm:text-xs text-gray-600 leading-relaxed bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100">
          現在値はAI想定値に対し
          <GapIndicator current={current} expected={expected} />
          の乖離があります。
          <span className="block sm:inline sm:ml-1">
            業種平均({avg.toFixed(2)}倍)と比較すると
            <span className="font-bold underline decoration-blue-200">{current > avg ? '割高' : '割安'}</span>な水準です。
          </span>
        </div>
      </div>
    </div>
  );
}

function ValuationCard({ 
  title, 
  current, 
  expected, 
  avg, 
  evaluation,
  description 
}: { 
  title: string; 
  current: number | null; 
  expected: number | null; 
  avg: number | null; 
  evaluation: string;
  description: string;
}) {
  if (current == null || expected == null || avg == null) return null;

  const diffPct = ((current - expected) / expected) * 100;
  const isOver = diffPct > 5;
  const isUnder = diffPct < -5;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-bold text-sm sm:text-base text-gray-800 flex items-center gap-2">
            {title} 分析
            <EvaluationBadge evaluation={evaluation} />
          </h3>
          <p className="text-[10px] text-gray-400 font-medium hidden sm:block">{description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">現在の{title}</div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{current.toFixed(2)}<span className="text-xs sm:text-sm ml-0.5 font-bold">倍</span></div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-4 sm:space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-amber-50/40 rounded-xl p-2.5 sm:p-3 border border-amber-100/50">
            <div className="text-[10px] text-amber-600 font-bold mb-1">AI想定値</div>
            <div className="text-base sm:text-xl font-black text-amber-700">{expected.toFixed(2)}<span className="text-xs ml-0.5">倍</span></div>
          </div>
          <div className="bg-blue-50/40 rounded-xl p-2.5 sm:p-3 border border-blue-100/50">
            <div className="text-[10px] text-blue-600 font-bold mb-1">想定との乖離</div>
            <div className={`text-base sm:text-xl font-black ${isOver ? 'text-red-600' : isUnder ? 'text-green-600' : 'text-gray-600'}`}>
              {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%
            </div>
          </div>
        </div>

        <ComparisonScale current={current} expected={expected} avg={avg} label={title} />
      </div>
    </div>
  );
}

const ValuationPageClient = ({ code }: { code: string }) => {
  const [report, setReport] = useState<ValuationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [livePer, setLivePer] = useState<number | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/stocks/${code}/valuation-report`);
        const data = await res.json();
        if (data.success && data.data) {
          setReport(data.data);
        }
      } catch (error) {
        console.error('Error fetching valuation report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [code]);

  useEffect(() => {
    const fetchLivePer = async () => {
      try {
        const res = await fetch(`/api/stocks/${code}/company_info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data[0]) {
          const info = data.data[0] as LiveCompanyInfo;
          const per = info.trailing_pe != null ? info.trailing_pe : info.forward_pe;
          if (per != null) {
            setLivePer(Number(per));
          }
        }
      } catch (error) {
        console.error('Error fetching live PER:', error);
      }
    };
    fetchLivePer();
    const interval = setInterval(fetchLivePer, 60000);
    return () => clearInterval(interval);
  }, [code]);

  const effectivePer = livePer ?? (report?.per ? Number(report.per) : null);
  const effectivePerEvaluation =
    livePer != null && report?.industry_avg_per != null
      ? evaluatePerLive(livePer, Number(report.industry_avg_per))
      : report?.per_evaluation ?? 'neutral';

  return (
    <div className="bg-gray-50 min-h-screen px-4 sm:px-6">
      <CompanyBasicInfo code={code} />

      <div className="max-w-4xl mx-auto py-4 sm:py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-gray-200 border-t-blue-600" />
          </div>
        ) : !report ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">レポートはまだ作成されていません</p>
            <p className="text-xs text-gray-400 mt-2">決算発表や重要な市場ニュースの後に生成されます</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">AIバリュエーション診断</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase bg-white px-2 py-1 rounded border border-gray-100">
                  {new Date(report.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                <ReportTypeBadge type={report.report_type} />
              </div>
            </div>

            <ValuationSummary
              per={effectivePer}
              pbr={report.pbr ? Number(report.pbr) : null}
              perEvaluation={effectivePerEvaluation}
              pbrEvaluation={report.pbr_evaluation}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <ValuationCard
                title="PER"
                current={effectivePer}
                expected={report.expected_per ? Number(report.expected_per) : null}
                avg={report.industry_avg_per ? Number(report.industry_avg_per) : null}
                evaluation={effectivePerEvaluation}
                description="現在利益に対する株価の妥当性を評価します。"
              />
              <ValuationCard 
                title="PBR"
                current={report.pbr ? Number(report.pbr) : null}
                expected={report.expected_pbr ? Number(report.expected_pbr) : null}
                avg={report.industry_avg_pbr ? Number(report.industry_avg_pbr) : null}
                evaluation={report.pbr_evaluation}
                description="純資産に対する株価の妥当性を評価します。"
              />
            </div>

            {/* AI Analysis Summary */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-50 bg-gray-50/50">
                <h3 className="font-bold text-sm sm:text-base text-gray-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  AI 分析サマリー
                </h3>
              </div>
              <div className="p-3 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed space-y-4">
                  {report.report_content}
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-gray-400 max-w-lg mx-auto">
                ※本診断はAIによる独自のアルゴリズムに基づいた推計値であり、投資の最終決定はご自身の判断で行ってください。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValuationPageClient;
