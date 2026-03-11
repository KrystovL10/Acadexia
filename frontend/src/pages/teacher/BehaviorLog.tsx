import { useState, useMemo } from 'react';
import {
  Plus, Search, X, ChevronDown, Award, AlertTriangle,
  MessageSquare, User, Clock, Pencil, Trash2, Star,
  Shield, FileText, Zap,
} from 'lucide-react';
import {
  useClassStudents,
  useClassBehaviorLogs,
  useStudentBehaviorLogs,
  useAddBehaviorLog,
  useUpdateBehaviorLog,
  useDeleteBehaviorLog,
} from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import type { BehaviorLogDto, CreateBehaviorLogRequest } from '../../types/teacher.types';
import type { StudentSummaryDto } from '../../types/admin.types';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { cn } from '../../lib/utils';

// ==================== CONSTANTS & HELPERS ====================

const LOG_TYPES = [
  { value: 'ACHIEVEMENT', label: 'Achievement', icon: Award, color: 'gold' },
  { value: 'DISCIPLINE_ISSUE', label: 'Discipline Issue', icon: AlertTriangle, color: 'red' },
  { value: 'COMMENDATION', label: 'Commendation', icon: Star, color: 'green' },
  { value: 'NOTE', label: 'Note', icon: FileText, color: 'grey' },
  { value: 'WARNING', label: 'Warning', icon: Zap, color: 'orange' },
] as const;

type LogTypeValue = (typeof LOG_TYPES)[number]['value'];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
type Severity = (typeof SEVERITIES)[number];

const ACHIEVEMENT_TEMPLATES = [
  'Academic Excellence', 'Sports Achievement', 'Leadership', 'Community Service', 'Arts/Culture',
];
const DISCIPLINE_TEMPLATES = [
  'Late to class', 'Disrupting class', 'Missing assignment', 'Disrespectful behavior',
  'Uniform violation', 'Phone in class',
];

