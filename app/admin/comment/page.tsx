"use client"

import PostForm from '@/components/post/PostForm';
import { useState, useEffect } from 'react';
import { format, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from 'lucide-react';
import CompanySearch from '@/components/parts/common/CompanySearch';
import AutoSaveTextarea from '@/components/parts/common/AutoSaveTextarea';
import DateRangeSelector from '@/components/parts/admin/DateRangeSelector';
import YahooBBSRanking from '@/components/temp/YahooBBSRanking';

// company_info テーブルのデータ構造
interface CompanyInfo {
  code: string;
  name: string;
  current_price: string;   // 例: "3450.00"
  price_change: string;    // 例: "-5.00"
  // ... 以下省略
}

interface Comment {
  id: string;
  comment: string;
  comment_date: string;
}

interface CommentsResponse {
  success: boolean;
  data: Comment[];
}

interface Company {
  id: string;   // "コード" を格納
  name: string; // "会社名" を格納
}

export default function Home() {
  console.log('[Home Component] Rendering Home component');

  const now = new Date();
  const twoDaysAgo = subDays(now, 7);

  const [selectedLimit, setSelectedLimit] = useState<number>(500);
  console.log('[Home Component] selectedLimit:', selectedLimit);

  const [comments, setComments] = useState<Comment[]>([]);
  console.log('[Home Component] comments state:', comments);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  console.log('[Home Component] selectedCompany:', selectedCompany);

  const [isTextareaOpen, setIsTextareaOpen] = useState<boolean>(false);
  const [isPostFormOpen, setIsPostFormOpen] = useState<boolean>(false);

  const [startDateTime, setStartDateTime] = useState<string>(
    format(twoDaysAgo, "yyyy-MM-dd HH:mm:ss")
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    format(now, "yyyy-MM-dd HH:mm:ss")
  );
  console.log('[Home Component] Date range:', { startDateTime, endDateTime });

  const limitOptions = Array.from({ length: 6 }, (_, i) => (i + 3) * 100);

  // --------------------------------------------------------------------------------
  // useEffect: ローカルストレージから isTextareaOpen と isPostFormOpen の状態復元
  // --------------------------------------------------------------------------------
  useEffect(() => {
    console.log('[useEffect: load from localStorage] Mounting...');
    const savedTextareaOpen = localStorage.getItem('isTextareaOpen');
    const savedPostFormOpen = localStorage.getItem('isPostFormOpen');
    console.log('[useEffect: load from localStorage] isTextareaOpen:', savedTextareaOpen, 'isPostFormOpen:', savedPostFormOpen);

    if (savedTextareaOpen) {
      setIsTextareaOpen(JSON.parse(savedTextareaOpen));
    }
    if (savedPostFormOpen) {
      setIsPostFormOpen(JSON.parse(savedPostFormOpen));
    }
  }, []);

  // --------------------------------------------------------------------------------
  // useEffect: isTextareaOpen の変更時に localStorage へ保存
  // --------------------------------------------------------------------------------
  useEffect(() => {
    console.log('[useEffect: save isTextareaOpen] isTextareaOpen changed ->', isTextareaOpen);
    localStorage.setItem('isTextareaOpen', JSON.stringify(isTextareaOpen));
  }, [isTextareaOpen]);

  // --------------------------------------------------------------------------------
  // useEffect: isPostFormOpen の変更時に localStorage へ保存
  // --------------------------------------------------------------------------------
  useEffect(() => {
    console.log('[useEffect: save isPostFormOpen] isPostFormOpen changed ->', isPostFormOpen);
    localStorage.setItem('isPostFormOpen', JSON.stringify(isPostFormOpen));
  }, [isPostFormOpen]);

  // --------------------------------------------------------------------------------
  // company_info APIを叩いて会社情報を取得
  // --------------------------------------------------------------------------------
  const fetchCompanyInfo = async (code: string): Promise<CompanyInfo | null> => {
    console.log('[fetchCompanyInfo] Fetching company info for code:', code);
    try {
      const response = await fetch(`/api/${code}/company_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      console.log('[fetchCompanyInfo] Response data:', data);

      if (data.success && data.data && data.data.length > 0) {
        console.log('[fetchCompanyInfo] Company info found:', data.data[0]);
        return data.data[0] as CompanyInfo;
      }
      console.warn('[fetchCompanyInfo] No company info found for code:', code);
      return null;
    } catch (error) {
      console.error('[fetchCompanyInfo] Error fetching company info:', error);
      return null;
    }
  };

  // --------------------------------------------------------------------------------
  // 前日比(%) = (price_change / 前日終値) * 100
  // 前日終値 = current_price - price_change
  // --------------------------------------------------------------------------------
  const calculatePriceChangePercent = (info: CompanyInfo) => {
    console.log('[calculatePriceChangePercent] info:', info);
    const currentPriceNum = parseFloat(info.current_price || '0');
    const priceChangeNum = parseFloat(info.price_change || '0');
    const previousClose = currentPriceNum - priceChangeNum;

    if (!previousClose || isNaN(previousClose)) {
      console.warn('[calculatePriceChangePercent] previousClose is invalid:', previousClose);
      return 0;
    }
    const result = (priceChangeNum / previousClose) * 100;
    console.log('[calculatePriceChangePercent] result:', result);
    return result;
  };

  // --------------------------------------------------------------------------------
  // CompanySearch で会社選択
  // --------------------------------------------------------------------------------
  const handleCompanySelect = async (company: Company) => {
    console.log('[handleCompanySelect] Selected company from search:', company);
    const code = company.id.split(' ')[0];
    // 最新の companyInfo を取得
    const info = await fetchCompanyInfo(code);

    // company_info から会社名を優先
    const resolvedName = info?.name || company.name;
    const newCompany = { id: code, name: resolvedName };
    setSelectedCompany(newCompany);
    console.log('[handleCompanySelect] setSelectedCompany ->', newCompany);

    // コメントを取得 & すぐコピー
    await fetchComments(code, newCompany, info, startDateTime, endDateTime, selectedLimit);
  };

  // --------------------------------------------------------------------------------
  // ランキングで会社選択
  // --------------------------------------------------------------------------------
  const handleCodeSelect = async (code: string) => {
    console.log('[handleCodeSelect] Selected code from ranking:', code);
    // 最新の companyInfo を取得
    const info = await fetchCompanyInfo(code);

    const resolvedName = info?.name || '(不明な会社名)';
    const newCompany = { id: code, name: resolvedName };
    setSelectedCompany(newCompany);
    console.log('[handleCodeSelect] setSelectedCompany ->', newCompany);

    // コメントを取得 & すぐコピー
    await fetchComments(code, newCompany, info, startDateTime, endDateTime, selectedLimit);
  };

  // --------------------------------------------------------------------------------
  // 日付範囲選択
  // --------------------------------------------------------------------------------
  const handleDateRangeSelect = (start: string, end: string) => {
    console.log('[handleDateRangeSelect] New range:', { start, end });
    setStartDateTime(start);
    setEndDateTime(end);

    if (selectedCompany) {
      console.log('[handleDateRangeSelect] Re-fetching comments for selectedCompany:', selectedCompany);
      handleReFetchSelectedCompanyComments(start, end);
    }
  };

  // --------------------------------------------------------------------------------
  // 選択中の会社を改めて再取得してコメント取得
  // --------------------------------------------------------------------------------
  const handleReFetchSelectedCompanyComments = async (start: string, end: string) => {
    console.log('[handleReFetchSelectedCompanyComments] start, end:', { start, end });
    if (!selectedCompany) {
      console.warn('[handleReFetchSelectedCompanyComments] No selectedCompany. Skip fetching.');
      return;
    }
    const code = selectedCompany.id;
    // 最新の companyInfo を再取得
    const info = await fetchCompanyInfo(code);

    // コメント再取得
    await fetchComments(code, selectedCompany, info, start, end, selectedLimit);
  };

  // --------------------------------------------------------------------------------
  // クリップボードへコピー
  // --------------------------------------------------------------------------------
  const copyToClipboard = async (
    comments: Comment[],
    company: Company,
    info: CompanyInfo | null
  ) => {
    console.log('[copyToClipboard] Copying to clipboard for company:', company, 'info:', info);
    if (!info) {
      console.warn('[copyToClipboard] companyInfo が null のため、前日比計算できません');
      return;
    }
    try {
      const todayString = format(new Date(), "yyyy-MM-dd");
      const priceChangePercent = calculatePriceChangePercent(info); 
      const priceChangeNum = parseFloat(info.price_change || '0');

      const signForChange = priceChangeNum > 0 ? "+" : "";
      const displayChange = `${signForChange}${priceChangeNum.toFixed(2)}`;

      const signForPercent = priceChangePercent > 0 ? "+" : "";
      const displayPercent = `${signForPercent}${priceChangePercent.toFixed(2)}%`;

      const header = `${company.name}【${company.id}】の掲示板 ${todayString} 前日比${displayChange} (${displayPercent})\n`;
      const promptText = (localStorage.getItem('autoSaveText_news_prompt') ?? '') + '\n';

      const commentText = comments
        .map(comment => `${comment.comment_date}\n${comment.comment}\n\n`)
        .join('');

      const combinedText = header + promptText + commentText;

      await navigator.clipboard.writeText(combinedText);
      console.log('[copyToClipboard] Clipboard write success. Combined text length:', combinedText.length);
      alert(`${company.name}\nのコメントを${comments.length}件コピーしました`);
    } catch (err) {
      console.error('[copyToClipboard] クリップボードへのコピーに失敗:', err);
      setError('クリップボードへのコピーに失敗しました');
    }
  };

  // --------------------------------------------------------------------------------
  // コメントを取得 → 取得後すぐコピー
  // --------------------------------------------------------------------------------
  const fetchComments = async (
    code: string,
    company: Company,
    info: CompanyInfo | null,
    start: string,
    end: string,
    limit: number
  ) => {
    console.log('[fetchComments] Start fetching comments with:', {
      code, company, info, start, end, limit
    });
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/yahoo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          limit,
          startDateTime: start,
          endDateTime: end
        })
      });

      console.log('[fetchComments] Raw response object:', response);
      const data: CommentsResponse = await response.json();
      console.log('[fetchComments] Parsed JSON:', data);

      if (!response.ok) {
        throw new Error(
          data.success ? '不明なエラーが発生しました' : 'データの取得に失敗しました'
        );
      }

      setComments(data.data);
      console.log('[fetchComments] Comments set. Count:', data.data.length);

      // 取得後にコピー
      await copyToClipboard(data.data, company, info);
    } catch (err) {
      console.error('[fetchComments] Error:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      setComments([]);
    } finally {
      setLoading(false);
      console.log('[fetchComments] Fetching comments done.');
    }
  };

  // --------------------------------------------------------------------------------
  // Limit(件数)変更
  // --------------------------------------------------------------------------------
  const handleLimitChange = async (newLimit: number) => {
    console.log('[handleLimitChange] newLimit ->', newLimit);
    setSelectedLimit(newLimit);

    if (!selectedCompany) {
      console.warn('[handleLimitChange] No company selected. Skip refetch.');
      return;
    }
    // 会社情報を再取得したいなら fetchCompanyInfo する
    const info = await fetchCompanyInfo(selectedCompany.id);
    // 取得した新しい info を使って再度コメント取得
    await fetchComments(
      selectedCompany.id,
      selectedCompany,
      info,
      startDateTime,
      endDateTime,
      newLimit
    );
  };

  // --------------------------------------------------------------------------------
  // JSXの返却
  // --------------------------------------------------------------------------------
  return (
    <main className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          onClick={() => {
            console.log('[Button: 投稿フォーム] Toggling isPostFormOpen from', isPostFormOpen, 'to', !isPostFormOpen);
            setIsPostFormOpen(!isPostFormOpen);
          }}
          variant="outline"
          className="mb-4 w-full flex items-center justify-between"
        >
          投稿フォーム
          {isPostFormOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {isPostFormOpen && <PostForm redirectAfterPost={false} />}

        <Button
          onClick={() => {
            console.log('[Button: プロンプト設定] Toggling isTextareaOpen from', isTextareaOpen, 'to', !isTextareaOpen);
            setIsTextareaOpen(!isTextareaOpen);
          }}
          variant="outline"
          className="mb-4 w-full flex items-center justify-between"
        >
          プロンプト設定
          {isTextareaOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {isTextareaOpen && (
          <div className="mb-4">
            <AutoSaveTextarea storageKey="news_prompt" />
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="w-96">
            <CompanySearch 
              enableNavigation={false}
              onCompanySelect={handleCompanySelect}
            />
          </div>

          <DateRangeSelector onTimeRangeSelect={handleDateRangeSelect} />

          <select
            id="limit"
            className="w-24 p-2 border rounded-md"
            value={selectedLimit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
          >
            {limitOptions.map((limit) => (
              <option key={limit} value={limit}>
                {limit}件
              </option>
            ))}
          </select>

          <YahooBBSRanking 
            onCodeSelect={handleCodeSelect}
            selectedCompanyFromSearch={selectedCompany}
          />
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="p-4 relative min-h-[100px]">
              <div className="pr-4">
                {comment.comment}
              </div>
              <div className="absolute bottom-2 right-4 text-sm text-gray-500">
                {comment.comment_date}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {comments.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          {comments.length}件のコメントを表示中
        </div>
      )}
    </main>
  );
}
