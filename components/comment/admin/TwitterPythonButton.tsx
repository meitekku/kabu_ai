import React, { useState, useEffect } from 'react';
import Image from 'next/image';

// ===== テストモード設定 =====
// 🚀 現在: 本番モード有効
// 📝 ボタン押下で即座にPlaywright投稿が実行されます
// 
// 🔄 テストモードに戻す手順:
// 1. 下記の IS_TEST_MODE を true に変更
// 2. ファイルを保存  
// 3. 投稿ボタンに🧪アイコンとテストが表示されれば完了
const IS_TEST_MODE = false;
// ==============================

interface TwitterPythonButtonProps {
  title: string;
  content: string;
  chartImageUrl?: string; // チャート画像のURL（data URL）
  onSuccess?: () => void;
  onError?: (error: string) => void;
  useSystemProfile?: boolean; // システムプロファイルを使用するかどうか
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
  onError,
  useSystemProfile = false
}: TwitterPythonButtonProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [lastResponse, setLastResponse] = useState<TweetResponse | null>(null);
  const [showFullUI, setShowFullUI] = useState(false); // UIの表示切り替え
  const [isManuallySelected, setIsManuallySelected] = useState(false); // 手動選択画像フラグ
  
  // テストモード用のstate
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPostData, setTestPostData] = useState<{
    message: string;
    imagePaths: string[];
    mode: 'mobile' | 'playwright' | 'normal';
  } | null>(null);

  // チャート画像が渡された場合、それを使用（手動選択画像を優先）
  useEffect(() => {
    console.log('🔍 [FRONTEND DEBUG] useEffect - chartImageUrl変更検出');
    console.log('🔍 [FRONTEND DEBUG] chartImageUrl存在:', !!chartImageUrl);
    console.log('🔍 [FRONTEND DEBUG] chartImageUrl長さ:', chartImageUrl ? chartImageUrl.length : 0);
    console.log('🔍 [FRONTEND DEBUG] 現在のimageUrl存在:', !!imageUrl);
    console.log('🔍 [FRONTEND DEBUG] 現在のimageUrl長さ:', imageUrl ? imageUrl.length : 0);
    console.log('🔍 [FRONTEND DEBUG] 手動選択フラグ:', isManuallySelected);
    
    // 手動選択された画像がない場合のみchartImageUrlを適用
    if (chartImageUrl && (!imageUrl || !isManuallySelected)) {
      console.log('🔍 [FRONTEND DEBUG] chartImageUrlプレビュー:', chartImageUrl.substring(0, 100) + '...');
      setImageUrl(chartImageUrl);
      setPreviewUrl(chartImageUrl);
      setIsManuallySelected(false); // chart画像なので手動選択フラグをfalseに
      console.log('✅ [FRONTEND DEBUG] chartImageUrlをimageUrlに設定完了');
    } else if (!chartImageUrl && imageUrl && !isManuallySelected) {
      // chartImageUrlが空で、既存が手動選択でない場合はクリア
      console.log('⚠️ [FRONTEND DEBUG] chartImageUrlが空になったため、chart画像をクリア');
      setImageUrl('');
      setPreviewUrl('');
    } else {
      console.log('🔍 [FRONTEND DEBUG] 手動選択画像が存在するため、chartImageUrlは無視');
    }
  }, [chartImageUrl, isManuallySelected]);  // imageUrlを依存配列から除外して無限ループを防ぐ

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // テストモード用：投稿データをログ出力する関数
  const logTestPostData = (message: string, imagePaths: string[], mode: string) => {
    console.log('='.repeat(50));
    console.log('📝 [テストモード] 投稿前データ確認');
    console.log('='.repeat(50));
    console.log('🚀 投稿モード:', mode);
    console.log('📄 投稿メッセージ:');
    console.log(message);
    console.log('🖼️ 添付画像数:', imagePaths.length);
    if (imagePaths.length > 0) {
      imagePaths.forEach((path, index) => {
        console.log(`  ${index + 1}. ${path}`);
      });
    }
    console.log('⏰ 処理時刻:', new Date().toLocaleString('ja-JP'));
    console.log('='.repeat(50));
  };

  // テストモード用：投稿確認を表示する関数（ボタン押下直後用）
  const showTestConfirmationImmediate = (mode: 'mobile' | 'playwright' | 'normal') => {
    if (IS_TEST_MODE) {
      setIsLoading(true);
      setProcessingStatus('🧪 テストモード：投稿内容を確認中...');
      
      // titleが存在する場合は、contentが空でも改行2つを追加
      const tweetMessage = title ? (content ? `${title}\n\n${content}` : title) : (content || '');
      const imagePaths = chartImageUrl ? ['チャート画像が添付されます'] : [];
      
      logTestPostData(tweetMessage, imagePaths, mode);
      setTestPostData({ message: tweetMessage, imagePaths, mode });
      setShowTestModal(true);
      setIsLoading(false);
      setProcessingStatus('');
      return true; // テストモードで停止
    }
    return false; // 本番モードで継続
  };

  // テストモード確認後の実際の投稿処理を実行する関数
  const executeActualPost = async (mode: 'mobile' | 'playwright' | 'normal') => {
    switch (mode) {
      case 'mobile':
        await handlePostMobileActual();
        break;
      case 'playwright':
        await handlePostPlaywrightActual();
        break;
      case 'normal':
        await handlePostActual();
        break;
    }
  };



  // モバイル版投稿（テストモード対応）
  const handlePostMobile = async () => {
    // ===== テストモード確認（最優先） =====
    if (showTestConfirmationImmediate('mobile')) {
      return; // テストモードで停止
    }
    // ===========================
    
    // 本番モードの場合は実際の投稿処理を実行
    await handlePostMobileActual();
  };

  // モバイル版投稿（実際の処理）
  const handlePostMobileActual = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProcessingStatus('📱 モバイル版（認証回避強化）で処理を開始しています...');
      setLastResponse(null);
      
      // titleが存在する場合は、contentが空でも改行2つを追加
      const tweetMessage = title ? (content ? `${title}\n\n${content}` : title) : (content || '');
      
      // デバッグ情報をコンソールに出力
      console.log('🐛 [DEBUG] モバイル投稿開始');
      console.log('🐛 [DEBUG] title:', title);
      console.log('🐛 [DEBUG] content:', content);
      console.log('🐛 [DEBUG] tweetMessage:', tweetMessage);
      console.log('🐛 [DEBUG] chartImageUrl present:', !!imageUrl);
      console.log('🐛 [DEBUG] chartImageUrl length:', imageUrl ? imageUrl.length : 0);
      
      // モバイル版実投稿処理
      setProcessingStatus('📱 iPhone 14 Pro Max として認証を回避しています...');
      
      // 画像データの準備（base64を直接渡す）
      let imageBase64Data: string[] = [];
      if (imageUrl) {
        try {
          setProcessingStatus('📱 画像データを準備中...');
          imageBase64Data = [imageUrl]; // base64 data URLをそのまま渡す
          console.log('🐛 [DEBUG] Mobile imageBase64Data prepared:', imageBase64Data.length, 'items');
          setProcessingStatus('📱 画像データ準備完了。モバイル投稿処理中...');
        } catch (err) {
          console.error('Mobile image data preparation error:', err);
          setProcessingStatus('📱 画像データ準備に失敗。テキストのみで投稿中...');
        }
      }


      // リクエストボディを作成（モバイル実投稿モード）
      const postBody = {
        message: tweetMessage,
        textOnly: imageBase64Data.length === 0,
        actuallyPost: true, // 実投稿モード
        imageBase64Data: imageBase64Data
      };
      
      const requestOptions = {
        method: 'POST',
        cache: 'no-cache' as RequestCache,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody)
      };
      
      const response = await fetch('/api/twitter/post_mobile', requestOptions);
      const result = await response.json();
      
      setLastResponse(result);
      
      // 🔒 モバイル版実投稿の成功を厳格にチェック（他の投稿方式と同様）
      console.log('🔍 [MOBILE SUCCESS CHECK] モバイル版成功判定開始');
      console.log('🔍 [MOBILE SUCCESS CHECK] result.success:', result.success);
      console.log('🔍 [MOBILE SUCCESS CHECK] result.details?.final_result:', result.details?.final_result);
      
      const isActualPostSuccess = result.details && result.details.final_result;
      
      // モバイル版の成功ステップを確認（テストモードと実投稿モードの両方を考慮）
      const hasActualPostStep = result.details && result.details.success_steps.some((step: { step: string; message: string; timestamp: string; type: string }) => {
        const isPostSuccess = step.message.includes('モバイル版投稿完了成功') || 
                             step.message.includes('モバイル版実投稿成功') ||
                             step.message.includes('モバイルツイート投稿完了') ||
                             step.message.includes('投稿完了成功') ||
                             step.message.includes('実投稿') ||
                             step.message.includes('ツイート投稿完了');
        console.log('🔍 [MOBILE SUCCESS CHECK] step:', step.message, '→ success:', isPostSuccess);
        return isPostSuccess;
      });
      
      console.log('🔍 [MOBILE SUCCESS CHECK] isActualPostSuccess:', isActualPostSuccess);
      console.log('🔍 [MOBILE SUCCESS CHECK] hasActualPostStep:', hasActualPostStep);
      console.log('🔍 [MOBILE SUCCESS CHECK] 最終判定:', isActualPostSuccess && hasActualPostStep);
      
      if (result.success && isActualPostSuccess && hasActualPostStep) {
        // 実投稿が確実に成功した場合のみサイト投稿を実行
        setProcessingStatus('✅ モバイル版実投稿が正常に完了しました！');
        setError(null);
        
        // 実投稿成功レスポンスを整形
        setLastResponse({
          success: true,
          message: 'モバイル版実投稿が完了しました',
          details: result.details
        });
        
        setTimeout(() => {
          setProcessingStatus('');
        }, 3000);
        
        // 実投稿成功時のみonSuccessを呼ぶ
        if (onSuccess) {
          console.log('✅ [MOBILE SUCCESS] モバイル版実投稿成功：サイト投稿を実行します');
          onSuccess();
        }
      } else if (result.success && (!isActualPostSuccess || !hasActualPostStep)) {
        // API処理は成功したが、実投稿は未実行の場合
        setProcessingStatus('📱 モバイル版処理完了（投稿は未実行）');
        setError('モバイル版実投稿が実行されませんでした');
        
        setLastResponse({
          success: false,
          error: 'モバイル版実投稿が実行されませんでした',
          details: result.details || {
            final_result: false,
            timestamp: new Date().toISOString(),
            errors: [
              {
                step: 'mobile_post_verification',
                message: 'モバイル版実投稿ステップが確認できませんでした',
                timestamp: new Date().toISOString(),
                type: 'verification_error'
              }
            ],
            warnings: [],
            success_steps: [],
            summary: {
              total_errors: 1,
              total_warnings: 0,
              total_success_steps: 0
            }
          }
        });
        
        console.log('⚠️ [MOBILE SUCCESS] モバイル版実投稿未確認：サイト投稿は実行されません');
        if (onError) onError('モバイル版実投稿が実行されませんでした');
      } else {
        // API処理自体が失敗した場合
        const errorMsg = result.error || 'モバイル版投稿に失敗しました';
        setError(errorMsg);
        setProcessingStatus(`❌ モバイル版エラー: ${errorMsg}`);
        
        console.log('❌ [MOBILE SUCCESS] モバイル版API処理失敗：サイト投稿は実行されません');
        if (onError) {
          onError(errorMsg);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'モバイル版で予期しないエラーが発生しました';
      setError(errorMessage);
      setProcessingStatus(`❌ モバイル版エラー: ${errorMessage}`);
      
      // エラーレスポンスを整形
      setLastResponse({
        success: false,
        error: errorMessage,
        details: {
          final_result: false,
          timestamp: new Date().toISOString(),
          errors: [
            {
              step: 'mobile_exception',
              message: errorMessage,
              timestamp: new Date().toISOString(),
              type: 'exception',
              exception: err instanceof Error ? err.stack : String(err)
            }
          ],
          warnings: [],
          success_steps: [],
          summary: {
            total_errors: 1,
            total_warnings: 0,
            total_success_steps: 0
          }
        }
      });
      
      console.error('❌ [MOBILE ERROR] モバイル版例外発生：サイト投稿は実行されません', err);
      
      // 例外発生時はonSuccess()は絶対に呼ばない
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Playwright版投稿（テストモード対応）
  const handlePostPlaywright = async () => {
    // ===== テストモード確認（最優先） =====
    if (showTestConfirmationImmediate('playwright')) {
      return; // テストモードで停止
    }
    // ===========================
    
    // 本番モードの場合は実際の投稿処理を実行
    await handlePostPlaywrightActual();
  };

  // Playwright版投稿（実際の処理）
  const handlePostPlaywrightActual = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProcessingStatus('Playwright版（実投稿モード）で処理を開始しています...');
      setLastResponse(null);
      
      // titleが存在する場合は、contentが空でも改行2つを追加
      const tweetMessage = title ? (content ? `${title}\n\n${content}` : title) : (content || '');
      
      // デバッグ情報をコンソールに出力（詳細強化版）
      console.log('='.repeat(60));
      console.log('🎭 [Playwright投稿開始] 詳細デバッグ');
      console.log('='.repeat(60));
      console.log('📝 [INPUT] title:', title);
      console.log('📝 [INPUT] content:', content);
      console.log('📝 [COMPOSED] tweetMessage:', tweetMessage);
      console.log('📷 [IMAGE] chartImageUrl存在:', !!imageUrl);
      console.log('📷 [IMAGE] chartImageUrl長さ:', imageUrl ? imageUrl.length : 0);
      
      if (imageUrl) {
        console.log('📷 [IMAGE] データ形式:', imageUrl.substring(0, 50) + '...');
        console.log('📷 [IMAGE] MIMEタイプ:', imageUrl.match(/data:([^;]*)/)?.[1] || 'unknown');
        
        // base64データの妥当性チェック
        try {
          const base64Data = imageUrl.split(',')[1];
          const decodedSize = atob(base64Data).length;
          console.log('📷 [IMAGE] デコード後サイズ:', decodedSize, 'bytes');
          console.log('📷 [IMAGE] 推定ファイルサイズ:', Math.round(decodedSize / 1024), 'KB');
        } catch (e) {
          console.error('📷 [ERROR] base64デコードエラー:', e);
        }
      } else {
        console.log('📷 [WARNING] 画像データが存在しません');
      }
      
      console.log('⏰ [TIMING] 処理開始時刻:', new Date().toISOString());
      
      // Playwright版実投稿処理
      setProcessingStatus('ブラウザでの手動ログインをお待ちください。ログイン完了後に実際に投稿されます...');
      
      // 画像データの準備（base64を直接渡す）- 詳細ログ版
      let imageBase64Data: string[] = [];
      if (imageUrl) {
        try {
          console.log('📷 [PREPARE] 画像データ準備開始...');
          setProcessingStatus('画像データを準備中...');
          
          // データの詳細検証
          console.log('📷 [PREPARE] 元データ形式確認:', {
            isDataURL: imageUrl.startsWith('data:'),
            length: imageUrl.length,
            hasComma: imageUrl.includes(','),
            mimeType: imageUrl.match(/data:([^;]*)/)?.[1]
          });
          
          imageBase64Data = [imageUrl]; // base64 data URLをそのまま渡す
          
          console.log('📷 [PREPARE] imageBase64Data作成完了:');
          console.log('  - 配列サイズ:', imageBase64Data.length);
          console.log('  - 各アイテム長さ:', imageBase64Data.map(item => item.length));
          console.log('  - 送信データプレビュー:', imageBase64Data[0]?.substring(0, 100) + '...');
          
          setProcessingStatus('画像データ準備完了。投稿処理中...');
          
        } catch (err) {
          console.error('📷 [ERROR] 画像データ準備エラー:', err);
          console.error('📷 [ERROR] エラー詳細:', {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            imageUrlLength: imageUrl.length,
            imageUrlStart: imageUrl.substring(0, 50)
          });
          setProcessingStatus('画像データ準備に失敗。テキストのみで投稿中...');
        }
      } else {
        console.log('📷 [SKIP] 画像データなし - テキストのみ投稿');
      }


      // リクエストボディを作成（実投稿モード）- 詳細ログ版
      const postBody = {
        message: tweetMessage,
        textOnly: imageBase64Data.length === 0,
        actuallyPost: true, // 実投稿モード
        imageBase64Data: imageBase64Data
      };
      
      console.log('📦 [REQUEST] リクエストボディ作成完了:');
      console.log('  - message長さ:', postBody.message.length);
      console.log('  - textOnly:', postBody.textOnly);
      console.log('  - actuallyPost:', postBody.actuallyPost);
      console.log('  - imageBase64Data配列サイズ:', postBody.imageBase64Data.length);
      
      if (postBody.imageBase64Data.length > 0) {
        console.log('  - 画像データ詳細:', postBody.imageBase64Data.map((img, i) => ({
          index: i,
          length: img.length,
          isDataURL: img.startsWith('data:'),
          mimeType: img.match(/data:([^;]*)/)?.[1] || 'unknown'
        })));
      } else {
        console.log('  - ⚠️ 画像データが空です');
      }
      
      const requestOptions = {
        method: 'POST',
        cache: 'no-cache' as RequestCache,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody)
      };
      
      console.log('🌐 [API] リクエスト送信開始...');
      console.log('🌐 [API] エンドポイント: /api/twitter/post_playwright');
      console.log('🌐 [API] リクエストオプション:', {
        method: requestOptions.method,
        headers: requestOptions.headers,
        bodyLength: requestOptions.body ? requestOptions.body.length : 0
      });
      
      const response = await fetch('/api/twitter/post_playwright', requestOptions);
      
      console.log('🌐 [API] レスポンス受信:');
      console.log('  - ステータス:', response.status, response.statusText);
      console.log('  - ヘッダー:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      
      console.log('🌐 [API] レスポンス内容:');
      console.log('  - success:', result.success);
      console.log('  - message:', result.message);
      if (result.error) {
        console.log('  - error:', result.error);
      }
      if (result.details) {
        console.log('  - details.final_result:', result.details.final_result);
        console.log('  - details.summary:', result.details.summary);
        
        if (result.details.errors && result.details.errors.length > 0) {
          console.log('  - エラー詳細:', result.details.errors);
        }
        
        if (result.details.success_steps && result.details.success_steps.length > 0) {
          console.log('  - 成功ステップ:', result.details.success_steps.map((s: { step: string; message: string; timestamp: string; type: string }) => s.message));
        }
      }
      
      if (!result.success) {
        console.error('❌ [FAIL] API呼び出し失敗');
        console.error('❌ [FAIL] エラー内容:', result.error);
        console.error('❌ [FAIL] 完全レスポンス:', result);
        throw new Error(result.error || 'Playwright版実投稿に失敗しました');
      }
      
      console.log('✅ [SUCCESS] API呼び出し成功');
      
      // Playwright版実投稿の成功を詳細チェック
      const isActualPostSuccess = result.details && result.details.final_result;
      const hasActualPostStep = result.details && result.details.success_steps.some((step: { step: string; message: string; timestamp: string; type: string }) => 
        step.message.includes('投稿完了成功') || step.message.includes('実投稿') || step.message.includes('ツイート投稿完了')
      );
      
      console.log('🔍 [PLAYWRIGHT SUCCESS CHECK] result.success:', result.success);
      console.log('🔍 [PLAYWRIGHT SUCCESS CHECK] isActualPostSuccess:', isActualPostSuccess);
      console.log('🔍 [PLAYWRIGHT SUCCESS CHECK] hasActualPostStep:', hasActualPostStep);
      console.log('🔍 [PLAYWRIGHT SUCCESS CHECK] 最終判定:', result.success && isActualPostSuccess && hasActualPostStep);
      
      if (result.success && isActualPostSuccess && hasActualPostStep) {
        // 実投稿が確実に成功した場合のみサイト投稿を実行
        setProcessingStatus('✅ Playwright版実投稿が正常に完了しました！');
        setError(null);
        
        // 実投稿成功レスポンスを整形
        setLastResponse({
          success: true,
          message: 'Playwright版実投稿が完了しました',
          details: result.details
        });
        
        setTimeout(() => {
          setProcessingStatus('');
        }, 3000);
        
        // 実投稿成功時のみonSuccessを呼ぶ
        if (onSuccess) {
          console.log('✅ [PLAYWRIGHT SUCCESS] Playwright版実投稿成功：サイト投稿を実行します');
          onSuccess();
        }
      } else if (result.success && (!isActualPostSuccess || !hasActualPostStep)) {
        // API処理は成功したが、実投稿は未実行の場合
        setProcessingStatus('🎭 Playwright版処理完了（投稿は未実行）');
        setError('Playwright版実投稿が実行されませんでした');
        
        setLastResponse({
          success: false,
          error: 'Playwright版実投稿が実行されませんでした',
          details: result.details || {
            final_result: false,
            timestamp: new Date().toISOString(),
            errors: [
              {
                step: 'playwright_post_verification',
                message: 'Playwright版実投稿ステップが確認できませんでした',
                timestamp: new Date().toISOString(),
                type: 'verification_error'
              }
            ],
            warnings: [],
            success_steps: [],
            summary: {
              total_errors: 1,
              total_warnings: 0,
              total_success_steps: 0
            }
          }
        });
        
        console.log('❌ [PLAYWRIGHT INCOMPLETE] Playwright版実投稿未確認：サイト投稿は実行されません');
        if (onError) onError('Playwright版実投稿が実行されませんでした');
      } else {
        // 投稿が完了していない場合
        setProcessingStatus('Playwright処理完了（投稿は未実行）');
        setError('Playwright版実投稿が実行されませんでした');
        
        setLastResponse({
          success: false,
          error: 'Playwright版実投稿が実行されませんでした',
          details: result.details || {
            final_result: false,
            timestamp: new Date().toISOString(),
            errors: [
              {
                step: 'playwright_post_verification',
                message: 'Playwright版実投稿ステップが確認できませんでした',
                timestamp: new Date().toISOString(),
                type: 'verification_error'
              }
            ],
            warnings: [],
            success_steps: [],
            summary: {
              total_errors: 1,
              total_warnings: 0,
              total_success_steps: 0
            }
          }
        });
        
        console.log('Playwright版実投稿未確認：サイト投稿は実行されません');
        if (onError) onError('Playwright版実投稿が実行されませんでした');
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Playwright版実投稿に失敗しました';
      setError(errorMsg);
      setProcessingStatus('');
      
      // エラーレスポンスを整形
      setLastResponse({
        success: false,
        error: errorMsg,
        details: {
          final_result: false,
          timestamp: new Date().toISOString(),
          errors: [
            {
              step: 'playwright_actual_post',
              message: errorMsg,
              timestamp: new Date().toISOString(),
              type: 'error',
              exception: errorMsg
            }
          ],
          warnings: [],
          success_steps: [],
          summary: {
            total_errors: 1,
            total_warnings: 0,
            total_success_steps: 0
          }
        }
      });
      
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 手動で画像を選択
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖼️ [IMAGE DEBUG] handleImageChange呼び出し');
    console.log('🖼️ [IMAGE DEBUG] 現在の状態 - imageUrl存在:', !!imageUrl);
    console.log('🖼️ [IMAGE DEBUG] 現在の状態 - isManuallySelected:', isManuallySelected);
    const file = e.target.files?.[0];
    if (file) {
      try {
        setError(null);
        console.log('🖼️ [IMAGE DEBUG] 手動画像選択開始');
        console.log('🖼️ [IMAGE DEBUG] ファイル名:', file.name);
        console.log('🖼️ [IMAGE DEBUG] ファイルサイズ:', file.size);
        console.log('🖼️ [IMAGE DEBUG] ファイルタイプ:', file.type);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          console.log('🖼️ [IMAGE DEBUG] FileReader完了');
          console.log('🖼️ [IMAGE DEBUG] データURL長さ:', result.length);
          console.log('🖼️ [IMAGE DEBUG] データURLプレビュー:', result.substring(0, 100) + '...');
          
          setImageUrl(result);
          setPreviewUrl(result);
          setIsManuallySelected(true); // 手動選択フラグを設定
          setProcessingStatus(`画像サイズ: ${formatFileSize(file.size)}`);
          
          console.log('✅ [IMAGE DEBUG] 手動選択画像設定完了（手動選択フラグON）');
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('🖼️ [IMAGE ERROR] 画像読み込みエラー:', err);
        const errorMsg = '画像の読み込みに失敗しました';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    } else {
      console.log('🖼️ [IMAGE DEBUG] ファイルが選択されませんでした');
    }
  };



  // ツイートを実投稿（テストモード対応）
  const handlePost = async () => {
    // ===== テストモード確認（最優先） =====
    if (showTestConfirmationImmediate('normal')) {
      return; // テストモードで停止
    }
    // ===========================
    
    // 本番モードの場合は実際の投稿処理を実行
    await handlePostActual();
  };

  // ツイートを実投稿（実際の処理）
  const handlePostActual = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProcessingStatus(useSystemProfile ? '安全なプロファイルコピーを作成中。既存のChromeとVSCodeには影響しません...' : '処理を開始しています...');
      setLastResponse(null);
      
      // titleが存在する場合は、contentが空でも改行2つを追加
      const tweetMessage = title ? (content ? `${title}\n\n${content}` : title) : (content || '');
      
      // デバッグ情報をコンソールに出力
      console.log('='.repeat(60));
      console.log('🐛 [PYTHON DEBUG] 通常Python投稿開始');
      console.log('='.repeat(60));
      console.log('🐛 [PYTHON DEBUG] title:', title);
      console.log('🐛 [PYTHON DEBUG] content:', content);
      console.log('🐛 [PYTHON DEBUG] tweetMessage:', tweetMessage);
      console.log('🐛 [PYTHON DEBUG] imageUrl存在:', !!imageUrl);
      console.log('🐛 [PYTHON DEBUG] imageUrl長さ:', imageUrl ? imageUrl.length : 0);
      if (imageUrl) {
        console.log('🐛 [PYTHON DEBUG] imageUrlプレビュー:', imageUrl.substring(0, 100) + '...');
        console.log('🐛 [PYTHON DEBUG] MIMEタイプ:', imageUrl.match(/data:([^;]*)/)?.[1] || 'unknown');
      }
      console.log('🐛 [PYTHON DEBUG] useSystemProfile:', useSystemProfile);
      
      // ツイート投稿処理
      setProcessingStatus(useSystemProfile ? 'ブラウザでの手動ログインをお待ちください。ログイン完了後に自動投稿されます...' : 'ツイートを投稿中...');
      
      let imageBase64Data: string[] = [];
      
      // 画像がある場合はbase64データを準備
      if (imageUrl) {
        setProcessingStatus('画像データを準備中...');
        try {
          imageBase64Data = [imageUrl]; // base64 data URLを配列形式で設定
          console.log('🐛 [DEBUG] Python imageBase64Data prepared, length:', imageBase64Data.length, 'items');
          console.log('🐛 [DEBUG] 画像データ詳細:', imageBase64Data[0] ? imageBase64Data[0].substring(0, 100) + '...' : 'なし');
          setProcessingStatus('画像データ準備完了。投稿処理中...');
        } catch (err) {
          console.error('Image data preparation error:', err);
          setProcessingStatus('画像データ準備に失敗しました。テキストのみで投稿します...');
        }
      }
      

      // リクエストボディを作成（実投稿モード）
      const postBody = {
        message: tweetMessage,
        textOnly: imageBase64Data.length === 0,
        useSystemProfile: useSystemProfile,
        actuallyPost: true, // 実投稿モードを明示的に指定
        imageBase64Data: imageBase64Data
      };
      
      const requestOptions = {
        method: 'POST',
        cache: 'no-cache' as RequestCache,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody)
      };
      
      const response = await fetch('/api/twitter/post_safe', requestOptions);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '投稿に失敗しました');
      }
      
      // 実際の投稿が成功したかを詳細チェック
      const isActualPostSuccess = result.details && result.details.final_result;
      const hasActualPostStep = result.details && result.details.success_steps.some((step: { step: string; message: string; timestamp: string; type: string }) => 
        step.message.includes('投稿成功') || step.message.includes('実投稿') || step.message.includes('ツイート完了')
      );
      
      console.log('🔍 [SAFE SUCCESS CHECK] result.success:', result.success);
      console.log('🔍 [SAFE SUCCESS CHECK] isActualPostSuccess:', isActualPostSuccess);
      console.log('🔍 [SAFE SUCCESS CHECK] hasActualPostStep:', hasActualPostStep);
      console.log('🔍 [SAFE SUCCESS CHECK] 最終判定:', result.success && isActualPostSuccess && hasActualPostStep);
      
      if (result.success && isActualPostSuccess && hasActualPostStep) {
        // 実投稿が確実に成功した場合のみサイト投稿を実行
        setProcessingStatus('✅ 安全な実投稿が正常に完了しました！');
        setError(null);
        
        // 実投稿成功レスポンスを整形
        setLastResponse({
          success: true,
          message: result.message || 'ツイート実投稿が完了しました',
          details: result.details
        });
        
        setTimeout(() => {
          setProcessingStatus('');
        }, 3000);
        
        // 実投稿成功時のみonSuccessを呼ぶ
        if (onSuccess) {
          console.log('✅ [SAFE SUCCESS] 安全な実投稿成功：サイト投稿を実行します');
          onSuccess();
        }
      } else if (result.success && (!isActualPostSuccess || !hasActualPostStep)) {
        // API処理は成功したが、実投稿は未実行の場合
        setProcessingStatus('🔒 安全版処理完了（投稿は未実行）');
        setError('安全版実投稿が実行されませんでした');
        
        setLastResponse({
          success: false,
          error: '安全版実投稿が実行されませんでした',
          details: result.details || {
            final_result: false,
            timestamp: new Date().toISOString(),
            errors: [
              {
                step: 'safe_post_verification',
                message: '安全版実投稿ステップが確認できませんでした',
                timestamp: new Date().toISOString(),
                type: 'verification_error'
              }
            ],
            warnings: [],
            success_steps: [],
            summary: {
              total_errors: 1,
              total_warnings: 0,
              total_success_steps: 0
            }
          }
        });
        
        console.log('❌ [SAFE INCOMPLETE] 安全版実投稿未確認：サイト投稿は実行されません');
        if (onError) onError('安全版実投稿が実行されませんでした');
      } else {
        // 投稿が完了していない場合（テストモードなど）
        setProcessingStatus('処理完了（投稿は未実行）');
        setError('実際の投稿が実行されませんでした');
        
        setLastResponse({
          success: false,
          error: '実際の投稿が実行されませんでした',
          details: result.details || {
            final_result: false,
            timestamp: new Date().toISOString(),
            errors: [
              {
                step: 'post_verification',
                message: '実際の投稿ステップが確認できませんでした',
                timestamp: new Date().toISOString(),
                type: 'verification_error'
              }
            ],
            warnings: [],
            success_steps: [],
            summary: {
              total_errors: 1,
              total_warnings: 0,
              total_success_steps: 0
            }
          }
        });
        
        console.log('実投稿未確認：サイト投稿は実行されません');
        if (onError) onError('実際の投稿が実行されませんでした');
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '投稿に失敗しました';
      setError(errorMsg);
      setProcessingStatus('');
      
      // エラーレスポンスを整形
      setLastResponse({
        success: false,
        error: errorMsg,
        details: {
          final_result: false,
          timestamp: new Date().toISOString(),
          errors: [
            {
              step: 'tweet_post',
              message: errorMsg,
              timestamp: new Date().toISOString(),
              type: 'error',
              exception: errorMsg
            }
          ],
          warnings: [],
          success_steps: [],
          summary: {
            total_errors: 1,
            total_warnings: 0,
            total_success_steps: 0
          }
        }
      });
      
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 画像をクリア
  const handleClearImage = () => {
    console.log('🗑️ [IMAGE DEBUG] 画像クリア実行');
    console.log('🗑️ [IMAGE DEBUG] クリア前 - imageUrl存在:', !!imageUrl);
    console.log('🗑️ [IMAGE DEBUG] クリア前 - previewUrl存在:', !!previewUrl);
    
    setImageUrl('');
    setPreviewUrl('');
    setIsManuallySelected(false); // 手動選択フラグをリセット
    setProcessingStatus('');
    setLastResponse(null);
    setError(null);
    
    console.log('✅ [IMAGE DEBUG] 画像クリア完了（手動選択フラグOFF）');
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
            {isLoading ? '処理中...' : IS_TEST_MODE ? '🧪 Python投稿(テスト)' : 'Python投稿'}
          </button>
          
          <button
            onClick={() => handlePostPlaywright()}
            disabled={isLoading}
            className="flex items-center justify-center gap-1 bg-[#10a37f] text-white px-3 py-1.5 rounded hover:bg-[#0e8f6f] disabled:opacity-50 text-xs"
          >
            {isLoading ? '処理中...' : IS_TEST_MODE ? '🧪 Playwright投稿(テスト)' : 'Playwright投稿'}
          </button>
          
          <button
            onClick={() => handlePostMobile()}
            disabled={isLoading}
            className="flex items-center justify-center gap-1 bg-[#8b5cf6] text-white px-3 py-1.5 rounded hover:bg-[#7c3aed] disabled:opacity-50 text-xs"
          >
            {isLoading ? '処理中...' : IS_TEST_MODE ? '🧪📱 モバイル版(テスト)' : '📱 モバイル版（推奨）'}
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
                  IS_TEST_MODE ? '🧪 Python投稿(テスト)' : 'Python投稿'
                )}
              </button>
              <button
                onClick={() => handlePostPlaywright()}
                disabled={isLoading}
                className="flex items-center justify-center gap-1 bg-[#10a37f] text-white px-3 py-1.5 rounded hover:bg-[#0e8f6f] disabled:opacity-50 text-xs"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    処理中...
                  </>
                ) : (
                  IS_TEST_MODE ? '🧪 Playwright投稿(テスト)' : 'Playwright投稿'
                )}
              </button>
              <button
                onClick={() => handlePostMobile()}
                disabled={isLoading}
                className="flex items-center justify-center gap-1 bg-[#8b5cf6] text-white px-3 py-1.5 rounded hover:bg-[#7c3aed] disabled:opacity-50 text-xs"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    処理中...
                  </>
                ) : (
                  IS_TEST_MODE ? '🧪📱 モバイル版(テスト)' : '📱 モバイル版（推奨）'
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

      {/* ===== テストモード確認モーダル ===== */}
      {IS_TEST_MODE && showTestModal && testPostData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-orange-600">🧪 テストモード - 投稿前確認</h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* 投稿モード表示 */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-800">🚀 投稿モード: {testPostData.mode}</p>
              </div>

              {/* 投稿メッセージ */}
              <div>
                <h4 className="font-semibold mb-2">📄 投稿メッセージ:</h4>
                <div className="p-3 bg-gray-50 border rounded-lg whitespace-pre-wrap text-sm">
                  {testPostData.message}
                </div>
              </div>

              {/* 添付画像 */}
              {testPostData.imagePaths.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">🖼️ 添付画像 ({testPostData.imagePaths.length}件):</h4>
                  <div className="space-y-2">
                    {testPostData.imagePaths.map((path, index) => (
                      <div key={index} className="p-2 bg-gray-50 border rounded text-sm">
                        {index + 1}. {path}
                      </div>
                    ))}
                  </div>
                  {/* チャート画像プレビュー */}
                  {chartImageUrl && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">📊 チャート画像プレビュー:</p>
                      <Image
                        src={chartImageUrl}
                        alt="チャート画像"
                        width={400}
                        height={300}
                        className="border rounded-lg object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 処理時刻 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  ⏰ 処理時刻: {new Date().toLocaleString('ja-JP')}
                </p>
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    console.log('❌ [テストモード] ユーザーが投稿をキャンセルしました');
                    setShowTestModal(false);
                    setIsLoading(false);
                    setProcessingStatus('');
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  キャンセル
                </button>
                <button
                  onClick={async () => {
                    console.log('🚀 [テストモード] 投稿実行が選択されました');
                    setShowTestModal(false);
                    
                    if (testPostData) {
                      console.log(`📤 [テストモード] ${testPostData.mode}モードで投稿処理を開始します`);
                      await executeActualPost(testPostData.mode);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  [テスト] 投稿実行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* =============================== */}
    </>
  );
}