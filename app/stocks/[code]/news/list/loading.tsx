export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* H1 heading - matches text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 */}
      <div className="h-7 sm:h-8 bg-gray-200 rounded w-48 mb-4 sm:mb-6" />

      {/* News list - matches divide-y divide-gray-100 */}
      <div className="divide-y divide-gray-100">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="py-3 px-2">
            <div className="flex flex-col">
              {/* date + badge - matches flex items-center gap-2 */}
              <div className="flex items-center gap-2 mb-1">
                {/* date - matches font-bold text-sm text-gray-500 */}
                <div className="h-5 bg-gray-200 rounded w-24" />
                {/* badge placeholder */}
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
              {/* title - matches font-bold text-base text-gray-900 mt-1 */}
              <div className="h-6 bg-gray-200 rounded w-full mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
