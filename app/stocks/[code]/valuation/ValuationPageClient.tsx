'use client';

import { useState, useEffect } from 'react';
import CompanyBasicInfo from '@/components/common/CompanyBasicInfo';

interface ValuationReport {
  id: number;
  code: string;
  per: number | null;
  pbr: number | null;
  industry_avg_per: number | null;
  industry_avg_pbr: number | null;
  per_evaluation: string;
  pbr_evaluation: string;
  report_content: string;
  report_type: string;
  created_at: string;
}

function EvaluationBadge({ evaluation }: { evaluation: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: '高い', className: 'bg-red-100 text-red-700' },
    neutral: { label: '普通', className: 'bg-gray-100 text-gray-700' },
    low: { label: '低い', className: 'bg-green-100 text-green-700' },
  };
  const { label, className } = config[evaluation] ?? config.neutral;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
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

function ComparisonBar({ current, avg, label }: { current: number | null; avg: number | null; label: string }) {
  if (current == null || avg == null) return null;

  const max = Math.max(current, avg) * 1.2;
  const currentPct = max > 0 ? (current / max) * 100 : 0;
  const avgPct = max > 0 ? (avg / max) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${currentPct}%` }}
          />
        </div>
        <span className="text-xs font-medium w-14 text-right">{current.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-16 shrink-0">業種平均</span>
        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gray-400 rounded-full"
            style={{ width: `${avgPct}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-14 text-right">{avg.toFixed(2)}</span>
      </div>
    </div>
  );
}

const ValuationPageClient = ({ code }: { code: string }) => {
  const [report, setReport] = useState<ValuationReport | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <CompanyBasicInfo code={code} />

      <div className="px-2 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600" />
          </div>
        ) : !report ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500 text-sm">
            レポートはまだ作成されていません
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <h2 className="text-base font-bold">PER・PBR バリュエーションレポート</h2>

            {/* PER section */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">PER</span>
                <EvaluationBadge evaluation={report.per_evaluation} />
                {report.per != null && (
                  <span className="text-sm text-gray-700 ml-auto">{Number(report.per).toFixed(2)}倍</span>
                )}
              </div>
              <ComparisonBar current={report.per ? Number(report.per) : null} avg={report.industry_avg_per ? Number(report.industry_avg_per) : null} label="当社" />
            </div>

            {/* PBR section */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">PBR</span>
                <EvaluationBadge evaluation={report.pbr_evaluation} />
                {report.pbr != null && (
                  <span className="text-sm text-gray-700 ml-auto">{Number(report.pbr).toFixed(2)}倍</span>
                )}
              </div>
              <ComparisonBar current={report.pbr ? Number(report.pbr) : null} avg={report.industry_avg_pbr ? Number(report.industry_avg_pbr) : null} label="当社" />
            </div>

            {/* Report content */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {report.report_content}
              </p>
            </div>

            {/* Footer: date and type */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-400">
                {new Date(report.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <ReportTypeBadge type={report.report_type} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValuationPageClient;
