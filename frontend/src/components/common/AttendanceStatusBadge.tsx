import { cn } from '../../lib/utils';

interface AttendanceStatusBadgeProps {
  percentage: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

function getStatus(pct: number) {
  if (pct >= 90) return { label: 'Excellent', bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-300' };
  if (pct >= 75) return { label: 'Good', bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-300' };
  if (pct >= 60) return { label: 'Fair', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' };
  return { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' };
}

export default function AttendanceStatusBadge({
  percentage,
  showLabel = true,
  size = 'sm',
  className,
}: AttendanceStatusBadgeProps) {
  const status = getStatus(percentage);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1',
        status.bg,
        status.text,
        status.ring,
        sizeClasses,
        className
      )}
    >
      {Math.round(percentage)}%
      {showLabel && <span className="font-medium">{status.label}</span>}
    </span>
  );
}

export { getStatus as getAttendanceStatus };
