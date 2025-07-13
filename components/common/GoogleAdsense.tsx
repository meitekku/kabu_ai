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
      // 開発環境でのデバッグ情報
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction) {
        console.log('GoogleAdsense: Running in development mode - ads will not display');
        return;
      }

      if (typeof window === 'undefined') {
        console.log('GoogleAdsense: Window object not available');
        return;
      }

      if (!adsRef.current) {
        console.log('GoogleAdsense: Ad container not found');
        return;
      }

      // AdSenseの初期化
      if (!window.adsbygoogle) {
        console.log('GoogleAdsense: Initializing adsbygoogle array');
        window.adsbygoogle = [];
      }

      window.adsbygoogle.push({});
      console.log('GoogleAdsense: Ad push completed');
    } catch (err) {
      console.error('GoogleAdsense error:', err);
    }
  }, []);

  if (process.env.NODE_ENV !== 'production') {
    return (
      <div className="w-full my-4 p-4 border-2 border-dashed border-gray-300 text-center text-gray-500">
        Ad Space (Development Mode)
      </div>
    );
  }

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