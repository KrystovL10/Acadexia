import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell, AlertOctagon, AlertTriangle, Info, CheckCircle,
  TrendingDown, Calendar,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

import { useMyChildren, useChildWarnings } from '../../hooks/parent';
import type { EarlyWarningDto } from '../../types/warning.types';
import type { BadgeProps } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

// ==================== CONSTANTS ====================

type WarningLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const LEVEL_CONFIG: Record<WarningLevel, {
  icon: typeof AlertOctagon;
  bg: string;
  border: string;
  badgeVariant: BadgeProps['variant'];
  iconColor: string;
}> = {
  CRITICAL: {
    icon: AlertOctagon,
    bg: 'bg-red-50',
    border: 'border-l-red-600',
    badgeVariant: 'danger',
    iconColor: 'text-red-600',
  },
  HIGH: {
    icon: AlertTriangle,
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    badgeVariant: 'danger',
    iconColor: 'text-orange-600',
  },
  MEDIUM: {
    icon: Info,
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    badgeVariant: 'warning',
    iconColor: 'text-amber-600',
  },
  LOW: {
    icon: Bell,
    bg: 'bg-blue-50',
    border: 'border-l-blue-400',
    badgeVariant: 'info',
    iconColor: 'text-blue-500',
  },
};

// ==================== SUB-COMPONENTS ====================

function WarningCard({ warning }: { warning: EarlyWarningDto }) {
  const level = (warning.warningLevel as WarningLevel) ?? 'LOW';
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.LOW;
  const Icon = config.icon;

  return (
    <div className={cn(
      'rounded-lg border-l-4 p-4',
      config.bg,
      config.border,
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{warning.warningType}</span>
            <Badge variant={config.badgeVariant}>{level}</Badge>
            {warning.isResolved && (
              <Badge variant="success">
                <CheckCircle className="mr-1 h-3 w-3" />
                Resolved
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-700">{warning.description}</p>

          {warning.suggestedAction && (
            <p className="mt-1 text-xs text-gray-500 italic">
              Suggested: {warning.suggestedAction}
            </p>
          )}

          {/* Stats row */}
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            {warning.currentGpa != null && (
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                GPA: {warning.currentGpa.toFixed(2)}
                {warning.previousGpa != null && (
                  <span className="ml-1 text-gray-400">
                    (was {warning.previousGpa.toFixed(2)})
                  </span>
                )}
              </span>
            )}
            {warning.attendancePercentage != null && (
              <span>Attendance: {warning.attendancePercentage.toFixed(0)}%</span>
            )}
            {warning.subjectsFailing && (
              <span>Failing: {warning.subjectsFailing}</span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            {new Date(warning.generatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {warning.isAiGenerated && (
              <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-purple-600">
                AI
              </span>
            )}
          </div>

          {warning.isResolved && warning.resolutionNote && (
            <div className="mt-2 rounded bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-700">
              <span className="font-medium">Resolution: </span>
              {warning.resolutionNote}
              {warning.resolvedByName && (
                <span className="ml-1 text-green-500">— {warning.resolvedByName}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function ParentAlerts() {
  const [searchParams] = useSearchParams();
  const initialStudentId = searchParams.get('studentId');

  const { data: children = [], isLoading: childrenLoading } = useMyChildren();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId ?? '');

  useEffect(() => {
    if (!selectedStudentId && children.length > 0) {
      setSelectedStudentId(String(children[0].id));
    }
  }, [children, selectedStudentId]);

  const studentId = selectedStudentId ? Number(selectedStudentId) : null;
  const { data: warnings = [], isLoading: warningsLoading } = useChildWarnings(studentId);

  const childOptions = children.map((c) => ({
    value: String(c.id),
    label: `${c.fullName} (${c.studentIndex})`,
  }));

  const selectedChild = children.find((c) => c.id === studentId);
  const isLoading = childrenLoading || warningsLoading;

  const unresolved = warnings.filter((w) => !w.isResolved);
  const resolved = warnings.filter((w) => w.isResolved);
  const criticalCount = warnings.filter((w) => w.warningLevel === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Academic Alerts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Early warnings and academic alerts for your child.
        </p>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <Card>
          <div className="p-5">
            <Select
              label="Select Child"
              value={selectedStudentId}
              onValueChange={setSelectedStudentId}
              options={childOptions}
              placeholder="Choose a child..."
            />
          </div>
        </Card>
      )}

      {/* Selected child + stats */}
      {selectedChild && !isLoading && warnings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              {selectedChild.fullName.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{selectedChild.fullName}</div>
              <div className="text-sm text-gray-500">
                {selectedChild.studentIndex} · {selectedChild.className ?? selectedChild.yearGroup}
              </div>
            </div>
          </div>

          {criticalCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
              <AlertOctagon className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
                <div className="text-xs text-red-600">Critical Alert{criticalCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !studentId ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Select a child to view their alerts.</p>
        </div>
      ) : warnings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-green-200 bg-green-50 py-16 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-400" />
          <p className="text-sm font-medium text-green-700">No alerts at this time</p>
          <p className="mt-1 text-xs text-green-600">
            Great news — your child has no academic warnings recorded.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unresolved */}
          {unresolved.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Active Warnings ({unresolved.length})
              </h2>
              <div className="space-y-3">
                {unresolved.map((w) => <WarningCard key={w.id} warning={w} />)}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Resolved ({resolved.length})
              </h2>
              <div className="space-y-3 opacity-70">
                {resolved.map((w) => <WarningCard key={w.id} warning={w} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
