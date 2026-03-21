export default function Loading() {
  return (
    <div className="mx-auto animate-pulse px-4 sm:px-6">
      {/* Back link */}
      <div className="mb-4">
        <div className="h-5 bg-gray-200 rounded w-44"></div>
      </div>

      {/* Article header */}
      <div className="mb-8">
        <div className="pb-4 border-b border-gray-200">
          {/* Title */}
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>

          {/* Metadata: company + date | share buttons */}
          <div className="flex justify-between items-center mt-2">
            <div>
              <div className="h-4 bg-gray-200 rounded w-28 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-36"></div>
            </div>
            <div className="flex space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            </div>
          </div>
        </div>

        {/* Article content */}
        <div className="mt-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>

      {/* Related news section */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="divide-y divide-gray-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="py-3.5">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-5 bg-gray-200 rounded w-full mt-0.5"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