function typeLabel(t: string) {
  return LOG_TYPES.find((lt) => lt.value === t)?.label ?? t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function typeBorderColor(t: string, severity?: string | null) {
  switch (t) {
    case 'ACHIEVEMENT': return 'border-l-amber-400';
    case 'DISCIPLINE_ISSUE': return severity === 'HIGH' ? 'border-l-red-700' : 'border-l-red-400';
    case 'COMMENDATION': return 'border-l-green-500';
    case 'WARNING': return 'border-l-orange-400';
    case 'NOTE': return 'border-l-gray-300';
    default: return 'border-l-gray-300';
  }
}

function typeIconColor(t: string) {
  switch (t) {
    case 'ACHIEVEMENT': return 'bg-amber-100 text-amber-600';
    case 'DISCIPLINE_ISSUE': return 'bg-red-100 text-red-600';
    case 'COMMENDATION': return 'bg-green-100 text-green-600';
    case 'WARNING': return 'bg-orange-100 text-orange-600';
    case 'NOTE': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-500';
  }
}

function typeBadgeColor(t: string): string {
  switch (t) {
    case 'ACHIEVEMENT': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'DISCIPLINE_ISSUE': return 'bg-red-100 text-red-700 border-red-200';
    case 'COMMENDATION': return 'bg-green-100 text-green-700 border-green-200';
    case 'WARNING': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'NOTE': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function severityBadge(s: string | null): { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string } {
  switch (s) {
    case 'HIGH': return { variant: 'danger', label: 'High' };
    case 'MEDIUM': return { variant: 'warning', label: 'Medium' };
    case 'LOW': return { variant: 'info', label: 'Low' };
    default: return { variant: 'neutral', label: s ?? '' };
  }
}

function severityColor(s: string) {
  switch (s) {
    case 'HIGH': return 'border-red-300 bg-red-50 text-red-700';
    case 'MEDIUM': return 'border-orange-300 bg-orange-50 text-orange-700';
    case 'LOW': return 'border-yellow-300 bg-yellow-50 text-yellow-700';
    default: return 'border-gray-300 bg-gray-50 text-gray-600';
  }
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatTimestamp(iso);
}

function dateGroupLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dStr = d.toDateString();
  if (dStr === today.toDateString()) {
    return `Today — ${d.toLocaleDateString('en-GH', { month: 'long', day: 'numeric' })}`;
  }
  if (dStr === yesterday.toDateString()) {
    return `Yesterday — ${d.toLocaleDateString('en-GH', { month: 'long', day: 'numeric' })}`;
  }
  return d.toLocaleDateString('en-GH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getLogIcon(t: string) {
  return LOG_TYPES.find((lt) => lt.value === t)?.icon ?? FileText;
}

function groupByDate(logs: BehaviorLogDto[]) {
  const groups: { label: string; date: string; logs: BehaviorLogDto[] }[] = [];
  for (const log of logs) {
    const dateKey = new Date(log.loggedAt).toDateString();
    const existing = groups.find((g) => g.date === dateKey);
    if (existing) {
      existing.logs.push(log);
    } else {
      groups.push({ label: dateGroupLabel(log.loggedAt), date: dateKey, logs: [log] });
    }
  }
  return groups;
}

// ==================== DELETE CONFIRMATION MODAL ====================

function DeleteConfirmModal({
  log,
  onClose,
  onConfirm,
  isDeleting,
}: {
  log: BehaviorLogDto;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Modal open onClose={onClose} title="Delete this log entry?" size="sm">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-800">{log.title}</p>
          <p className="mt-1 text-xs text-gray-500">Student: {log.studentName}</p>
        </div>

        <p className="text-sm text-gray-600">This action cannot be undone.</p>

        {log.severity === 'HIGH' && (
          <p className="text-xs text-amber-600">
            If this log created an early warning, the warning will be resolved automatically.
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isDeleting} className="flex-1">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== ADD/EDIT LOG MODAL ====================

function LogFormModal({
  students,
  classRoomId,
  termId,
  onClose,
  onSave,
  isSaving,
  editLog,
  preSelectedStudentId,
}: {
  students: StudentSummaryDto[];
  classRoomId: number;
  termId: number;
  onClose: () => void;
  onSave: (data: CreateBehaviorLogRequest) => void;
  isSaving: boolean;
  editLog?: BehaviorLogDto | null;
  preSelectedStudentId?: number | null;
}) {
  const isEdit = !!editLog;
  const [studentId, setStudentId] = useState<number | null>(
    editLog?.studentId ?? preSelectedStudentId ?? null
  );
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [logType, setLogType] = useState<LogTypeValue>(
    (editLog?.logType as LogTypeValue) ?? 'DISCIPLINE_ISSUE'
  );
  const [severity, setSeverity] = useState<Severity>(
    (editLog?.severity as Severity) ?? 'MEDIUM'
  );
  const [title, setTitle] = useState(editLog?.title ?? '');
  const [description, setDescription] = useState(editLog?.description ?? '');

  const selectedStudent = students.find((s) => s.id === studentId);

  const filteredStudents = studentSearch.trim()
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
          s.studentIndex.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students;

  const canSubmit = studentId && title.trim() && description.trim();
  const showSeverity = logType === 'DISCIPLINE_ISSUE' || logType === 'WARNING';

  function handleSubmit() {
    if (!canSubmit) return;
    onSave({
      studentId: studentId!,
      classRoomId,
      termId,
      logType,
      title: title.trim(),
      description: description.trim(),
      severity: showSeverity ? severity : undefined,
    });
  }

  function applyTemplate(template: string) {
    setTitle(template);
  }

  const templates = logType === 'ACHIEVEMENT' || logType === 'COMMENDATION'
    ? ACHIEVEMENT_TEMPLATES
    : logType === 'DISCIPLINE_ISSUE' || logType === 'WARNING'
      ? DISCIPLINE_TEMPLATES
      : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Log Entry' : 'Add Behavior Log Entry'}
      description="Record conduct events for your class students"
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-5">
        {/* Student selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Student *</label>
          {selectedStudent ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary uppercase">
                {selectedStudent.fullName.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{selectedStudent.fullName}</p>
                <p className="font-mono text-xs text-gray-500">{selectedStudent.studentIndex}</p>
              </div>
              {!isEdit && (
                <button onClick={() => { setStudentId(null); setStudentSearch(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setShowStudentDropdown(true); }}
                onFocus={() => setShowStudentDropdown(true)}
                onBlur={() => setTimeout(() => setShowStudentDropdown(false), 150)}
                placeholder="Search student by name or index..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {showStudentDropdown && filteredStudents.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredStudents.slice(0, 15).map((s) => (
                    <button
                      key={s.id}
                      onMouseDown={() => {
                        setStudentId(s.id);
                        setStudentSearch('');
                        setShowStudentDropdown(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                        {s.fullName.charAt(0)}
                      </span>
                      <span className="font-medium text-gray-800">{s.fullName}</span>
                      <span className="ml-auto font-mono text-xs text-gray-400">{s.studentIndex}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Log type radio buttons with icons */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Log Type *</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {LOG_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setLogType(value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors',
                  logType === value
                    ? value === 'ACHIEVEMENT' ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : value === 'DISCIPLINE_ISSUE' ? 'border-red-300 bg-red-50 text-red-700'
                    : value === 'COMMENDATION' ? 'border-green-300 bg-green-50 text-green-700'
                    : value === 'WARNING' ? 'border-orange-300 bg-orange-50 text-orange-700'
                    : 'border-gray-400 bg-gray-100 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick templates */}
        {templates.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Quick templates</label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t}
                  onClick={() => applyTemplate(t)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    title === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              logType === 'ACHIEVEMENT' || logType === 'COMMENDATION'
                ? 'e.g. Won inter-class quiz competition'
                : 'e.g. Disrupting class during Science lesson'
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description *</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="Provide details about this entry..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className={cn(
            'mt-1 text-right text-[10px]',
            description.length > 450 ? 'text-amber-600' : 'text-gray-400'
          )}>
            {description.length}/500
          </p>
        </div>

        {/* Severity */}
        {showSeverity && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Severity</label>
            <div className="flex gap-2">
              {([
                { value: 'LOW' as Severity, label: 'Low', desc: 'Minor infraction', dot: 'bg-yellow-400' },
                { value: 'MEDIUM' as Severity, label: 'Medium', desc: 'Requires monitoring', dot: 'bg-orange-400' },
                { value: 'HIGH' as Severity, label: 'High', desc: 'Requires immediate attention', dot: 'bg-red-500' },
              ]).map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    severity === s.value
                      ? severityColor(s.value) + ' ring-1 ring-current'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', s.dot)} />
                    <span className="text-xs font-semibold">{s.label}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] opacity-70">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HIGH severity warning */}
        {showSeverity && severity === 'HIGH' && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              A HIGH severity {logType === 'WARNING' ? 'warning' : 'discipline'} log will automatically create an Early Warning for this student and notify the system administrator.
            </span>
          </div>
        )}

        {/* Preview card */}
        {title.trim() && selectedStudent && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Preview</label>
            <div className={cn(
              'rounded-lg border-l-4 border bg-gray-50 px-4 py-3',
              typeBorderColor(logType, showSeverity ? severity : null)
            )}>
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', typeBadgeColor(logType))}>
                  {typeLabel(logType)}
                </span>
                {showSeverity && (
                  <Badge variant={severityBadge(severity).variant} className="text-[10px]">
                    {severity}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-gray-800">{title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{selectedStudent.fullName}</p>
              {description.trim() && (
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{description}</p>
              )}
            </div>
          </div>
        )}

        {/* Term info */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Term: {useTeacherStore.getState().currentTermLabel ?? 'Current Term'} (auto-assigned)</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            loading={isSaving}
            disabled={!canSubmit}
          >
            <Plus className="h-4 w-4" />
            {isEdit ? 'Save Changes' : 'Add Log Entry'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== LOG CARD ====================

function LogCard({
  log,
  onEdit,
  onDelete,
  onStudentClick,
}: {
  log: BehaviorLogDto;
  onEdit: (log: BehaviorLogDto) => void;
  onDelete: (log: BehaviorLogDto) => void;
  onStudentClick: (studentId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLongDesc = log.description.length > 150;
  const Icon = getLogIcon(log.logType);
  const sev = severityBadge(log.severity);
  const showSeverity = (log.logType === 'DISCIPLINE_ISSUE' || log.logType === 'WARNING') && log.severity;

  return (
    <div className={cn(
      'rounded-xl border border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
      typeBorderColor(log.logType, log.severity)
    )}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          typeIconColor(log.logType)
        )}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: badges + time */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', typeBadgeColor(log.logType))}>
                {typeLabel(log.logType)}
              </span>
              {showSeverity && (
                <Badge variant={sev.variant} className="text-[10px]">{sev.label}</Badge>
              )}
            </div>
            <span className="shrink-0 flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
              <Clock className="h-3 w-3" />
              {relativeTime(log.loggedAt)}
            </span>
          </div>

          {/* Student + title */}
          <div className="mt-2">
            <button
              onClick={() => onStudentClick(log.studentId)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
            >
              <User className="h-3 w-3" />
              {log.studentName}
            </button>
            <p className="mt-1 text-sm font-semibold text-gray-900">{log.title}</p>
          </div>

          {/* Description */}
          <div className="mt-1.5">
            <p className={cn(
              'text-sm text-gray-600 leading-relaxed',
              !expanded && isLongDesc && 'line-clamp-2'
            )}>
              {log.description}
            </p>
            {isLongDesc && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Footer: logged by + actions */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">Logged by {log.loggedByName}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(log)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(log)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CLASS BEHAVIOR OVERVIEW ====================

function ClassBehaviorOverview({
  logs,
  students,
  onStudentClick,
}: {
  logs: BehaviorLogDto[];
  students: StudentSummaryDto[];
  onStudentClick: (id: number) => void;
}) {
  const [showConcerns, setShowConcerns] = useState(false);

  const achievementCount = logs.filter((l) =>
    l.logType === 'ACHIEVEMENT' || l.logType === 'COMMENDATION'
  ).length;
  const disciplineCount = logs.filter((l) =>
    l.logType === 'DISCIPLINE_ISSUE' || l.logType === 'WARNING'
  ).length;

  // Build per-student conduct scores (simple heuristic):
  // Start at 100, -10 for HIGH discipline, -5 for MEDIUM, -2 for LOW, -3 for WARNING
  // +3 for achievement, +2 for commendation
  const studentScores = useMemo(() => {
    const scores: Record<number, { score: number; name: string; latestIssue?: string }> = {};
    for (const s of students) {
      scores[s.id] = { score: 100, name: s.fullName };
    }
    for (const log of logs) {
      if (!scores[log.studentId]) {
        scores[log.studentId] = { score: 100, name: log.studentName };
      }
      const entry = scores[log.studentId];
      switch (log.logType) {
        case 'DISCIPLINE_ISSUE':
          if (log.severity === 'HIGH') entry.score -= 10;
          else if (log.severity === 'MEDIUM') entry.score -= 5;
          else entry.score -= 2;
          entry.latestIssue = log.title;
          break;
        case 'WARNING':
          entry.score -= 3;
          entry.latestIssue = log.title;
          break;
        case 'ACHIEVEMENT':
          entry.score += 3;
          break;
        case 'COMMENDATION':
          entry.score += 2;
          break;
      }
      entry.score = Math.max(0, Math.min(100, entry.score));
    }
    return scores;
  }, [logs, students]);

  const allScores = Object.values(studentScores);
  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length)
    : 100;

  const sorted = [...allScores].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const concerns = sorted.filter((s) => s.score < 75);

  const conductColor = avgScore >= 80 ? 'bg-green-500' : avgScore >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const conductTextColor = avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-600';

  function conductGrade(score: number) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  }

  const medals = ['text-amber-500', 'text-gray-400', 'text-orange-600'];
  const medalLabels = ['1st', '2nd', '3rd'];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
        <div className="bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-2xl font-bold text-amber-600">{achievementCount}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Achievements</p>
        </div>
        <div className="bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-2xl font-bold text-red-600">{disciplineCount}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Discipline Issues</p>
        </div>
        <div className="bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <User className="h-4 w-4 text-red-400" />
            <span className={cn('text-2xl font-bold', concerns.length > 0 ? 'text-red-600' : 'text-gray-300')}>
              {concerns.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">With Concerns</p>
        </div>
        <div className="bg-white p-4 text-center">
          <span className={cn('text-2xl font-bold', conductTextColor)}>{avgScore}</span>
          <span className="text-sm text-gray-400">/100</span>
          <p className="mt-1 text-xs text-gray-500">Avg. Conduct</p>
        </div>
      </div>

      {/* Conduct progress bar */}
      <div className="px-5 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">Class Conduct Score</span>
          <span className={cn('text-xs font-bold', conductTextColor)}>{avgScore}/100</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', conductColor)}
            style={{ width: `${avgScore}%` }}
          />
        </div>
      </div>

      {/* Leaderboard + concerns */}
      <div className="grid gap-px bg-gray-100 sm:grid-cols-2">
        {/* Top 3 */}
        <div className="bg-white px-5 py-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Best Conduct This Term
          </p>
          <div className="space-y-2.5">
            {top3.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={cn('text-sm font-bold', medals[i])}>{medalLabels[i]}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                  {s.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{s.name}</p>
                </div>
                <Badge variant={s.score >= 90 ? 'success' : 'info'} className="text-[10px]">
                  {conductGrade(s.score)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Students with concerns */}
        <div className="bg-white px-5 py-4">
          {concerns.length > 0 ? (
            <>
              <button
                onClick={() => setShowConcerns(!showConcerns)}
                className="flex w-full items-center justify-between text-left"
              >
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                  {concerns.length} student{concerns.length !== 1 ? 's' : ''} need conduct attention
                </p>
                <ChevronDown className={cn(
                  'h-4 w-4 text-gray-400 transition-transform',
                  showConcerns && 'rotate-180'
                )} />
              </button>
              {showConcerns && (
                <div className="mt-3 space-y-2.5">
                  {concerns.slice(0, 5).map((s, i) => {
                    const id = Object.entries(studentScores).find(([, v]) => v === s)?.[0];
                    return (
                      <button
                        key={i}
                        onClick={() => id && onStudentClick(Number(id))}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 uppercase">
                          {s.name.charAt(0)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{s.name}</p>
                          {s.latestIssue && (
                            <p className="truncate text-xs text-gray-400">{s.latestIssue}</p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-red-600">{s.score}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <Shield className="h-6 w-6 text-green-300 mb-1.5" />
              <p className="text-xs text-gray-500">No students with conduct concerns</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== STUDENT CONDUCT DRAWER ====================

function StudentConductDrawer({
  studentId,
  termId,
  students,
  onClose,
  onAddLog,
}: {
  studentId: number;
  termId: number;
  students: StudentSummaryDto[];
  onClose: () => void;
  onAddLog: (studentId: number) => void;
}) {
  const student = students.find((s) => s.id === studentId);
  const { data: logs = [], isLoading } = useStudentBehaviorLogs(studentId, termId);
  const [activeTab, setActiveTab] = useState<'summary' | 'logs' | 'assessment'>('summary');

  const achievements = logs.filter((l) => l.logType === 'ACHIEVEMENT' || l.logType === 'COMMENDATION');
  const disciplines = logs.filter((l) => l.logType === 'DISCIPLINE_ISSUE' || l.logType === 'WARNING');
  const highCount = disciplines.filter((l) => l.severity === 'HIGH').length;
  const medCount = disciplines.filter((l) => l.severity === 'MEDIUM').length;
  const lowCount = disciplines.filter((l) => l.severity === 'LOW').length;

  // Conduct score
  let score = 100;
  for (const log of logs) {
    if (log.logType === 'DISCIPLINE_ISSUE') {
      if (log.severity === 'HIGH') score -= 10;
      else if (log.severity === 'MEDIUM') score -= 5;
      else score -= 2;
    } else if (log.logType === 'WARNING') {
      score -= 3;
    } else if (log.logType === 'ACHIEVEMENT') {
      score += 3;
    } else if (log.logType === 'COMMENDATION') {
      score += 2;
    }
  }
  score = Math.max(0, Math.min(100, score));

  function conductGrade(s: number) {
    if (s >= 90) return { label: 'Excellent', variant: 'success' as const };
    if (s >= 80) return { label: 'Very Good', variant: 'success' as const };
    if (s >= 70) return { label: 'Good', variant: 'info' as const };
    if (s >= 60) return { label: 'Satisfactory', variant: 'warning' as const };
    return { label: 'Needs Improvement', variant: 'danger' as const };
  }

  const grade = conductGrade(score);
  const gaugeColor = score >= 80 ? '#16A34A' : score >= 60 ? '#F59E0B' : '#DC2626';
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  if (!student) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-200 px-5 py-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary uppercase">
            {student.fullName.charAt(0)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-900">{student.fullName}</p>
            <p className="font-mono text-xs text-gray-400">{student.studentIndex}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score + Grade */}
        <div className="flex items-center gap-6 px-5 py-5 border-b border-gray-100">
          <svg width={88} height={88}>
            <circle cx={44} cy={44} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={6} />
            <circle
              cx={44} cy={44} r={radius}
              fill="none" stroke={gaugeColor} strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 44 44)"
              className="transition-all duration-500"
            />
            <text x={44} y={44} textAnchor="middle" dominantBaseline="central" fill={gaugeColor} className="text-base font-bold">
              {score}
            </text>
          </svg>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Conduct Score</p>
            <Badge variant={grade.variant} className="mt-1 text-sm">
              {grade.label}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['summary', 'logs', 'assessment'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2.5 text-center text-xs font-medium transition-colors capitalize',
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" className="text-primary" />
            </div>
          ) : activeTab === 'summary' ? (
            <div className="space-y-5">
              {/* Achievements */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700">Achievements ({achievements.length})</span>
                </div>
                {achievements.length > 0 ? (
                  <ul className="space-y-1.5 ml-6">
                    {achievements.map((a) => (
                      <li key={a.id} className="text-sm text-gray-600">
                        <span className="font-medium">{a.title}</span>
                        <span className="ml-1.5 text-xs text-gray-400">{relativeTime(a.loggedAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ml-6 text-xs text-gray-400">No achievements this term</p>
                )}
              </div>

              {/* Discipline */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-semibold text-gray-700">Discipline Issues ({disciplines.length})</span>
                </div>
                {disciplines.length > 0 ? (
                  <>
                    <div className="flex gap-3 ml-6 mb-2">
                      {highCount > 0 && <span className="text-xs text-red-600 font-medium">{highCount} High</span>}
                      {medCount > 0 && <span className="text-xs text-orange-600 font-medium">{medCount} Medium</span>}
                      {lowCount > 0 && <span className="text-xs text-yellow-600 font-medium">{lowCount} Low</span>}
                    </div>
                    <ul className="space-y-1.5 ml-6">
                      {disciplines.map((d) => (
                        <li key={d.id} className="text-sm text-gray-600">
                          <span className="font-medium">{d.title}</span>
                          {d.severity && (
                            <Badge variant={severityBadge(d.severity).variant} className="ml-1.5 text-[9px]">
                              {d.severity}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="ml-6 text-xs text-gray-400">No discipline issues this term</p>
                )}
              </div>

              {/* Score breakdown */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Conduct Score Breakdown</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Base Score</span>
                    <span className="font-mono">100</span>
                  </div>
                  {achievements.length > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>+ Achievements ({achievements.filter(a => a.logType === 'ACHIEVEMENT').length} x +3)</span>
                      <span className="font-mono">+{achievements.filter(a => a.logType === 'ACHIEVEMENT').length * 3}</span>
                    </div>
                  )}
                  {achievements.filter(a => a.logType === 'COMMENDATION').length > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>+ Commendations ({achievements.filter(a => a.logType === 'COMMENDATION').length} x +2)</span>
                      <span className="font-mono">+{achievements.filter(a => a.logType === 'COMMENDATION').length * 2}</span>
                    </div>
                  )}
                  {highCount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>- High Severity ({highCount} x -10)</span>
                      <span className="font-mono">-{highCount * 10}</span>
                    </div>
                  )}
                  {medCount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>- Medium Severity ({medCount} x -5)</span>
                      <span className="font-mono">-{medCount * 5}</span>
                    </div>
                  )}
                  {lowCount > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>- Low Severity ({lowCount} x -2)</span>
                      <span className="font-mono">-{lowCount * 2}</span>
                    </div>
                  )}
                  {disciplines.filter(d => d.logType === 'WARNING').length > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>- Warnings ({disciplines.filter(d => d.logType === 'WARNING').length} x -3)</span>
                      <span className="font-mono">-{disciplines.filter(d => d.logType === 'WARNING').length * 3}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-gray-200 font-semibold">
                    <span>Final Score</span>
                    <span className="font-mono">{score}/100</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'logs' ? (
            <div className="space-y-3">
              <Button size="sm" variant="primary" onClick={() => onAddLog(studentId)}>
                <Plus className="h-3.5 w-3.5" />
                Add Log for {student.fullName.split(' ')[0]}
              </Button>
              {logs.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">No logs for this student yet.</p>
              ) : (
                logs
                  .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
                  .map((log) => {
                    const Icon = getLogIcon(log.logType);
                    return (
                      <div key={log.id} className={cn(
                        'rounded-lg border-l-4 border bg-gray-50 px-3 py-2.5',
                        typeBorderColor(log.logType, log.severity)
                      )}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-gray-500" />
                          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold', typeBadgeColor(log.logType))}>
                            {typeLabel(log.logType)}
                          </span>
                          {log.severity && (
                            <Badge variant={severityBadge(log.severity).variant} className="text-[9px]">
                              {log.severity}
                            </Badge>
                          )}
                          <span className="ml-auto text-[10px] text-gray-400">{relativeTime(log.loggedAt)}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-800">{log.title}</p>
                        <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{log.description}</p>
                      </div>
                    );
                  })
              )}
            </div>
          ) : (
            /* Assessment tab */
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {score >= 90
                    ? `${student.fullName} has demonstrated exemplary conduct this term. With ${achievements.length} commendable entries and no significant disciplinary concerns, this student serves as a role model for peers.`
                    : score >= 70
                      ? `${student.fullName} has maintained generally good conduct this term. There have been ${disciplines.length} conduct concern${disciplines.length !== 1 ? 's' : ''} that were addressed. Continued improvement is encouraged.`
                      : `${student.fullName} requires attention regarding conduct this term. With ${disciplines.length} discipline-related entries, focused intervention and monitoring are recommended. Parents/guardians should be engaged for collaborative improvement.`
                  }
                </p>
              </div>
              <p className="text-xs text-gray-400">
                This assessment is automatically generated and may be used in terminal reports.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ==================== FILTER TYPES ====================

type FilterType = 'all' | LogTypeValue;
type FilterSeverity = 'all' | Severity;

// ==================== MAIN PAGE ====================

export default function BehaviorLog() {
  const teacherStore = useTeacherStore();
  const { currentTermId: schoolTermId } = useSchoolStore();
  const termId = teacherStore.currentTermId ?? schoolTermId;
  const classRoomId = teacherStore.classRoomId;
  const termLabel = teacherStore.currentTermLabel ?? 'Current Term';

  const { data: students = [] } = useClassStudents();
  const { data: logs = [], isLoading: loadingLogs } = useClassBehaviorLogs(termId ?? undefined);
  const addBehaviorLog = useAddBehaviorLog();
  const updateBehaviorLog = useUpdateBehaviorLog();
  const deleteBehaviorLog = useDeleteBehaviorLog();

  // UI state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editLog, setEditLog] = useState<BehaviorLogDto | null>(null);
  const [deleteLog, setDeleteLog] = useState<BehaviorLogDto | null>(null);
  const [drawerStudentId, setDrawerStudentId] = useState<number | null>(null);
  const [preSelectedStudentId, setPreSelectedStudentId] = useState<number | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [filterStudentId, setFilterStudentId] = useState<number | null>(null);
  const [showStudentFilter, setShowStudentFilter] = useState(false);

  const filteredLogs = useMemo(() => {
    let list = [...logs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.studentName.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      list = list.filter((l) => l.logType === filterType);
    }

    if (filterSeverity !== 'all') {
      list = list.filter((l) => l.severity === filterSeverity);
    }

    if (filterStudentId) {
      list = list.filter((l) => l.studentId === filterStudentId);
    }

    list.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
    return list;
  }, [logs, search, filterType, filterSeverity, filterStudentId]);

  const dateGroups = useMemo(() => groupByDate(filteredLogs), [filteredLogs]);

  // Handlers
  function handleOpenAdd() {
    setEditLog(null);
    setPreSelectedStudentId(null);
    setShowFormModal(true);
  }

  function handleOpenAddForStudent(studentId: number) {
    setEditLog(null);
    setPreSelectedStudentId(studentId);
    setShowFormModal(true);
    setDrawerStudentId(null);
  }

  function handleOpenEdit(log: BehaviorLogDto) {
    setEditLog(log);
    setPreSelectedStudentId(null);
    setShowFormModal(true);
  }

  function handleSave(data: CreateBehaviorLogRequest) {
    if (editLog) {
      updateBehaviorLog.mutate(
        { logId: editLog.id, data },
        { onSuccess: () => { setShowFormModal(false); setEditLog(null); } }
      );
    } else {
      addBehaviorLog.mutate(data, {
        onSuccess: () => { setShowFormModal(false); setPreSelectedStudentId(null); },
      });
    }
  }

  function handleDelete() {
    if (!deleteLog) return;
    deleteBehaviorLog.mutate(
      { logId: deleteLog.id, termId: termId ?? undefined, studentId: deleteLog.studentId },
      { onSuccess: () => setDeleteLog(null) }
    );
  }

  const filterStudentName = filterStudentId
    ? students.find((s) => s.id === filterStudentId)?.fullName
    : null;

  if (!termId || !classRoomId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conduct & Behavior Log"
          subtitle={teacherStore.classRoomName ?? 'Your class'}
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-700">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            No active term or class assigned. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Conduct & Behavior Log"
        subtitle={`${teacherStore.classRoomName ?? 'Your class'} · Track achievements and discipline`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="info">{termLabel}</Badge>
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              Add Log Entry
            </Button>
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 overflow-x-auto">
        {[
          { key: 'all' as FilterType, label: 'All' },
          { key: 'ACHIEVEMENT' as FilterType, label: 'Achievements' },
          { key: 'DISCIPLINE_ISSUE' as FilterType, label: 'Discipline' },
          { key: 'COMMENDATION' as FilterType, label: 'Commendations' },
          { key: 'WARNING' as FilterType, label: 'Warnings' },
          { key: 'NOTE' as FilterType, label: 'Notes' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
              filterType === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview card */}
      <ClassBehaviorOverview
        logs={logs}
        students={students}
        onStudentClick={setDrawerStudentId}
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, title, or description..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Severity filter */}
        {(filterType === 'all' || filterType === 'DISCIPLINE_ISSUE' || filterType === 'WARNING') && (
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
            <button
              onClick={() => setFilterSeverity('all')}
              className={cn(
                'rounded-md px-2.5 py-1.5 font-medium transition-colors',
                filterSeverity === 'all' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Any
            </button>
            {SEVERITIES.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={cn(
                  'rounded-md px-2 py-1.5 font-medium transition-colors',
                  filterSeverity === s ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        )}

        {/* Student filter */}
        <div className="relative">
          <button
            onClick={() => setShowStudentFilter(!showStudentFilter)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
              filterStudentId
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
          >
            <User className="h-3.5 w-3.5" />
            {filterStudentName ?? 'Student'}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showStudentFilter && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStudentFilter(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  onClick={() => { setFilterStudentId(null); setShowStudentFilter(false); }}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-xs hover:bg-gray-50',
                    !filterStudentId && 'bg-primary/5 text-primary font-medium'
                  )}
                >
                  All Students
                </button>
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setFilterStudentId(s.id); setShowStudentFilter(false); }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50',
                      filterStudentId === s.id && 'bg-primary/5 text-primary font-medium'
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary uppercase">
                      {s.fullName.charAt(0)}
                    </span>
                    {s.fullName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="ml-auto text-xs text-gray-400">
          {filteredLogs.length} of {logs.length} entries
        </p>
      </div>

      {/* Log list (grouped by date) */}
      {loadingLogs ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            {logs.length === 0
              ? 'No behavior logs recorded this term.'
              : 'No entries match your filters.'}
          </p>
          {logs.length === 0 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              Add First Entry
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.date}>
              <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.logs.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    onEdit={handleOpenEdit}
                    onDelete={setDeleteLog}
                    onStudentClick={setDrawerStudentId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showFormModal && (
        <LogFormModal
          students={students}
          classRoomId={classRoomId}
          termId={termId}
          onClose={() => { setShowFormModal(false); setEditLog(null); setPreSelectedStudentId(null); }}
          onSave={handleSave}
          isSaving={addBehaviorLog.isPending || updateBehaviorLog.isPending}
          editLog={editLog}
          preSelectedStudentId={preSelectedStudentId}
        />
      )}

      {/* Delete confirmation */}
      {deleteLog && (
        <DeleteConfirmModal
          log={deleteLog}
          onClose={() => setDeleteLog(null)}
          onConfirm={handleDelete}
          isDeleting={deleteBehaviorLog.isPending}
        />
      )}

      {/* Student conduct drawer */}
      {drawerStudentId && (
        <StudentConductDrawer
          studentId={drawerStudentId}
          termId={termId}
          students={students}
          onClose={() => setDrawerStudentId(null)}
          onAddLog={handleOpenAddForStudent}
        />
      )}
    </div>
  );
}
