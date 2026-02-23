"use client";

import PostForm from "@/components/post/PostForm";
import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import CompanySearch from "@/components/parts/common/CompanySearch";
import AutoSaveTextarea from "@/components/parts/common/AutoSaveTextarea";
import DateRangeSelector from "@/components/parts/admin/DateRangeSelector";
import YahooBBSRanking from "@/components/temp/YahooBBSRanking";

interface CompanyInfo {
  code: string;
  name: string;
  current_price: string;
  price_change: string;
}

interface Comment {
  id: string;
  comment: string;
  comment_date: string;
}

interface CommentsResponse {
  success: boolean;
  data: Comment[];
  error?: string;
}

interface Company {
  id: string;
  name: string;
}

export default function Home() {
  const now = new Date();
  const twoDaysAgo = subDays(now, 7);

  const [selectedLimit, setSelectedLimit] = useState<number>(500);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isTextareaOpen, setIsTextareaOpen] = useState<boolean>(false);
  const [isPostFormOpen, setIsPostFormOpen] = useState<boolean>(false);
  const [startDateTime, setStartDateTime] = useState<string>(
    format(twoDaysAgo, "yyyy-MM-dd HH:mm:ss")
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    format(now, "yyyy-MM-dd HH:mm:ss")
  );
  const [combinedCommentText, setCombinedCommentText] = useState<string>("");

  const limitOptions = Array.from({ length: 6 }, (_, i) => (i + 3) * 100);

  useEffect(() => {
    const savedTextareaOpen = localStorage.getItem("isTextareaOpen");
    const savedPostFormOpen = localStorage.getItem("isPostFormOpen");

    if (savedTextareaOpen) {
      setIsTextareaOpen(JSON.parse(savedTextareaOpen));
    }
    if (savedPostFormOpen) {
      setIsPostFormOpen(JSON.parse(savedPostFormOpen));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("isTextareaOpen", JSON.stringify(isTextareaOpen));
  }, [isTextareaOpen]);

  useEffect(() => {
    localStorage.setItem("isPostFormOpen", JSON.stringify(isPostFormOpen));
  }, [isPostFormOpen]);

  const fetchCompanyInfo = async (code: string): Promise<CompanyInfo | null> => {
    try {
      const dbResponse = await fetch(`/api/stocks/${code}/company_info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const dbData = await dbResponse.json();

      if (dbData.success && dbData.data && dbData.data.length > 0) {
        const companyInfo: CompanyInfo = {
          ...dbData.data[0],
          current_price: dbData.data[0].current_price || "0",
          price_change: dbData.data[0].price_change || "0",
        };
        return companyInfo;
      }
      return null;
    } catch {
      return null;
    }
  };

  const calculatePriceChangePercent = (info: CompanyInfo) => {
    const currentPriceNum = parseFloat(info.current_price || "0");
    const priceChangeNum = parseFloat(info.price_change || "0");
    const previousClose = currentPriceNum - priceChangeNum;

    if (!previousClose || isNaN(previousClose)) return 0;

    return (priceChangeNum / previousClose) * 100;
  };

  const handleCompanySelect = async (company: Company) => {
    const code = company.id.split(" ")[0];
    const info = await fetchCompanyInfo(code);
    const resolvedName = info?.name || company.name;
    const newCompany = { id: code, name: resolvedName };
    setSelectedCompany(newCompany);
    await fetchComments(code, newCompany, info, startDateTime, endDateTime, selectedLimit);
  };

  const handleCodeSelect = async (code: string) => {
    const info = await fetchCompanyInfo(code);
    const resolvedName = info?.name || "(不明な会社名)";
    const newCompany = { id: code, name: resolvedName };
    setSelectedCompany(newCompany);
    await fetchComments(code, newCompany, info, startDateTime, endDateTime, selectedLimit);
  };

  const handleDateRangeSelect = (start: string, end: string) => {
    setStartDateTime(start);
    setEndDateTime(end);

    if (selectedCompany) {
      handleReFetchSelectedCompanyComments(start, end);
    }
  };

  const handleReFetchSelectedCompanyComments = async (start: string, end: string) => {
    if (!selectedCompany) return;
    const code = selectedCompany.id;
    const info = await fetchCompanyInfo(code);
    await fetchComments(code, selectedCompany, info, start, end, selectedLimit);
  };

  const copyToClipboard = async (
    comments: Comment[],
    company: Company,
    info: CompanyInfo | null
  ) => {
    const todayString = format(new Date(), "yyyy-MM-dd");

    let header: string;
    if (info) {
      const priceChangePercent = calculatePriceChangePercent(info);
      const priceChangeNum = parseFloat(info.price_change || "0");
      const signForChange = priceChangeNum > 0 ? "+" : "";
      const displayChange = `${signForChange}${priceChangeNum.toFixed(2)}`;
      const signForPercent = priceChangePercent > 0 ? "+" : "";
      const displayPercent = `${signForPercent}${priceChangePercent.toFixed(2)}%`;
      header = `${company.name}【${company.id}】の掲示板 ${todayString} 前日比${displayChange} (${displayPercent})\n`;
    } else {
      header = `${company.name}【${company.id}】の掲示板 ${todayString}\n`;
    }

    const promptText = (localStorage.getItem("autoSaveText_news_prompt") ?? "") + "\n";
    const commentText = comments.map((comment) => `${comment.comment_date}\n${comment.comment}\n\n`).join("");

    const combinedText = header + promptText + commentText;
    setCombinedCommentText(combinedText);

    try {
      await navigator.clipboard.writeText(combinedText);
      alert(`${company.name}\nのコメントを${comments.length}件コピーしました`);
    } catch {
      // clipboard APIが失敗した場合（ユーザージェスチャー期限切れ等）
      // コピーボタンで手動コピーできるようにテキストは保持済み
    }
  };

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(combinedCommentText);
      alert("コメントをコピーしました");
    } catch (err) {
      console.error("コピーに失敗しました:", err);
      alert("コピーに失敗しました。もう一度お試しください。");
    }
  };

  const fetchComments = async (
    code: string,
    company: Company,
    info: CompanyInfo | null,
    start: string,
    end: string,
    limit: number
  ) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/yahoo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, limit, startDateTime: start, endDateTime: end }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `APIエラー: ${response.status}`);
      }

      const data: CommentsResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || "データの取得に失敗しました");
      }

      setComments(data.data);
      await copyToClipboard(data.data, company, info);
    } catch (err) {
      console.error("コメント取得エラー:", err);
      setError(err instanceof Error ? 
        `コメントの取得に失敗しました: ${err.message}` : 
        "予期せぬエラーが発生しました。しばらく時間をおいて再度お試しください。"
      );
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = async (newLimit: number) => {
    setSelectedLimit(newLimit);
    if (!selectedCompany) return;
    const info = await fetchCompanyInfo(selectedCompany.id);
    await fetchComments(selectedCompany.id, selectedCompany, info, startDateTime, endDateTime, newLimit);
  };

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button onClick={() => setIsPostFormOpen(!isPostFormOpen)} variant="outline" className="mb-4 w-full flex items-center justify-between">
          投稿フォーム
          {isPostFormOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {isPostFormOpen && <PostForm redirectAfterPost={false} />}

        <Button onClick={() => setIsTextareaOpen(!isTextareaOpen)} variant="outline" className="mb-4 w-full flex items-center justify-between">
          プロンプト設定
          {isTextareaOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {isTextareaOpen && (
          <div className="mb-4">
            <AutoSaveTextarea storageKey="news_prompt" />
          </div>
        )}

        <div className="flex items-center gap-4 md:whitespace-nowrap">
          <div className="w-96">
            <CompanySearch enableNavigation={false} onCompanySelect={handleCompanySelect}
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

          <YahooBBSRanking onCodeSelect={handleCodeSelect} selectedCompanyFromSearch={selectedCompany} />
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

      {comments.length > 0 && (
        <div className="mb-4 flex justify-center">
          <Button
            onClick={handleCopyClick}
            className="w-full max-w-xs flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Copy className="w-4 h-4" />
            コメントをコピー
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {comments.length > 0 && (
          <div className="mb-4">
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {combinedCommentText}
            </div>
          </div>
        )}
      </div>

      {comments.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          {comments.length}件のコメントを表示中
        </div>
      )}
    </main>
  );
}