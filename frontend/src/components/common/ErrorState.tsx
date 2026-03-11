import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  error?: Error | string | null;
  onRetry?: () => void;
  variant?: 'page' | 'card' | 'inline';
}

export default function ErrorState({ error, onRetry, variant = 'card' }: ErrorStateProps) {
  const message = typeof error === 'string' ? error : error?.message || 'Something went wrong';

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-1 font-medium underline hover:no-underline">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="mt-1 max-w-md text-sm text-gray-500">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // card variant (default)
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 py-8 text-center">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="mt-3 text-sm font-medium text-gray-700">Failed to load data</p>
      <p className="mt-1 max-w-xs text-xs text-gray-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
