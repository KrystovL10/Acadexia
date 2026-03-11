import { Users, FileText, AlertTriangle, ClipboardList, Database, Construction } from 'lucide-react';

type EmptyStateType = 'no-students' | 'no-results' | 'no-warnings' | 'no-scores' | 'no-data' | 'coming-soon';

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

const illustrations: Record<EmptyStateType, { Icon: typeof Users; color: string; bgColor: string }> = {
  'no-students': { Icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
  'no-results': { Icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  'no-warnings': { Icon: AlertTriangle, color: 'text-green-500', bgColor: 'bg-green-50' },
  'no-scores': { Icon: ClipboardList, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  'no-data': { Icon: Database, color: 'text-gray-400', bgColor: 'bg-gray-100' },
  'coming-soon': { Icon: Construction, color: 'text-accent', bgColor: 'bg-accent/10' },
};

export default function EmptyState({ type = 'no-data', title, subtitle, action }: EmptyStateProps) {
  const { Icon, color, bgColor } = illustrations[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${bgColor}`}>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-xs text-gray-500">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
