"use client";

import NewsSummaryGenerator from '@/components/admin/NewsSummaryGenerator';

export default function NewsSummaryPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">ニュース要約生成</h1>
        <p className="mt-2 text-muted-foreground">
          本日の投稿からAIが自動でニュース要約を生成し、Twitterとサイトに投稿できます。
        </p>
      </div>
      
      <NewsSummaryGenerator />
    </div>
  );
}