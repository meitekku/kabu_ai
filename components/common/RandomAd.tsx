'use client';

import { useEffect, useMemo, useState } from 'react';

const AD_SLOT_WIDTH = 300;
const AD_SLOT_HEIGHT = 250;

export default function RandomAd() {
  const [selectedAd, setSelectedAd] = useState<string | null>(null);

  // 広告の配列 - 新しい広告を追加する際はここに追加してください
  const ads = useMemo(
    () => [
      // 広告1
      `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+A6R1F6+1WP2+NXU8H" rel="nofollow">
         <img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=250727432616&wid=001&eno=01&mid=s00000008903004021000&mc=1">
       </a>
       <img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=459YIW+A6R1F6+1WP2+NXU8H" alt="">`,

      // 広告2
      `<a href="https://px.a8.net/svt/ejp?a8mat=459YIW+93GFHU+1WP2+15P77L" rel="nofollow">
         <img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=250727432550&wid=001&eno=01&mid=s00000008903007004000&mc=1">
       </a>
       <img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=459YIW+93GFHU+1WP2+15P77L" alt="">`,
    ],
    []
  );

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * ads.length);
    setSelectedAd(ads[randomIndex]);
  }, [ads]);

  return (
    <div className="my-4 flex w-full justify-center">
      <div
        className="h-[250px] w-[300px] overflow-hidden rounded-sm bg-gray-50"
        style={{ width: AD_SLOT_WIDTH, height: AD_SLOT_HEIGHT }}
      >
        {selectedAd ? (
          <div
            className="h-full w-full leading-none [&_a]:block [&_a]:h-[250px] [&_a]:w-[300px] [&_img]:block"
            dangerouslySetInnerHTML={{ __html: selectedAd }}
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-gray-200/70" />
        )}
      </div>
    </div>
  );
}
