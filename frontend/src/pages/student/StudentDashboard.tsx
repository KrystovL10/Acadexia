import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  CalendarCheck,
  Award,
  AlertTriangle,
  X,
  BarChart2,
  Brain,
  User,
  ChevronRight,
  Download,
  Star,
  Target,
} from 'lucide-react';

import { useAuthStore } from '../../store/auth.store';
import {
  useMyProfile,
  useMyLatestTermResult,
  useMyGpaHistory,
  useMyWarnings,
  useMySubjectPerformance,
  useDownloadTranscript,
} from '../../hooks/student';
import { ROUTES } from '../../router/routes';
import { cn } from '../../lib/utils';
import Card from '../../components/common/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import GradeBadge from '../../components/common/GradeBadge';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function gpaColor(gpa: number): string {
  if (gpa >= 3.6) return 'text-emerald-600';
  if (gpa >= 3.0) return 'text-green-600';
  if (gpa >= 2.0) return 'text-amber-600';
  return 'text-red-600';
}

function gpaRingColor(gpa: number): string {
  if (gpa >= 3.6) return '#10b981';
  if (gpa >= 3.0) return '#16a34a';
  if (gpa >= 2.0) return '#f59e0b';
  return '#dc2626';
}

function gpaClassification(gpa: number): string {
  if (gpa >= 3.6) return 'DISTINCTION';
  if (gpa >= 3.0) return 'VERY GOOD';
  if (gpa >= 2.5) return 'GOOD';
  if (gpa >= 2.0) return 'CREDIT';
  if (gpa >= 1.0) return 'PASS';
  return 'FAIL';
}

function gpaClassificationVariant(gpa: number): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (gpa >= 3.6) return 'success';
  if (gpa >= 2.5) return 'info';
  if (gpa >= 2.0) return 'warning';
  return 'danger';
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}


// ── GPA Ring gauge ────────────────────────────────────────────────────────────

function GpaGauge({ gpa }: { gpa: number }) {
  const pct = Math.min((gpa / 4.0) * 100, 100);
  const color = gpaRingColor(gpa);
  const id = useId();

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      {/* SVG ring */}
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        {/* Fill */}
        <circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 50}`}
          strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {/* Center label */}
      <div className="relative flex flex-col items-center">
        <span className={cn('text-3xl font-black leading-none', gpaColor(gpa))}>
          {gpa.toFixed(2)}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
          GPA
        </span>
      </div>
      {/* Scale marks */}
      {[1, 2, 3, 4].map((mark) => {
        const angle = (mark / 4) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const cx = 50 + 44 * Math.cos(rad);
        const cy = 50 + 44 * Math.sin(rad);
        return (
          <span
            key={mark}
            className="absolute text-[8px] font-bold text-gray-400"
            style={{
              left: `${cx}%`,
              top: `${cy}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {mark}
          </span>
        );
      })}
    </div>
  );
}

// ── Attendance ring ───────────────────────────────────────────────────────────

function AttendanceRing({ pct }: { pct: number }) {
  const color = pct >= 85 ? '#16a34a' : pct >= 75 ? '#f59e0b' : '#dc2626';
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle
          cx="24" cy="24" r="20"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 20}`}
          strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
        />
      </svg>
      <span className="relative text-[10px] font-bold text-gray-700">{Math.round(pct)}%</span>
    </div>
  );
}

// ── Trend arrow ───────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: 'UP' | 'DOWN' | 'STABLE' | 'IMPROVING' | 'DECLINING' }) {
  if (trend === 'UP' || trend === 'IMPROVING')
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'DOWN' || trend === 'DECLINING')
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────

function GpaTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="mb-1 font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value?.toFixed(2)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Score chip ────────────────────────────────────────────────────────────────

const GRADE_CHIP: Record<string, string> = {
  A1: 'bg-green-100 text-green-800 border-green-200',
  A2: 'bg-green-100 text-green-800 border-green-200',
  B2: 'bg-blue-100 text-blue-800 border-blue-200',
  B3: 'bg-blue-100 text-blue-800 border-blue-200',
  C4: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C5: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  C6: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  D7: 'bg-orange-100 text-orange-800 border-orange-200',
  E8: 'bg-red-100 text-red-800 border-red-200',
  F9: 'bg-red-100 text-red-800 border-red-200',
};

function ScoreChip({ subject, grade }: { subject: string; grade: string | null }) {
  if (!grade) return null;
  const cls = GRADE_CHIP[grade.toUpperCase()] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
      {subject}: {grade}
    </span>
  );
}

// ── Quick action card ─────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
        'transition-all duration-150 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: latestResult, isLoading: resultLoading } = useMyLatestTermResult();
  const { data: gpaHistory, isLoading: gpaLoading } = useMyGpaHistory();
  const { data: warnings = [], isLoading: warningsLoading } = useMyWarnings();
  const { data: subjectPerf, isLoading: subjectLoading } = useMySubjectPerformance();
  const downloadTranscript = useDownloadTranscript();

  const firstName = profile?.firstName ?? user?.firstName ?? 'Student';
  const isFirstLogin = user?.isFirstLogin ?? false;
  const showWelcomeBanner = isFirstLogin && !bannerDismissed;

  // Active (unresolved) warnings
  const activeWarnings = warnings.filter((w) => !w.isResolved);

  // GPA chart data — merge termHistory with cgpaProgression
  const chartData = (gpaHistory?.termHistory ?? []).map((t, i) => ({
    term: t.termLabel,
    gpa: t.gpa,
    cgpa: gpaHistory?.cgpaProgression?.[i]?.cgpaAfterThisTerm ?? null,
    position: t.positionInClass,
    total: t.totalStudents,
  }));

  const hasSingleTerm = chartData.length === 1;
  const hasNoTerms = chartData.length === 0;

  // Previous term GPA for comparison
  const termHistory = gpaHistory?.termHistory ?? [];
  const prevGpa = termHistory.length >= 2 ? termHistory[termHistory.length - 2].gpa : null;
  const currentGpa = latestResult?.gpa ?? gpaHistory?.termHistory.at(-1)?.gpa ?? null;
  const gpaDiff = currentGpa != null && prevGpa != null ? currentGpa - prevGpa : null;

  // Stat card: attendance from latest result
  const attendancePct = latestResult?.attendancePercentage ?? null;

  // Subjects this term
  const scores = latestResult?.scores ?? [];
  const passedCount = scores.filter((s) => (s.total ?? 0) >= 50).length;
  const failedCount = scores.length - passedCount;

  const isPageLoading = profileLoading || resultLoading || gpaLoading;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      {showWelcomeBanner && (
        <div className="relative flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <span className="text-xl">🎉</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">
              Welcome to GES Academic System!
            </p>
            <p className="mt-0.5 text-sm text-green-700">
              Your results and academic records will appear here as your teachers submit and publish them.
            </p>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-green-500 hover:text-green-700"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {profileLoading ? (
              <div className="h-8 w-48 animate-pulse rounded-md bg-gray-100" />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {firstName}!
              </h1>
            )}
            {profile?.studentIndex && (
              <p className="mt-0.5 font-mono text-xs text-gray-400">#{profile.studentIndex}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile?.currentYearGroup && profile?.currentClassName && (
                <span className="inline-flex items-center rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                  {profile.currentYearGroup} · {profile.currentClassName}
                </span>
              )}
              {profile?.currentProgramName && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                  {profile.currentProgramName}
                </span>
              )}
              {latestResult?.termLabel && (
                <Badge variant="info">{latestResult.termLabel}</Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:text-right">
            {currentGpa != null && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Term GPA</p>
                <p className={cn('text-2xl font-black', gpaColor(currentGpa))}>
                  {currentGpa.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isPageLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className="text-primary" />
        </div>
      )}

      {!isPageLoading && (
        <>
          {/* ── Hero GPA Card ─────────────────────────────────────────────── */}
          {currentGpa != null ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

                {/* Left: GPA info */}
                <div className="flex flex-col justify-center px-6 py-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Current Term GPA
                  </p>
                  <div className="mt-2 flex items-end gap-3">
                    <span className={cn('text-6xl font-black leading-none', gpaColor(currentGpa))}>
                      {currentGpa.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Badge variant={gpaClassificationVariant(currentGpa)}>
                      {gpaClassification(currentGpa)}
                    </Badge>
                  </div>
                  {latestResult?.termLabel && (
                    <p className="mt-2 text-xs text-gray-500">{latestResult.termLabel}</p>
                  )}
                  {gpaDiff != null && (
                    <div className="mt-3 flex items-center gap-1.5">
                      {gpaDiff > 0
                        ? <TrendingUp className="h-4 w-4 text-green-500" />
                        : gpaDiff < 0
                        ? <TrendingDown className="h-4 w-4 text-red-500" />
                        : <Minus className="h-4 w-4 text-gray-400" />}
                      <p className="text-xs text-gray-500">
                        Was <strong>{prevGpa?.toFixed(2)}</strong> last term{' '}
                        <span className={cn(
                          'font-semibold',
                          gpaDiff > 0 ? 'text-green-600' : gpaDiff < 0 ? 'text-red-600' : 'text-gray-500'
                        )}>
                          ({gpaDiff > 0 ? '+' : ''}{gpaDiff.toFixed(2)})
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Center: Gauge */}
                <div className="flex items-center justify-center py-6">
                  <GpaGauge gpa={currentGpa} />
                </div>

                {/* Right: Position */}
                <div className="flex flex-col justify-center px-6 py-6">
                  {latestResult?.positionInClass != null ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Class Position
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {latestResult.positionInClass <= 3 && (
                          <Trophy className="h-6 w-6 text-amber-500" />
                        )}
                        <span className="text-4xl font-black text-gray-900">
                          #{latestResult.positionInClass}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        out of {latestResult.totalStudentsInClass} students
                      </p>
                      {latestResult.totalStudentsInClass > 0 && (
                        <p className="mt-1 text-xs text-gray-400">
                          Top{' '}
                          {Math.ceil(
                            (latestResult.positionInClass / latestResult.totalStudentsInClass) * 100
                          )}
                          %
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Position not yet ranked</p>
                  )}

                  {/* Previous term trend */}
                  {termHistory.length >= 2 && (
                    <div className="mt-4 flex items-center gap-1.5">
                      <TrendIcon trend={termHistory.at(-1)!.trend} />
                      <span className="text-xs text-gray-500">
                        {termHistory.at(-1)!.trend === 'UP'
                          ? 'Improving trend'
                          : termHistory.at(-1)!.trend === 'DOWN'
                          ? 'Declining trend'
                          : 'Stable performance'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* No results yet placeholder */
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-6 py-10 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-amber-400" />
              <p className="font-semibold text-amber-800">Your term results will appear here</p>
              <p className="mt-1 text-sm text-amber-600">
                Once your class teacher generates reports, your GPA and scores will show here.
              </p>
              <div className="mt-3">
                <Badge variant="warning">Results Pending</Badge>
              </div>
            </div>
          )}

          {/* ── Stat Cards ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

            {/* CGPA */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">CGPA</p>
                <Award className="h-4 w-4 text-primary/50" />
              </div>
              {gpaHistory?.currentCgpa != null ? (
                <>
                  <p className={cn('mt-2 text-3xl font-black', gpaColor(gpaHistory.currentCgpa))}>
                    {gpaHistory.currentCgpa.toFixed(2)}
                  </p>
                  <div className="mt-1">
                    <Badge variant={gpaClassificationVariant(gpaHistory.currentCgpa)} className="text-[10px]">
                      {gpaHistory.currentClassification || gpaClassification(gpaHistory.currentCgpa)}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Across {gpaHistory.termHistory.length} term{gpaHistory.termHistory.length !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-2xl font-bold text-gray-300">—</p>
              )}
            </div>

            {/* Subjects */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Subjects</p>
                <BookOpen className="h-4 w-4 text-primary/50" />
              </div>
              {scores.length > 0 ? (
                <>
                  <p className="mt-2 text-3xl font-black text-gray-900">
                    {passedCount}
                    <span className="text-base font-semibold text-gray-400">/{scores.length}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Passed this term</p>
                  <div className="mt-2 flex gap-3">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      {passedCount} passed
                    </span>
                    {failedCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {failedCount} failed
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-2xl font-bold text-gray-300">—</p>
              )}
            </div>

            {/* Attendance */}
            <div
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => navigate(ROUTES.STUDENT_ATTENDANCE)}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Attendance</p>
                <CalendarCheck className="h-4 w-4 text-primary/50" />
              </div>
              {attendancePct != null ? (
                <>
                  <div className="mt-2 flex items-center gap-3">
                    <AttendanceRing pct={attendancePct} />
                    <div>
                      <p className="text-2xl font-black text-gray-900">{attendancePct.toFixed(0)}%</p>
                      {attendancePct < 75 && (
                        <Badge variant="warning" className="mt-1 text-[10px]">Below 75%</Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {latestResult?.totalDaysPresent}d present · {latestResult?.totalDaysAbsent}d absent
                  </p>
                  <p className="mt-1.5 text-[10px] font-medium text-primary">
                    View details →
                  </p>
                </>
              ) : (
                <p className="mt-3 text-2xl font-bold text-gray-300">—</p>
              )}
            </div>

            {/* Class Position */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Position</p>
                <Target className="h-4 w-4 text-primary/50" />
              </div>
              {latestResult?.positionInClass != null ? (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    {latestResult.positionInClass <= 3 && (
                      <Trophy className="h-5 w-5 text-amber-500" />
                    )}
                    <p className="text-3xl font-black text-gray-900">
                      #{latestResult.positionInClass}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    out of {latestResult.totalStudentsInClass}
                  </p>
                  {latestResult.totalStudentsInClass > 0 && (
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Top {Math.ceil((latestResult.positionInClass / latestResult.totalStudentsInClass) * 100)}%
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-2xl font-bold text-gray-300">—</p>
              )}
            </div>
          </div>

          {/* ── GPA Progression Chart ──────────────────────────────────────── */}
          <Card
            title="My Academic Journey"
            subtitle="GPA progression across all terms"
          >
            {gpaLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" className="text-primary" />
              </div>
            ) : hasNoTerms ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="mb-3 h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-500">No term data yet.</p>
                <p className="mt-1 text-xs text-gray-400">Your GPA trend will appear here once results are published.</p>
              </div>
            ) : hasSingleTerm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <span className={cn('text-2xl font-black', gpaColor(chartData[0].gpa))}>
                        {chartData[0].gpa.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{chartData[0].term}</p>
                    <p className="mt-1 text-xs text-gray-400">More terms will show your GPA trend over time</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B6B3A" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1B6B3A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="term"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 4]}
                      ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<GpaTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <ReferenceLine
                      y={2.0}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{ value: 'Min Pass', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
                    />
                    <ReferenceLine
                      y={3.6}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: 'Distinction', position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gpa"
                      name="Term GPA"
                      stroke="#1B6B3A"
                      strokeWidth={2.5}
                      fill="url(#gpaGradient)"
                      dot={{ r: 5, fill: '#1B6B3A', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cgpa"
                      name="Cumulative GPA"
                      stroke="#FCD116"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 4, fill: '#FCD116', strokeWidth: 2, stroke: '#fff' }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* ── Subject Performance ────────────────────────────────────────── */}
          {!subjectLoading && subjectPerf && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* Strengths */}
              <Card title="Your Strengths 💪">
                {subjectPerf.strongestSubjects.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No data yet</p>
                ) : (
                  <ul className="space-y-4">
                    {subjectPerf.strongestSubjects.slice(0, 3).map((s) => (
                      <li key={s.subjectName}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">{s.subjectName}</span>
                          <div className="flex items-center gap-1.5">
                            <TrendIcon trend={s.trend} />
                            <GradeBadge grade={s.bestGrade} />
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all duration-700"
                            style={{ width: `${Math.min(s.averageScore, 100)}%` }}
                          />
                        </div>
                        <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
                          <span>Avg: {s.averageScore.toFixed(1)}</span>
                          <span>Best: {s.bestScore}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Focus areas */}
              <Card title="Focus Areas 📚">
                {subjectPerf.weakestSubjects.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No data yet</p>
                ) : (
                  <ul className="space-y-4">
                    {subjectPerf.weakestSubjects.slice(0, 3).map((s) => (
                      <li key={s.subjectName}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-medium text-gray-800">{s.subjectName}</span>
                            <span className="ml-2 text-[10px] text-amber-600 font-medium">Needs attention</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendIcon trend={s.trend} />
                            <GradeBadge grade={s.latestGrade} />
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all duration-700',
                              s.averageScore >= 50 ? 'bg-amber-400' : 'bg-red-400'
                            )}
                            style={{ width: `${Math.min(s.averageScore, 100)}%` }}
                          />
                        </div>
                        <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
                          <span>Avg: {s.averageScore.toFixed(1)}</span>
                          <span>Worst: {s.worstScore}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}

          {/* ── Recent Results ─────────────────────────────────────────────── */}
          <Card
            title="Recent Term Results"
            action={
              latestResult?.isGenerated && (
                <button
                  onClick={() => navigate(ROUTES.STUDENT_RESULTS)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View Full Results <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )
            }
          >
            {latestResult?.isGenerated ? (
              <div className="space-y-4">
                {/* Term label + stats */}
                <div className="flex flex-wrap items-center gap-3">
                  {latestResult.termLabel && (
                    <Badge variant="neutral">{latestResult.termLabel}</Badge>
                  )}
                  {latestResult.gpa != null && (
                    <span className="text-sm font-semibold text-gray-700">
                      GPA: <span className={gpaColor(latestResult.gpa)}>{latestResult.gpa.toFixed(2)}</span>
                    </span>
                  )}
                  {latestResult.positionInClass != null && (
                    <span className="text-sm text-gray-500">
                      Position: <strong className="text-gray-700">{ordinal(latestResult.positionInClass)}</strong>
                    </span>
                  )}
                </div>
                {/* Score chips */}
                <div className="flex flex-wrap gap-1.5">
                  {latestResult.scores.slice(0, 10).map((s) => (
                    <ScoreChip key={s.subjectName} subject={s.subjectName} grade={s.grade} />
                  ))}
                  {latestResult.scores.length > 10 && (
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] text-gray-500">
                      +{latestResult.scores.length - 10} more
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigate(ROUTES.STUDENT_RESULTS)}
                  className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  View full results <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="py-6 text-center">
                <Star className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                <p className="text-sm font-medium text-gray-600">Results not yet published</p>
                <p className="mt-1 text-xs text-gray-400">
                  Check back soon — your class teacher will publish your results shortly.
                </p>
              </div>
            )}
          </Card>

          {/* ── My Conduct ─────────────────────────────────────────────────── */}
          {latestResult?.conductRating && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-primary/60" />
                <h3 className="text-sm font-semibold text-gray-800">My Conduct</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/8">
                  <span className="text-lg font-bold text-primary">
                    {latestResult.conductRating.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">{latestResult.conductRating}</p>
                  <p className="text-xs text-gray-500">
                    Based on attendance, behavior logs, and class participation
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Active Warnings ────────────────────────────────────────────── */}
          {!warningsLoading && activeWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-amber-900">Academic Alert</h3>
                  {activeWarnings.map((w) => (
                    <div key={w.id} className="rounded-lg border border-amber-200 bg-white/70 px-4 py-3">
                      <p className="text-sm text-amber-800">
                        {w.warningType === 'ATTENDANCE'
                          ? 'Your attendance has dropped below 75% this term. Try to attend all classes to stay on track.'
                          : w.warningType === 'ACADEMIC'
                          ? 'You may need extra support in some subjects this term. Consider asking your teachers for help.'
                          : w.description}
                      </p>
                      {w.suggestedAction && (
                        <p className="mt-1 text-xs text-amber-600 italic">{w.suggestedAction}</p>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => navigate(ROUTES.STUDENT_PROFILE)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-50 transition-colors"
                  >
                    Talk to your class teacher
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Quick Actions ──────────────────────────────────────────────── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickAction
                icon={BarChart2}
                label="View Results"
                onClick={() => navigate(ROUTES.STUDENT_RESULTS)}
              />
              <QuickAction
                icon={Download}
                label={downloadTranscript.isPending ? 'Downloading…' : 'Download Transcript'}
                onClick={() => downloadTranscript.mutate()}
              />
              <QuickAction
                icon={Brain}
                label="Study Assistant"
                onClick={() => navigate(ROUTES.STUDENT_AI)}
              />
              <QuickAction
                icon={User}
                label="My Profile"
                onClick={() => navigate(ROUTES.STUDENT_PROFILE)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
