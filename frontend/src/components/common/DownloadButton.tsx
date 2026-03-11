import { useState, useRef, useCallback, type ReactNode } from 'react';
import { Download, Check, AlertCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import Spinner from '../ui/Spinner';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { downloadFile } from '../../lib/downloadUtils';

/* ─── Variants ─── */

const downloadButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white shadow-sm hover:bg-primary-light focus-visible:ring-primary',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        ghost: 'text-gray-700 hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

/* ─── Types ─── */

type DownloadState = 'idle' | 'loading' | 'success' | 'error';

interface DownloadButtonProps
  extends VariantProps<typeof downloadButtonVariants> {
  label: string;
  filename: string;
  fetchFn: () => Promise<Blob>;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  /** Show a "preparing..." toast for large files (ZIP) */
  isLargeFile?: boolean;
}

/* ─── Component ─── */

export default function DownloadButton({
  label,
  filename,
  fetchFn,
  variant,
  size,
  icon,
  className,
  disabled,
  isLargeFile,
}: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { toast } = useToast();

  const resetToIdle = useCallback((delay = 2000) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState('idle'), delay);
  }, []);

  async function handleClick() {
    if (state === 'loading') return;
    setState('loading');

    if (isLargeFile) {
      toast({
        title: 'Preparing download...',
        description: 'This may take a moment for large files.',
        variant: 'info',
      });
    }

    try {
      await downloadFile(fetchFn, filename);
      setState('success');
      toast({
        title: `${filename} downloaded`,
        variant: 'success',
      });
      resetToIdle();
    } catch {
      setState('error');
      toast({
        title: 'Download failed',
        description: 'Please try again.',
        variant: 'danger',
      });
      resetToIdle(4000);
    }
  }

  const stateContent: Record<DownloadState, { icon: ReactNode; text: string }> = {
    idle: {
      icon: icon ?? <Download className="h-4 w-4" />,
      text: label,
    },
    loading: {
      icon: <Spinner size="sm" />,
      text: 'Downloading...',
    },
    success: {
      icon: <Check className="h-4 w-4" />,
      text: 'Downloaded!',
    },
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      text: 'Failed. Retry?',
    },
  };

  const current = stateContent[state];

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      className={cn(
        downloadButtonVariants({ variant, size }),
        state === 'success' && 'bg-green-600 text-white hover:bg-green-700 border-green-600',
        state === 'error' && 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
        className
      )}
    >
      {current.icon}
      {current.text}
    </button>
  );
}
