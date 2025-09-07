'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

export default function MobileTopAd() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAd, setSelectedAd] = useState<string>('');

  // 468px以上のモバイル用広告（タブレット・大きめのスマホ）
  const largeAds = useMemo(() => [
    // 広告1 (468x60)
    `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+A6R1F6+1WP2+NY1Y9" rel="nofollow">
       <img border="0" width="468" height="60" alt="" src="https://www20.a8.net/svt/bgt?aid=250727432616&wid=001&eno=01&mid=s00000008903004022000&mc=1">
     </a>
     <img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=459YIW+A6R1F6+1WP2+NY1Y9" alt="">`,
    
    // 広告2 (468x60)
    `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+93GFHU+1WP2+15Q22P" rel="nofollow">
       <img border="0" width="468" height="60" alt="" src="https://www22.a8.net/svt/bgt?aid=250727432550&wid=001&eno=01&mid=s00000008903007008000&mc=1">
     </a>
     <img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=459YIW+93GFHU+1WP2+15Q22P" alt="">`
  ], []);

  // 468px未満のスマホ用広告（小さめのスマホ）
  const smallAds = useMemo(() => [
    // 広告1 (320x50)
    `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+93GFHU+1WP2+15PUCX" rel="nofollow">
       <img border="0" width="320" height="50" alt="" src="https://www26.a8.net/svt/bgt?aid=250727432550&wid=001&eno=01&mid=s00000008903007007000&mc=1">
     </a>
     <img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=459YIW+93GFHU+1WP2+15PUCX" alt="">`,
    
    // 広告2 (234x60)
    `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+A6R1F6+1WP2+NX735" rel="nofollow">
       <img border="0" width="234" height="60" alt="" src="https://www28.a8.net/svt/bgt?aid=250727432616&wid=001&eno=01&mid=s00000008903004018000&mc=1">
     </a>
     <img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=459YIW+A6R1F6+1WP2+NX735" alt="">`
  ], []);

  const checkDevice = useCallback(() => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        const isDeviceMobile = width < 768; // md breakpoint
        setIsMobile(isDeviceMobile);

        if (isDeviceMobile) {
          // 画面幅に応じて適切な広告配列を選択
          const adsToUse = width >= 468 ? largeAds : smallAds;
          const randomIndex = Math.floor(Math.random() * adsToUse.length);
          setSelectedAd(adsToUse[randomIndex]);
        }
      }
  }, [largeAds, smallAds]);

  useEffect(() => {
    checkDevice();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkDevice);
      return () => window.removeEventListener('resize', checkDevice);
    }
  }, [checkDevice]);

  // モバイルでない場合は何も表示しない
  if (!isMobile) return null;

  return (
    <div className="w-full py-4 bg-gray-50 border-b border-gray-200 md:hidden">
      <div 
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: selectedAd }}
      />
    </div>
  );
}