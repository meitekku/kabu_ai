import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface TwitterPythonButtonProps {
  title: string;
  content: string;
  chartImageUrl?: string; // チャート画像のURL（data URL）
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface SaveImageResponse {
  success: boolean;
  path?: string;
  absolutePath?: string;
  filename?: string;
  error?: string;
}

interface TweetResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    final_result: boolean;
    timestamp: string;
    errors: Array<{
      step: string;
      message: string;
      timestamp: string;
      type: string;
      exception?: string;
      traceback?: string;
    }>;
    warnings: Array<{
      step: string;
      message: string;
      timestamp: string;
      type: string;
    }>;
    success_steps: Array<{
      step: string;
      message: string;
      timestamp: string;
      type: string;
    }>;
    summary: {
      total_errors: number;
      total_warnings: number;
      total_success_steps: number;
    };
  };
}

export default function TwitterPythonButton({ 
  title, 
  content, 
  chartImageUrl, 
  onSuccess,
  onError 
}: TwitterPythonButtonProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [lastResponse, setLastResponse] = useState<TweetResponse | null>(null);
  const [showFullUI, setShowFullUI] = useState(false); // UIの表示切り替え

  // チャート画像が渡された場合、それを使用
  useEffect(() => {
    if (chartImageUrl) {
      setImageUrl(chartImageUrl);
      setPreviewUrl(chartImageUrl);
    }
  }, [chartImageUrl]);

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 絵文字を含むテキストをエンコード（BMP外の文字を処理）
  const encodeEmojiText = (text: string): string => {
    // 絵文字を含むテキストをBase64エンコード
    // Pythonスクリプト側でデコードして処理する
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  };

  // 絵文字の存在をチェック
  const containsEmoji = (text: string): boolean => {
    // 絵文字の正規表現パターン（より包括的）
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
    return emojiRegex.test(text);
  };

  // 手動で画像を選択
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setError(null);
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setImageUrl(result);
          setPreviewUrl(result);
          setProcessingStatus(`画像サイズ: ${formatFileSize(file.size)}`);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('画像読み込みエラー:', err);
        const errorMsg = '画像の読み込みに失敗しました';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    }
  };

  // 画像をサーバーに保存
  const saveImageToServer = async (dataUrl: string): Promise<string | null> => {
    try {
      setProcessingStatus('画像をサーバーに保存中...');
      
      const response = await fetch('/api/twitter/post_selenium/save-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: dataUrl
        }),
      });
      
      const result: SaveImageResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '画像の保存に失敗しました');
      }
      
      // Pythonスクリプト用の絶対パスを返す
      return result.absolutePath || null;
      
    } catch (err) {
      console.error('画像保存エラー:', err);
      throw err;
    }
  };

  // ツイートを投稿
  const handlePost = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProcessingStatus('処理を開始しています...');
      setLastResponse(null);
      
      const tweetMessage = `${title}\n${content}`;
      let imagePath: string | undefined;
      
      // 画像がある場合はサーバーに保存
      if (imageUrl) {
        try {
          const savedPath = await saveImageToServer(imageUrl);
          if (savedPath) {
            imagePath = savedPath;
            setProcessingStatus(`画像を保存しました`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '画像の保存に失敗しました';
          setError(errorMsg);
          if (onError) onError(errorMsg);
          setIsLoading(false);
          return;
        }
      }
      
      // Pythonスクリプトを実行してツイート投稿
      setProcessingStatus('Pythonスクリプトを実行中...');
      
      // 絵文字が含まれているかチェック
      const hasEmoji = containsEmoji(tweetMessage);
      if (hasEmoji) {
        console.log('絵文字を検出しました。特別な処理を使用します。');
      }
      
      const requestBody = {
        message: tweetMessage,
        // 絵文字が含まれている場合は、エンコードしたメッセージも送信
        encodedMessage: hasEmoji ? encodeEmojiText(tweetMessage) : undefined,
        hasEmoji: hasEmoji,
        imagePath: imagePath,
        textOnly: !imagePath
      };
      
      const response = await fetch('/api/twitter/post_selenium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const result: TweetResponse = await response.json();
      setLastResponse(result);
      
      if (!result.success) {
        throw new Error(result.error || '投稿に失敗しました');
      }
      
      setProcessingStatus('投稿完了！');
      setError(null);
      setTimeout(() => {
        setProcessingStatus('');
      }, 3000);
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '投稿に失敗しました';
      setError(errorMsg);
      setProcessingStatus('');
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 画像をクリア
  const handleClearImage = () => {
    setImageUrl('');
    setPreviewUrl('');
    setProcessingStatus('');
    setLastResponse(null);
    setError(null);
  };

  // 詳細情報の表示切り替え
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <>
      {/* シンプルなボタンモード（デフォルト） */}
      {!showFullUI ? (
        <div className="flex flex-col gap-1">
          <button
            onClick={handlePost}
            disabled={isLoading}
            className="flex items-center justify-center gap-1 bg-[#1DA1F2] text-white px-3 py-1.5 rounded hover:bg-[#1a8cd8] disabled:opacity-50 text-xs"
          >
            {isLoading ? '処理中...' : 'Python投稿'}
          </button>
          
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
          
          {processingStatus && (
            <p className="text-xs text-gray-600">{processingStatus}</p>
          )}
          
          <button
            onClick={() => setShowFullUI(true)}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            詳細オプション
          </button>
        </div>
      ) : (
        /* フルUIモード */
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Python投稿</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePost}
                disabled={isLoading}
                className="flex items-center justify-center gap-1 bg-[#1DA1F2] text-white px-3 py-1.5 rounded hover:bg-[#1a8cd8] disabled:opacity-50 text-xs"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    処理中...
                  </>
                ) : (
                  '投稿'
                )}
              </button>
              <button
                onClick={() => setShowFullUI(false)}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                閉じる
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-xs"
              id={`image-upload-python-${title}`}
              disabled={isLoading}
            />
            {previewUrl && (
              <button
                onClick={handleClearImage}
                className="text-xs text-red-600 hover:text-red-800"
                disabled={isLoading}
              >
                クリア
              </button>
            )}
          </div>

          {processingStatus && (
            <p className="text-xs text-gray-600">{processingStatus}</p>
          )}

          {previewUrl && (
            <div className="mt-1">
              <Image
                src={previewUrl}
                alt="プレビュー"
                width={200}
                height={150}
                className="rounded shadow-sm object-contain"
                unoptimized
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-xs p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          {/* 詳細情報表示 */}
          {lastResponse && (
            <div className="mt-2">
              <button
                onClick={toggleDetails}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showDetails ? '詳細を隠す' : '詳細を表示'}
              </button>
              
              {showDetails && lastResponse.details && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <div className="mb-2">
                    <strong>最終結果:</strong> {lastResponse.details.final_result ? '✅ 成功' : '❌ 失敗'}
                  </div>
                  
                  {/* 成功ステップ */}
                  {lastResponse.details.success_steps.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-green-600">成功ステップ ({lastResponse.details.success_steps.length}):</strong>
                      <ul className="ml-2 mt-1">
                        {lastResponse.details.success_steps.map((step, idx) => (
                          <li key={idx} className="text-green-700">
                            • [{step.step}] {step.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* 警告 */}
                  {lastResponse.details.warnings.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-yellow-600">警告 ({lastResponse.details.warnings.length}):</strong>
                      <ul className="ml-2 mt-1">
                        {lastResponse.details.warnings.map((warning, idx) => (
                          <li key={idx} className="text-yellow-700">
                            • [{warning.step}] {warning.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* エラー */}
                  {lastResponse.details.errors.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-red-600">エラー ({lastResponse.details.errors.length}):</strong>
                      <ul className="ml-2 mt-1">
                        {lastResponse.details.errors.map((error, idx) => (
                          <li key={idx} className="text-red-700">
                            • [{error.step}] {error.message}
                            {error.exception && (
                              <div className="ml-2 text-xs text-gray-600">
                                例外: {error.exception}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}