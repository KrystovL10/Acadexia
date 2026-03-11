import { useState, useMemo } from 'react';
import {
  Search, X, ChevronDown, Download, User, AlertTriangle,
  BookOpen, Calendar, MessageSquare, Trophy
} from 'lucide-react';
import {
  useClassStudents,
  useStudentDetail,
  useClassScoreOverview,
  useAttendanceSummary,
  useAttendanceSheet,
  useStudentBehaviorLogs,
  useAddBehaviorLog,
} from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import { teacherApi } from '../../api/teacher.api';
import type { ScoreDto } from '../../types/tutor.types';
import type { SubjectDto, StudentSummaryDto } from '../../types/admin.types';
import type { CreateBehaviorLogRequest } from '../../types/teacher.types';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/common/Button';
import DownloadButton from '../../components/common/DownloadButton';
import { cn } from '../../lib/utils';

// ==================== HELPERS ====================

function computeStudentGpa(
  studentId: number,
  scoreMatrix: Record<number, Record<number, ScoreDto | null>>,
  subjects: SubjectDto[]
) {
  const studentScores = scoreMatrix[studentId] ?? {};
  let totalGp = 0;
  let scored = 0;
  let passed = 0;
  let failed = 0;
  for (const subj of subjects) {
    const s = studentScores[subj.id];
    if (s && s.gradePoint !== null) {
      totalGp += s.gradePoint;
      scored++;
      if (s.gradePoint >= 1.6) passed++;
      else failed++;
    }
  }
  const gpa = scored > 0 ? totalGp / scored : null;
  return { gpa, passed, failed };
}

function cardBorderColor(gpa: number | null) {
  if (gpa === null) return 'border-l-gray-200';
  if (gpa >= 3.0) return 'border-l-green-500';
  if (gpa >= 2.0) return 'border-l-amber-400';
  return 'border-l-red-500';
}

function gpaLabel(gpa: number | null) {
  if (gpa === null) return '—';
  return gpa.toFixed(2);
}

function gpaColor(gpa: number | null) {
  if (gpa === null) return 'text-gray-400';
  if (gpa >= 3.0) return 'text-green-600';
  if (gpa >= 2.0) return 'text-amber-600';
  return 'text-red-600';
}

