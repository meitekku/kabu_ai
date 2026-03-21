export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* HeroCarousel skeleton - matches w-full mb-4, h-44 md:h-52 rounded-lg */}
      <div className="w-full mb-4">
        <div className="rounded-lg bg-gray-700 h-44 md:h-52 shadow-lg" />
      </div>

      {/* TrendingSection skeleton - matches bg-[#1a1a1a] header + border box + 2 SectionBlocks */}
      <div className="bg-white py-5">
        <div className="bg-gray-800 h-9 rounded-t" />
        <div className="border border-[#e5e5e5] border-t-0 rounded-b p-3">
          {[0, 1].map((section) => (
            <div key={section} className="mb-4 sm:mb-5">
              {/* SectionBlock header - matches border-l-[3px] bg-[#f8f8f8] py-1.5 px-3 */}
              <div className="border-l-[3px] border-gray-300 bg-gray-100 py-1.5 px-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="h-[13px] bg-gray-200 rounded w-28" />
                </div>
                <div className="h-[18px] bg-gray-200 rounded-full w-16" />
              </div>
              {/* TrendingCard grid - matches grid-cols-1 md:grid-cols-2 gap-3 mt-2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {[0, 1, 2, 3].map((card) => (
                  <div key={card} className="bg-card rounded-xl border border-[#e5e5e5] overflow-hidden flex flex-col">
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 border-l-[3px] border-l-gray-300">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-gray-200 rounded-full flex-shrink-0" />
                        <div className="w-7 h-7 bg-gray-200 rounded-md flex-shrink-0" />
                        <div className="h-3 bg-gray-200 rounded w-20" />
                        <div className="h-3 bg-gray-200 rounded w-8" />
                      </div>
                      <div className="h-5 bg-gray-200 rounded w-12 flex-shrink-0" />
                    </div>
                    {/* Card body */}
                    <div className="px-3 py-2 flex flex-col gap-0.5 flex-grow">
                      <div className="h-3.5 bg-gray-200 rounded w-full" />
                      <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                      <div className="h-2.5 bg-gray-200 rounded w-3/5 mt-0.5" />
                    </div>
                    {/* Card footer */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100">
                      <div className="h-2.5 bg-gray-200 rounded w-10" />
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新着ニュース section skeleton - matches bg-[#1a1a1a] header + border box + NewsListS */}
      <div className="bg-white py-5">
        <div className="bg-gray-800 h-9 rounded-t" />
        <div className="border border-[#e5e5e5] border-t-0 rounded-b">
          {/* NewsListS items - matches bg-white border border-[#eee] rounded shadow-sm p-3 */}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-b border-[#eee] p-3">
              <div className="h-[10px] bg-gray-200 rounded w-24 mb-1.5" />
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="h-[14px] bg-gray-200 rounded w-full mb-1" />
                  <div className="h-[12px] bg-gray-200 rounded w-4/5" />
                </div>
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
          {/* もっと見るボタン skeleton */}
          <div className="text-right py-3 px-3">
            <div className="inline-block h-7 w-28 bg-gray-200 rounded border border-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
