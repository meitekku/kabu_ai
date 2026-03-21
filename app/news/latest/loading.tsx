export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* H1 heading - matches text-xl sm:text-2xl font-bold mb-4 sm:mb-6 */}
      <div className="h-7 sm:h-8 bg-gray-200 rounded w-28 mb-4 sm:mb-6" />

      {/* NewsListS items - matches bg-white border border-[#eee] rounded shadow-sm p-3 (no gap between cards) */}
      <div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-white border border-[#eee] rounded shadow-sm p-3">
            {/* date - matches text-[10px] text-[#999] mb-1.5 */}
            <div className="h-[10px] bg-gray-200 rounded w-24 mb-1.5" />
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                {/* title - matches text-sm font-bold, 2 lines */}
                <div className="h-[14px] bg-gray-200 rounded w-full mb-1" />
                <div className="h-[14px] bg-gray-200 rounded w-3/4 mb-1" />
                {/* snippet - matches text-xs */}
                <div className="h-[12px] bg-gray-200 rounded w-4/5" />
              </div>
              {/* CompanyVisual / thumbnail - matches w-14 h-14 sm:w-16 sm:h-16 */}
              <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
