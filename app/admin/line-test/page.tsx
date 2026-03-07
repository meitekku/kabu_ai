'use client';

import { useState } from 'react';

type ReportType = 'midday' | 'closing';

export default function LineTestPage() {
  const [loading, setLoading] = useState<ReportType | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendTest = async (reportType: ReportType) => {
    setLoading(reportType);
    setResult(null);

    try {
      const res = await fetch('/api/admin/line/test-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, message: data.error || 'エラーが発生しました' });
      } else {
        setResult({ success: data.success, message: data.message });
      }
    } catch {
      setResult({ success: false, message: 'ネットワークエラーが発生しました' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">LINE通知テスト</h1>
        <p className="mt-2 text-gray-600">
          お気に入り銘柄のAIレポートを生成し、自分のLINEにテスト送信します。
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => sendTest('midday')}
          disabled={loading !== null}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'midday' ? '生成中...' : '昼レポート(12:00)を今すぐ送信'}
        </button>

        <button
          onClick={() => sendTest('closing')}
          disabled={loading !== null}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'closing' ? '生成中...' : '終値レポート(16:00)を今すぐ送信'}
        </button>
      </div>

      {loading && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          レポートを生成中です。Claude Agentが分析を行うため、1〜2分ほどかかる場合があります...
        </div>
      )}

      {result && (
        <div
          className={`mt-4 p-4 rounded-lg border ${
            result.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
