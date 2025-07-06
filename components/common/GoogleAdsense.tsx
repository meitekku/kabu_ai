'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: Array<{
      [key: string]: unknown;
    }>;
  }
}

export default function GoogleAdsense() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('Google Adsense error:', err);
    }
  }, []);

  return (
    <div className="w-full my-4">
      <ins
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