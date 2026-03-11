import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, CheckCircle2, Clock, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useTutorStore } from '../../store/tutor.store';
import { useTutorAssignments } from '../../hooks/tutor';
import type { TutorAssignmentDto } from '../../types/tutor.types';
import { ROUTES } from '../../router/routes';
import { cn } from '../../lib/utils';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

// ── Circular progress indicator ──────────────────────────────────────────────

function CircularProgress({
  pct,
  submitted,
  total,
}: {
  pct: number;
  submitted: number;
  total: number;
}) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color =
    pct >= 71 ? '#22c55e' : pct >= 31 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#e5e7eb';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="64" height="64" className="-rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-[11px] font-bold text-gray-800">
          {submitted}/{total}
        </span>
        <span className="text-[9px] text-gray-400">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

// ── Assignment status helpers ────────────────────────────────────────────────

type AssignmentStatus = 'LOCKED' | 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';

function getStatus(a: TutorAssignmentDto): AssignmentStatus {
  if (a.isTermLocked) return 'LOCKED';
  if (a.completionPercentage >= 100) return 'COMPLETE';
  if (a.scoresSubmitted > 0) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

const STATUS_CONFIG: Record<
  AssignmentStatus,
  { label: string; variant: 'danger' | 'success' | 'info' | 'neutral' }
> = {
  LOCKED:      { label: 'Locked',      variant: 'danger' },
  COMPLETE:    { label: 'Complete',    variant: 'success' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  NOT_STARTED: { label: 'Not Started', variant: 'neutral' },
};

const YEAR_GROUP_LABEL: Record<string, string> = {
  SHS1: 'Year 1',
  SHS2: 'Year 2',
  SHS3: 'Year 3',
};

// ── Stat mini-card ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ icon, label, value, sub, color = 'text-primary' }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TutorDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { setSelectedContext } = useTutorStore();

  const { data: assignments = [], isLoading } = useTutorAssignments();

  // Aggregate stats
  const stats = useMemo(() => {
    const totalStudents  = assignments.reduce((s, a) => s + a.studentsCount, 0);
    const totalSubmitted = assignments.reduce((s, a) => s + a.scoresSubmitted, 0);
    const totalRemaining = assignments.reduce((s, a) => s + a.scoresRemaining, 0);
    const totalExpected  = totalStudents;
    const overallPct     = totalExpected > 0 ? (totalSubmitted / totalExpected) * 100 : 0;
    const lockedCount    = assignments.filter((a) => a.isTermLocked).length;
    const allComplete    = assignments.length > 0 && totalRemaining === 0;
    const termLabel      = assignments[0]?.termLabel ?? '—';

    return {
      totalStudents,
      totalSubmitted,
      totalRemaining,
      overallPct,
      lockedCount,
      allComplete,
      termLabel,
    };
  }, [assignments]);

  // Navigate to Score Entry with a pre-selected assignment
  const enterScores = (a: TutorAssignmentDto) => {
    setSelectedContext({
      classRoomId:   a.classRoomId,
      classRoomName: a.className,
      subjectId:     a.subjectId,
      subjectName:   a.subjectName,
      termId:        a.termId,
      termLabel:     a.termLabel,
    });
    navigate(ROUTES.TUTOR_SCORE_ENTRY);
  };

  const fullName   = user ? `${user.firstName} ${user.lastName}` : '';
  const subjects   = user?.assignedSubjects?.join(', ') ?? '';
  const schoolName = user?.schoolName ?? '';

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome header ── */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Welcome, {fullName}</h1>
              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Subject Tutor
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {schoolName && <span>{schoolName}</span>}
              {schoolName && subjects && <span className="text-gray-300">·</span>}
              {subjects && <span>Teaches: {subjects}</span>}
            </div>
          </div>
          <div className="mt-2 text-right sm:mt-0">
            <p className="text-sm font-semibold text-gray-700">{stats.termLabel}</p>
            <p className="text-xs text-gray-400">Current Term</p>
          </div>
        </div>
      </div>

      {/* ── Overall progress summary ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">This Term's Progress</h2>

        {stats.allComplete && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">
              All scores submitted for this term!
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Subjects',    value: assignments.length },
            { label: 'Total Students',    value: stats.totalStudents },
            { label: 'Scores Submitted',  value: stats.totalSubmitted },
            { label: 'Scores Remaining',  value: stats.totalRemaining },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Master progress bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
            <span>Overall Completion</span>
            <span className="font-semibold">{stats.overallPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                stats.overallPct >= 71
                  ? 'bg-green-500'
                  : stats.overallPct >= 31
                  ? 'bg-amber-400'
                  : stats.overallPct > 0
                  ? 'bg-red-400'
                  : 'bg-gray-300'
              )}
              style={{ width: `${stats.overallPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            You have completed {stats.overallPct.toFixed(0)}% of score entry for this term
          </p>
        </div>
      </div>

      {/* ── Quick stats row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Assigned Subjects"
          value={assignments.length}
          sub={`${stats.totalStudents} students total`}
          color="text-primary"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Scores"
          value={stats.totalRemaining}
          sub={stats.totalRemaining === 0 ? 'All caught up!' : 'Scores not yet entered'}
          color={stats.totalRemaining === 0 ? 'text-green-600' : 'text-amber-600'}
        />
        <StatCard
          icon={<Lock className="h-5 w-5" />}
          label="Locked Subjects"
          value={stats.lockedCount}
          sub={stats.lockedCount === 0 ? 'No subjects locked' : 'Score entry disabled'}
          color={stats.lockedCount > 0 ? 'text-red-600' : 'text-gray-400'}
        />
      </div>

      {/* ── Assignment cards ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">My Assignments</h2>
          <span className="text-sm text-gray-400">{assignments.length} subject{assignments.length !== 1 ? 's' : ''}</span>
        </div>

        {assignments.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No assignments found for this term.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => {
            const status  = getStatus(a);
            const config  = STATUS_CONFIG[status];
            const pct     = Math.min(100, a.completionPercentage);
            const yearLbl = YEAR_GROUP_LABEL[a.yearGroup] ?? a.yearGroup;

            return (
              <div
                key={`${a.classRoomId}-${a.subjectId}`}
                className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Card header */}
                <div className="border-b border-gray-100 px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-900 leading-tight">
                        {a.subjectName}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-sm text-gray-600">{a.className}</span>
                        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {yearLbl}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{a.programName}</p>
                    </div>
                    <Badge variant={config.variant} className="shrink-0 text-[10px]">
                      {config.label}
                    </Badge>
                  </div>
                </div>

                {/* Card body */}
                <div className="flex flex-1 items-center gap-5 px-5 py-4">
                  {/* Circular progress */}
                  <CircularProgress
                    pct={pct}
                    submitted={a.scoresSubmitted}
                    total={a.studentsCount}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-600">
                        {a.studentsCount} student{a.studentsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-1 text-sm font-medium',
                        a.scoresRemaining === 0 ? 'text-green-600' : 'text-amber-600'
                      )}
                    >
                      {a.scoresRemaining === 0
                        ? 'All scores entered'
                        : `${a.scoresRemaining} score${a.scoresRemaining !== 1 ? 's' : ''} remaining`}
                    </p>
                  </div>
                </div>

                {/* Card footer */}
                <div className="border-t border-gray-100 px-5 py-3">
                  <button
                    onClick={() => enterScores(a)}
                    disabled={a.isTermLocked}
                    className={cn(
                      'w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      a.isTermLocked
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                        : 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80'
                    )}
                  >
                    {a.isTermLocked ? 'Term Locked' : 'Enter Scores'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom section: Recent Activity + Term Status ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Recent Activity</h2>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No recent activity</p>
            <p className="mt-1 text-xs text-gray-400">
              Your recent score entries will appear here.
            </p>
          </div>
        </div>

        {/* Term status / Upcoming info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Important Dates</h2>

          {assignments.length === 0 ? (
            <p className="text-sm text-gray-400">No term information available.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Current Term
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {stats.termLabel}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Score Entry
                </p>
                {stats.lockedCount === assignments.length && assignments.length > 0 ? (
                  <div className="mt-1 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-red-500" />
                    <p className="text-sm font-semibold text-red-600">All subjects locked</p>
                  </div>
                ) : stats.totalRemaining === 0 ? (
                  <div className="mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-sm font-semibold text-green-600">All complete</p>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm font-semibold text-amber-600">
                      {stats.totalRemaining} scores pending
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Contact admin for term deadline
                    </p>
                  </>
                )}
              </div>

              {/* Per-subject locked status */}
              {assignments.some((a) => a.isTermLocked) && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Locked Subjects
                  </p>
                  <ul className="space-y-1">
                    {assignments
                      .filter((a) => a.isTermLocked)
                      .map((a) => (
                        <li
                          key={`${a.classRoomId}-${a.subjectId}`}
                          className="flex items-center gap-1.5 text-xs text-red-600"
                        >
                          <Lock className="h-3 w-3 shrink-0" />
                          {a.subjectName} — {a.className}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
