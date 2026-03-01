"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { ServerToDate } from '@/utils/format/ServerToDate';
import TwitterPostButton from './TwitterPostButton';
import TwitterPythonButton from './TwitterPythonButton';
import StockChart, { StockChartRef } from '@/components/parts/chart/StockChart';
import { submitTwitterAndWebPost } from '@/lib/admin/postToTwitterAndWeb';

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
  approveSiteNumber?: number;
  apiEndpoint?: string;
  enableBatchPosting?: boolean;
  batchPostSiteNumber?: number;
}

interface BatchQueueEntry {
  id: number;
  title: string;
  content: string;
  chartImageUrl?: string;
}

const normalizeBatchIntervalMinutes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 5;
  }

  return Math.max(5, Math.round(value / 5) * 5);
};

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  id: number;
}> = ({ value, onChange, onBlur, id }) => {
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
      onBlur={onBlur}
      data-id={id}
      className="w-full resize-none overflow-hidden rounded-lg border p-2"
      style={{ minHeight: '2.5rem' }}
    />
  );
};

const ApprovalList: React.FC<ApprovalListProps> = ({
  items,
  fetchData,
  approveSiteNumber = 70,
  apiEndpoint = '/api/admin/accept_ai',
  enableBatchPosting = false,
  batchPostSiteNumber = 71,
}) => {
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const chartRefs = useRef<Record<number, StockChartRef | null>>({});
  const chartButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const batchRunIdRef = useRef(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [editedContents, setEditedContents] = useState<Record<number, string>>({});
  const [editedTitles, setEditedTitles] = useState<Record<number, string>>({});
  const [isUpdating, setIsUpdating] = useState<Record<number, boolean>>({});
  const [expandedCharts, setExpandedCharts] = useState<Record<number, boolean>>({});
  const [chartImages, setChartImages] = useState<Record<number, string>>({});
  const [generatingImage, setGeneratingImage] = useState<Record<number, boolean>>({});
  const [autoExpandedIds, setAutoExpandedIds] = useState<Set<number>>(new Set());
  const [fadingOut, setFadingOut] = useState<Record<number, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(5);
  const [isBatchPosting, setIsBatchPosting] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [activeBatchItemId, setActiveBatchItemId] = useState<number | null>(null);

  useEffect(() => {
    const initialContents: Record<number, string> = {};
    const initialTitles: Record<number, string> = {};
    items.forEach(item => {
      initialContents[item.id] = item.content || '';
      initialTitles[item.id] = item.title || '';
    });
    setEditedContents(initialContents);
    setEditedTitles(initialTitles);
    setSelectedIds(prev => prev.filter(id => items.some(item => item.id === id)));
  }, [items]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const button = entry.target as HTMLButtonElement;
            const id = Number(button.dataset.chartId);

            if (!autoExpandedIds.has(id) && !expandedCharts[id]) {
              setAutoExpandedIds(prev => new Set([...prev, id]));
              setExpandedCharts(prev => ({ ...prev, [id]: true }));
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    Object.values(chartButtonRefs.current).forEach(button => {
      if (button) {
        observer.observe(button);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [items, autoExpandedIds, expandedCharts]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const clearCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    setCountdownSeconds(null);
  };

  const scheduleStatusClear = () => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    statusTimeoutRef.current = setTimeout(() => {
      setBatchStatus(null);
    }, 5000);
  };

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
      if (!result.success) {
        throw new Error(result.error || '更新に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleContentChange = (id: number, newContent: string) => {
    setEditedContents(prev => ({ ...prev, [id]: newContent }));
  };

  const handleTitleChange = (id: number, newTitle: string) => {
    setEditedTitles(prev => ({ ...prev, [id]: newTitle }));
  };

  const handleAccept = async (id: number): Promise<boolean> => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      setError(null);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update', table: 'post', data: { accept: 1, site: approveSiteNumber }, conditions: { id } }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '承認に失敗しました');
      }

      await fetchData();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '承認に失敗しました';
      console.error('エラーが発生しました:', err);
      setError(message);
      return false;
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update', table: 'post', data: { accept: 2 }, conditions: { id } }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchData();
      } else {
        console.error('却下に失敗しました:', result.error);
      }
    } catch (err) {
      console.error('エラーが発生しました:', err);
    }
  };

  const handleCopy = (id: number) => {
    const text = `${editedTitles[id] || ''}\n\n${editedContents[id] || ''}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert('クリップボードにコピーしました'))
        .catch(() => alert('コピーに失敗しました'));
    } else {
      alert('クリップボード機能がサポートされていません');
    }
  };

  const toggleChart = (id: number) => {
    setExpandedCharts(prev => ({
      ...prev,
      [id]: !prev[id],
    }));

    if (expandedCharts[id]) {
      setChartImages(prev => ({ ...prev, [id]: '' }));
    }
  };

  const generateChartImage = async (id: number) => {
    const chartRef = chartRefs.current[id];
    if (!chartRef) {
      return;
    }

    try {
      setGeneratingImage(prev => ({ ...prev, [id]: true }));
      const imageUrl = await chartRef.exportAsImage();
      setChartImages(prev => ({ ...prev, [id]: imageUrl }));
    } catch (imageError) {
      console.error('チャート画像の生成に失敗しました:', imageError);
      alert('チャート画像の生成に失敗しました');
    } finally {
      setGeneratingImage(prev => ({ ...prev, [id]: false }));
    }
  };

  const handlePythonPostError = (id: number, postError: string) => {
    console.error(`Twitter Python投稿エラー (ID: ${id}):`, postError);
  };

  const handleTwitterPostComplete = (id: number) => {
    setFadingOut(prev => ({ ...prev, [id]: true }));
  };

  const handleSelectChange = (id: number, checked: boolean) => {
    if (isBatchPosting) {
      return;
    }

    setBatchError(null);
    setBatchStatus(null);

    setSelectedIds(prev => {
      if (checked) {
        if (prev.includes(id)) {
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter(selectedId => selectedId !== id);
    });
  };

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainSeconds}`;
  };

  const waitForNextBatchSlot = (delayMs: number, runId: number) => {
    clearCountdown();

    if (delayMs <= 0) {
      return Promise.resolve();
    }

    const initialSeconds = Math.ceil(delayMs / 1000);
    setCountdownSeconds(initialSeconds);

    return new Promise<void>((resolve, reject) => {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev === null || prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      countdownTimeoutRef.current = setTimeout(() => {
        clearCountdown();
        if (runId !== batchRunIdRef.current) {
          reject(new Error('一括投稿を停止しました'));
          return;
        }
        resolve();
      }, delayMs);
    });
  };

  const stopBatchPosting = () => {
    batchRunIdRef.current += 1;
    clearCountdown();
    setIsBatchPosting(false);
    setActiveBatchItemId(null);
    setBatchStatus('一括投稿を停止しました');
    scheduleStatusClear();
  };

  const handleBatchPost = async () => {
    if (!enableBatchPosting || selectedIds.length === 0 || isBatchPosting) {
      return;
    }

    const safeIntervalMinutes = normalizeBatchIntervalMinutes(Number(batchIntervalMinutes));
    const queue: BatchQueueEntry[] = selectedIds.map(id => {
      const currentItem = items.find(item => item.id === id);
      return {
        id,
        title: editedTitles[id] ?? currentItem?.title ?? '',
        content: editedContents[id] ?? currentItem?.content ?? '',
        chartImageUrl: chartImages[id],
      };
    });

    const invalidEntry = queue.find(entry => !entry.title.trim() || !entry.content.trim());
    if (invalidEntry) {
      setBatchError(`ID ${invalidEntry.id} のタイトルまたは本文が空です。`);
      return;
    }

    batchRunIdRef.current += 1;
    const runId = batchRunIdRef.current;

    setBatchIntervalMinutes(safeIntervalMinutes);
    setBatchError(null);
    setBatchStatus(`${queue.length}件の一括投稿を開始します`);
    setIsBatchPosting(true);

    try {
      for (let index = 0; index < queue.length; index += 1) {
        if (runId !== batchRunIdRef.current) {
          return;
        }

        const entry = queue[index];
        setActiveBatchItemId(entry.id);
        setBatchStatus(`${index + 1}/${queue.length} 件目を投稿中`);

        await submitTwitterAndWebPost({
          title: entry.title,
          content: entry.content,
          imageUrl: entry.chartImageUrl,
          siteNumber: batchPostSiteNumber,
        });

        handleTwitterPostComplete(entry.id);
        const accepted = await handleAccept(entry.id);
        if (!accepted) {
          throw new Error(`ID ${entry.id} の承認反映に失敗しました。`);
        }

        setSelectedIds(prev => prev.filter(selectedId => selectedId !== entry.id));

        if (index < queue.length - 1) {
          setBatchStatus(`次の投稿まで ${safeIntervalMinutes} 分待機します`);
          await waitForNextBatchSlot(safeIntervalMinutes * 60 * 1000, runId);
        }
      }

      setBatchStatus('選択した投稿をすべて処理しました');
      scheduleStatusClear();
    } catch (postError) {
      if (runId !== batchRunIdRef.current) {
        return;
      }

      setBatchError(postError instanceof Error ? postError.message : '一括投稿に失敗しました');
      setBatchStatus(null);
    } finally {
      if (runId === batchRunIdRef.current) {
        clearCountdown();
        setIsBatchPosting(false);
        setActiveBatchItemId(null);
      }
    }
  };

  const showBatchBar = enableBatchPosting && (selectedIds.length > 0 || isBatchPosting || !!batchStatus || !!batchError);

  return (
    <div className={`max-w-4xl ${showBatchBar ? 'pb-44' : ''}`}>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <ul className="space-y-4">
        {items.map(item => {
          const selectedOrder = selectedIds.indexOf(item.id);

          return (
            <li
              key={item.id}
              className={`relative rounded-lg border p-4 transition-opacity duration-500 ${
                fadingOut[item.id] ? 'opacity-0' : 'opacity-100'
              } ${selectedOrder >= 0 ? 'border-blue-400 ring-2 ring-blue-200' : ''}`}
            >
              <div className="flex flex-col items-start gap-4 md:flex-row">
                <div className="min-w-0 w-full flex-1">
                  <input
                    ref={el => { inputRefs.current[item.id] = el; }}
                    type="text"
                    value={editedTitles[item.id] || ''}
                    onChange={e => handleTitleChange(item.id, e.target.value)}
                    onBlur={e => updatePost(item.id, e.target.value, editedContents[item.id] || '')}
                    className="mb-2 w-full flex-1 rounded-lg border p-2"
                    placeholder="タイトルを入力"
                    readOnly={isUpdating[item.id]}
                  />

                  <AutoResizeTextarea
                    value={editedContents[item.id] || ''}
                    onChange={e => handleContentChange(item.id, e.target.value)}
                    onBlur={e => updatePost(item.id, editedTitles[item.id] || '', e.target.value)}
                    id={item.id}
                  />

                  <button
                    ref={el => { chartButtonRefs.current[item.id] = el; }}
                    data-chart-id={item.id}
                    onClick={() => toggleChart(item.id)}
                    className="mt-2 mb-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-sm transition-colors hover:bg-gray-200"
                  >
                    <span
                      className="inline-block transition-transform duration-200"
                      style={{ transform: expandedCharts[item.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      ▶
                    </span>
                    チャートを{expandedCharts[item.id] ? '非表示' : '表示'}
                    {autoExpandedIds.has(item.id) && !expandedCharts[item.id] && (
                      <span className="text-xs text-gray-500">（自動展開済み）</span>
                    )}
                  </button>

                  {expandedCharts[item.id] && (
                    <div className="mb-4 transition-all duration-300">
                      <StockChart
                        ref={el => { chartRefs.current[item.id] = el; }}
                        code={item.code}
                        width="100%"
                        pcHeight={{
                          upper: 288,
                          lower: 144,
                        }}
                        mobileHeight={{
                          upper: 192,
                          lower: 120,
                        }}
                        onTooltipRendered={(isRendered) => {
                          if (isRendered && !chartImages[item.id] && !generatingImage[item.id]) {
                            generateChartImage(item.id);
                          }
                        }}
                        maxNewsTooltips={4}
                        company_name={true}
                      />
                    </div>
                  )}

                  <p className="mt-2 text-sm text-gray-500">
                    作成日時: {ServerToDate(item.created_at)}
                  </p>
                </div>

                <div className="order-last flex w-full flex-col gap-2 md:sticky md:top-4 md:w-[220px] md:flex-shrink-0 md:pt-2">
                  {enableBatchPosting && (
                    <label className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedOrder >= 0}
                        onChange={e => handleSelectChange(item.id, e.target.checked)}
                        disabled={isBatchPosting}
                        aria-label={`投稿候補に追加 ${item.id}`}
                      />
                      <span>一括投稿に追加</span>
                      {selectedOrder >= 0 && (
                        <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                          {selectedOrder + 1}番目
                        </span>
                      )}
                    </label>
                  )}

                  <button
                    onClick={() => handleAccept(item.id)}
                    className={`rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 ${isUpdating[item.id] ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={isUpdating[item.id]}
                  >
                    {isUpdating[item.id] ? '処理中...' : '承認'}
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className={`rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 ${isUpdating[item.id] ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={isUpdating[item.id]}
                  >
                    {isUpdating[item.id] ? '処理中...' : '却下'}
                  </button>
                  <button
                    onClick={() => handleCopy(item.id)}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    コピー
                  </button>

                  <TwitterPostButton
                    title={editedTitles[item.id] || ''}
                    content={editedContents[item.id] || ''}
                    chartImageUrl={chartImages[item.id]}
                    onSuccess={() => handleAccept(item.id)}
                    onComplete={() => handleTwitterPostComplete(item.id)}
                    siteNumber={71}
                  />

                  <TwitterPythonButton
                    title={editedTitles[item.id] || ''}
                    content={editedContents[item.id] || ''}
                    chartImageUrl={chartImages[item.id]}
                    onSuccess={() => handleAccept(item.id)}
                    onError={(postError) => handlePythonPostError(item.id, postError)}
                  />

                  {activeBatchItemId === item.id && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      一括投稿を実行中
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {showBatchBar && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 rounded-2xl border border-slate-300 bg-white/95 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="text-xs text-slate-500">選択数</p>
                <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold">
                  {selectedIds.length} 件
                </div>
              </div>
              <label>
                <p className="text-xs text-slate-500">投稿間隔(分)</p>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={batchIntervalMinutes}
                  onChange={e => setBatchIntervalMinutes(normalizeBatchIntervalMinutes(Number(e.target.value)))}
                  disabled={isBatchPosting}
                  className="w-24 rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <div>
                <p className="text-xs text-slate-500">カウント</p>
                <div className="min-w-24 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold">
                  {formatCountdown(countdownSeconds)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBatchPost}
                  disabled={selectedIds.length === 0 || isBatchPosting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBatchPosting ? '投稿中...' : '選択順で投稿する'}
                </button>
                {isBatchPosting && (
                  <button
                    onClick={stopBatchPosting}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    停止
                  </button>
                )}
              </div>
              {batchStatus && <p className="text-sm text-slate-600">{batchStatus}</p>}
              {batchError && <p className="text-sm text-red-600">{batchError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalList;
