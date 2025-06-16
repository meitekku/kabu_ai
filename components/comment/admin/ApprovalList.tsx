// src/components/ApprovalList.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ServerToDate } from '@/utils/format/ServerToDate';
import TwitterPostButton from './TwitterPostButton';
import Image from 'next/image';

// 薬の画像配列を定義
const MEDICINE_IMAGES = [
  {
    src: '/site_images/admin/messageImage_1749552408215.jpg',
    alt: 'エンレスト200mg'
  },
  {
    src: '/site_images/admin/messageImage_1749552440144.jpg',
    alt: 'レンドルミン0.25mg'
  },
  {
    src: '/site_images/admin/messageImage_1749552497655.jpg',
    alt: 'ジャディアンス10mg'
  }
];

// debounce関数の追加
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
}

interface ApprovalListProps {
  items: ApprovalItem[];
  fetchData: () => Promise<void>;
}

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
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

  // 更新処理の関数
  const updatePost = async (id: number, title: string, content: string) => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      setError(null);

      const response = await fetch('/api/post/update_post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, title, content }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '更新に失敗しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('更新に失敗しました');
      }
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  // debounceされた更新関数
  const debouncedUpdate = useRef(
    debounce((id: number, title: string, content: string) => {
      updatePost(id, title, content);
    }, 1000)
  ).current;

  const handleContentChange = (id: number, newContent: string) => {
    const textarea = document.querySelector(`textarea[data-id="${id}"]`) as HTMLTextAreaElement;
    const selectionStart = textarea?.selectionStart;
    const selectionEnd = textarea?.selectionEnd;

    setEditedContents(prev => ({
      ...prev,
      [id]: newContent
    }));
    debouncedUpdate(id, editedTitles[id] || '', newContent);

    // フォーカスとカーソル位置を復元
    if (textarea) {
      textarea.focus();
      if (selectionStart !== null && selectionEnd !== null) {
        textarea.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  };

  const handleTitleChange = (id: number, newTitle: string) => {
    const input = document.querySelector(`input[data-id="${id}"]`) as HTMLInputElement;
    const selectionStart = input?.selectionStart;
    const selectionEnd = input?.selectionEnd;

    setEditedTitles(prev => ({
      ...prev,
      [id]: newTitle
    }));
    debouncedUpdate(id, newTitle, editedContents[id] || '');

    // フォーカスとカーソル位置を復元
    if (input) {
      input.focus();
      if (selectionStart !== null && selectionEnd !== null) {
        input.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  };

  const handleAccept = async (id: number): Promise<void> => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      setError(null);

      const response = await fetch('/api/admin/accept_ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'update',
          table: 'post',
          data: { accept: 1 },
          conditions: { id }
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
      } else {
        console.error('承認に失敗しました:', result.error);
      }
    } catch (error) {
      console.error('エラーが発生しました:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: number): Promise<void> => {
    try {
      const response = await fetch('/api/admin/accept_ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'update',
          table: 'post',
          data: { accept: 2 },
          conditions: { id }
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchData();
      } else {
        console.error('却下に失敗しました:', result.error);
      }
    } catch (error) {
      console.error('エラーが発生しました:', error);
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
          <li key={item.id} className="relative rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={editedTitles[item.id] || ''}
                  onChange={(e) => handleTitleChange(item.id, e.target.value)}
                  className="flex-1 p-2 border rounded-lg w-full mb-2"
                  placeholder="タイトルを入力"
                  disabled={isUpdating[item.id]}
                  data-id={item.id}
                />
                <AutoResizeTextarea
                  value={editedContents[item.id] || ''}
                  onChange={(e) => handleContentChange(item.id, e.target.value)}
                  id={item.id}
                />
                <p className="text-sm text-gray-500 mt-2">
                  作成日時: {ServerToDate(item.created_at)}
                </p>
              </div>
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
                  onClick={() => handleReject(item.id)}
                  className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 ${
                    isUpdating[item.id] ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isUpdating[item.id]}
                >
                  {isUpdating[item.id] ? '処理中...' : '却下'}
                </button>
                <button
                  onClick={() => handleCopy(item.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  コピー
                </button>
                <TwitterPostButton
                  title={editedTitles[item.id]}
                  content={editedContents[item.id]}
                  onSuccess={() => handleAccept(item.id)}
                />
                <div className="flex flex-col gap-2 mt-4">
                  {MEDICINE_IMAGES.map((image, index) => (
                    <div key={index} className="w-50 h-20 relative">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        className="object-contain"
                      />
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