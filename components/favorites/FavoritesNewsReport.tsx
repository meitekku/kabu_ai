'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface Report {
  id: number;
  report_type: 'midday' | 'closing';
  content: string;
  stock_codes: string[];
  generation_date: string;
  created_at: string;
}

interface FavoritesNewsReportProps {
  date?: string;
}

export function FavoritesNewsReport({ date }: FavoritesNewsReportProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (date) params.set('date', date);
        const res = await fetch(`/api/favorites/news?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports || []);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, [date]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">まだレポートが生成されていません</p>
        <p className="text-xs mt-1">平日 11:30 / 15:30 に自動生成されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div key={report.id} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              report.report_type === 'midday'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {report.report_type === 'midday' ? '昼レポート' : '終値レポート'}
            </span>
            <span className="text-xs text-gray-500">{report.generation_date}</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {report.content}
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {report.stock_codes.map((code) => (
              <a
                key={code}
                href={`/stocks/${code}/news`}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {code}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
