'use client';

export default function GoogleAdsense() {
  return (
    <div className="w-full my-4" dangerouslySetInnerHTML={{
      __html: `
        <!-- ランキング上部広告 -->
        <ins class="adsbygoogle"
          style="display:block"
          data-ad-client="ca-pub-5634065252713097"
          data-ad-slot="9265803239"
          data-ad-format="auto"
          data-full-width-responsive="true">
        </ins>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      `
    }} />
  );
} 