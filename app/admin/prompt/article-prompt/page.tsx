"use client";
import React, { useState, useEffect } from 'react';

interface CompanyOption {
  code: string;
  name: string;
}

interface PostPrompt {
  code: string;
  prompt: string;
  created_at: string;
}

interface PostArticle {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
}

interface ArticlePromptData {
  prompt: PostPrompt;
  articles: PostArticle[];
}

export default function ArticlePromptPage() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [data, setData] = useState<ArticlePromptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 当日のデータがある会社一覧を取得
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/admin/article-prompt');
        const result = await response.json();

        if (result.success && result.data) {
          setCompanies(result.data);
        } else {
          setError(result.error || '会社一覧の取得に失敗しました');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '会社一覧の取得に失敗しました');
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  // 会社選択時の処理
  const handleCompanyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedCode(code);

    if (!code) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/admin/article-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        if (result.data.articles.length === 0) {
          setError('本日の記事データが見つかりません');
        }
      } else {
        setError(result.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">記事プロンプト確認</h1>

      <div className="mb-8">
        <label htmlFor="company-select" className="block text-sm font-medium text-gray-700 mb-2">
          会社を選択
        </label>
        {loadingCompanies ? (
          <div className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
            読み込み中...
          </div>
        ) : (
          <select
            id="company-select"
            value={selectedCode}
            onChange={handleCompanyChange}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- 選択してください --</option>
            {companies.map((company) => (
              <option key={company.code} value={company.code}>
                {company.code} - {company.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="flex justify-center p-8">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      )}

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* プロンプト表示 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-800">プロンプト</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600 mb-2">Code: {data.prompt.code}</p>
              <p className="whitespace-pre-wrap text-gray-800">{data.prompt.prompt}</p>
            </div>
          </div>

          {/* 記事データ表示 */}
          {data.articles.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                本日の記事 ({data.articles.length}件)
              </h2>
              <div className="space-y-4">
                {data.articles.map((article) => (
                  <div
                    key={article.id}
                    className="border border-gray-200 rounded-md p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-800">{article.title}</h3>
                      <span className="text-xs text-gray-500">
                        {new Date(article.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-700 text-sm">
                      {article.content}
                      {article.content.length >= 500 && (
                        <span className="text-gray-400 italic"> ...</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
