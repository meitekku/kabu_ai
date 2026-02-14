export default function Loading() {
  return (
    <div>
      {/* NewsSection skeleton - matches NewsSection.tsx loading state */}
      <div className="max-w-7xl mx-auto">
        {/* Block 1: ピックアップニュース */}
        <div className="mb-8">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="w-full aspect-[2/1] bg-gray-200 animate-pulse"></div>
                <div className="p-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Block 2: 市場ニュース */}
        <div className="mb-8">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="w-full aspect-[2/1] bg-gray-200 animate-pulse"></div>
                <div className="p-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* h2 新着ニュース heading */}
      <div className="h-7 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>

      {/* NewsListS skeleton - date + title + description + thumbnail */}
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-b border-gray-100 pb-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
              <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
