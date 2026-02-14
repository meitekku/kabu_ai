export default function Loading() {
  return (
    <div className="container mx-auto py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-b border-gray-100 pb-4">
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
