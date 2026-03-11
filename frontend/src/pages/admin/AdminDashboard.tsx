import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users, TrendingUp, CheckCircle, AlertTriangle,
  RefreshCw, ChevronRight, Trophy, Crown,
  UserPlus, GraduationCap, FileBarChart, Settings, UserCog,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

import Card from '../../components/common/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';

import { useAdminDashboardStats, useTermComparisonData, useGradeDistribution, useClassPerformance } from '../../hooks/admin/useStats';
import { useWarningSummary } from '../../hooks/admin/useWarnings';
import { usePowerRankings } from '../../hooks/admin/useRankings';
import { useSchoolStore } from '../../store/school.store';
import { useAuthStore } from '../../store/auth.store';
import { ROUTES } from '../../router/routes';
import { colors } from '../../lib/theme';
import { cn } from '../../lib/utils';

// ==================== GRADE COLORS ====================

const GRADE_COLORS: Record<string, string> = {
  A1: '#166534', A2: '#16a34a',
  B2: '#1e40af', B3: '#3b82f6',
  C4: '#d97706', C5: '#f59e0b', C6: '#fbbf24',
  D7: '#ea580c', E8: '#dc2626', F9: '#991b1b',
};

const RANK_STYLES = [
  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '1st' },
  { bg: 'bg-gray-100', text: 'text-gray-600', label: '2nd' },
  { bg: 'bg-orange-100', text: 'text-orange-700', label: '3rd' },
];

// ==================== SKELETON ====================

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-6 w-16 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-64 rounded bg-gray-200" />
      </div>
      <div className="p-6">
        <div className="rounded bg-gray-100" style={{ height }} />
      </div>
    </div>
  );
}

// ==================== GREETING ====================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ==================== EMPTY STATE ====================

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16">
      <div className="rounded-full bg-gray-100 p-4">
        <TrendingUp className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">No results recorded yet</h3>
      <p className="mt-1 text-sm text-gray-500">Set up your academic structure to start tracking performance.</p>
      <button
        onClick={() => navigate(ROUTES.ADMIN_ACADEMIC_YEAR)}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
      >
        Set Up Academic Year
      </button>
    </div>
  );
}

// ==================== GPA COLOR ====================

function gpaColor(gpa: number | null | undefined): string {
  if (gpa == null) return 'text-gray-500';
  if (gpa >= 3.0) return 'text-green-600';
  if (gpa >= 2.0) return 'text-amber-600';
  return 'text-red-600';
}

function gpaBgColor(gpa: number | null | undefined): string {
  if (gpa == null) return 'bg-gray-100 text-gray-600';
  if (gpa >= 3.0) return 'bg-green-100 text-green-700';
  if (gpa >= 2.0) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

// ==================== CUSTOM TOOLTIP ====================

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-sm font-medium text-gray-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value?.toFixed(2)}</span>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { percentage?: number } }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-medium text-gray-900">{item.name}</p>
      <p className="text-sm text-gray-600">
        Count: <span className="font-semibold">{item.value}</span>
      </p>
      {item.payload.percentage != null && (
        <p className="text-sm text-gray-600">
          {item.payload.percentage.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// ==================== WARNING LEVEL CONFIG ====================

const WARNING_LEVEL_CONFIG = {
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', variant: 'danger' as const },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', variant: 'warning' as const },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', variant: 'warning' as const },
  LOW: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', variant: 'info' as const },
};

// ==================== MAIN COMPONENT ====================

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { schoolId, currentTermId, currentTermLabel, currentAcademicYearLabel } = useSchoolStore();
  const { user } = useAuthStore();

  const sid = schoolId ?? 0;
  const tid = currentTermId ?? 0;

  const statsQuery = useAdminDashboardStats(sid, tid);
  const termCompQuery = useTermComparisonData(sid);
  const gradeDistQuery = useGradeDistribution(sid, tid);
  const classPerformanceQuery = useClassPerformance(sid, tid);
  const warningQuery = useWarningSummary(sid, tid);
  const rankingsQuery = usePowerRankings(sid, tid);

  const stats = statsQuery.data;
  const warnings = warningQuery.data;
  const rankings = rankingsQuery.data;
  const isLoading = statsQuery.isLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['term-comparison'] });
    queryClient.invalidateQueries({ queryKey: ['grade-distribution'] });
    queryClient.invalidateQueries({ queryKey: ['class-performance'] });
    queryClient.invalidateQueries({ queryKey: ['warnings'] });
    queryClient.invalidateQueries({ queryKey: ['power-rankings'] });
  };

  // No context set
  if (!schoolId || !currentTermId) {
    return (
      <div className="space-y-6">
        <PageGreeting name={user?.firstName ?? 'Admin'} />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.firstName ?? 'Admin'}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {currentTermLabel && currentAcademicYearLabel && (
              <Badge variant="success">
                {currentTermLabel} — {currentAcademicYearLabel}
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </button>
      </div>

      {/* QUICK ACTIONS */}
      <QuickActionsPanel />

      {/* STAT CARDS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Total Students */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-50 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents?.toLocaleString() ?? '—'}</p>
                <p className="text-xs text-gray-400">Active students enrolled</p>
              </div>
            </div>
          </div>

          {/* School Average GPA */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-50 p-3">
                <TrendingUp className={cn('h-6 w-6', gpaColor(stats?.averageSchoolGpa))} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500">School Average GPA</p>
                <p className={cn('text-2xl font-bold', gpaColor(stats?.averageSchoolGpa))}>
                  {stats?.averageSchoolGpa?.toFixed(2) ?? '—'}
                </p>
                <p className="text-xs text-gray-400">Out of 4.00</p>
              </div>
            </div>
          </div>

          {/* Pass Rate */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-emerald-50 p-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.passRate != null ? `${stats.passRate.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-gray-400">Students above C6</p>
                {stats?.passRate != null && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(stats.passRate, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Warnings */}
          <button
            onClick={() => navigate(ROUTES.ADMIN_WARNINGS)}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-left hover:border-red-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-50 p-3 group-hover:bg-red-100 transition-colors">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500">Active Warnings</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeWarnings ?? '—'}</p>
                <p className="text-xs text-gray-400">Students at risk</p>
                {warnings && (
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="font-medium text-red-600">{warnings.criticalCount}</span> critical
                    {' · '}
                    <span className="font-medium text-orange-600">{warnings.highCount}</span> high
                    {' · '}
                    <span className="font-medium text-amber-600">{warnings.mediumCount}</span> medium
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* TERM PERFORMANCE COMPARISON */}
      {termCompQuery.isLoading ? (
        <SkeletonChart height={350} />
      ) : termCompQuery.data && termCompQuery.data.length > 0 ? (
        <Card
          title="Term Performance Comparison"
          subtitle="Average GPA by year group across terms"
        >
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={termCompQuery.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="termLabel" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} tickCount={5} />
              <Tooltip content={<BarTooltip />} />
              <Legend />
              <Bar dataKey="shs1Avg" name="SHS 1" fill={colors.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="shs2Avg" name="SHS 2" fill={colors.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="shs3Avg" name="SHS 3" fill={colors.primaryDark} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      ) : null}

      {/* TWO-COLUMN: Grade Distribution + Class Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grade Distribution Pie Chart */}
        {gradeDistQuery.isLoading ? (
          <SkeletonChart height={320} />
        ) : gradeDistQuery.data && gradeDistQuery.data.length > 0 ? (
          <Card title="Grade Distribution This Term">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={gradeDistQuery.data.map((d) => ({ name: d.grade, value: d.count, percentage: d.percentage }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {gradeDistQuery.data.map((entry) => (
                        <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2">
                <div className="space-y-1.5">
                  {gradeDistQuery.data.map((d) => (
                    <div key={d.grade} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: GRADE_COLORS[d.grade] ?? '#94a3b8' }}
                        />
                        <span className="font-medium text-gray-700">{d.grade}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <span>{d.count}</span>
                        <span className="w-12 text-right">{d.percentage?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Grade Distribution This Term">
            <p className="py-8 text-center text-sm text-gray-400">No grade data available yet.</p>
          </Card>
        )}

        {/* Class Performance Ranking Table */}
        {classPerformanceQuery.isLoading ? (
          <SkeletonChart height={320} />
        ) : classPerformanceQuery.data && classPerformanceQuery.data.length > 0 ? (
          <Card
            title="Class Performance Ranking"
            subtitle="Ranked by average GPA this term"
          >
            <div className="max-h-[340px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="pb-2 pr-2">#</th>
                    <th className="pb-2 pr-2">Class</th>
                    <th className="pb-2 pr-2 text-right">Avg GPA</th>
                    <th className="pb-2 pr-2 text-right">Students</th>
                    <th className="pb-2 text-right">Pass Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classPerformanceQuery.data.map((cls, idx) => (
                    <tr key={cls.className} className="text-sm hover:bg-gray-50">
                      <td className="py-2.5 pr-2">
                        {idx < 3 ? (
                          <span className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                            RANK_STYLES[idx].bg,
                            RANK_STYLES[idx].text,
                          )}>
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="pl-1.5 text-gray-400">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-2 font-medium text-gray-900">{cls.className}</td>
                      <td className="py-2.5 pr-2 text-right">
                        <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', gpaBgColor(cls.avgGpa))}>
                          {cls.avgGpa?.toFixed(2) ?? '—'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-right text-gray-600">{cls.studentCount}</td>
                      <td className="py-2.5 text-right text-gray-600">
                        {cls.passRate != null ? `${cls.passRate.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card title="Class Performance Ranking">
            <p className="py-8 text-center text-sm text-gray-400">No class performance data yet.</p>
          </Card>
        )}
      </div>

      {/* BOTTOM: Warnings + Top Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Early Warnings Panel */}
        {warningQuery.isLoading ? (
          <SkeletonChart height={300} />
        ) : (
          <Card
            title="Early Warnings"
            action={
              warnings ? (
                <Badge variant={warnings.unresolvedCount > 0 ? 'danger' : 'success'}>
                  {warnings.unresolvedCount} unresolved
                </Badge>
              ) : null
            }
          >
            {warnings && (warnings.criticalCount > 0 || warnings.highCount > 0 || warnings.mediumCount > 0 || warnings.lowCount > 0) ? (
              <>
                {/* Level summary row */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {(
                    [
                      ['CRITICAL', warnings.criticalCount],
                      ['HIGH', warnings.highCount],
                      ['MEDIUM', warnings.mediumCount],
                      ['LOW', warnings.lowCount],
                    ] as const
                  ).map(([level, count]) => {
                    const cfg = WARNING_LEVEL_CONFIG[level];
                    return (
                      <div key={level} className={cn('rounded-lg border px-3 py-1.5', cfg.bg, cfg.border)}>
                        <span className={cn('text-xs font-bold', cfg.text)}>{count}</span>
                        <span className={cn('ml-1 text-xs', cfg.text)}>{level}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Critical students list */}
                {warnings.criticalStudents && warnings.criticalStudents.length > 0 ? (
                  <div className="space-y-2">
                    {warnings.criticalStudents.slice(0, 5).map((w) => {
                      const cfg = WARNING_LEVEL_CONFIG[w.warningLevel as keyof typeof WARNING_LEVEL_CONFIG] ?? WARNING_LEVEL_CONFIG.MEDIUM;
                      return (
                        <div key={w.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{w.studentName}</p>
                            <p className="text-xs text-gray-500">{w.studentClassName ?? 'N/A'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cfg.variant}>{w.warningLevel}</Badge>
                            <button
                              onClick={() => navigate(ROUTES.ADMIN_WARNINGS)}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-400">No critical warnings.</p>
                )}

                <button
                  onClick={() => navigate(ROUTES.ADMIN_WARNINGS)}
                  className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  View All Warnings
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-8">
                <CheckCircle className="h-10 w-10 text-green-400" />
                <p className="mt-2 text-sm text-gray-500">No active warnings this term.</p>
              </div>
            )}
          </Card>
        )}

        {/* Top Performing Students */}
        {rankingsQuery.isLoading ? (
          <SkeletonChart height={300} />
        ) : (
          <Card
            title="Top Students This Term"
            action={
              <button
                onClick={() => navigate(ROUTES.ADMIN_RANKINGS)}
                className="text-sm font-medium text-primary hover:underline"
              >
                View Full Rankings
              </button>
            }
          >
            {rankings?.topTenStudents && rankings.topTenStudents.length > 0 ? (
              <div className="space-y-2">
                {rankings.topTenStudents.slice(0, 5).map((student, idx) => (
                  <div key={student.studentId} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      {idx < 3 ? (
                        <span className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                          RANK_STYLES[idx].bg,
                          RANK_STYLES[idx].text,
                        )}>
                          {idx === 0 && <Crown className="h-4 w-4" />}
                          {idx === 1 && <Trophy className="h-3.5 w-3.5" />}
                          {idx === 2 && <Trophy className="h-3.5 w-3.5" />}
                        </span>
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-xs font-semibold text-gray-500">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar + Name */}
                    <Avatar
                      src={student.profilePhotoUrl ?? undefined}
                      fallback={student.fullName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{student.fullName}</p>
                      <p className="text-xs text-gray-500">{student.className}</p>
                    </div>

                    {/* GPA + Program */}
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{student.programName}</Badge>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', gpaBgColor(student.gpa))}>
                        {student.gpa.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Trophy className="h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No ranking data available yet.</p>
              </div>
            )}
          </Card>
        )}

      </div>
    </div>
  );
}

// ==================== QUICK ACTIONS ====================

const QUICK_ACTIONS = [
  {
    icon: UserPlus,
    label: 'Enroll Student',
    description: 'Add a new student',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    route: ROUTES.ADMIN_STUDENTS,
  },
  {
    icon: UserCog,
    label: 'Add Staff',
    description: 'Add a teacher or tutor',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    route: ROUTES.ADMIN_TEACHERS,
  },
  {
    icon: GraduationCap,
    label: 'New Class',
    description: 'Create a new class',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    route: ROUTES.ADMIN_CLASSES,
  },
  {
    icon: FileBarChart,
    label: 'View Reports',
    description: 'Generate report cards',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    route: ROUTES.ADMIN_REPORTS,
  },
] as const;

function QuickActionsPanel() {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Quick Actions</h3>
        <p className="mt-0.5 text-sm text-gray-500">Frequently used actions and shortcuts</p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {QUICK_ACTIONS.map(({ icon: Icon, label, description, bg, iconColor, route }) => (
          <button
            key={label}
            onClick={() => navigate(route)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl p-4 text-center',
              'transition-all duration-150 hover:brightness-95 active:scale-95',
              bg,
            )}
          >
            <Icon className={cn('h-6 w-6', iconColor)} />
            <div>
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{description}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate(ROUTES.ADMIN_SETTINGS)}
        className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Settings className="h-3.5 w-3.5" />
        Customize quick actions
      </button>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function PageGreeting({ name }: { name: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {getGreeting()}, {name}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
