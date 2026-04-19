import { LoadingTable } from '@chainboard/ui';

export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900"
          />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />

      {/* Table skeleton */}
      <LoadingTable rows={8} />
    </div>
  );
}
