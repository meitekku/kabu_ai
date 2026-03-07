"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

// データ型の定義
interface PromptItem {
  id: number;
  prompt: string;
  category: string;
}

type SqlValue = string | number | boolean | null | Date;

interface DatabaseRecord {
  [key: string]: SqlValue;
}

interface QueryCondition {
  [key: string]: SqlValue;
}

type OperationType = 'select' | 'insert' | 'update' | 'delete';

interface DatabaseOperation {
  type: OperationType;
  table: string;
  data?: DatabaseRecord | string[];
  conditions?: QueryCondition;
}

interface DatabaseResponse {
  success: boolean;
  data?: PromptItem[];
  error?: string;
}

export default function PromptPage() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [key: number]: string }>({});
  const [collapsedItems, setCollapsedItems] = useState<{ [key: number]: boolean }>({});
  const updateTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const fetchData = async (): Promise<void> => {
    try {
      const operation: DatabaseOperation = {
        type: 'select',
        table: 'prompt',
        data: ['id', 'prompt', 'category']
      };

      const response = await fetch('/api/admin/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      });

      const result: DatabaseResponse = await response.json();

      if (result.success && result.data) {
        // 表示対象: 午前(101-107), 午後(201-207), 海外まとめ(8)のみ
        const filtered = result.data.filter((item: PromptItem) =>
          (item.id >= 101 && item.id <= 107) ||
          (item.id >= 201 && item.id <= 207) ||
          item.id === 8
        );
        // 表示順: 午前→午後→海外まとめ
        filtered.sort((a: PromptItem, b: PromptItem) => {
          const order = (id: number) => id === 8 ? 999 : id;
          return order(a.id) - order(b.id);
        });
        setItems(filtered);
        // 初期値を設定
        const initialValues = result.data.reduce((acc, item) => {
          acc[item.id] = item.prompt;
          return acc;
        }, {} as { [key: number]: string });
        setEditValues(initialValues);
      } else {
        setError(result.error || '未知のエラーが発生しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('データの取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: number, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [id]: value
    }));

    // 既存のタイムアウトをキャンセル
    if (updateTimeoutRef.current[id]) {
      clearTimeout(updateTimeoutRef.current[id]);
    }

    // 新しいタイムアウトを設定（値をクロージャで保持）
    updateTimeoutRef.current[id] = setTimeout(() => {
      handleSave(id, value);
    }, 1500);
  };

  const handleSave = async (id: number, value: string) => {
    try {
      console.log(`更新中: ID=${id}, value="${value}"`); // デバッグ用

      const operation: DatabaseOperation = {
        type: 'update',
        table: 'prompt',
        data: { prompt: value }, // editValues[id]ではなく、直接valueを使用
        conditions: { id }
      };

      const response = await fetch('/api/admin/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '更新に失敗しました');
      } else {
        console.log(`更新成功: ID=${id}`); // デバッグ用
      }
    } catch (error) {
      console.log('更新エラー:', error);
      setError('更新に失敗しました');
    }
  };

  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    const scrollHeight = element.scrollHeight;
    element.style.height = `${scrollHeight}px`;
  };

  // すべてのtextareaの高さを調整する関数をuseCallbackでメモ化
  const adjustAllTextareas = useCallback(() => {
    if (typeof document !== 'undefined') {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea) => {
        adjustTextareaHeight(textarea as HTMLTextAreaElement);
      });
    }
  }, []);

  // LocalStorageから開閉状態を読み込む
  const loadCollapsedState = useCallback(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('prompt-collapsed-state');
        if (saved) {
          setCollapsedItems(JSON.parse(saved));
        } else {
          // デフォルトで全て閉じる
          const defaultState = items.reduce((acc, item) => {
            acc[item.id] = true;
            return acc;
          }, {} as { [key: number]: boolean });
          setCollapsedItems(defaultState);
        }
      } catch (error) {
        console.error('Failed to load collapsed state:', error);
      }
    }
  }, [items]);

  // LocalStorageに開閉状態を保存する
  const saveCollapsedState = (newState: { [key: number]: boolean }) => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('prompt-collapsed-state', JSON.stringify(newState));
      } catch (error) {
        console.error('Failed to save collapsed state:', error);
      }
    }
  };

  // 開閉状態を切り替える
  const toggleCollapsed = (id: number) => {
    const newState = {
      ...collapsedItems,
      [id]: !collapsedItems[id]
    };
    setCollapsedItems(newState);
    saveCollapsedState(newState);
    
    // 展開する場合、textareaの高さを再計算
    if (collapsedItems[id] && typeof document !== 'undefined') {
      setTimeout(() => {
        const textarea = document.querySelector(`textarea[data-id="${id}"]`) as HTMLTextAreaElement;
        if (textarea) {
          adjustTextareaHeight(textarea);
        }
      }, 0);
    }
  };

  useEffect(() => {
    // fetchDataの実行
    void fetchData();
    
    // クリーンアップ関数でrefの現在の値をコピーして使用
    const currentTimeouts = updateTimeoutRef.current;
    return () => {
      // コンポーネントのアンマウント時にタイムアウトをクリア
      Object.values(currentTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // データがロードされた後に開閉状態を読み込む
  useEffect(() => {
    if (!loading && items.length > 0) {
      loadCollapsedState();
    }
  }, [loading, items, loadCollapsedState]);

  // データがロードされた後、textareaの高さを調整
  useEffect(() => {
    if (!loading && items.length > 0) {
      // DOMが更新された後に高さを調整
      setTimeout(() => {
        adjustAllTextareas();
      }, 0);
    }
  }, [loading, items, adjustAllTextareas]); // adjustAllTextareasを依存配列に追加

  if (loading) {
    return <div className="flex justify-center p-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  const WEEKDAY_NAMES: Record<number, string> = { 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土', 7: '日' };

  const getTimeSlotBadge = (id: number) => {
    if (id >= 101 && id <= 107) {
      const day = WEEKDAY_NAMES[id - 100];
      return <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700 border border-amber-300">☀ {day}曜・午前 (11:45)</span>;
    }
    if (id >= 201 && id <= 207) {
      const day = WEEKDAY_NAMES[id - 200];
      return <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-700 border border-indigo-300">🌙 {day}曜・午後 (15:35-45)</span>;
    }
    return null;
  };

  const isAutoPrompt = (id: number) => (id >= 101 && id <= 107) || (id >= 201 && id <= 207);

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">プロンプト管理</h1>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>自動切り替えプロンプト:</strong> id=101〜107（午前・11:45バッチ）/ id=201〜207（午後・15:35〜15:45バッチ）。
          曜日ごとに個別設定可能。更新はバッチ開始時にDBから再取得されます。
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.id === 101 && (
                <h2 className="text-lg font-bold text-amber-700 flex items-center gap-2 mt-2">☀ 午前（11:45バッチ）</h2>
              )}
              {item.id === 201 && (
                <h2 className="text-lg font-bold text-indigo-700 flex items-center gap-2 mt-6">🌙 午後（15:35〜15:45バッチ）</h2>
              )}
              {item.id === 8 && (
                <h2 className="text-lg font-bold text-green-700 flex items-center gap-2 mt-6">🌐 海外まとめ</h2>
              )}
              <div className={`border p-4 rounded-lg bg-white shadow-sm ${isAutoPrompt(item.id) ? 'ring-2 ring-blue-200' : 'ring-2 ring-green-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <span>ID: {item.category}</span>
                    {getTimeSlotBadge(item.id)}
                  </div>
                  <button
                    onClick={() => toggleCollapsed(item.id)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    {collapsedItems[item.id] ? '▼ 展開' : '▲ 折りたたみ'}
                  </button>
                </div>
                {!collapsedItems[item.id] && (
                  <textarea
                    data-id={item.id}
                    value={editValues[item.id] || ''}
                    onChange={(e) => {
                      handleChange(item.id, e.target.value);
                      adjustTextareaHeight(e.target);
                    }}
                    onFocus={(e) => adjustTextareaHeight(e.target)}
                    className="w-full p-3 border rounded-md resize-none overflow-hidden min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="プロンプトを入力してください..."
                  />
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </main>
  );
}