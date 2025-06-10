"use client";
import React, { useState, useEffect } from 'react';
import ApprovalList from '@/components/comment/admin/ApprovalList';

// データ型の定義
interface ApprovalItem {
  id: number;
  title: string;
  content: string;
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

export default function Home() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (): Promise<void> => {
    try {
      const operation: DatabaseOperation = {
        type: 'select',
        table: 'post',
        data: ['id', 'title' , 'content', 'accept', 'created_at'],
        conditions: {
          accept: 0
        }
      };

      const response = await fetch('/api/admin/accept_ai', {
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
      {/* <LogoutButton /> */}
      <h1 className="text-2xl font-bold mb-4">リスト</h1>
      <ApprovalList items={items} fetchData={fetchData} />
    </main>
  );
}