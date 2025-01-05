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
  const now = new Date();
  const twoDaysAgo = subDays(now, 7);

  const [selectedLimit, setSelectedLimit] = useState<number>(500);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [isTextareaOpen, setIsTextareaOpen] = useState<boolean>(false);
  const [isPostFormOpen, setIsPostFormOpen] = useState<boolean>(false);

  const [startDateTime, setStartDateTime] = useState<string>(
    format(twoDaysAgo, "yyyy-MM-dd HH:mm:ss")
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    format(now, "yyyy-MM-dd HH:mm:ss")
  );

  const limitOptions = Array.from({ length: 6 }, (_, i) => (i + 3) * 100);

  useEffect(() => {
    const savedTextareaOpen = localStorage.getItem('isTextareaOpen');
    const savedPostFormOpen = localStorage.getItem('isPostFormOpen');
    if (savedTextareaOpen) {
      setIsTextareaOpen(JSON.parse(savedTextareaOpen));
    }
    if (savedPostFormOpen) {
      setIsPostFormOpen(JSON.parse(savedPostFormOpen));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isTextareaOpen', JSON.stringify(isTextareaOpen));
  }, [isTextareaOpen]);

  useEffect(() => {
    localStorage.setItem('isPostFormOpen', JSON.stringify(isPostFormOpen));
  }, [isPostFormOpen]);

  /**
   * company_info APIを叩いて会社情報を取得
   */
  const fetchCompanyInfo = async (code: string): Promise<CompanyInfo | null> => {
    try {
      const response = await fetch(`/api/${code}/company_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        return data.data[0] as CompanyInfo;
      }
      return null;
    } catch (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
  };

  /**
   * 前日比(%) = (price_change / 前日終値) * 100
   * 前日終値 = current_price - price_change
   * 例: current_price=3450, price_change=-5 -> 前日終値=3455
   */
  const calculatePriceChangePercent = (info: CompanyInfo) => {
    const currentPriceNum = parseFloat(info.current_price || '0');
    const priceChangeNum = parseFloat(info.price_change || '0');
    const previousClose = currentPriceNum - priceChangeNum;
    if (!previousClose || isNaN(previousClose)) {
      return 0;
    }
    return (priceChangeNum / previousClose) * 100;
  };

  /**
   * 会社選択 (CompanySearch)
   */
  const handleCompanySelect = async (company: Company) => {
    const code = company.id.split(' ')[0];
    // 最新の companyInfo を取得
    const info = await fetchCompanyInfo(code);

    // company_info から会社名を優先
    const resolvedName = info?.name || company.name;
    const newCompany = { id: code, name: resolvedName };
    setSelectedCompany(newCompany);

    // コメントを取得 & すぐコピー
    // 今回、最新のinfo を引数で渡す
    await fetchComments(code, newCompany, info, startDateTime, endDateTime, selectedLimit);
  };

  /**
   * ランキングで会社選択
   */
  const handleCodeSelect = async (code: string) => {
    // 最新の companyInfo を取得
    const info = await fetchCompanyInfo(code);

    // 会社名
    const resolvedName = info?.name || '(不明な会社名)';
    const newCompany = { id: code, name: resolvedName };
    setSelectedCompany(newCompany);

    // コメントを取得 & すぐコピー
    await fetchComments(code, newCompany, info, startDateTime, endDateTime, selectedLimit);
  };

  /**
   * 日付範囲選択
   */
  const handleDateRangeSelect = (start: string, end: string) => {
    setStartDateTime(start);
    setEndDateTime(end);
    if (selectedCompany) {
      // すでに選択されている会社の code と company_info を改めて取り直すか、
      // もし state に company_info を保持しているならそれを使うなどの方法がある
      // ここではシンプルに fetchCompanyInfo -> fetchComments でもOK
      handleReFetchSelectedCompanyComments(start, end);
    }
  };

  /**
   * 選択中の会社を改めて再取得してコメント取得
   */
  const handleReFetchSelectedCompanyComments = async (start: string, end: string) => {
    if (!selectedCompany) return;
    const code = selectedCompany.id;
    // 最新の companyInfo を再取得
    const info = await fetchCompanyInfo(code);

    // コメント再取得
    await fetchComments(code, selectedCompany, info, start, end, selectedLimit);
  };

  /**
   * クリップボードへコピー
   * 今回は "info" を引数で受け取る
   */
  const copyToClipboard = async (
    comments: Comment[],
    company: Company,
    info: CompanyInfo | null
  ) => {
    if (!info) {
      console.warn('companyInfo が null のため、前日比計算できません');
      return;
    }
    try {
      // 今日の日付
      const todayString = format(new Date(), "yyyy-MM-dd");

      // 前日比(%) 計算
      const priceChangePercent = calculatePriceChangePercent(info); // ±0.XX...
      // priceChange 数値
      const priceChangeNum = parseFloat(info.price_change || '0');

      // ±表示の整形
      // price_change がプラス値の場合だけ先頭に "+", マイナスなら - が既に付いている
      const signForChange = priceChangeNum > 0 ? "+" : "";
      const displayChange = `${signForChange}${priceChangeNum.toFixed(2)}`;
      
      // パーセント表記 (+ or -)
      const signForPercent = priceChangePercent > 0 ? "+" : "";
      const displayPercent = `${signForPercent}${priceChangePercent.toFixed(2)}%`;

      // ヘッダ
      const header = `${company.name}【${company.id}】の掲示板 ${todayString} ` +
                     `前日比${displayChange} (${displayPercent})\n`;

      // ユーザーが保存している「プロンプト文」
      const promptText = (localStorage.getItem('autoSaveText_news_prompt') ?? '') + '\n';

      // コメント部分
      const commentText = comments
        .map(comment => `${comment.comment_date}\n${comment.comment}\n\n`)
        .join('');

      // 結合
      const combinedText = header + promptText + commentText;

      await navigator.clipboard.writeText(combinedText);
      alert(`${company.name}\nのコメントを${comments.length}件コピーしました`);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
      setError('クリップボードへのコピーに失敗しました');
    }
  };

  /**
   * コメントを取得 → 取得後すぐコピー
   * ここで info をパラメータで受け取り、copyToClipboard にも渡す
   */
  const fetchComments = async (
    code: string,
    company: Company,
    info: CompanyInfo | null,
    start: string,
    end: string,
    limit: number
  ) => {
    setLoading(true);
    setError('');
    console.log(
      JSON.stringify({
        code: code,
        limit: limit,
        startDateTime: start,
        endDateTime: end
      })      
    );

    try {
      const response = await fetch('/api/admin/yahoo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          limit: limit,
          startDateTime: start,
          endDateTime: end
        })
      });

      const data: CommentsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.success ? '不明なエラーが発生しました' : 'データの取得に失敗しました');
      }

      setComments(data.data);

      // 取得後にコピー
      await copyToClipboard(data.data, company, info);

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Limit(件数)変更
   */
  const handleLimitChange = async (newLimit: number) => {
    setSelectedLimit(newLimit);
    if (!selectedCompany) return;

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

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          onClick={() => setIsPostFormOpen(!isPostFormOpen)}
          variant="outline"
          className="mb-4 w-full flex items-center justify-between"
        >
          投稿フォーム
          {isPostFormOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {isPostFormOpen && <PostForm redirectAfterPost={false} />}

        <Button
          onClick={() => setIsTextareaOpen(!isTextareaOpen)}
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
