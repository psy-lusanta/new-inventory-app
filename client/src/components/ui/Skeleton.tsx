export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 dark:bg-[#2a2d3e] rounded w-24" />
        <div className="h-8 w-8 bg-gray-200 dark:bg-[#2a2d3e] rounded-lg" />
      </div>
      <div className="h-8 bg-gray-200 dark:bg-[#2a2d3e] rounded w-16 mb-1" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(4)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-[#2a2d3e] rounded w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#2a2d3e] bg-gray-50 dark:bg-[#0f1117]">
              {[...Array(5)].map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 bg-gray-200 dark:bg-[#2a2d3e] rounded w-20 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d3e]">
            {[...Array(5)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SkeletonCostDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
      <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
        <div className="h-4 bg-gray-200 dark:bg-[#2a2d3e] rounded w-48 mb-1" />
        <div className="h-3 bg-gray-200 dark:bg-[#2a2d3e] rounded w-32 mb-6" />
        <div className="h-48 bg-gray-100 dark:bg-[#0f1117] rounded-xl" />
      </div>
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
        <div className="h-4 bg-gray-200 dark:bg-[#2a2d3e] rounded w-32 mb-4" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between mb-1">
              <div className="h-3 bg-gray-200 dark:bg-[#2a2d3e] rounded w-24" />
              <div className="h-3 bg-gray-200 dark:bg-[#2a2d3e] rounded w-16" />
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-[#0f1117] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}