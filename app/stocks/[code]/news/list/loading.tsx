export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* H1 heading */}
      <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>

      {/* News list */}
      <div className="divide-y divide-gray-100">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="py-3 px-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-full mt-1"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
