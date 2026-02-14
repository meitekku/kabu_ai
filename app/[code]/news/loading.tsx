export default function Loading() {
  return (
    <div>
      {/* CompanyBasicInfo skeleton - exact match from CompanyBasicInfo.tsx */}
      <div className="w-full bg-white px-2 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-12 bg-gray-200 rounded"></div>
            <div className="h-5 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-baseline space-x-4 mt-1">
          <div className="h-7 w-24 bg-gray-200 rounded"></div>
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-4 text-sm mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 w-12 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* StockChart skeleton */}
      <div className="mt-2 animate-pulse">
        <div className="rounded bg-gray-200 h-[200px] md:h-[200px] hidden md:block"></div>
        <div className="rounded bg-gray-200 h-[120px] md:hidden"></div>
        <div className="rounded bg-gray-200 mt-2 h-[100px] hidden md:block"></div>
        <div className="rounded bg-gray-200 mt-2 h-[80px] md:hidden"></div>
      </div>

      {/* NewsList skeleton */}
      <div className="animate-pulse">
        <div className="h-7 bg-gray-200 rounded w-32 mt-4 mb-2"></div>
        <div className="divide-y divide-gray-100">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="py-1 px-0 sm:py-3 sm:px-2">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-5 bg-gray-200 rounded w-full mt-0.5"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
