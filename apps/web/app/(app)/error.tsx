'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Something went wrong</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {error.message ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
