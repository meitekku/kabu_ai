'use client';

import { useEffect, useState } from 'react';

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

  if (!isMobile) return null;

  return (
    <div className="w-full my-4 md:hidden" dangerouslySetInnerHTML={{
      __html: `
        <a href="https://px.a8.net/svt/ejp?a8mat=459YIW+A6R1F6+1WP2+NXU8H" rel="nofollow">
          <img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=250727432616&wid=001&eno=01&mid=s00000008903004021000&mc=1">
        </a>
        <img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=459YIW+A6R1F6+1WP2+NXU8H" alt="">
      `
    }} />
  );
} 