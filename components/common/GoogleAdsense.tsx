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

      if (!window.adsbygoogle) {
        console.error('GoogleAdsense: adsbygoogle not initialized');
        return;
      }

      // 広告の表示を試行
      window.adsbygoogle.push({});
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
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client="ca-pub-5634065252713097"
        data-ad-slot="2001556735"
      />
    </div>
  );
} 