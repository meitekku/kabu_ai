import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface TwitterPostButtonProps {
  title: string;
  content: string;
  chartImageUrl?: string; // チャート画像のURL（data URL）
  onSuccess?: () => void;
  siteNumber?: number; // サイト番号（デフォルト: 72）
  onComplete?: () => void; // 投稿完了時のコールバック
}

export default function TwitterPostButton({ title, content, chartImageUrl, onSuccess, siteNumber = 72, onComplete }: TwitterPostButtonProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Unixタイムスタンプを日本時間の「MM月DD日 H:i:s」形式に変換する関数
  const formatUnixTimestampToJST = (unixTimestamp: number): string => {
    const date = new Date(unixTimestamp * 1000);
    
    // 日本時間に変換（UTC+9）
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    
    const month = jstDate.getUTCMonth() + 1;
    const day = jstDate.getUTCDate();
    const hours = jstDate.getUTCHours().toString().padStart(2, '0');
    const minutes = jstDate.getUTCMinutes().toString().padStart(2, '0');
    const seconds = jstDate.getUTCSeconds().toString().padStart(2, '0');
    
    return `${month}月${day}日 ${hours}:${minutes}:${seconds}`;
  };

  // チャート画像が渡された場合、それを使用
  useEffect(() => {
    // console.log('[DEBUG TwitterPostButton] Props受信:', {
    //   title: title?.substring(0, 20) + '...',
    //   content: content?.substring(0, 20) + '...',
    //   chartImageUrl: chartImageUrl ? 'あり' : 'なし',
    //   chartImageUrlLength: chartImageUrl?.length || 0
    // });

    if (chartImageUrl) {
      // console.log('[DEBUG TwitterPostButton] チャート画像を設定');
      setImageUrl(chartImageUrl);
      setPreviewUrl(chartImageUrl);
      setCompressionInfo(''); // 「チャート画像を使用」テキストを削除
    }
  }, [chartImageUrl, title, content]);

  // 画像を圧縮する関数
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (typeof window === 'undefined') {
          reject(new Error('画像処理はブラウザ環境でのみ利用可能です'));
          return;
        }
        const img = new window.Image();
        img.src = event.target!.result as string;
        img.onload = () => {
          if (typeof document === 'undefined') {
            reject(new Error('画像処理はブラウザ環境でのみ利用可能です'));
            return;
          }
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
      // console.log('[DEBUG TwitterPostButton] 手動で画像選択:', file.name, formatFileSize(file.size));
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
        console.error('[DEBUG TwitterPostButton] 画像処理エラー:', err);
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
      
      // 1. Webサイトに投稿
      const postResponse = await fetch('/api/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: '0000', // ニュース要約用の汎用コード
          title: title,
          content: content,
          site: siteNumber, // サイト番号
          accept: 1, // 承認済み
          pickup: 0 // 通常投稿
        }),
      });
      
      if (!postResponse.ok) {
        throw new Error('Webサイトへの投稿に失敗しました');
      }
      
      // 2. Twitterに投稿
      const twitterResponse = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetContent,
          imageUrl: imageUrl || undefined,
        }),
      });
      
      // 429エラーの場合は待機時間を日本時間で表示
      if (twitterResponse.status === 429) {
        const resetTime = twitterResponse.headers.get('x-rate-limit-reset');
        if (resetTime) {
          const resetTimestamp = parseInt(resetTime);
          const jstTime = formatUnixTimestampToJST(resetTimestamp);
          throw new Error(`レート制限に達しました。${jstTime}頃に再試行してください。`);
        } else {
          throw new Error('レート制限に達しました。少し時間をおいて再試行してください。');
        }
      }
      
      const twitterResult = await twitterResponse.json();
      
      if (!twitterResult.success) {
        throw new Error(twitterResult.message || 'Twitter投稿に失敗しました');
      }
      
      // 成功メッセージを表示
      setSuccessMessage('TwitterとWebの両方に投稿が完了しました！');
      
      // 0.5秒後に完了処理を実行
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
        if (onSuccess) {
          onSuccess();
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 画像をクリア
  const handleClearImage = () => {
    // console.log('[DEBUG TwitterPostButton] 画像クリア');
    setImageUrl('');
    setPreviewUrl('');
    setCompressionInfo('');
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handlePost}
        disabled={isLoading}
        className="flex items-center justify-center gap-1 bg-[#1DA1F2] text-white px-3 py-1.5 rounded hover:bg-[#1a8cd8] disabled:opacity-50 text-xs"
      >
        {isLoading ? '投稿中...' : 'Twitter & Web投稿'}
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
        </label>
        {previewUrl && (
          <button
            onClick={handleClearImage}
            className="text-xs text-red-600 hover:text-red-800 ml-2"
          >
            クリア
          </button>
        )}
      </div>

      {compressionInfo && (
        <p className="text-xs text-gray-600">{compressionInfo}</p>
      )}

      {previewUrl && (
        <div className="mt-1 flex flex-col items-center">
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
      
      {successMessage && (
        <p className="text-green-600 text-xs mt-1 font-medium">{successMessage}</p>
      )}
      
      {/* デバッグ情報表示（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-100 rounded">
          <p>デバッグ情報:</p>
          <p>- チャート画像: {chartImageUrl ? '渡されている' : '渡されていない'}</p>
          <p>- 選択画像: {imageUrl && !chartImageUrl ? 'あり' : 'なし'}</p>
          <p>- 画像サイズ: {imageUrl ? `${(imageUrl.length / 1024).toFixed(1)}KB` : '0KB'}</p>
        </div>
      )}
    </div>
  );
}