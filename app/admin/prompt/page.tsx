"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

// データ型の定義
interface PromptItem {
  id: number;
  prompt: string;
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
  const updateTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const fetchData = async (): Promise<void> => {
    try {
      const operation: DatabaseOperation = {
        type: 'select',
        table: 'prompt',
        data: ['id', 'prompt']
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
        setItems(result.data);
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
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea) => {
      adjustTextareaHeight(textarea as HTMLTextAreaElement);
    });
  }, []);

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

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">プロンプト管理</h1>
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border p-4 rounded-lg bg-white shadow-sm">
              <div className="mb-2 text-sm text-gray-500">ID: {item.id}</div>
              <textarea
                value={editValues[item.id] || ''}
                onChange={(e) => {
                  handleChange(item.id, e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                onFocus={(e) => adjustTextareaHeight(e.target)}
                className="w-full p-3 border rounded-md resize-none overflow-hidden min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="プロンプトを入力してください..."
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}