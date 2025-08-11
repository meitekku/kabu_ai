"use client";
import React, { useState, useEffect } from 'react';
import ApprovalList from '@/components/comment/admin/ApprovalList';

// データ型の定義
interface ApprovalItem {
  id: number;
  title: string;
  content: string;
  code: string;
  accept: number;
  created_at: string;
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
  data?: ApprovalItem[];
  error?: string;
}

export default function UltraThinkPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (): Promise<void> => {
    try {
      const operation: DatabaseOperation = {
        type: 'select',
        table: 'post',
        data: ['id', 'title' , 'content', 'code', 'accept', 'created_at'],
        conditions: {
          accept: 0
        }
      };

      const response = await fetch('/api/ultrathink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      });

      const result: DatabaseResponse = await response.json();

      if (result.success && result.data) {
        setItems(result.data);
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

  useEffect(() => {
    void fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <main className="container mx-auto py-4">
      <h1 className="text-2xl font-bold mb-4">Ultra Think - Twitter投稿</h1>
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
        <h3 className="font-semibold text-blue-900 mb-2">📋 使用方法</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• まず既存のChromeプロファイル（ログイン済み）の使用を試みます</li>
          <li>• 「手動ログイン投稿」ボタンをクリックすると、新しいブラウザウィンドウが開きます</li>
          <li>• <strong>自動フォールバック</strong>：既存プロファイルでログインされていない場合、完全に新規のプロファイルで再起動します</li>
          <li>• 新規プロファイルの場合は通常の自動ログインが実行されます</li>
          <li>• 投稿完了後、ブラウザは自動的に終了されます</li>
        </ul>
      </div>
      
      <div className="mb-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
        <h3 className="font-semibold text-green-900 mb-2">🔄 動作パターン</h3>
        <div className="text-green-800 text-sm space-y-2">
          <div>
            <strong>パターン1:</strong> 既存プロファイルにログイン情報がある場合
            <div className="ml-4 text-xs">→ 既存プロファイルを使用して投稿</div>
          </div>
          <div>
            <strong>パターン2:</strong> 既存プロファイルにログイン情報がない場合  
            <div className="ml-4 text-xs">→ 自動的に新規プロファイルで再起動し、自動ログイン後投稿</div>
          </div>
        </div>
      </div>
      <ApprovalList items={items} fetchData={fetchData} useSystemProfile={true} />
    </main>
  );
}