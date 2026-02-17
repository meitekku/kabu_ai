export default function Loading() {
  const summaryItems = [0, 1, 2, 3];
  const newsRows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="animate-pulse">
      {/* CompanyBasicInfo skeleton */}
      <div className="w-full bg-white px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-12 rounded bg-gray-200"></div>
            <div className="h-5 w-32 rounded bg-gray-200"></div>
          </div>
          <div className="h-4 w-16 rounded bg-gray-200"></div>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="flex items-baseline space-x-4">
            <div className="h-7 w-24 rounded bg-gray-200"></div>
            <div className="h-5 w-32 rounded bg-gray-200"></div>
          </div>
          <div className="h-3 w-24 rounded bg-gray-200"></div>
        </div>
        <div className="mt-2 grid grid-cols-4 text-sm">
          {summaryItems.map((i) => (
            <div key={i}>
              <div className="mb-1 h-4 w-12 rounded bg-gray-200"></div>
              <div className="h-4 w-16 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      </div>

      {/* StockChart skeleton */}
      <div className="mt-2">
        <div className="hidden h-[200px] rounded bg-gray-200 md:block"></div>
        <div className="h-[120px] rounded bg-gray-200 md:hidden"></div>
        <div className="mt-2 hidden h-[100px] rounded bg-gray-200 md:block"></div>
        <div className="mt-2 h-[80px] rounded bg-gray-200 md:hidden"></div>
      </div>

      {/* AiFeatureNav skeleton */}
      <div className="mx-auto my-2 max-w-lg">
        <div className="rounded-2xl border border-gray-200/60 bg-gray-50/70 p-4">
          <div className="mx-auto mb-3 h-3 w-40 rounded bg-gray-200"></div>
          <div className="flex gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex-1 rounded-xl border border-gray-200 p-4">
                <div className="mx-auto h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="mx-auto mt-3 h-4 w-20 rounded bg-gray-200"></div>
                <div className="mx-auto mt-2 h-3 w-24 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NewsList skeleton */}
      <div>
        <div className="mt-4 mb-2 h-7 w-32 rounded bg-gray-200"></div>
        <div className="divide-y divide-gray-100">
          {newsRows.map((i) => (
            <div key={i} className="py-1 px-0 sm:py-3 sm:px-2">
              <div className="mb-1 flex items-center gap-2">
                <div className="h-4 w-24 rounded bg-gray-200"></div>
                <div className="h-4 w-12 rounded bg-gray-200"></div>
              </div>
              <div className="mt-0.5 h-5 w-full rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-end">
          <div className="h-4 w-20 rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}
