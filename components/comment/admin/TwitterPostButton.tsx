import React, { useState } from 'react';
//import { FaTwitter } from 'react-icons/fa';
import Image from 'next/image';

interface TwitterPostButtonProps {
  title: string;
  content: string;
  url: string;
  onSuccess?: () => void;
}

export default function TwitterPostButton({ title, content, url, onSuccess }: TwitterPostButtonProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageUrl(result);
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    try {
      setIsLoading(true);
      setError(null);
  
      const tweetContent = `${title}\n${content}`;
  
      const response = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetContent,
          url,
          imageUrl: imageUrl || undefined,
        }),
      });
  
      const result = await response.json();
  
      // 429エラーの場合は待機時間を表示
      if (response.status === 429) {
        const resetTime = response.headers.get('x-rate-limit-reset');
        const waitTime = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
        throw new Error(`レート制限に達しました。${waitTime ? `${waitTime.toLocaleTimeString()}頃に` : '少し時間をおいて'}再試行してください。`);
      }
  
      if (!result.success) {
        throw new Error(result.message || '投稿に失敗しました');
      }
  
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handlePost}
        disabled={isLoading}
        className="flex items-center justify-center gap-1 bg-[#1DA1F2] text-white px-3 py-1.5 rounded hover:bg-[#1a8cd8] disabled:opacity-50 text-xs"
      >
        {isLoading ? '投稿中...' : '検索'}
      </button>
      
      <div className="flex items-center gap-1">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="text-xs w-24"
          id={`image-upload-${title}`}
        />
        <label
          htmlFor={`image-upload-${title}`}
          className="text-xs text-gray-600 cursor-pointer hover:text-gray-800"
        >
          画像を選択
        </label>
      </div>

      {previewUrl && (
        <div className="mt-1 flex justify-center">
          <Image
            src={previewUrl}
            alt="プレビュー"
            width={150}
            height={100}
            className="rounded shadow-sm"
          />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
} 