'use client';

import { useEffect, useState } from 'react';

export default function MobileTopAd() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
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
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5634065252713097"
        data-ad-slot="9265803239"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
} 