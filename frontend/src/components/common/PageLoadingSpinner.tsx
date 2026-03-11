import { Loader2 } from 'lucide-react';

export default function PageLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
          <span className="text-2xl font-bold">GES</span>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
