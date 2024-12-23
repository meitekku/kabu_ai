"use client"

import { useState } from 'react';
import { format, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from 'lucide-react';
import CompanySearch from '@/components/parts/common/CompanySearch';
import AutoSaveTextarea from '@/components/parts/common/AutoSaveTextarea';
import DateRangeSelector from '@/components/parts/admin/DateRangeSelector';

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
  id: string;
  name: string;
}

export default function Home() {
  const now = new Date();
  const twoDaysAgo = subDays(now, 2);

  const [selectedLimit, setSelectedLimit] = useState<number>(300);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isTextareaOpen, setIsTextareaOpen] = useState<boolean>(false);
  
  const [startDateTime, setStartDateTime] = useState<string>(
    format(twoDaysAgo, "yyyy-MM-dd HH:mm:ss")
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    format(now, "yyyy-MM-dd HH:mm:ss")
  );

  const limitOptions = Array.from({ length: 5 }, (_, i) => (i + 3) * 100);

  const handleCompanySelect = (company: Company) => {
    const code = company.id.split(' ')[0];
    const newCompany = {
      id: code,
      name: company.name
    };
    setSelectedCompany(newCompany);
    fetchComments(code, newCompany, startDateTime, endDateTime);
  };

  const handleDateRangeSelect = (start: string, end: string) => {
    setStartDateTime(start);
    setEndDateTime(end);
    if (selectedCompany) {
      fetchComments(selectedCompany.id, selectedCompany, start, end);
    }
  };

  const copyToClipboard = async (comments: Comment[], company: Company) => {
    try {
      const promptText = localStorage.getItem('autoSaveText_news_prompt')+'\n' || '';
      const combinedText = promptText + '\n' + comments.map(comment => `${comment.comment_date}\n${comment.comment}\n\n`).join('');
      await navigator.clipboard.writeText(combinedText);
      alert(`${company.name}\nのコメントを${comments.length}件コピーしました`);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
      setError('クリップボードへのコピーに失敗しました');
    }
  };

  const fetchComments = async (
    code: string, 
    company: Company, 
    start: string = startDateTime, 
    end: string = endDateTime
  ) => {
    setLoading(true);
    setError('');

    try {
      console.log(start, end);

      const response = await fetch('/api/admin/yahoo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          limit: selectedLimit,
          startDateTime: start,
          endDateTime: end
        })
      });

      const data: CommentsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.success ? '不明なエラーが発生しました' : 'データの取得に失敗しました');
      }

      setComments(data.data);
      await copyToClipboard(data.data, company);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setSelectedLimit(newLimit);
    if (selectedCompany) {
      fetchComments(selectedCompany.id, selectedCompany, startDateTime, endDateTime);
    }
  };

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
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