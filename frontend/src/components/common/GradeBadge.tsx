import { cn } from '../../lib/utils';

const GRADE_COLORS: Record<string, string> = {
  A1: 'grade-a1',
  A2: 'grade-a2',
  B2: 'grade-b2',
  B3: 'grade-b3',
  C4: 'grade-c4',
  C5: 'grade-c5',
  C6: 'grade-c6',
  D7: 'grade-d7',
  E8: 'grade-e8',
  F9: 'grade-f9',
};

interface GradeBadgeProps {
  grade: string | null | undefined;
  className?: string;
}

export default function GradeBadge({ grade, className }: GradeBadgeProps) {
  if (!grade) return <span className="text-gray-400">—</span>;

  const colorClass = GRADE_COLORS[grade.toUpperCase()] ?? '';

  return (
    <span className={cn('grade-badge', colorClass, className)}>
      {grade}
    </span>
  );
}
