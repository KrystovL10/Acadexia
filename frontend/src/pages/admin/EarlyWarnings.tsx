import { useState, useMemo } from 'react';
import {
  AlertTriangle, AlertOctagon, Info, Bell, Search,
  CheckCircle, ChevronLeft, ChevronRight, Play, Eye,
  ArrowRight, Clock,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

import {
  useWarningSummary, useTermWarnings, useStudentWarnings,
  useResolveWarning, useTriggerWarningAnalysis,
} from '../../hooks/admin/useWarnings';
import { useSchoolStore } from '../../store/school.store';
import { YearGroup } from '../../types/enums';
import type { EarlyWarningDto, EarlyWarningSummaryDto } from '../../types/warning.types';
import { cn } from '../../lib/utils';

// ==================== CONSTANTS ====================

const LEVEL_CONFIG = {
  CRITICAL: {
    icon: AlertOctagon,
    bg: 'bg-red-50',
    border: 'border-l-red-600',
    badge: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
    cardBg: 'bg-red-600',
    cardText: 'text-white',
    subtitle: 'Immediate action required',
  },
  HIGH: {
    icon: AlertTriangle,
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
    cardBg: 'bg-orange-500',
    cardText: 'text-white',
    subtitle: 'Urgent attention needed',
  },
  MEDIUM: {
    icon: Info,
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
    cardBg: 'bg-amber-500',
    cardText: 'text-white',
    subtitle: 'Monitor closely',
  },
  LOW: {
    icon: Bell,
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    cardBg: 'bg-blue-500',
    cardText: 'text-white',
    subtitle: 'Keep an eye on',
  },
} as const;

const LEVEL_FILTER = [
  { value: '__all__', label: 'All Levels' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const TYPE_FILTER = [
  { value: '__all__', label: 'All Types' },
  { value: 'FAILING_SUBJECTS', label: 'Failing Subjects' },
  { value: 'GPA_DECLINE', label: 'GPA Decline' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'BEHAVIORAL', label: 'Behavioral' },
  { value: 'CORE_SUBJECT_FAILURE', label: 'Core Subject Failure' },
];

const STATUS_FILTER = [
  { value: '__all__', label: 'All Status' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
];

const YG_FILTER = [
  { value: '__all__', label: 'All Years' },
  { value: YearGroup.SHS1, label: 'SHS 1' },
  { value: YearGroup.SHS2, label: 'SHS 2' },
  { value: YearGroup.SHS3, label: 'SHS 3' },
];

const PAGE_SIZE = 10;

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function formatWarningType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ==================== MAIN COMPONENT ====================

export default function EarlyWarnings() {
  const { toast } = useToast();
  const { schoolId, currentTermId, currentTermLabel } = useSchoolStore();
  const sid = schoolId ?? 0;
  const tid = currentTermId ?? 0;

  // Queries
  const summaryQuery = useWarningSummary(sid, tid);
  const triggerAnalysis = useTriggerWarningAnalysis();

  const summary = summaryQuery.data as EarlyWarningSummaryDto | undefined;

  // Filters
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('__all__');
  const [filterType, setFilterType] = useState('__all__');
  const [filterStatus, setFilterStatus] = useState('__all__');
  const [filterYg, setFilterYg] = useState('__all__');
  const [page, setPage] = useState(0);

  // Modals
  const [resolveWarning, setResolveWarning] = useState<EarlyWarningDto | null>(null);
  const [viewStudentWarnings, setViewStudentWarnings] = useState<{ studentId: number; studentName: string } | null>(null);

  // Warnings list
  const warningsQuery = useTermWarnings({
    termId: tid,
    level: filterLevel === '__all__' ? undefined : filterLevel,
    page,
    size: PAGE_SIZE,
  });

  const warnings = warningsQuery.data;
  const warningsList = warnings?.content ?? [];
  const totalElements = warnings?.totalElements ?? 0;
  const totalPages = warnings?.totalPages ?? 0;

  // Client-side filtering for search, type, status, year group
  const filteredWarnings = useMemo(() => {
    let result = warningsList;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) => w.studentName.toLowerCase().includes(q) || w.studentIndex.toLowerCase().includes(q),
      );
    }
    if (filterType !== '__all__') {
      result = result.filter((w) => w.warningType === filterType);
    }
    if (filterStatus === 'resolved') {
      result = result.filter((w) => w.isResolved);
    } else if (filterStatus === 'unresolved') {
      result = result.filter((w) => !w.isResolved);
    }
    // Year group filter — from class name pattern (e.g. "SHS 1 ..." or "SHS1 ...")
    if (filterYg !== '__all__') {
      const ygLabel = filterYg.replace('SHS', 'SHS ');
      result = result.filter(
        (w) => w.studentClassName?.includes(filterYg) || w.studentClassName?.includes(ygLabel),
      );
    }
    return result;
  }, [warningsList, search, filterType, filterStatus, filterYg]);

  const handleRunAnalysis = async () => {
    try {
      toast({ title: 'Analysis started', description: 'Running warning analysis...', variant: 'info' });
      const result = await triggerAnalysis.mutateAsync({ schoolId: sid, termId: tid });
      const count = result.data.data;
      toast({ title: 'Analysis complete', description: `${count} warning(s) generated`, variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to run warning analysis', variant: 'danger' });
    }
  };

  // Determine last analysis time from most recent warning
  const lastAnalyzed = useMemo(() => {
    if (!summary?.recentWarnings?.length) return null;
    const latest = summary.recentWarnings.reduce((a, b) =>
      new Date(a.generatedAt) > new Date(b.generatedAt) ? a : b,
    );
    return latest.generatedAt;
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Early Warning System</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {currentTermLabel && <Badge variant="neutral">{currentTermLabel}</Badge>}
              {lastAnalyzed && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last analyzed: {formatTimeAgo(lastAnalyzed)}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button onClick={handleRunAnalysis} loading={triggerAnalysis.isPending}>
          <Play className="h-4 w-4" />
          Run Analysis
        </Button>
      </div>

      {/* SUMMARY STATS */}
      {summaryQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl p-6">
              <div className="h-8 w-16 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard level="CRITICAL" count={summary.criticalCount} />
            <SummaryCard level="HIGH" count={summary.highCount} />
            <SummaryCard level="MEDIUM" count={summary.mediumCount} />
            <SummaryCard level="LOW" count={summary.lowCount} />
          </div>

          {/* Resolved progress */}
          {summary.totalWarnings > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  <span className="font-semibold text-green-600">{summary.resolvedCount}</span> of{' '}
                  <span className="font-semibold">{summary.totalWarnings}</span> warnings resolved this term
                </span>
                <span className="text-gray-500">
                  {summary.totalWarnings > 0
                    ? Math.round((summary.resolvedCount / summary.totalWarnings) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${summary.totalWarnings > 0 ? (summary.resolvedCount / summary.totalWarnings) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* FILTER & SEARCH BAR */}
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or index..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <Select
            value={filterLevel}
            onValueChange={(v) => { setFilterLevel(v); setPage(0); }}
            options={LEVEL_FILTER}
            placeholder="All Levels"
            className="w-full lg:w-36"
          />
          <Select
            value={filterType}
            onValueChange={(v) => { setFilterType(v); setPage(0); }}
            options={TYPE_FILTER}
            placeholder="All Types"
            className="w-full lg:w-48"
          />
          <Select
            value={filterStatus}
            onValueChange={(v) => { setFilterStatus(v); setPage(0); }}
            options={STATUS_FILTER}
            placeholder="All Status"
            className="w-full lg:w-36"
          />
          <Select
            value={filterYg}
            onValueChange={(v) => { setFilterYg(v); setPage(0); }}
            options={YG_FILTER}
            placeholder="All Years"
            className="w-full lg:w-32"
          />
        </div>
      </Card>

      {/* WARNINGS LIST */}
      {warningsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 p-5">
              <div className="flex gap-4">
                <div className="h-6 w-20 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-gray-200" />
                  <div className="h-3 w-64 rounded bg-gray-200" />
                  <div className="h-3 w-48 rounded bg-gray-200" />
                </div>
                <div className="h-8 w-20 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredWarnings.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">
              {warningsList.length === 0 ? 'No active warnings this term' : 'No warnings match your filters'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {warningsList.length === 0 ? 'All students are performing well!' : 'Try adjusting your filter criteria'}
            </p>
            {warningsList.length === 0 && (
              <Button className="mt-4" onClick={handleRunAnalysis} loading={triggerAnalysis.isPending}>
                <Play className="h-4 w-4" />
                Run Analysis
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredWarnings.map((warning) => (
            <WarningCard
              key={warning.id}
              warning={warning}
              onResolve={() => setResolveWarning(warning)}
              onViewStudent={() => setViewStudentWarnings({
                studentId: warning.studentId,
                studentName: warning.studentName,
              })}
            />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = totalPages <= 5
                ? i
                : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                    pageNum === page
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {resolveWarning && (
        <ResolveWarningModal
          warning={resolveWarning}
          onClose={() => setResolveWarning(null)}
        />
      )}
      {viewStudentWarnings && (
        <StudentWarningsModal
          studentId={viewStudentWarnings.studentId}
          studentName={viewStudentWarnings.studentName}
          onClose={() => setViewStudentWarnings(null)}
        />
      )}
    </div>
  );
}

// ==================== SUMMARY CARD ====================

function SummaryCard({ level, count }: { level: keyof typeof LEVEL_CONFIG; count: number }) {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-xl p-5 shadow-md', config.cardBg)}>
      <div className="flex items-center justify-between">
        <Icon className={cn('h-6 w-6', config.cardText)} />
        <span className={cn('text-3xl font-black', config.cardText)}>{count}</span>
      </div>
      <p className={cn('mt-2 text-sm font-semibold', config.cardText)}>{level}</p>
      <p className={cn('text-xs opacity-80', config.cardText)}>{config.subtitle}</p>
    </div>
  );
}

// ==================== WARNING CARD ====================

function WarningCard({
  warning, onResolve, onViewStudent,
}: {
  warning: EarlyWarningDto;
  onResolve: () => void;
  onViewStudent: () => void;
}) {
  const config = LEVEL_CONFIG[warning.warningLevel as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.LOW;
  const failingSubjects = warning.subjectsFailing ? warning.subjectsFailing.split(',').map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div
      className={cn(
        'rounded-xl border border-l-4 transition-all',
        config.border,
        warning.isResolved ? 'border-gray-200 bg-gray-50/60 opacity-75' : `border-gray-200 ${config.bg}`,
      )}
    >
      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* LEFT */}
          <div className="flex shrink-0 flex-col gap-2 lg:w-36">
            <span
              className={cn(
                'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase',
                config.badge,
              )}
            >
              {warning.warningLevel}
            </span>
            <span className="text-xs font-medium text-gray-700">
              {formatWarningType(warning.warningType)}
            </span>
            <span className="text-xs text-gray-400">{formatTimeAgo(warning.generatedAt)}</span>
          </div>

          {/* CENTER */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Avatar fallback={warning.studentName} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{warning.studentName}</p>
                <p className="text-xs text-gray-500">
                  {warning.studentIndex}
                  {warning.studentClassName && <> &middot; {warning.studentClassName}</>}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">{warning.description}</p>

            {/* Failing subjects chips */}
            {failingSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {failingSubjects.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            )}

            {/* Resolved banner */}
            {warning.isResolved && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-xs text-green-700">
                  <span className="font-semibold">RESOLVED</span>
                  {warning.resolvedByName && <> by {warning.resolvedByName}</>}
                  {warning.resolvedAt && <> &middot; {formatTimeAgo(warning.resolvedAt)}</>}
                  {warning.resolutionNote && (
                    <p className="mt-0.5 text-green-600">{warning.resolutionNote}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="shrink-0 space-y-3 lg:w-48 lg:text-right">
            {/* Suggested action */}
            {warning.suggestedAction && (
              <p className="text-xs italic text-gray-500 leading-relaxed">{warning.suggestedAction}</p>
            )}

            {/* GPA indicators */}
            {warning.previousGpa != null && warning.currentGpa != null && (
              <div className="flex items-center gap-2 lg:justify-end">
                <span className="text-sm text-gray-500">{warning.previousGpa.toFixed(2)}</span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <span
                  className={cn(
                    'text-sm font-bold',
                    warning.currentGpa < warning.previousGpa ? 'text-red-600' : 'text-green-600',
                  )}
                >
                  {warning.currentGpa.toFixed(2)}
                </span>
              </div>
            )}

            {/* Attendance */}
            {warning.attendancePercentage != null && (
              <p className="text-xs text-gray-500">
                Attendance: <span className={cn('font-semibold', warning.attendancePercentage < 75 ? 'text-red-600' : 'text-gray-700')}>
                  {warning.attendancePercentage}%
                </span>
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 lg:justify-end">
              {!warning.isResolved && (
                <Button size="sm" variant="primary" onClick={onResolve}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Resolve
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onViewStudent}>
                <Eye className="h-3.5 w-3.5" />
                View All
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== RESOLVE WARNING MODAL ====================

function ResolveWarningModal({ warning, onClose }: { warning: EarlyWarningDto; onClose: () => void }) {
  const { toast } = useToast();
  const resolve = useResolveWarning();
  const [note, setNote] = useState('');

  const config = LEVEL_CONFIG[warning.warningLevel as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.LOW;

  const handleSubmit = async () => {
    if (!note.trim()) {
      toast({ title: 'Required', description: 'Please enter a resolution note', variant: 'warning' });
      return;
    }
    try {
      await resolve.mutateAsync({
        warningId: warning.id,
        data: { resolutionNote: note.trim() },
      });
      toast({ title: 'Warning resolved', description: `Warning for ${warning.studentName} has been resolved`, variant: 'success' });
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve warning', variant: 'danger' });
    }
  };

  return (
    <Modal open onClose={onClose} title="Resolve Warning" size="lg">
      <div className="space-y-4">
        {/* Warning summary */}
        <div className={cn('rounded-lg border-l-4 p-4', config.border, config.bg)}>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold uppercase', config.badge)}>
              {warning.warningLevel}
            </span>
            <span className="text-sm font-medium text-gray-700">{formatWarningType(warning.warningType)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Avatar fallback={warning.studentName} size="sm" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{warning.studentName}</p>
              <p className="text-xs text-gray-500">
                {warning.studentIndex}
                {warning.studentClassName && <> &middot; {warning.studentClassName}</>}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-700">{warning.description}</p>
        </div>

        {/* Resolution note */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Resolution Note *</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the action taken to address this warning..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={resolve.isPending} disabled={!note.trim()}>
            <CheckCircle className="h-4 w-4" />
            Confirm Resolve
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== STUDENT WARNINGS MODAL ====================

function StudentWarningsModal({
  studentId, studentName, onClose,
}: {
  studentId: number; studentName: string; onClose: () => void;
}) {
  const warningsQuery = useStudentWarnings(studentId);
  const warnings = (warningsQuery.data ?? []) as EarlyWarningDto[];

  return (
    <Modal open onClose={onClose} title={`All Warnings — ${studentName}`} size="xl">
      {warningsQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : warnings.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-green-400" />
          <p className="mt-2 text-sm text-gray-500">No warnings for this student</p>
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {warnings.map((w) => {
            const cfg = LEVEL_CONFIG[w.warningLevel as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.LOW;
            return (
              <div
                key={w.id}
                className={cn(
                  'rounded-lg border border-l-4 p-4',
                  cfg.border,
                  w.isResolved ? 'border-gray-200 bg-gray-50' : `border-gray-200 ${cfg.bg}`,
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold uppercase', cfg.badge)}>
                    {w.warningLevel}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{formatWarningType(w.warningType)}</span>
                  <span className="ml-auto text-xs text-gray-400">{formatTimeAgo(w.generatedAt)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{w.description}</p>

                {/* GPA */}
                {w.previousGpa != null && w.currentGpa != null && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-gray-500">GPA: {w.previousGpa.toFixed(2)}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className={cn('font-bold', w.currentGpa < w.previousGpa ? 'text-red-600' : 'text-green-600')}>
                      {w.currentGpa.toFixed(2)}
                    </span>
                  </div>
                )}

                {w.isResolved && (
                  <div className="mt-2 flex items-center gap-2 rounded bg-green-50 px-2 py-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs text-green-700">
                      <span className="font-semibold">Resolved</span>
                      {w.resolvedByName && <> by {w.resolvedByName}</>}
                      {w.resolvedAt && <> &middot; {formatTimeAgo(w.resolvedAt)}</>}
                    </span>
                  </div>
                )}
                {w.resolutionNote && (
                  <p className="mt-1 text-xs text-gray-500 italic">Note: {w.resolutionNote}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
