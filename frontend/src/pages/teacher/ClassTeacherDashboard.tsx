import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, CheckCircle, AlertTriangle, AlertCircle,
  ClipboardList, Download, FileText,
  Clock, ChevronRight, Calendar, BarChart2,
  Shield, Award, GraduationCap, TrendingUp,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Button from '../../components/common/Button';
import Spinner from '../../components/ui/Spinner';

import {
  useClassDashboard,
  useMyClass,
  useClassStudents,
  useReportReadiness,
  useClassBehaviorLogs,
  useAttendanceSummary,
  useMarkAttendance,
  useDownloadClassReports,
  useGenerateReports,
} from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import { ROUTES } from '../../router/routes';
import { cn } from '../../lib/utils';
import type { StudentSummaryDto } from '../../types/admin.types';
import type { MarkAttendanceRequest } from '../../types/teacher.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function gpaColor(gpa: number | null | undefined): string {
  if (gpa == null) return 'text-gray-400';
  if (gpa >= 3.0) return 'text-green-600';
  if (gpa >= 2.0) return 'text-amber-600';
  return 'text-red-600';
}

function gpaBadgeVariant(
  gpa: number | null | undefined
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (gpa == null) return 'neutral';
  if (gpa >= 3.0) return 'success';
  if (gpa >= 2.0) return 'warning';
  return 'danger';
}

function subjectBarColor(avg: number): string {
  if (avg >= 60) return '#16a34a';
  if (avg >= 40) return '#d97706';
  return '#dc2626';
}

function abbrevSubject(name: string): string {
  if (name.length <= 12) return name;
  const words = name.split(' ');
  if (words.length > 1)
    return words.map((w) => w[0]?.toUpperCase() ?? '').join('');
  return name.slice(0, 9) + '…';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GH', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-6 w-14 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  onClick?: () => void;
}

function StatCard({
  icon,
  iconBg = 'bg-primary/10 text-primary',
  label,
  value,
  sub,
  onClick,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              iconBg
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <div className="text-xl font-bold text-gray-900 leading-tight">
              {value}
            </div>
          </div>
        </div>
        {onClick && (
          <button
            onClick={onClick}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      {sub && <div className="mt-2.5 pl-[52px]">{sub}</div>}
    </div>
  );
}

// ── Subject Performance Bar Chart ─────────────────────────────────────────────

interface SubjectChartEntry {
  name: string;
  fullName: string;
  avgScore: number;
  passRate: number;
  tutorName: string;
}

function SubjectTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: SubjectChartEntry }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.payload.fullName}</p>
      <p className="text-gray-600">
        Avg Score:{' '}
        <span
          className={cn(
            'font-medium',
            d.value >= 60
              ? 'text-green-600'
              : d.value >= 40
              ? 'text-amber-600'
              : 'text-red-600'
          )}
        >
          {d.value.toFixed(1)}
        </span>
      </p>
      <p className="text-gray-600">
        Pass Rate:{' '}
        <span className="font-medium">{d.payload.passRate.toFixed(1)}%</span>
      </p>
      {d.payload.tutorName && (
        <p className="mt-1 text-xs text-gray-400">
          Tutor: {d.payload.tutorName}
        </p>
      )}
    </div>
  );
}