function downloadCsv(students: StudentSummaryDto[]) {
  const header = ['#', 'Student Index', 'Full Name', 'Program', 'Year Group'];
  const rows = students.map((s, i) => [
    i + 1,
    s.studentIndex,
    s.fullName,
    s.programName,
    s.yearGroup,
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== TABS ====================

type Tab = 'overview' | 'scores' | 'attendance' | 'behavior' | 'warnings';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <User className="h-3.5 w-3.5" /> },
  { id: 'scores', label: 'Scores', icon: <Trophy className="h-3.5 w-3.5" /> },
  { id: 'attendance', label: 'Attendance', icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: 'behavior', label: 'Behavior', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 'warnings', label: 'Warnings', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
];

// ==================== OVERVIEW TAB ====================

function OverviewTab({ studentId }: { studentId: number }) {
  const { data: detail, isLoading } = useStudentDetail(studentId);
  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" className="text-primary" />
      </div>
    );
  if (!detail) return <p className="py-8 text-center text-sm text-gray-400">No data.</p>;
  const s = detail.student;
  const rows = [
    ['Student Index', s.studentIndex],
    ['Date of Birth', s.dateOfBirth],
    ['Gender', s.gender],
    ['Nationality', s.nationality],
    ['Hometown', s.hometown],
    ['Phone', s.phoneNumber || '—'],
    ['Email', s.email],
    ['BECE Aggregate', s.beceAggregate != null ? String(s.beceAggregate) : '—'],
    ['BECE Year', s.beceYear || '—'],
    ['Admission Date', s.admissionDate],
    ['Program', s.currentProgramName],
    ['Class', s.currentClassName ?? '—'],
    ['Guardian', s.guardianName || '—'],
    ['Guardian Phone', s.guardianPhone || '—'],
    ['Guardian Relationship', s.guardianRelationship || '—'],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Current GPA', value: gpaLabel(detail.currentGpa), color: gpaColor(detail.currentGpa) },
          { label: 'CGPA', value: detail.cgpa?.toFixed(2) ?? '—', color: 'text-primary' },
          { label: 'Position', value: detail.positionInClass != null ? `#${detail.positionInClass}` : '—', color: 'text-gray-700' },
          { label: 'Attendance', value: `${(detail.attendanceSummary?.percentage ?? 0).toFixed(0)}%`, color: (detail.attendanceSummary?.percentage ?? 100) < 75 ? 'text-red-600' : 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
            <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
      <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm overflow-hidden">
        {rows.map(([k, v]) => (
          <div key={k} className="flex px-4 py-2">
            <dt className="w-40 shrink-0 font-medium text-gray-500">{k}</dt>
            <dd className="text-gray-800 break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ==================== SCORES TAB ====================

function ScoresTab({ studentId, termId }: { studentId: number; termId: number | null | undefined }) {
  const { data: detail, isLoading } = useStudentDetail(studentId);
  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" className="text-primary" />
      </div>
    );
  if (!detail) return <p className="py-8 text-center text-sm text-gray-400">No data.</p>;
  const scores = detail.currentTermScores;
  if (!scores.length)
    return <p className="py-8 text-center text-sm text-gray-400">No scores recorded yet.</p>;
  return (
    <div className="space-y-3">
      {termId && (
        <div className="flex gap-2">
          <DownloadButton
            label="Download Report"
            filename={`report_student${studentId}_term${termId}.pdf`}
            fetchFn={() => teacherApi.downloadStudentReport(studentId, termId)}
            variant="outline"
            size="sm"
            className="flex-1"
          />
          <DownloadButton
            label="Download Transcript"
            filename={`transcript_student${studentId}.pdf`}
            fetchFn={() => teacherApi.downloadTranscript(studentId)}
            variant="outline"
            size="sm"
            className="flex-1"
          />
        </div>
      )}
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Subject</th>
            <th className="px-3 py-2 text-center">Class</th>
            <th className="px-3 py-2 text-center">Exam</th>
            <th className="px-3 py-2 text-center">Total</th>
            <th className="px-3 py-2 text-center">Grade</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((sc) => (
            <tr key={sc.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{sc.subjectName}</td>
              <td className="px-3 py-2 text-center text-gray-600">{sc.isAbsent ? 'ABS' : (sc.classScore ?? '—')}</td>
              <td className="px-3 py-2 text-center text-gray-600">{sc.isAbsent ? 'ABS' : (sc.examScore ?? '—')}</td>
              <td className="px-3 py-2 text-center font-semibold text-gray-800">{sc.isAbsent ? 'ABS' : (sc.totalScore ?? '—')}</td>
              <td className="px-3 py-2 text-center">
                {sc.grade ? (
                  <span className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-xs font-bold',
                    sc.gradePoint != null && sc.gradePoint >= 3.0 ? 'bg-green-100 text-green-700' :
                    sc.gradePoint != null && sc.gradePoint >= 2.0 ? 'bg-blue-100 text-blue-700' :
                    sc.gradePoint != null && sc.gradePoint >= 1.6 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {sc.grade}
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

// ==================== ATTENDANCE TAB ====================

function AttendanceTab({
  studentId,
  termId,
}: {
  studentId: number;
  termId: number | null | undefined;
}) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }, []);

  const { data: sheet, isLoading } = useAttendanceSheet(
    termId ?? undefined,
    thirtyDaysAgo,
    today
  );

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" className="text-primary" />
      </div>
    );

  if (!sheet || !sheet.dates.length)
    return <p className="py-8 text-center text-sm text-gray-400">No attendance data.</p>;

  const matrix = sheet.attendanceMatrix[studentId] ?? {};
  const present = sheet.dates.filter((d) => matrix[d] === true).length;
  const absent = sheet.dates.filter((d) => matrix[d] === false).length;
  const pct = sheet.dates.length > 0 ? Math.round((present / sheet.dates.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Present', value: present, color: 'text-green-600' },
          { label: 'Absent', value: absent, color: 'text-red-600' },
          { label: 'Rate', value: `${pct}%`, color: pct < 75 ? 'text-red-600' : 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Last 30 Days
        </p>
        <div className="flex flex-wrap gap-1.5">
          {sheet.dates.map((date) => {
            const val = matrix[date];
            return (
              <span
                key={date}
                title={date}
                className={cn(
                  'inline-block h-5 w-5 rounded-sm text-[9px] leading-5 text-center font-medium',
                  val === true ? 'bg-green-400 text-white' :
                  val === false ? 'bg-red-400 text-white' :
                  'bg-gray-200 text-gray-400'
                )}
              >
                {new Date(date).getDate()}
              </span>
            );
          })}
        </div>
        <div className="mt-2 flex gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-400" />Present</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" />Absent</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-200" />Not recorded</span>
        </div>
      </div>
    </div>
  );
}

// ==================== BEHAVIOR TAB ====================

function BehaviorTab({
  studentId,
  classRoomId,
  termId,
}: {
  studentId: number;
  classRoomId: number | null;
  termId: number | null | undefined;
}) {
  const { data: logs = [], isLoading } = useStudentBehaviorLogs(studentId, termId ?? undefined);
  const addLog = useAddBehaviorLog();
  const [form, setForm] = useState({
    logType: 'ACHIEVEMENT',
    title: '',
    description: '',
    severity: '',
  });
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classRoomId || !termId) return;
    const req: CreateBehaviorLogRequest = {
      studentId,
      classRoomId,
      termId,
      logType: form.logType,
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.logType === 'DISCIPLINE' ? form.severity || undefined : undefined,
    };
    addLog.mutate(req, {
      onSuccess: () => {
        setForm({ logType: 'ACHIEVEMENT', title: '', description: '', severity: '' });
        setShowForm(false);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Log History ({logs.length})
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showForm ? 'Cancel' : '+ Add Log'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
              <select
                value={form.logType}
                onChange={(e) => setForm((f) => ({ ...f, logType: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              >
                <option value="ACHIEVEMENT">Achievement</option>
                <option value="DISCIPLINE">Discipline</option>
                <option value="COUNSELING">Counseling</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            {form.logType === 'DISCIPLINE' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="">Select…</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              placeholder="e.g. Outstanding class performance"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
            <textarea
              required
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            loading={addLog.isPending}
            disabled={!classRoomId || !termId}
          >
            Save Log
          </Button>
        </form>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="sm" className="text-primary" />
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No behavior logs yet.</p>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">{log.title}</p>
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                log.logType === 'ACHIEVEMENT' ? 'bg-green-100 text-green-700' :
                log.logType === 'DISCIPLINE' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              )}>
                {log.logType}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{log.description}</p>
            <p className="mt-1.5 text-[10px] text-gray-400">
              {new Date(log.loggedAt).toLocaleDateString()} · {log.loggedByName}
              {log.severity && ` · ${log.severity}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== WARNINGS TAB ====================

function WarningsTab({ studentId }: { studentId: number }) {
  const { data: detail, isLoading } = useStudentDetail(studentId);
  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" className="text-primary" />
      </div>
    );
  const warnings = detail?.activeWarnings ?? [];
  if (!warnings.length)
    return <p className="py-8 text-center text-sm text-gray-400">No active warnings.</p>;
  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <div
          key={w.id}
          className={cn(
            'rounded-lg border p-3',
            w.warningLevel === 'CRITICAL' ? 'border-red-200 bg-red-50' :
            w.warningLevel === 'HIGH' ? 'border-orange-200 bg-orange-50' :
            'border-amber-200 bg-amber-50'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800">{w.warningType}</p>
            <span className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
              w.warningLevel === 'CRITICAL' ? 'bg-red-200 text-red-800' :
              w.warningLevel === 'HIGH' ? 'bg-orange-200 text-orange-800' :
              'bg-amber-200 text-amber-800'
            )}>
              {w.warningLevel}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-600">{w.description}</p>
          {w.suggestedAction && (
            <p className="mt-1 text-xs italic text-gray-500">Action: {w.suggestedAction}</p>
          )}
          <p className="mt-1.5 text-[10px] text-gray-400">
            {new Date(w.generatedAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

// ==================== PROFILE DRAWER ====================

function ProfileDrawer({
  studentId,
  onClose,
  classRoomId,
  termId,
}: {
  studentId: number;
  onClose: () => void;
  classRoomId: number | null;
  termId: number | null | undefined;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: students = [] } = useClassStudents();
  const student = students.find((s) => s.id === studentId);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">{student?.fullName ?? 'Student Profile'}</p>
            <p className="text-xs text-gray-500">{student?.studentIndex} · {student?.programName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'overview' && <OverviewTab studentId={studentId} />}
          {activeTab === 'scores' && <ScoresTab studentId={studentId} termId={termId} />}
          {activeTab === 'attendance' && (
            <AttendanceTab studentId={studentId} termId={termId} />
          )}
          {activeTab === 'behavior' && (
            <BehaviorTab studentId={studentId} classRoomId={classRoomId} termId={termId} />
          )}
          {activeTab === 'warnings' && <WarningsTab studentId={studentId} />}
        </div>
      </div>
    </>
  );
}

// ==================== STUDENT CARD ====================

function StudentCard({
  student,
  gpa,
  passed,
  failed,
  totalSubjects,
  attendancePct,
  onClick,
}: {
  student: StudentSummaryDto;
  gpa: number | null;
  passed: number;
  failed: number;
  totalSubjects: number;
  attendancePct: number | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border border-l-4 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30',
        cardBorderColor(gpa)
      )}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary uppercase">
          {student.fullName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{student.fullName}</p>
          <p className="font-mono text-xs text-gray-400">{student.studentIndex}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
        <div>
          <p className={cn('font-bold text-sm', gpaColor(gpa))}>{gpaLabel(gpa)}</p>
          <p className="text-gray-400">GPA</p>
        </div>
        <div>
          <p className="text-sm font-bold text-green-600">{passed}</p>
          <p className="text-gray-400">Passed</p>
        </div>
        <div>
          <p className={cn('text-sm font-bold', failed > 0 ? 'text-red-600' : 'text-gray-400')}>{failed}</p>
          <p className="text-gray-400">Failed</p>
        </div>
        <div>
          <p className={cn(
            'text-sm font-bold',
            attendancePct === null ? 'text-gray-300' :
            attendancePct < 75 ? 'text-red-600' : 'text-green-600'
          )}>
            {attendancePct !== null ? `${attendancePct.toFixed(0)}%` : '—'}
          </p>
          <p className="text-gray-400">Attend.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {student.yearGroup}
        </span>
        <span className="text-[10px] text-gray-400">{totalSubjects} subjects</span>
      </div>
    </button>
  );
}

// ==================== MAIN PAGE ====================

type SortKey = 'name' | 'gpa-desc' | 'gpa-asc' | 'attendance';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'gpa-desc', label: 'GPA (High–Low)' },
  { value: 'gpa-asc', label: 'GPA (Low–High)' },
  { value: 'attendance', label: 'Attendance' },
];

export default function ClassStudentList() {
  const teacherStore = useTeacherStore();
  const { currentTermId: schoolTermId } = useSchoolStore();
  const termId = teacherStore.currentTermId ?? schoolTermId;
  const classRoomId = teacherStore.classRoomId;

  const { data: students = [], isLoading, isError } = useClassStudents();
  const { data: overview } = useClassScoreOverview(termId ?? undefined);
  const { data: attendanceSummary = [] } = useAttendanceSummary(termId ?? undefined);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const attendanceMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const a of attendanceSummary) {
      map[a.studentId] = a.percentage;
    }
    return map;
  }, [attendanceSummary]);

  const statsMap = useMemo(() => {
    if (!overview) return {} as Record<number, { gpa: number | null; passed: number; failed: number }>;
    const result: Record<number, { gpa: number | null; passed: number; failed: number }> = {};
    for (const s of overview.students) {
      result[s.id] = computeStudentGpa(s.id, overview.scoreMatrix, overview.subjects);
    }
    return result;
  }, [overview]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? students.filter(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.studentIndex.toLowerCase().includes(q)
        )
      : [...students];

    if (sort === 'name') list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    else if (sort === 'gpa-desc')
      list.sort((a, b) => (statsMap[b.id]?.gpa ?? -1) - (statsMap[a.id]?.gpa ?? -1));
    else if (sort === 'gpa-asc')
      list.sort((a, b) => (statsMap[a.id]?.gpa ?? 99) - (statsMap[b.id]?.gpa ?? 99));
    else if (sort === 'attendance')
      list.sort((a, b) => (attendanceMap[b.id] ?? -1) - (attendanceMap[a.id] ?? -1));

    return list;
  }, [students, search, sort, statsMap, attendanceMap]);

  return (
    <div>
      <PageHeader
        title="My Students"
        subtitle={`${teacherStore.classRoomName ?? 'Your class'} · ${students.length} students`}
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or index…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* CSV Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(students)}
          disabled={!students.length}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-primary" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load students. Please try again.
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            {search ? 'No students match your search.' : 'No students in this class.'}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => {
            const stats = statsMap[s.id] ?? { gpa: null, passed: 0, failed: 0 };
            return (
              <StudentCard
                key={s.id}
                student={s}
                gpa={stats.gpa}
                passed={stats.passed}
                failed={stats.failed}
                totalSubjects={overview?.subjects.length ?? 0}
                attendancePct={attendanceMap[s.id] ?? null}
                onClick={() => setSelectedStudentId(s.id)}
              />
            );
          })}
        </div>
      )}

      {/* Profile Drawer */}
      {selectedStudentId !== null && (
        <ProfileDrawer
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          classRoomId={classRoomId}
          termId={termId}
        />
      )}
    </div>
  );
}
