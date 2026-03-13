import { useState, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
  Cell,
} from 'recharts';
import {
  AlertTriangle, Star, Users, TrendingUp, Download,
  ChevronDown, Shield, Award, Check, X, Clock,
} from 'lucide-react';
import { useSchoolAttendanceStats, useAdminOverrideAttendance } from '../../hooks/admin';
import { useSchoolStore } from '../../store/school.store';
import type {
  SchoolAttendanceStatsDto, ClassAttendanceDto,
  StudentAttendanceRankDto,
} from '../../types/attendance.types';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { cn } from '../../lib/utils';
import { colors } from '../../lib/theme';

// ==================== HELPERS ====================

function riskColor(pct: number) {
  if (pct >= 90) return { text: 'text-green-600', bg: 'bg-green-500', label: 'Excellent' };
  if (pct >= 75) return { text: 'text-teal-600', bg: 'bg-teal-500', label: 'Good' };
  if (pct >= 65) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'At Risk' };
  return { text: 'text-red-600', bg: 'bg-red-500', label: 'Critical' };
}

function barColor(pct: number) {
  if (pct >= 90) return colors.success;
  if (pct >= 75) return '#0D9488';
  if (pct >= 65) return colors.warning;
  return colors.danger;
}

function formatShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
}

// ==================== CONIC GAUGE ====================

