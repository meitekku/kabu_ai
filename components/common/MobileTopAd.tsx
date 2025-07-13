'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle: Array<{
      [key: string]: unknown;
    }>;
  }
}

export default function MobileTopAd() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768); // md breakpoint
      }
    };

    checkIfMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkIfMobile);
      return () => window.removeEventListener('resize', checkIfMobile);
    }
  }, []);

  useEffect(() => {
    if (isMobile && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error('Google Adsense error:', err);
      }
    }
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <div className="w-full my-4 md:hidden">
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5634065252713097"
        crossOrigin="anonymous"
      />
      {/* smartpohone top ad */}
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '300px', height: '50px' }}
        data-ad-client="ca-pub-5634065252713097"
        data-ad-slot="9265803239"
      />
    </div>
  );
} 