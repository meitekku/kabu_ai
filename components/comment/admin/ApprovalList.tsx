"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { ServerToDate } from '@/utils/format/ServerToDate';
import TwitterPostButton from './TwitterPostButton';
import TwitterPythonButton from './TwitterPythonButton'; // 新しく追加
import Image from 'next/image';
import StockChart, { StockChartRef } from '@/components/parts/chart/StockChart';

// 薬の画像配列を定義
const MEDICINE_IMAGES = [
  { src: '/site_images/admin/messageImage_1749552408215.jpg', alt: 'エンレスト200mg' },
  { src: '/site_images/admin/messageImage_1749552440144.jpg', alt: 'レンドルミン0.25mg' },
  { src: '/site_images/admin/messageImage_1749552497655.jpg', alt: 'ジャディアンス10mg' },
];

// debounce関数の定義
function debounce(
  func: (id: number, title: string, content: string) => void,
  wait: number
) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(id: number, title: string, content: string) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(id, title, content), wait);
  };
}

interface ApprovalItem {
  id: number;
  title: string;
  content: string;
  accept: number;
  created_at: string;
  code: string;
}

interface ApprovalListProps {
  items: ApprovalItem[];
  fetchData: () => Promise<void>;
}

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  id: number;
}> = ({ value, onChange, id }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const scrollTop = textarea.scrollTop;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.scrollTop = scrollTop;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      data-id={id}
      className="w-full p-2 border rounded-lg resize-none overflow-hidden"
      style={{ minHeight: '2.5rem' }}
    />
  );
};

