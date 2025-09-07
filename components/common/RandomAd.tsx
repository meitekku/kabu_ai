'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

export default function RandomAd() {
  const [selectedAd, setSelectedAd] = useState<string>('');

  // 広告の配列 - 新しい広告を追加する際はここに追加してください
  const ads = useMemo(() => [
    // 広告1
    `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+A6R1F6+1WP2+NXU8H" rel="nofollow">
       <img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=250727432616&wid=001&eno=01&mid=s00000008903004021000&mc=1">
     </a>
     <img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=459YIW+A6R1F6+1WP2+NXU8H" alt="">`,
    
    // 広告2
    `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+93GFHU+1WP2+15P77L" rel="nofollow">
       <img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=250727432550&wid=001&eno=01&mid=s00000008903007004000&mc=1">
     </a>
     <img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=459YIW+93GFHU+1WP2+15P77L" alt="">`
  ], []);

  const selectRandomAd = useCallback(() => {
    // ランダムに広告を選択
    const randomIndex = Math.floor(Math.random() * ads.length);
    setSelectedAd(ads[randomIndex]);
  }, [ads]);

  useEffect(() => {
    selectRandomAd();
  }, [selectRandomAd]);

  return (
    <div 
      className="w-full my-4 flex justify-center" 
      dangerouslySetInnerHTML={{ __html: selectedAd }}
    />
  );
}