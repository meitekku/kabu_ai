'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PostForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    code: '',
    accept: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const extractCode = (title: string) => {
    const fourDigits = title.match(/\d{4}/);
    if (fourDigits) return fourDigits[0];

    const threeDigitsOneLetter = title.match(/\d{3}[A-Za-z0-9]/);
    if (threeDigitsOneLetter) return threeDigitsOneLetter[0];

    return null;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    const code = extractCode(newTitle);
    setFormData({
      ...formData,
      title: newTitle,
      code: code || ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      setMessage('タイトルと内容を入力してください');
      return;
    }

    if (!formData.code) {
      alert('titleにコードを入れてください（4桁の数字、または3桁の数字+1文字）');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('投稿が完了しました');
        // App Routerの新しいナビゲーションAPIを使用
        router.push(`https://www.kabu-ai.jp/${formData.code}/news/article/${data.data.id}`);
      } else {
        setMessage('投稿に失敗しました: ' + data.message);
      }
    } catch (error) {
      setMessage('エラーが発生しました');
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="mb-4">
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="タイトルを入力"
              className="w-full p-2 border rounded"
            />
          </div>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="内容を入力"
            className="w-full h-64 p-2 border rounded resize-none"
          />
        </div>

        <div className="w-32 flex flex-col items-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.code}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '投稿中...' : '投稿する'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-4 p-2 text-center rounded bg-gray-100">
          {message}
        </div>
      )}
    </div>
  );
}