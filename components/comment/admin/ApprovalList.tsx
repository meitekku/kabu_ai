// src/components/ApprovalList.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ServerToDate } from '@/utils/format/ServerToDate';

interface ApprovalItem {
  id: number;
  title: string;
  content: string;
  accept: number;
  created_at: string;
}

interface ApprovalListProps {
  items: ApprovalItem[];
  fetchData: () => Promise<void>;
}

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
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
      className="w-full p-2 border rounded-lg resize-none overflow-hidden"
      style={{ minHeight: '2.5rem' }}
    />
  );
};

const ApprovalList: React.FC<ApprovalListProps> = ({ items, fetchData }) => {
  const [error, setError] = useState<string | null>(null);
  const [editedContents, setEditedContents] = useState<{ [key: number]: string }>({});
  const [editedTitles, setEditedTitles] = useState<{ [key: number]: string }>({});
  const [isUpdating, setIsUpdating] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const initialContents: { [key: number]: string } = {};
    const initialTitles: { [key: number]: string } = {};
    items.forEach(item => {
      initialContents[item.id] = item.content;
      initialTitles[item.id] = item.title || '';
    });
    setEditedContents(initialContents);
    setEditedTitles(initialTitles);
  }, [items]);

  const handleContentChange = (id: number, newContent: string) => {
    setEditedContents(prev => ({
      ...prev,
      [id]: newContent
    }));
  };

  const handleTitleChange = (id: number, newTitle: string) => {
    setEditedTitles(prev => ({
      ...prev,
      [id]: newTitle
    }));
  };

  const handleUpdateTitle = async (id: number): Promise<void> => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      setError(null);

      const response = await fetch('/api/approval', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          title: editedTitles[id]
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'タイトルの更新に失敗しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('タイトルの更新に失敗しました');
      }
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAccept = async (id: number): Promise<void> => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      setError(null);

      const response = await fetch('/api/admin/accept_ai/approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          content: editedContents[id],
          title: editedTitles[id]
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
      } else {
        throw new Error(result.error || '承認処理に失敗しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('承認処理に失敗しました');
      }
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  // コピー処理: タイトルとテキストエリアの内容の間に2つの改行を入れる
  const handleCopy = (id: number): void => {
    const title = editedTitles[id] || '';
    const content = editedContents[id] || '';
    const textToCopy = `${title}\n\n${content}`;

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        window.alert('クリップボードにコピーしました');
      })
      .catch(() => {
        window.alert('コピーに失敗しました');
      });
  };

  return (
    <div className="max-w-4xl">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <ul className="space-y-4">
        {items.map((item) => (
          // 親要素に relative を付与して、sticky が親要素内で有効になるようにする
          <li key={item.id} className="relative rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={editedTitles[item.id] || ''}
                  onChange={(e) => handleTitleChange(item.id, e.target.value)}
                  onBlur={() => handleUpdateTitle(item.id)}
                  className="flex-1 p-2 border rounded-lg w-full mb-2"
                  placeholder="タイトルを入力"
                  disabled={isUpdating[item.id]}
                />
                <AutoResizeTextarea
                  value={editedContents[item.id] || ''}
                  onChange={(e) => handleContentChange(item.id, e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-2">
                  作成日時: {ServerToDate(item.created_at)}
                </p>
              </div>
              {/* ボタン部分を sticky にして、スクロールに追従させる */}
              <div className="sticky top-4 flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleAccept(item.id)}
                  className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 ${
                    isUpdating[item.id] ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isUpdating[item.id]}
                >
                  {isUpdating[item.id] ? '処理中...' : '承認'}
                </button>
                <button
                  onClick={() => handleCopy(item.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  コピー
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApprovalList;