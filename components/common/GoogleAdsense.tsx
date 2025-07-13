'use client';

import { useEffect, useState } from 'react';

interface GoogleAdsenseProps {
  type: 'mobile-top' | 'sidebar';
}

export default function GoogleAdsense({ type }: GoogleAdsenseProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // 初期チェック
    checkIfMobile();

    // リサイズイベントのリスナーを追加
    window.addEventListener('resize', checkIfMobile);

    // クリーンアップ
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // サイドバー広告の場合、モバイルでは表示しない
  if (type === 'sidebar' && isMobile) {
    return null;
  }

  // モバイルトップ広告の場合、デスクトップでは表示しない
  if (type === 'mobile-top' && !isMobile) {
    return null;
  }

  return (
    <div className="w-full my-4" dangerouslySetInnerHTML={{
      __html: `
        <!-- ${type === 'mobile-top' ? 'スマートフォントップ広告' : 'サイドバー広告'} -->
        <ins class="adsbygoogle"
          style="display:block"
          data-ad-client="ca-pub-5634065252713097"
          data-ad-slot="9265803239"
          data-ad-format="auto"
          data-full-width-responsive="true">
        </ins>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      `
    }} />
  );
} 