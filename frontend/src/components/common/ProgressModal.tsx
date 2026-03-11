import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ReportProgressDto } from '../../types/teacher.types';
import Button from './Button';

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  classRoomId: number;
  termId: number;
  pollFn: (classRoomId: number, termId: number) => Promise<ReportProgressDto | null>;
  onComplete: (result: ReportProgressDto) => void;
  onClose: () => void;
}

export default function ProgressModal({
  isOpen,
  title,
  classRoomId,
  termId,
  pollFn,
  onComplete,
  onClose,
}: ProgressModalProps) {
  const { data: progress } = useQuery<ReportProgressDto | null>({
    queryKey: ['progressModal', classRoomId, termId],
    queryFn: () => pollFn(classRoomId, termId),
    enabled: isOpen,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return 2000;
      if (d.status === 'COMPLETE' || d.status === 'FAILED') return false;
      return 2000;
    },
  });

  const isComplete = progress?.status === 'COMPLETE';
  const isFailed = progress?.status === 'FAILED';
  const percentage = progress?.percentage ?? 0;
  const processed = progress?.processed ?? 0;
  const total = progress?.total ?? 0;

  useEffect(() => {
    if (isComplete && progress) {
      onComplete(progress);
    }
  }, [isComplete, progress, onComplete]);

  if (!isOpen) return null;

  // Circular progress values
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Close button (only when not in progress) */}
        {(isComplete || isFailed) && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Active / In-Progress state */}
        {!isComplete && !isFailed && (
          <div className="text-center">
            {/* Circular progress */}
            <div className="mx-auto mb-4 relative inline-flex items-center justify-center">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={radius}
                  fill="none" stroke="#e5e7eb" strokeWidth="6"
                />
                <circle
                  cx="50" cy="50" r={radius}
                  fill="none" stroke="#1B6B3A" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <span className="absolute text-lg font-bold text-primary">
                {Math.round(percentage)}%
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {progress?.message || 'Starting...'}
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Counter */}
            <p className="mt-2 text-xs text-gray-500">
              Processing {processed} of {total} students...
            </p>
            <p className="mt-2 text-xs text-gray-400">Please do not close this page</p>
          </div>
        )}

        {/* Complete state */}
        {isComplete && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Generation Complete</h3>
            <p className="mt-1 text-sm text-gray-500">{progress?.message}</p>
            {progress?.failed != null && progress.failed > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                {progress.failed} student(s) had errors
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <Button variant="primary" onClick={onClose} className="flex-1">
                Close & View Reports
              </Button>
            </div>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Generation Failed</h3>
            <p className="mt-1 text-sm text-red-600">
              {progress?.errorMessage || 'An unexpected error occurred.'}
            </p>
            <div className="mt-5">
              <Button variant="danger" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
