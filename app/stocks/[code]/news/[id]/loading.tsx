export default function Loading() {
  return (
    <div className="mx-auto animate-pulse px-4 sm:px-6">
      {/* Back link - matches <div className="mb-4"> */}
      <div className="mb-4">
        <div className="h-5 bg-gray-200 rounded w-44" />
      </div>

      {/* Article header - matches <div className="mb-8"><div className="pb-4 border-b border-gray-200"> */}
      <div className="mb-8">
        <div className="pb-4 border-b border-gray-200">
          {/* Title - matches text-xl sm:text-2xl font-bold */}
          <div className="h-7 sm:h-8 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-7 sm:h-8 bg-gray-200 rounded w-1/2" />

          {/* Metadata: company + date | share buttons */}
          <div className="flex justify-between items-center mt-2">
            <div>
              {/* company name - text-sm text-gray-600 */}
              <div className="h-4 bg-gray-200 rounded w-28 mb-1" />
              {/* date */}
              <div className="h-4 bg-gray-200 rounded w-36" />
            </div>
            {/* Share buttons - w-10 h-10 rounded-full */}
            <div className="flex space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="w-10 h-10 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>

        {/* Article content - matches prose mt-4 sm:mt-6 */}
        <div className="mt-4 sm:mt-6 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>

      {/* Related news (NewsList with h3Title) - matches mt-8 border-t border-gray-200 pt-6 */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        {/* h3 title - matches text-[18px] font-bold mb-4 pb-2 border-b */}
        <div className="mb-4 pb-2 border-b border-gray-200 relative">
          <div className="h-[27px] bg-gray-200 rounded w-48" />
        </div>
        {/* NewsListSkeleton rows - matches border-t + py-3.5 border-b per item */}
        <div className="border-t border-gray-200">
          {[0, 1, 2].map((i) => (
            <div key={i} className="py-3.5 border-b border-gray-100">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-[16.5px] bg-gray-200 rounded w-24" />
                  <div className="h-[15px] bg-gray-200 rounded w-14" />
                </div>
                <div className="h-[22.5px] bg-gray-200 rounded w-full mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RelatedStocksNews section - matches mt-8 */}
      <div className="mt-8">
        <div className="mb-4 pb-2 border-b border-gray-200">
          <div className="h-[27px] bg-gray-200 rounded w-56" />
        </div>
        <div className="border-t border-gray-200">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3.5 border-b border-gray-100">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-[16.5px] bg-gray-200 rounded w-24" />
                  <div className="h-[15px] bg-gray-200 rounded w-14" />
                </div>
                <div className="h-[22.5px] bg-gray-200 rounded w-full mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
