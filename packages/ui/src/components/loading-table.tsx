import * as React from 'react';
import { cn } from '../lib/utils';

interface ColumnConfig {
  width: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { width: 'w-32' },
  { width: 'w-24' },
  { width: 'w-40' },
  { width: 'w-20' },
  { width: 'w-16' },
];

export interface LoadingTableProps {
  rows?: number;
  columns?: ColumnConfig[];
  className?: string;
}

function ShimmerCell({ width, delay }: { width: string; delay: number }) {
  return (
    <div
      className={cn('h-3.5 rounded-md', width)}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: `shimmer 1.8s ease-in-out ${delay}ms infinite`,
      }}
    />
  );
}

export function LoadingTable({
  rows = 5,
  columns = DEFAULT_COLUMNS,
  className,
}: LoadingTableProps) {
  return (
    <div
      className={cn('w-full overflow-hidden rounded-xl', className)}
      style={{
        background: 'rgb(17 17 20)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      {/* Header skeleton */}
      <div
        className="flex items-center gap-6 px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgb(21 21 24)' }}
      >
        {columns.map((col, i) => (
          <ShimmerCell key={i} width={cn(col.width, 'opacity-50')} delay={i * 40} />
        ))}
      </div>

      {/* Row skeletons */}
      <div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex items-center gap-6 px-5 py-4 transition-colors"
            style={{
              borderBottom: rowIdx < rows - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background: rowIdx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
            }}
          >
            {columns.map((col, colIdx) => (
              <ShimmerCell
                key={colIdx}
                width={colIdx % 3 === 2 ? 'w-3/4' : col.width}
                delay={rowIdx * 60 + colIdx * 30}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