const ApprovalList: React.FC<ApprovalListProps> = ({ items, fetchData }) => {
  // タイトル入力用 refs
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const chartRefs = useRef<Record<number, StockChartRef | null>>({});

  const [error, setError] = useState<string | null>(null);
  const [editedContents, setEditedContents] = useState<{ [key: number]: string }>({});
  const [editedTitles, setEditedTitles] = useState<{ [key: number]: string }>({});
  const [isUpdating, setIsUpdating] = useState<{ [key: number]: boolean }>({});
  const [expandedCharts, setExpandedCharts] = useState<{ [key: number]: boolean }>({});
  const [chartImages, setChartImages] = useState<{ [key: number]: string }>({});
  const [generatingImage, setGeneratingImage] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const initialContents: Record<number, string> = {};
    const initialTitles: Record<number, string> = {};
    items.forEach(item => {
      initialContents[item.id] = item.content;
      initialTitles[item.id] = item.title || '';
    });
    setEditedContents(initialContents);
    setEditedTitles(initialTitles);
  }, [items]);

  const updatePost = async (id: number, title: string, content: string) => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      setError(null);

      const response = await fetch('/api/post/update_post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, content }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '更新に失敗しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const debouncedUpdate = useRef(
    debounce((id: number, title: string, content: string) => {
      updatePost(id, title, content);
    }, 1000)
  ).current;

  const handleContentChange = (id: number, newContent: string) => {
    const textarea = document.querySelector(`textarea[data-id="${id}"]`) as HTMLTextAreaElement;
    const start = textarea?.selectionStart;
    const end = textarea?.selectionEnd;
    setEditedContents(prev => ({ ...prev, [id]: newContent }));
    debouncedUpdate(id, editedTitles[id] || '', newContent);
    if (textarea) {
      textarea.focus();
      if (start !== undefined && end !== undefined) textarea.setSelectionRange(start, end);
    }
  };

  const handleTitleChange = (id: number, newTitle: string) => {
    const input = inputRefs.current[id];
    const start = input?.selectionStart ?? 0;
    const end = input?.selectionEnd ?? 0;
    setEditedTitles(prev => ({ ...prev, [id]: newTitle }));
    debouncedUpdate(id, newTitle, editedContents[id] || '');
    requestAnimationFrame(() => {
      if (input) {
        input.focus();
        input.setSelectionRange(start, end);
      }
    });
  };

  const handleAccept = async (id: number) => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      setError(null);
      const response = await fetch('/api/admin/accept_ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update', table: 'post', data: { accept: 1 }, conditions: { id } }),
      });
      const result = await response.json();
      if (result.success) await fetchData();
      else console.error('承認に失敗しました:', result.error);
    } catch (err) {
      console.error('エラーが発生しました:', err);
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch('/api/admin/accept_ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update', table: 'post', data: { accept: 2 }, conditions: { id } }),
      });
      const result = await response.json();
      if (result.success) await fetchData();
      else console.error('却下に失敗しました:', result.error);
    } catch (err) {
      console.error('エラーが発生しました:', err);
    }
  };

  const handleCopy = (id: number) => {
    const text = `${editedTitles[id] || ''}\n\n${editedContents[id] || ''}`;
    navigator.clipboard.writeText(text)
      .then(() => alert('クリップボードにコピーしました'))
      .catch(() => alert('コピーに失敗しました'));
  };

  const toggleChart = (id: number) => {
    setExpandedCharts(prev => ({ 
      ...prev, 
      [id]: !prev[id] 
    }));
    
    // チャートを閉じる時は画像もクリア
    if (expandedCharts[id]) {
      setChartImages(prev => ({ ...prev, [id]: '' }));
    }
  };

  const generateChartImage = async (id: number) => {
    const chartRef = chartRefs.current[id];
    if (!chartRef) return;

    try {
      setGeneratingImage(prev => ({ ...prev, [id]: true }));
      const imageUrl = await chartRef.exportAsImage();
      setChartImages(prev => ({ ...prev, [id]: imageUrl }));
    } catch (error) {
      console.error('チャート画像の生成に失敗しました:', error);
      alert('チャート画像の生成に失敗しました');
    } finally {
      setGeneratingImage(prev => ({ ...prev, [id]: false }));
    }
  };

  // Twitter Python投稿のエラーハンドラー
  const handlePythonPostError = (id: number, error: string) => {
    console.error(`Twitter Python投稿エラー (ID: ${id}):`, error);
    // 必要に応じてユーザーに通知
  };

  return (
    <div className="max-w-4xl">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <ul className="space-y-4">
        {items.map(item => (
          <li key={item.id} className="relative rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={el => { inputRefs.current[item.id] = el }}
                  type="text"
                  value={editedTitles[item.id] || ''}
                  onChange={e => handleTitleChange(item.id, e.target.value)}
                  className="flex-1 p-2 border rounded-lg w-full mb-2"
                  placeholder="タイトルを入力"
                  readOnly={isUpdating[item.id]}
                />
                
                {/* textareaを先に配置 */}
                <AutoResizeTextarea
                  value={editedContents[item.id] || ''}
                  onChange={e => handleContentChange(item.id, e.target.value)}
                  id={item.id}
                />
                
                {/* チャート表示切り替えボタン */}
                <button
                  onClick={() => toggleChart(item.id)}
                  className="mt-2 mb-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <span className="inline-block transition-transform duration-200" style={{ transform: expandedCharts[item.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                  </span>
                  チャートを{expandedCharts[item.id] ? '非表示' : '表示'}
                </button>

                {/* StockChartをtextareaの後に配置 */}
                {expandedCharts[item.id] && (
                  <div className="mb-4 transition-all duration-300">
                    <StockChart
                      ref={el => { chartRefs.current[item.id] = el }}
                      code={item.code}
                      width="100%"
                      pcHeight={{
                        upper: 288,
                        lower: 144
                      }}
                      mobileHeight={{
                        upper: 192,
                        lower: 120
                      }}
                      onTooltipRendered={(isRendered) => {
                        // チャート描画完了時に自動的に画像生成
                        if (isRendered && !chartImages[item.id] && !generatingImage[item.id]) {
                          generateChartImage(item.id);
                        }
                      }}
                      maxNewsTooltips={4}
                      theme="black"
                    />
                    
                    {/* 画像生成中の表示 */}
                    {generatingImage[item.id] && (
                      <div className="mt-2 flex items-center gap-2 text-purple-600">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                        <span>チャート画像を自動生成中...</span>
                      </div>
                    )}
                    
                    {/* 生成されたチャート画像を表示 */}
                    {chartImages[item.id] && (
                      <div className="mt-4 border-2 border-purple-300 rounded-lg p-2">
                        <Image 
                          src={chartImages[item.id]} 
                          alt={`Chart for ${item.code}`} 
                          className="w-full rounded"
                          width={800}
                          height={600}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-gray-500 mt-2">
                  作成日時: {ServerToDate(item.created_at)}
                </p>
              </div>
              <div className="sticky top-4 flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleAccept(item.id)}
                  className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 ${isUpdating[item.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isUpdating[item.id]}
                >{isUpdating[item.id] ? '処理中...' : '承認'}</button>
                <button
                  onClick={() => handleReject(item.id)}
                  className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 ${isUpdating[item.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isUpdating[item.id]}
                >{isUpdating[item.id] ? '処理中...' : '却下'}</button>
                <button onClick={() => handleCopy(item.id)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">コピー</button>
                
                {/* 既存のTwitterPostButton */}
                <TwitterPostButton
                  title={editedTitles[item.id] || ''}
                  content={editedContents[item.id] || ''}
                  onSuccess={() => handleAccept(item.id)}
                />
                
                {/* 新しく追加: TwitterPythonButton */}
                <TwitterPythonButton
                  title={editedTitles[item.id] || ''}
                  content={editedContents[item.id] || ''}
                  chartImageUrl={chartImages[item.id]}
                  onSuccess={() => handleAccept(item.id)}
                  onError={(error) => handlePythonPostError(item.id, error)}
                />
                
                <div className="flex flex-col gap-2 mt-4">
                  {MEDICINE_IMAGES.map((image, idx) => (
                    <div key={idx} className="w-50 h-20 relative">
                      <Image src={image.src} alt={image.alt} fill className="object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApprovalList;