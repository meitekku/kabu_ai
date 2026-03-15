"use client";

import { useState } from 'react';

interface SummaryResponse {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
  data?: {
    stdout: string;
    stderr: string;
  };
  generatedNews?: {
    title: string;
    content: string;
    postCode: string;
  };
}

export default function NewsSummaryGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResponse | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedPostCode, setGeneratedPostCode] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isPosting, setIsPosting] = useState(false);


  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setSummaryResult(null);
    setGeneratedTitle('');
    setGeneratedContent('');
    setShowPopup(false);

    try {
      const response = await fetch('/api/admin/summarize_news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: SummaryResponse = await response.json();
      setSummaryResult(result);

      if (result.success && result.generatedNews) {
        // 生成されたニュースをポップアップで表示
        setGeneratedTitle(result.generatedNews.title);
        setGeneratedContent(result.generatedNews.content);
        setGeneratedPostCode(result.generatedNews.postCode);
        setShowPopup(true);
      }
    } catch (error) {
      setSummaryResult({
        success: false,
        message: 'APIリクエストエラー',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneratedTitle(e.target.value);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedContent(e.target.value);
  };

  const handleTwitterSuccess = () => {
    setShowPopup(false);
    alert('TwitterとWebサイトに投稿されました！');
  };

  const handleDiscardNews = () => {
    setShowPopup(false);
    setGeneratedTitle('');
    setGeneratedContent('');
    setGeneratedPostCode('');
    alert('ニュースが破棄されました。');
  };

  const handlePostToSite = async () => {
    if (!generatedTitle || !generatedContent) {
      alert('投稿に必要な情報が不足しています。');
      return;
    }

    setIsPosting(true);
    try {
      // 1. Webサイトに保存 (accept=1, site=72)
      const saveResponse = await fetch('/api/admin/save-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: generatedTitle,
          content: generatedContent,
          postCode: generatedPostCode,
        }),
      });

      const saveResult = await saveResponse.json();
      
      if (!saveResult.success) {
        alert('Webサイトへの保存に失敗しました: ' + saveResult.message);
        return;
      }

      // 2. Twitterに投稿
      const tweetContent = `${generatedTitle}\n${generatedContent}`;
      const twitterResponse = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetContent: tweetContent,
        }),
      });

      if (twitterResponse.status === 429) {
        const resetTime = twitterResponse.headers.get('x-rate-limit-reset');
        if (resetTime) {
          const resetTimestamp = parseInt(resetTime);
          const resetDate = new Date(resetTimestamp * 1000);
          const jstDate = new Date(resetDate.getTime() + (9 * 60 * 60 * 1000));
          const jstTime = `${jstDate.getUTCMonth() + 1}月${jstDate.getUTCDate()}日 ${jstDate.getUTCHours()}:${jstDate.getUTCMinutes().toString().padStart(2, '0')}`;
          alert(`レート制限に達しました。${jstTime}頃に再試行してください。\n\nWebサイトへの保存は成功しました。`);
        } else {
          alert('レート制限に達しました。少し時間をおいて再試行してください。\n\nWebサイトへの保存は成功しました。');
        }
        setShowPopup(false);
        return;
      }

      const twitterResult = await twitterResponse.json();
      
      if (!twitterResult.success) {
        alert('Twitter投稿に失敗しました: ' + twitterResult.message + '\n\nWebサイトへの保存は成功しました。');
        setShowPopup(false);
        return;
      }

      // 成功時の処理
      handleTwitterSuccess();
      
    } catch (error) {
      console.error('投稿エラー:', error);
      alert('投稿中にエラーが発生しました。');
    } finally {
      setIsPosting(false);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-card rounded-lg shadow-lg border border-border">
      <h2 className="text-2xl font-bold text-foreground mb-6">ニュース要約生成</h2>

      {/* 生成ボタン */}
      <div className="mb-6">
        <button
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isLoading
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isLoading ? '生成中...' : 'ニュース要約を生成'}
        </button>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="mb-6 p-4 bg-accent border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-primary">Pythonスクリプトを実行中...</span>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {summaryResult && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">実行結果</h3>
          <div className={`p-4 rounded-lg ${
            summaryResult.success ? 'bg-green-50 border border-green-200' : 'bg-destructive/10 border border-destructive/20'
          }`}>
            <p className={`font-medium ${
              summaryResult.success ? 'text-green-800' : 'text-destructive'
            }`}>
              {summaryResult.message}
            </p>

            {summaryResult.data?.stdout && (
              <details className="mt-3">
                <summary className="cursor-pointer text-foreground font-medium">標準出力を表示</summary>
                <pre className="mt-2 p-3 bg-secondary rounded text-sm overflow-x-auto whitespace-pre-wrap">
                  {summaryResult.data.stdout}
                </pre>
              </details>
            )}

            {summaryResult.data?.stderr && (
              <details className="mt-3">
                <summary className="cursor-pointer text-foreground font-medium">エラー出力を表示</summary>
                <pre className="mt-2 p-3 bg-destructive/10 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                  {summaryResult.data.stderr}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* ポップアップモーダル */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-border">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">ニュース要約生成完了</h3>
                <button
                  onClick={handleClosePopup}
                  className="text-muted-foreground hover:text-foreground text-2xl"
                >
                  ×
                </button>
              </div>

              {/* タイトル編集 */}
              <div className="mb-4">
                <label htmlFor="popup-title" className="block text-sm font-medium text-foreground mb-2">
                  タイトル
                </label>
                <input
                  id="popup-title"
                  type="text"
                  value={generatedTitle}
                  onChange={handleTitleChange}
                  className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                  placeholder="投稿タイトルを入力..."
                />
              </div>

              {/* コンテンツ編集 */}
              <div className="mb-4">
                <label htmlFor="popup-content" className="block text-sm font-medium text-foreground mb-2">
                  投稿内容
                </label>
                <textarea
                  id="popup-content"
                  value={generatedContent}
                  onChange={handleContentChange}
                  rows={10}
                  className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                  placeholder="投稿内容を入力..."
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  文字数: {generatedContent.length}
                </p>
              </div>

              {/* アクションボタン */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDiscardNews}
                  className="px-6 py-3 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 transition-colors"
                >
                  破棄
                </button>
                <button
                  onClick={handlePostToSite}
                  disabled={isPosting}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isPosting
                      ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {isPosting ? '投稿中...' : 'Twitter & Web投稿'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}