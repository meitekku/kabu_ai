'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: Array<{
      [key: string]: unknown;
    }>;
  }
}

export default function GoogleAdsense() {
  const adsRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      // AdSenseの初期化確認
      if (typeof window === 'undefined') {
        console.log('GoogleAdsense: Window object not available');
        return;
      }

      // 広告の表示を試行
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      console.log('GoogleAdsense: Ad push completed');
    } catch (err) {
      console.error('GoogleAdsense error:', err);
    }
  }, []);

  return (
    <div className="w-full my-4">
      <ins
        ref={adsRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5634065252713097"
        data-ad-slot="2001556735"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
} 