function ConicGauge({ value, size = 120 }: { value: number; size?: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const rc = riskColor(clampedValue);
  const angle = (clampedValue / 100) * 360;

  return (
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${
          clampedValue >= 90 ? colors.success
            : clampedValue >= 75 ? '#0D9488'
              : clampedValue >= 65 ? colors.warning : colors.danger
        } ${angle}deg, #F3F4F6 ${angle}deg)`,
      }}
    >
      <div
        className="rounded-full bg-white flex items-center justify-center"
        style={{ width: size - 20, height: size - 20 }}
      >
        <span className={cn('text-2xl font-bold', rc.text)}>
          {clampedValue.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ==================== STAT CARDS ====================

function StatCards({
  stats,
  onAtRiskClick,
}: {
  stats: SchoolAttendanceStatsDto;
  onAtRiskClick: () => void;
}) {
  const atRiskCount = stats.students65to75 + stats.studentsBelow65;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Overall Attendance Rate */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center">
        <ConicGauge value={stats.overallAvgAttendance} size={110} />
        <p className="mt-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Overall Attendance
        </p>
      </div>

      {/* Above 90% */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <span className="text-3xl font-bold text-green-600">{stats.studentsAbove90}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {stats.totalStudents > 0
            ? `${((stats.studentsAbove90 / stats.totalStudents) * 100).toFixed(0)}% of school`
            : '—'}
        </p>
        <p className="mt-1 text-[10px] font-medium text-green-600 uppercase tracking-wide">
          Excellent Attendance
        </p>
      </div>

      {/* At Risk */}
      <button
        onClick={onAtRiskClick}
        className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center justify-center text-left hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('h-5 w-5', atRiskCount > 0 ? 'text-amber-500' : 'text-gray-300')} />
          <span className={cn('text-3xl font-bold', atRiskCount > 0 ? 'text-amber-600' : 'text-gray-300')}>
            {atRiskCount}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{'< 75% attendance'}</p>
        <p className="mt-1 text-[10px] font-medium text-amber-600 uppercase tracking-wide">
          Require Attention
        </p>
      </button>

      {/* Perfect Attendance */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <span className="text-3xl font-bold text-amber-600">
            {(stats.perfectAttendanceStudents ?? []).length}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">100% attendance</p>
        <p className="mt-1 text-[10px] font-medium text-amber-600 uppercase tracking-wide">
          Heroes of the Term
        </p>
      </div>
    </div>
  );
}

// ==================== DAILY TREND CHART ====================

function DailyTrendChart({
  data,
  termLabel,
}: {
  data: SchoolAttendanceStatsDto['dailyTrend'];
  termLabel: string;
}) {
  // Filter out weekends
  const weekdayData = data.filter((d) => {
    const day = new Date(d.date + 'T00:00:00').getDay();
    return day !== 0 && day !== 6;
  });

  const chartData = weekdayData.map((d) => ({
    ...d,
    dateLabel: formatShortDate(d.date),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        Daily Attendance Trend — {termLabel}
      </h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No trend data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.success} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as (typeof chartData)[0];
                return (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs">
                    <p className="font-semibold text-gray-800">{d.dateLabel}</p>
                    <p className="text-green-600">Present: {d.presentCount}</p>
                    <p className="text-red-600">Absent: {d.absentCount}</p>
                    <p className="font-bold text-gray-700">Rate: {d.attendanceRate.toFixed(1)}%</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={75} stroke={colors.warning} strokeDasharray="5 5" label={{ value: '75% min', position: 'insideTopRight', fontSize: 10, fill: colors.warning }} />
            <Area
              type="monotone"
              dataKey="attendanceRate"
              stroke={colors.success}
              fill="url(#attendanceGrad)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: colors.success }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ==================== CLASS COMPARISON CHART ====================

function ClassComparisonChart({
  classes,
  onClassClick,
}: {
  classes: ClassAttendanceDto[];
  onClassClick: (classId: number) => void;
}) {
  // Sort worst to best
  const sorted = [...classes].sort((a, b) => a.avgAttendance - b.avgAttendance);
  const chartData = sorted.map((c) => ({
    ...c,
    fill: barColor(c.avgAttendance),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Attendance by Class</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No class data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="className" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as ClassAttendanceDto;
                return (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs">
                    <p className="font-semibold text-gray-800">{d.className}</p>
                    <p>Year: {d.yearGroup}</p>
                    <p>Attendance: {d.avgAttendance.toFixed(1)}%</p>
                    <p>At Risk: {d.studentsAtRisk} students</p>
                    <p>Total: {d.totalStudents} students</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={75} stroke={colors.warning} strokeDasharray="5 5" />
            <Bar
              dataKey="avgAttendance"
              name="Attendance %"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(data) => onClassClick((data as unknown as ClassAttendanceDto).classId)}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ==================== YEAR GROUP BREAKDOWN ====================

function YearGroupBreakdown({
  stats,
}: {
  stats: SchoolAttendanceStatsDto;
}) {
  const groups = stats.yearGroupBreakdown ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {groups.map((yg) => {
        const rc = riskColor(yg.avgAttendance);
        return (
          <div key={yg.yearGroup} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="info">{yg.yearGroup}</Badge>
              <span className={cn('text-2xl font-bold', rc.text)}>
                {yg.avgAttendance.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {yg.totalStudents} students
              </span>
              {yg.studentsAtRisk > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {yg.studentsAtRisk} at risk
                </span>
              )}
            </div>

            {/* Mini stacked bars for classes */}
            <div className="space-y-2">
              {(yg.classes ?? []).slice(0, 5).map((cls) => {
                const crc = riskColor(cls.avgAttendance);
                return (
                  <div key={cls.classId}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-gray-600 font-medium truncate">{cls.className}</span>
                      <span className={cn('font-bold', crc.text)}>
                        {cls.avgAttendance.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', crc.bg)}
                        style={{ width: `${Math.min(cls.avgAttendance, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {groups.length === 0 && (
        <div className="col-span-3 rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          No year group data available
        </div>
      )}
    </div>
  );
}

// ==================== AT-RISK STUDENTS TABLE ====================

type RiskTab = 'critical' | 'at-risk' | 'all';

function AtRiskSection({
  stats,
  onOverride,
}: {
  stats: SchoolAttendanceStatsDto;
  onOverride: (student: StudentAttendanceRankDto) => void;
}) {
  const [tab, setTab] = useState<RiskTab>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allAtRisk = (stats.mostAbsentStudents ?? []).filter((s) => s.attendancePercentage < 75);
  const filtered = useMemo(() => {
    switch (tab) {
      case 'critical': return allAtRisk.filter((s) => s.attendancePercentage < 65);
      case 'at-risk': return allAtRisk.filter((s) => s.attendancePercentage >= 65 && s.attendancePercentage < 75);
      default: return allAtRisk;
    }
  }, [allAtRisk, tab]);

  const criticalCount = allAtRisk.filter((s) => s.attendancePercentage < 65).length;
  const atRiskCount = allAtRisk.filter((s) => s.attendancePercentage >= 65).length;

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.studentId)));
  }

  return (
    <div className="space-y-4" id="at-risk-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">Students Requiring Attention</h3>
          <Badge variant="danger">{allAtRisk.length}</Badge>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary font-medium">{selected.size} selected</span>
            <Button size="sm" variant="primary">
              <AlertTriangle className="h-3.5 w-3.5" />
              Generate Warnings for Selected
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {([
          { key: 'critical' as RiskTab, label: `Critical (<65%)`, count: criticalCount },
          { key: 'at-risk' as RiskTab, label: `At Risk (65-74%)`, count: atRiskCount },
          { key: 'all' as RiskTab, label: `All Below 75%`, count: allAtRisk.length },
        ]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <Shield className="mx-auto mb-2 h-8 w-8 text-green-300" />
          <p className="text-sm text-gray-500">No students in this category</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2.5 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Class</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Year</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Present</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Absent</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-32">Attendance %</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Risk</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => {
                const rc = riskColor(s.attendancePercentage);
                return (
                  <tr key={s.studentId} className="hover:bg-gray-50/50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.studentId)}
                        onChange={() => toggleSelect(s.studentId)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                          {s.studentName.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800">{s.studentName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{s.studentIndex}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{s.className}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant="neutral">{s.yearGroup}</Badge>
                    </td>
                    <td className="px-3 py-3 text-center text-green-600 font-medium">{s.daysPresent}</td>
                    <td className="px-3 py-3 text-center text-red-600 font-medium">{s.daysAbsent}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', rc.bg)}
                            style={{ width: `${Math.min(s.attendancePercentage, 100)}%` }}
                          />
                        </div>
                        <span className={cn('text-xs font-bold w-10 text-right', rc.text)}>
                          {s.attendancePercentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={s.attendancePercentage < 65 ? 'danger' : 'warning'}>
                        {rc.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOverride(s)}
                          className="text-[10px] text-primary font-medium hover:underline"
                        >
                          View Record
                        </button>
                        <span className="text-gray-300 mx-0.5">|</span>
                        <button className="text-[10px] text-amber-600 font-medium hover:underline">
                          Create Warning
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== PERFECT ATTENDANCE SECTION ====================

function PerfectAttendanceSection({
  students,
}: {
  students: StudentAttendanceRankDto[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-800">Perfect Attendance Stars</h3>
          <Badge variant="success">{students.length}</Badge>
        </div>
        <Button size="sm" variant="outline" disabled>
          <Award className="h-3.5 w-3.5" />
          Generate Certificates
          <Badge variant="neutral" className="ml-1 text-[9px]">Soon</Badge>
        </Button>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <Star className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No students with 100% attendance yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {students.map((s) => (
            <div
              key={s.studentId}
              className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 flex items-center gap-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 uppercase">
                {s.studentName.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{s.studentName}</p>
                <p className="text-xs text-gray-500">{s.className}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    100% Attendance
                  </span>
                  <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-600 border border-green-200">
                    Certificate
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== ADMIN OVERRIDE MODAL ====================

const OVERRIDE_REASONS = [
  'Medical documentation provided',
  'Administrative error',
  'School event',
  'Excused absence',
  'Late arrival reclassification',
  'Other',
];

function OverrideModal({
  student,
  onClose,
}: {
  student: StudentAttendanceRankDto;
  onClose: () => void;
}) {
  const override = useAdminOverrideAttendance();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [newStatus, setNewStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT');
  const [reason, setReason] = useState(OVERRIDE_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [note, setNote] = useState('');

  const effectiveReason = reason === 'Other' ? customReason : reason;
  const canSubmit = effectiveReason.trim() && note.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    override.mutate(
      {
        studentId: student.studentId,
        date,
        newStatus,
        reason: effectiveReason.trim(),
        overrideNote: note.trim(),
      },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Override Attendance Record"
      description={`${student.studentName} — ${student.className}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Student info */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
            {student.studentName.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-800">{student.studentName}</p>
            <p className="text-xs text-gray-500">{student.studentIndex} · {student.className}</p>
          </div>
          <div className="ml-auto text-right">
            <p className={cn('text-sm font-bold', riskColor(student.attendancePercentage).text)}>
              {student.attendancePercentage.toFixed(1)}%
            </p>
            <p className="text-[10px] text-gray-400">Current attendance</p>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* New status */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">New Status</label>
          <div className="flex gap-2">
            {([
              { value: 'PRESENT' as const, label: 'Present', icon: Check, active: 'bg-green-100 text-green-700 border-green-300 ring-1 ring-green-300' },
              { value: 'ABSENT' as const, label: 'Absent', icon: X, active: 'bg-red-100 text-red-700 border-red-300 ring-1 ring-red-300' },
              { value: 'LATE' as const, label: 'Late', icon: Clock, active: 'bg-amber-100 text-amber-700 border-amber-300 ring-1 ring-amber-300' },
            ]).map(({ value, label, icon: Icon, active }) => (
              <button
                key={value}
                onClick={() => setNewStatus(value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors',
                  newStatus === value ? active : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
          <div className="relative">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-primary focus:outline-none"
            >
              {OVERRIDE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {reason === 'Other' && (
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Specify reason..."
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>

        {/* Override note */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Override Note *</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain why this record is being changed..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-[10px] text-gray-400">This note will be logged with your admin ID for auditing purposes.</p>
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
            loading={override.isPending}
            disabled={!canSubmit}
          >
            <Shield className="h-4 w-4" />
            Apply Override
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== MAIN PAGE ====================

export default function AttendanceDashboard() {
  const { schoolId, schoolName, currentTermId, currentTermLabel } = useSchoolStore();
  const termId = currentTermId;

  const { data: stats, isLoading } = useSchoolAttendanceStats(
    schoolId ?? 0,
    termId ?? 0
  );

  const [overrideStudent, setOverrideStudent] = useState<StudentAttendanceRankDto | null>(null);
  const [filterClassId, setFilterClassId] = useState<number | null>(null);
  const atRiskRef = useRef<HTMLDivElement>(null);

  function scrollToAtRisk() {
    atRiskRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!schoolId || !termId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance Overview" subtitle={schoolName ?? 'School'} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-700">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            No active term configured. Set up a current term in Academic Structure.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Attendance Overview"
        subtitle={`${schoolName ?? 'School'} · School-wide attendance analytics`}
        action={
          <div className="flex items-center gap-2">
            {schoolName && <Badge variant="info">{schoolName}</Badge>}
            {currentTermLabel && (
              <Badge variant="neutral">{currentTermLabel}</Badge>
            )}
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : !stats ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No attendance data available for this term.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <StatCards stats={stats} onAtRiskClick={scrollToAtRisk} />

          {/* Trend Chart */}
          <DailyTrendChart data={stats.dailyTrend ?? []} termLabel={stats.termLabel} />

          {/* Class Comparison */}
          <ClassComparisonChart
            classes={stats.classBreakdown ?? []}
            onClassClick={(id) => setFilterClassId(id === filterClassId ? null : id)}
          />

          {/* Year Group Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Year Group Breakdown</h3>
            <YearGroupBreakdown stats={stats} />
          </div>

          {/* At Risk Students */}
          <div ref={atRiskRef}>
            <AtRiskSection stats={stats} onOverride={setOverrideStudent} />
          </div>

          {/* Perfect Attendance */}
          <PerfectAttendanceSection students={stats.perfectAttendanceStudents ?? []} />
        </>
      )}

      {/* Override Modal */}
      {overrideStudent && (
        <OverrideModal
          student={overrideStudent}
          onClose={() => setOverrideStudent(null)}
        />
      )}
    </div>
  );
}