function SubjectPerformanceChart({
  data,
}: {
  data: Array<{
    subjectId: number;
    subjectName: string;
    avgScore: number;
    passRate: number;
    tutorName: string;
  }>;
}) {
  const chartData: SubjectChartEntry[] = useMemo(
    () =>
      data.map((s) => ({
        name: abbrevSubject(s.subjectName),
        fullName: s.subjectName,
        avgScore: parseFloat(s.avgScore.toFixed(1)),
        passRate: s.passRate,
        tutorName: s.tutorName,
      })),
    [data]
  );

  if (!chartData.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart2 className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">No subject data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickFormatter={(v: number) => `${v}`}
        />
        <RechartsTooltip content={<SubjectTooltip />} />
        <Bar dataKey="avgScore" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {chartData.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={subjectBarColor(entry.avgScore)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── GPA Distribution Pie ──────────────────────────────────────────────────────

function GpaDistributionChart({
  passRate,
  totalStudents,
}: {
  passRate: number;
  failRate?: number;
  totalStudents: number;
}) {
  const passCount = Math.round((passRate / 100) * totalStudents);
  const failCount = totalStudents - passCount;

  const pieData = [
    { name: 'Pass (GPA ≥ 1.6)', value: passCount, color: '#16a34a' },
    { name: 'Fail (GPA < 1.6)', value: failCount, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="46%"
          outerRadius={82}
          paddingAngle={2}
        >
          {pieData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Legend
          formatter={(value, entry) => (
            <span className="text-xs text-gray-700">
              {value}:{' '}
              <strong>
                {(entry.payload as { value?: number })?.value ?? 0}
              </strong>
            </span>
          )}
        />
        <RechartsTooltip
          formatter={(value: unknown) => [
            `${value} students (${((Number(value) / totalStudents) * 100).toFixed(1)}%)`,
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Score Entry Panel ─────────────────────────────────────────────────────────

function ScoreEntryPanel({
  scoreStatus,
  subjectPerformance,
  onGenerate,
}: {
  scoreStatus: {
    isAllComplete: boolean;
    subjects: Array<{
      subjectId: number;
      subjectName: string;
      studentsWithScores: number;
      studentsWithoutScores: number;
    }>;
  };
  subjectPerformance: Array<{
    subjectId: number;
    subjectName: string;
    tutorName: string;
  }>;
  onGenerate: () => void;
}) {
  const tutorMap = useMemo(() => {
    const m: Record<number, string> = {};
    subjectPerformance.forEach((s) => {
      m[s.subjectId] = s.tutorName;
    });
    return m;
  }, [subjectPerformance]);

  const completedCount = scoreStatus.subjects.filter(
    (s) => s.studentsWithoutScores === 0
  ).length;
  const totalCount = scoreStatus.subjects.length;

  return (
    <Card
      title="Score Entry Status"
      subtitle={`${completedCount} of ${totalCount} subjects complete`}
      action={
        <Badge variant={scoreStatus.isAllComplete ? 'success' : 'warning'}>
          {scoreStatus.isAllComplete
            ? '✓ All Complete'
            : `${totalCount - completedCount} pending`}
        </Badge>
      }
    >
      {/* Status banner */}
      <div
        className={cn(
          'mb-5 flex items-start gap-3 rounded-lg px-4 py-3 text-sm',
          scoreStatus.isAllComplete
            ? 'border border-green-200 bg-green-50 text-green-800'
            : 'border border-amber-200 bg-amber-50 text-amber-800'
        )}
      >
        {scoreStatus.isAllComplete ? (
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        )}
        <div className="flex-1">
          {scoreStatus.isAllComplete ? (
            <span>All scores submitted! You can now generate term reports.</span>
          ) : (
            <span>
              Reports cannot be generated until all scores are submitted.
              Contact tutors for pending subjects.
            </span>
          )}
        </div>
        {scoreStatus.isAllComplete && (
          <Button size="sm" variant="primary" onClick={onGenerate}>
            Generate Reports Now
          </Button>
        )}
      </div>

      {/* Subject completion grid */}
      {scoreStatus.subjects.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-4">Subject</th>
                <th className="pb-2 pr-4">Tutor</th>
                <th className="pb-2 pr-4 text-right">Submitted</th>
                <th className="pb-2 pr-4 text-right">Total</th>
                <th className="pb-2 pr-4 min-w-[100px]">Progress</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {scoreStatus.subjects.map((subj) => {
                const total = subj.studentsWithScores + subj.studentsWithoutScores;
                const pct = total > 0 ? (subj.studentsWithScores / total) * 100 : 0;
                const isComplete = subj.studentsWithoutScores === 0;
                const isStarted = subj.studentsWithScores > 0;
                return (
                  <tr
                    key={subj.subjectId}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-medium text-gray-800">
                      {subj.subjectName}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">
                      {tutorMap[subj.subjectId] ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">
                      {subj.studentsWithScores}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-500">
                      {total}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isComplete
                              ? 'bg-green-500'
                              : isStarted
                              ? 'bg-amber-400'
                              : 'bg-gray-300'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="mt-0.5 block text-[10px] text-gray-400">
                        {pct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Badge
                        variant={
                          isComplete
                            ? 'success'
                            : isStarted
                            ? 'warning'
                            : 'danger'
                        }
                        className="text-[10px]"
                      >
                        {isComplete
                          ? 'Complete'
                          : isStarted
                          ? 'In Progress'
                          : 'Not Started'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Attendance Modal ──────────────────────────────────────────────────────────

function AttendanceModal({
  open,
  onClose,
  classRoomId,
  termId,
  students,
}: {
  open: boolean;
  onClose: () => void;
  classRoomId: number | null;
  termId: number | null;
  students: StudentSummaryDto[];
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [presentMap, setPresentMap] = useState<Record<number, boolean>>({});
  const markAttendance = useMarkAttendance();

  useEffect(() => {
    const init: Record<number, boolean> = {};
    students.forEach((s) => {
      init[s.id] = true;
    });
    setPresentMap(init);
  }, [students]);

  const absentCount = Object.values(presentMap).filter((v) => !v).length;

  const handleSubmit = () => {
    if (!classRoomId || !termId) return;
    const request: MarkAttendanceRequest = {
      classRoomId,
      termId,
      date,
      entries: students.map((s) => ({
        studentId: s.id,
        isPresent: presentMap[s.id] ?? true,
        isLate: false,
      })),
    };
    markAttendance.mutate(request, { onSuccess: onClose });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark Daily Attendance"
      description={`${students.length} students · ${absentCount} absent`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Date */}
        <div className="flex items-center gap-3">
          <label className="w-10 text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Bulk toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const all: Record<number, boolean> = {};
              students.forEach((s) => { all[s.id] = true; });
              setPresentMap(all);
            }}
            className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
          >
            Mark All Present
          </button>
          <button
            onClick={() => {
              const all: Record<number, boolean> = {};
              students.forEach((s) => { all[s.id] = false; });
              setPresentMap(all);
            }}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            Mark All Absent
          </button>
        </div>

        {/* Student rows */}
        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
          {students.map((student, idx) => {
            const isPresent = presentMap[student.id] ?? true;
            return (
              <div
                key={student.id}
                className={cn(
                  'flex items-center justify-between border-b border-gray-50 px-4 py-3 last:border-0',
                  !isPresent && 'bg-red-50/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs text-gray-400">
                    {idx + 1}
                  </span>
                  <Avatar fallback={student.fullName} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-gray-400">{student.studentIndex}</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setPresentMap((prev) => ({
                      ...prev,
                      [student.id]: !prev[student.id],
                    }))
                  }
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    isPresent
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  )}
                >
                  {isPresent ? 'Present' : 'Absent'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={markAttendance.isPending}
            disabled={!classRoomId || !termId}
          >
            Save Attendance
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Generate Reports Modal ────────────────────────────────────────────────────

function GenerateReportsModal({
  open,
  onClose,
  classRoomId,
  termId,
}: {
  open: boolean;
  onClose: () => void;
  classRoomId: number | null;
  termId: number | null;
}) {
  const { data: readiness, isLoading: loadingReadiness } = useReportReadiness(
    classRoomId,
    termId
  );
  const generateReports = useGenerateReports();

  const handleGenerate = () => {
    if (!termId) return;
    generateReports.mutate(termId, { onSuccess: onClose });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Term Reports"
      description="Review readiness before generating reports for all students."
      size="md"
    >
      {loadingReadiness ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" className="text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {readiness && (
            <>
              <div
                className={cn(
                  'flex items-start gap-3 rounded-lg px-4 py-3 text-sm',
                  readiness.isReady
                    ? 'border border-green-200 bg-green-50 text-green-800'
                    : 'border border-amber-200 bg-amber-50 text-amber-800'
                )}
              >
                {readiness.isReady ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <p>{readiness.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="font-semibold text-gray-900">
                    {readiness.studentsCount}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                  <p className="text-xs text-gray-500">All Scores Ready</p>
                  <p
                    className={cn(
                      'font-semibold',
                      readiness.allScoresSubmitted
                        ? 'text-green-700'
                        : 'text-amber-700'
                    )}
                  >
                    {readiness.allScoresSubmitted ? 'Yes ✓' : 'Incomplete'}
                  </p>
                </div>
              </div>

              {readiness.missingScoreSubjects.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-red-600">
                    Missing scores:
                  </p>
                  <ul className="space-y-1">
                    {readiness.missingScoreSubjects.map((s) => (
                      <li
                        key={s}
                        className="flex items-center gap-2 text-sm text-red-700"
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              loading={generateReports.isPending}
              disabled={!readiness?.isReady || !termId}
            >
              <FileText className="h-4 w-4" />
              Generate {readiness?.studentsCount ?? ''} Reports
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function ClassTeacherDashboard() {
  const navigate = useNavigate();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const teacherStore = useTeacherStore();
  const schoolStore = useSchoolStore();

  const classRoomId = teacherStore.classRoomId;
  const termId = teacherStore.currentTermId ?? schoolStore.currentTermId;

  // Populate teacher store on mount
  useMyClass();

  const { data: dashboard, isLoading: loadingDash } = useClassDashboard(
    termId ?? undefined
  );
  const { data: students = [], isLoading: loadingStudents } = useClassStudents();
  const { data: readiness } = useReportReadiness(classRoomId, termId);
  const { data: behaviorLogs = [] } = useClassBehaviorLogs(termId ?? undefined);
  const { data: attendanceSummaries = [] } = useAttendanceSummary(
    termId ?? undefined
  );
  const downloadReports = useDownloadClassReports();

  const atRiskStudents = useMemo(
    () =>
      attendanceSummaries
        .filter((s) => s.percentage < 85)
        .sort((a, b) => a.percentage - b.percentage),
    [attendanceSummaries]
  );

  const recentLogs = useMemo(() => behaviorLogs.slice(0, 5), [behaviorLogs]);

  const rawScoreStatus = dashboard?.scoreCompletionStatus;
  const scoreStatus = {
    isAllComplete: rawScoreStatus?.allComplete ?? false,
    subjects: rawScoreStatus?.subjects ?? [],
  };
  const classInfo = dashboard?.classInfo;
  const termLabel =
    dashboard?.termLabel ?? schoolStore.currentTermLabel ?? 'No active term';
  const canGenerate = readiness?.isReady ?? false;

  // ── Loading ──
  if (loadingDash) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
          <div className="h-7 w-56 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Class Dashboard
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white shadow-sm">
                {classInfo?.displayName ??
                  teacherStore.classRoomName ??
                  'No class assigned'}
              </span>
              {(classInfo?.yearGroup ?? teacherStore.yearGroup) && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {classInfo?.yearGroup ?? teacherStore.yearGroup}
                </span>
              )}
              {(classInfo?.programName ?? teacherStore.programName) && (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                  {classInfo?.programName ?? teacherStore.programName}
                </span>
              )}
              <span className="text-sm text-gray-400">{termLabel}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!canGenerate && readiness && (
              <span className="hidden text-xs text-amber-600 sm:block">
                Scores incomplete
              </span>
            )}
            <Button
              variant="primary"
              disabled={!termId}
              onClick={() => setShowGenerateModal(true)}
              title={
                !canGenerate
                  ? 'All scores must be submitted first'
                  : 'Generate term reports'
              }
            >
              <FileText className="h-4 w-4" />
              Generate Reports
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. STAT CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-blue-50 text-blue-600"
          label="Students"
          value={
            loadingStudents ? (
              <Spinner size="sm" className="text-gray-400 mt-0.5" />
            ) : (
              students.length
            )
          }
          sub={
            <button
              onClick={() => navigate(ROUTES.TEACHER_STUDENTS)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View All →
            </button>
          }
          onClick={() => navigate(ROUTES.TEACHER_STUDENTS)}
        />

        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-green-50 text-green-600"
          label="Class Avg GPA"
          value={
            dashboard?.averageGpa != null ? (
              <span className={gpaColor(dashboard.averageGpa)}>
                {dashboard.averageGpa.toFixed(2)}
              </span>
            ) : (
              <span className="text-sm font-normal text-gray-400">
                Not yet
              </span>
            )
          }
          sub={
            dashboard?.averageGpa != null && (
              <Badge
                variant={gpaBadgeVariant(dashboard.averageGpa)}
                className="text-[10px]"
              >
                {dashboard.averageGpa >= 3.0
                  ? 'Very Good'
                  : dashboard.averageGpa >= 2.0
                  ? 'Good'
                  : 'Needs Attention'}
              </Badge>
            )
          }
        />

        <StatCard
          icon={<GraduationCap className="h-5 w-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
          label="Pass Rate"
          value={
            dashboard != null ? (
              `${dashboard.passRate.toFixed(1)}%`
            ) : (
              <span className="text-sm font-normal text-gray-400">—</span>
            )
          }
          sub={
            dashboard != null && (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      dashboard.passRate >= 70
                        ? 'bg-green-500'
                        : dashboard.passRate >= 50
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                    )}
                    style={{ width: `${dashboard.passRate}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500">
                  {Math.round(
                    (dashboard.passRate / 100) * (dashboard.totalStudents || 0)
                  )}{' '}
                  passing
                </p>
              </div>
            )
          }
        />

        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          iconBg="bg-amber-50 text-amber-600"
          label="Score Entry"
          value={
            scoreStatus.subjects.length > 0
              ? `${
                  scoreStatus.subjects.filter(
                    (s) => s.studentsWithoutScores === 0
                  ).length
                }/${scoreStatus.subjects.length}`
              : <span className="text-sm font-normal text-gray-400">—</span>
          }
          sub={
            scoreStatus.subjects.length > 0 &&
            (scoreStatus.isAllComplete ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                All complete
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-600">
                {
                  scoreStatus.subjects.filter(
                    (s) => s.studentsWithoutScores > 0
                  ).length
                }{' '}
                pending
              </span>
            ))
          }
        />

        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg={
            (dashboard?.activeWarnings ?? 0) > 0
              ? 'bg-red-50 text-red-600'
              : 'bg-green-50 text-green-600'
          }
          label="Active Warnings"
          value={
            dashboard != null ? (
              <span
                className={
                  dashboard.activeWarnings > 0 ? 'text-red-600' : 'text-green-600'
                }
              >
                {dashboard.activeWarnings}
              </span>
            ) : (
              <span className="text-sm font-normal text-gray-400">—</span>
            )
          }
          sub={
            dashboard != null &&
            (dashboard.activeWarnings === 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                All clear
              </span>
            ) : (
              <span className="text-xs text-red-500">
                {dashboard.activeWarnings} at-risk
              </span>
            ))
          }
        />
      </div>

      {/* ── 3. SCORE ENTRY STATUS PANEL ──────────────────────────────── */}
      <ScoreEntryPanel
        scoreStatus={scoreStatus}
        subjectPerformance={dashboard?.subjectPerformance ?? []}
        onGenerate={() => setShowGenerateModal(true)}
      />

      {/* ── 4. CHARTS ROW ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Subject Performance"
          subtitle="Average score per subject this term"
        >
          <SubjectPerformanceChart
            data={dashboard?.subjectPerformance ?? []}
          />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              ≥ 60 — Good
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              40–59 — Fair
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              &lt; 40 — Poor
            </span>
          </div>
        </Card>

        {dashboard?.averageGpa != null ? (
          <Card
            title="Pass / Fail Distribution"
            subtitle={`Based on ${dashboard.totalStudents} students`}
          >
            <GpaDistributionChart
              passRate={dashboard.passRate}
              failRate={dashboard.failRate}
              totalStudents={dashboard.totalStudents}
            />
          </Card>
        ) : (
          <Card title="GPA Distribution">
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <BarChart2 className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">
                No results generated yet
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Generate term reports to see GPA distribution
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowGenerateModal(true)}
                disabled={!termId}
              >
                Generate Reports
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* ── 5. STUDENT LIST SECTION ────────────────────────────────────── */}
      <Card
        title="Class Students"
        subtitle={`${students.length} students enrolled`}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.TEACHER_STUDENTS)}
          >
            View All <ChevronRight className="h-4 w-4" />
          </Button>
        }
      >
        {loadingStudents ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" className="text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No students enrolled in this class.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="pb-2 pr-3">#</th>
                    <th className="pb-2 pr-4">Student</th>
                    <th className="pb-2 pr-4">Index</th>
                    <th className="pb-2 pr-4">GPA</th>
                    <th className="pb-2 pr-4">Position</th>
                    <th className="pb-2">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 8).map((student, idx) => {
                    const atRisk = atRiskStudents.find(
                      (a) => a.studentId === student.id
                    );
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="py-2.5 pr-3 text-xs text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar fallback={student.fullName} size="sm" />
                            <span className="font-medium text-gray-800">
                              {student.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                          {student.studentIndex}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-gray-400">—</td>
                        <td className="py-2.5 pr-4 text-xs text-gray-400">—</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            {atRisk && (
                              <span
                                title={`Attendance: ${atRisk.percentage.toFixed(1)}%`}
                              >
                                <Clock
                                  className={cn(
                                    'h-3.5 w-3.5',
                                    atRisk.percentage < 75
                                      ? 'text-red-500'
                                      : 'text-amber-500'
                                  )}
                                />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {students.length > 8 && (
              <div className="border-t border-gray-100 pt-3">
                <button
                  onClick={() => navigate(ROUTES.TEACHER_STUDENTS)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Full Class List ({students.length} students) →
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── 6. ATTENDANCE SUMMARY ──────────────────────────────────────── */}
      <Card
        title="Attendance Summary — This Term"
        subtitle="Students below the 85% attendance threshold"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAttendanceModal(true)}
          >
            <Calendar className="h-4 w-4" />
            Mark Today
          </Button>
        }
      >
        {atRiskStudents.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                All students have good attendance
              </p>
              <p className="text-xs text-green-600">
                No students are below the 85% threshold.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-4">Student</th>
                  <th className="pb-2 pr-4 text-right">Present</th>
                  <th className="pb-2 pr-4 text-right">Absent</th>
                  <th className="pb-2 pr-4 text-right">%</th>
                  <th className="pb-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {atRiskStudents.map((summary) => {
                  const isCritical = summary.percentage < 75;
                  return (
                    <tr
                      key={summary.studentId}
                      className={cn(
                        'border-b border-gray-50 last:border-0',
                        isCritical ? 'bg-red-50/40' : 'bg-amber-50/30'
                      )}
                    >
                      <td className="py-2.5 pr-4 font-medium text-gray-800">
                        {summary.studentName}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-green-700">
                        {summary.totalPresent}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-red-600">
                        {summary.totalAbsent}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span
                          className={cn(
                            'font-semibold',
                            isCritical ? 'text-red-600' : 'text-amber-600'
                          )}
                        >
                          {summary.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={isCritical ? 'danger' : 'warning'}
                          className="text-[10px]"
                        >
                          {isCritical ? 'Critical' : 'At Risk'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 7. RECENT BEHAVIOR LOG ─────────────────────────────────────── */}
      <Card
        title="Recent Conduct Logs"
        subtitle="Last 5 entries"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.TEACHER_BEHAVIOR)}
          >
            View All <ChevronRight className="h-4 w-4" />
          </Button>
        }
      >
        {recentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Shield className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">
              No behavior logs recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => {
              const isDiscipline = log.logType
                ?.toUpperCase()
                .includes('DISCIPLINE');
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3"
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      isDiscipline
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    )}
                  >
                    {isDiscipline ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Award className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {log.studentName}
                      </span>
                      <Badge
                        variant={isDiscipline ? 'danger' : 'success'}
                        className="text-[10px]"
                      >
                        {isDiscipline ? 'DISCIPLINE' : 'ACHIEVEMENT'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {log.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {formatDate(log.loggedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── 8. QUICK ACTIONS ───────────────────────────────────────────── */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              icon: <Calendar className="h-5 w-5" />,
              label: 'Mark Attendance',
              color: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100',
              onClick: () => setShowAttendanceModal(true),
            },
            {
              icon: <BarChart2 className="h-5 w-5" />,
              label: 'Score Overview',
              color:
                'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-100',
              onClick: () => navigate(ROUTES.TEACHER_SCORES),
            },
            {
              icon: <FileText className="h-5 w-5" />,
              label: 'Generate Reports',
              color:
                'bg-green-50 text-green-600 hover:bg-green-100 border-green-100',
              onClick: () => setShowGenerateModal(true),
            },
            {
              icon: downloadReports.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Download className="h-5 w-5" />
              ),
              label: 'Download Reports',
              color:
                'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100',
              onClick: () => termId && downloadReports.mutate(termId),
            },
            {
              icon: <GraduationCap className="h-5 w-5" />,
              label: 'View Transcripts',
              color:
                'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100',
              onClick: () => navigate(ROUTES.TEACHER_STUDENTS),
            },
            {
              icon: <AlertTriangle className="h-5 w-5" />,
              label: 'View Warnings',
              color: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100',
              onClick: () => navigate(ROUTES.TEACHER_BEHAVIOR),
            },
          ].map(({ icon, label, color, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border px-3 py-4',
                'text-center text-xs font-semibold transition-colors',
                color
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Floating Action Button ────────────────────────────────────── */}
      <button
        onClick={() => setShowAttendanceModal(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 sm:hidden"
        aria-label="Mark Today's Attendance"
      >
        <Calendar className="h-6 w-6" />
      </button>

      {/* ── MODALS ─────────────────────────────────────────────────────── */}
      <AttendanceModal
        open={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        classRoomId={classRoomId}
        termId={termId}
        students={students}
      />
      <GenerateReportsModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        classRoomId={classRoomId}
        termId={termId}
      />
    </div>
  );
}
