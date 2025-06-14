import React, { useState } from 'react';
import Image from 'next/image';

interface TwitterPostButtonProps {
  title: string;
  content: string;
  onSuccess?: () => void;
}

export default function TwitterPostButton({ title, content, onSuccess }: TwitterPostButtonProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string>('');

  // 画像を圧縮する関数
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target!.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // 最大幅・高さを設定（Twitter推奨サイズ）
          const maxWidth = 1920;
          const maxHeight = 1080;
          let width = img.width;
          let height = img.height;
          
          // アスペクト比を保ちながらリサイズ
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 画像を描画
          ctx.drawImage(img, 0, 0, width, height);
          
          // JPEGとして圧縮（品質を調整）
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('画像の圧縮に失敗しました'));
                return;
              }
              
              const compressedSize = blob.size;
              const originalSize = file.size;
              const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
              
              setCompressionInfo(
                `圧縮完了: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio}%削減)`
              );
              
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(blob);
            },
            'image/jpeg',
            0.85 // JPEG品質（0.0-1.0）
          );
        };
        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    });
  };

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setCompressionInfo('画像を圧縮中...');
        setError(null);
        
        // 5MB以上の場合は圧縮、それ以下はそのまま
        if (file.size > 5 * 1024 * 1024) {
          const compressedDataUrl = await compressImage(file);
          setImageUrl(compressedDataUrl);
          setPreviewUrl(compressedDataUrl);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setImageUrl(result);
            setPreviewUrl(result);
            setCompressionInfo(`元のサイズ: ${formatFileSize(file.size)}`);
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error(err);
        setError('画像の処理に失敗しました');
        setCompressionInfo('');
      }
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
        {isLoading ? '投稿中...' : '投稿'}
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

      {compressionInfo && (
        <p className="text-xs text-gray-600">{compressionInfo}</p>
      )}

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