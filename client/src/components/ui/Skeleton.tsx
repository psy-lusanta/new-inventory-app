// ─── Base skeleton block ──────────────────────────────────────────────────────
const Sk = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-200 dark:bg-[#2a2d3e] rounded animate-pulse ${className}`} />
)

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

// ─── Table skeleton (already exists, keeping) ─────────────────────────────────
export function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3e]">
        <Sk className="h-4 w-32" />
      </div>
      <div className="divide-y divide-gray-50 dark:divide-[#2a2d3e]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Sk className="h-4 w-24" />
            <Sk className="h-4 w-32" />
            <Sk className="h-4 w-20" />
            <Sk className="h-4 w-28" />
            <Sk className="h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard skeleton ───────────────────────────────────────────────────────
export function SkeletonDashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-4 animate-pulse">
      {/* Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-4">
            <Sk className="h-3 w-20 mb-3" />
            <Sk className="h-8 w-14 mb-1" />
            <Sk className="h-2 w-12" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
          <Sk className="h-4 w-40 mb-4" />
          <Sk className="h-40 w-full" />
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
          <Sk className="h-4 w-48 mb-4" />
          <Sk className="h-48 w-full" />
        </div>
      </div>
      {/* Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5 space-y-3">
          <Sk className="h-4 w-32 mb-2" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Sk className="h-7 w-7 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Sk className="h-3 w-full" />
                <Sk className="h-2 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-4">
              <Sk className="h-3 w-24 mb-2" />
              <Sk className="h-5 w-16 mb-1" />
              <Sk className="h-2 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Reports skeleton ─────────────────────────────────────────────────────────
export function SkeletonReports() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 animate-pulse">
      <Sk className="h-6 w-32" />
      <Sk className="h-4 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
            <Sk className="h-9 w-9 rounded-lg mb-3" />
            <Sk className="h-4 w-24 mb-1" />
            <Sk className="h-3 w-32 mb-4" />
            <Sk className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Table Settings skeleton ──────────────────────────────────────────────────
export function SkeletonTableSettings() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <Sk className="h-9 w-9 rounded-lg" />
        <div>
          <Sk className="h-5 w-32 mb-1" />
          <Sk className="h-3 w-20" />
        </div>
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5 space-y-3">
          <Sk className="h-4 w-24" />
          <Sk className="h-9 w-full rounded-lg" />
          {i === 1 && [...Array(3)].map((_, j) => (
            <div key={j} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#0f1117] rounded-lg">
              <Sk className="h-5 w-5 rounded" />
              <Sk className="h-4 flex-1" />
              <Sk className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Logs skeleton ────────────────────────────────────────────────────────────
export function SkeletonLogs() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <Sk className="h-6 w-40" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-4">
            <Sk className="h-3 w-20 mb-2" />
            <Sk className="h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#2a2d3e] flex gap-3">
          <Sk className="h-8 flex-1 max-w-xs rounded-lg" />
          <Sk className="h-8 w-32 rounded-lg" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-[#2a2d3e]">
            <Sk className="h-8 w-8 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Sk className="h-3 w-32" />
              <Sk className="h-2 w-20" />
            </div>
            <Sk className="h-6 w-24 rounded-full" />
            <Sk className="h-3 w-28" />
            <Sk className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── Users skeleton ───────────────────────────────────────────────────────────
export function SkeletonUsers() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Sk className="h-6 w-20" />
        <Sk className="h-9 w-28 rounded-lg" />
      </div>
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-[#2a2d3e]">
            <Sk className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Sk className="h-4 w-32" />
              <Sk className="h-3 w-48" />
            </div>
            <Sk className="h-6 w-16 rounded-full" />
            <Sk className="h-8 w-8 rounded-lg" />
            <Sk className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Settings skeleton ────────────────────────────────────────────────────────
export function SkeletonSettings() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      <Sk className="h-6 w-40" />
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
        <div className="flex items-center gap-4">
          <Sk className="h-16 w-16 rounded-full shrink-0" />
          <div className="space-y-2">
            <Sk className="h-4 w-32" />
            <Sk className="h-3 w-48" />
            <Sk className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5 space-y-3">
          <Sk className="h-4 w-40" />
          {[...Array(2)].map((_, j) => (
            <div key={j}>
              <Sk className="h-3 w-20 mb-1" />
              <Sk className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Cost Dashboard skeleton ──────────────────────────────────────────────────
export function SkeletonCostDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
      <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
        <Sk className="h-4 w-48 mb-1" />
        <Sk className="h-3 w-32 mb-6" />
        <Sk className="h-48 w-full" />
      </div>
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5">
        <Sk className="h-4 w-32 mb-4" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between mb-1">
              <Sk className="h-3 w-24" />
              <Sk className="h-3 w-16" />
            </div>
            <Sk className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}