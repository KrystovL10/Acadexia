import { useState, useMemo } from 'react';
import {
  CalendarCheck,
  CalendarX,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useMyAttendanceSummary, useMyAttendanceHistory, useMyAllTermResults } from '../../hooks/student';
import { useStudentStore } from '../../store/student.store';

/* ─── Helpers ─── */

function pct(p: number) {
  return Math.round(p);
}

function attendanceColor(percentage: number): { bg: string; text: string; ring: string; label: string; icon: typeof CheckCircle } {
  if (percentage >= 90) return { bg: 'bg-green-50', text: 'text-green-700', ring: '#16a34a', label: 'Excellent', icon: CheckCircle };
  if (percentage >= 75) return { bg: 'bg-amber-50', text: 'text-amber-700', ring: '#d97706', label: 'Good', icon: Info };
  if (percentage >= 60) return { bg: 'bg-orange-50', text: 'text-orange-700', ring: '#ea580c', label: 'Fair', icon: AlertTriangle };
  return { bg: 'bg-red-50', text: 'text-red-700', ring: '#dc2626', label: 'Critical', icon: AlertTriangle };
}

function barColor(percentage: number): string {
  if (percentage >= 90) return '#16a34a';
  if (percentage >= 75) return '#d97706';
  if (percentage >= 60) return '#ea580c';
  return '#dc2626';
}

/* ─── Circular gauge ─── */
function AttendanceGauge({ percentage }: { percentage: number }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circ;
  const color = attendanceColor(percentage);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color.ring}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{pct(percentage)}%</span>
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">present</span>
      </div>
    </div>
  );
}

/* ─── Calendar ─── */
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface CalendarDay {
  date: number;
  month: number;
  year: number;
  status: 'present' | 'absent' | 'weekend' | 'empty';
}

function buildCalendar(year: number, month: number, absentSet: Set<string>): CalendarDay[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push({ date: 0, month, year, status: 'empty' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isWeekend = dow === 0 || dow === 6;
    let status: CalendarDay['status'] = isWeekend ? 'weekend' : 'present';
    if (absentSet.has(key)) status = 'absent';
    days.push({ date: d, month, year, status });
  }
  return days;
}

function MonthCalendar({
  year,
  month,
  absentSet,
}: {
  year: number;
  month: number;
  absentSet: Set<string>;
}) {
  const days = buildCalendar(year, month, absentSet);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-center text-sm font-semibold text-gray-700">
        {MONTH_NAMES[month]} {year}
      </h4>
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day.status === 'empty') {
            return <div key={`e-${i}`} />;
          }
          const base = 'flex h-7 w-7 mx-auto items-center justify-center rounded-full text-xs font-medium transition-colors';
          let cls = '';
          if (day.status === 'absent') cls = `${base} bg-red-100 text-red-700 ring-1 ring-red-300`;
          else if (day.status === 'weekend') cls = `${base} text-gray-300`;
          else cls = `${base} bg-green-50 text-green-700`;
          return (
            <div key={i} className="flex justify-center py-0.5">
              <div className={cls}>{day.date}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-green-100 ring-1 ring-green-300" />
          Present
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-100 ring-1 ring-red-300" />
          Absent
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-100" />
          Weekend
        </span>
      </div>
    </div>
  );
}

/* ─── Custom tooltip for BarChart ─── */
function HistoryTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className={val >= 90 ? 'text-green-600' : val >= 75 ? 'text-amber-600' : 'text-red-600'}>
        {val}% attendance
      </p>
    </div>
  );
}

/* ─── Main Component ─── */

export default function AttendanceView() {
  const { selectedTermId, availableTerms, setSelectedTerm } = useStudentStore();
  const [showAllAbsences, setShowAllAbsences] = useState(false);

  const allTerms = useMyAllTermResults();
  const terms = allTerms.data ?? availableTerms;

  const { data: summary, isLoading: summaryLoading } = useMyAttendanceSummary(selectedTermId);
  const { data: history, isLoading: historyLoading } = useMyAttendanceHistory();

  /* Build absence set for calendar */
  const absentSet = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    summary?.absentDates?.forEach(({ date }) => s.add(date.slice(0, 10)));
    return s;
  }, [summary]);

  /* Derive calendar months from absent dates */
  const calendarMonths = useMemo(() => {
    if (!summary) return [];
    const monthSet = new Set<string>();
    summary.absentDates?.forEach(({ date }) => {
      monthSet.add(date.slice(0, 7)); // YYYY-MM
    });
    // Always show at least current month if no absences
    if (monthSet.size === 0) {
      const now = new Date();
      monthSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(monthSet)
      .sort()
      .map((ym) => {
        const [y, m] = ym.split('-').map(Number);
        return { year: y, month: m - 1 };
      });
  }, [summary]);

  /* History chart data */
  const chartData = useMemo(() => {
    if (!history) return [];
    return history.map((h) => ({
      term: h.termLabel,
      attendance: pct(h.percentage),
    }));
  }, [history]);

  const displayedAbsences = showAllAbsences
    ? (summary?.absentDates ?? [])
    : (summary?.absentDates ?? []).slice(0, 5);

  const statusInfo = summary ? attendanceColor(summary.percentage) : null;

  return (
    <div className="space-y-6 pb-10">
      {/* ─── Page header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-0.5 text-sm text-gray-500">Track your daily attendance record</p>
        </div>

        {/* Term selector */}
        <div className="w-full sm:w-64">
          <select
            value={selectedTermId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const t = terms.find((t) => t.termId === id);
              if (t) setSelectedTerm(t.termId, t.termLabel);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {terms.length === 0 && <option value="">No terms available</option>}
            {terms.map((t) => (
              <option key={t.termId} value={t.termId}>
                {t.termLabel} — {t.yearGroup}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Loading ─── */}
      {summaryLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* ─── No term selected ─── */}
      {!selectedTermId && !summaryLoading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <CalendarCheck className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Select a term to view attendance</p>
        </div>
      )}

      {summary && statusInfo && (
        <>
          {/* ─── Status banner ─── */}
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${statusInfo.bg}`}>
            <statusInfo.icon className={`h-5 w-5 flex-shrink-0 ${statusInfo.text}`} />
            <div>
              <p className={`text-sm font-semibold ${statusInfo.text}`}>
                {statusInfo.label} Attendance — {pct(summary.percentage)}%
              </p>
              <p className={`text-xs ${statusInfo.text} opacity-80`}>
                {summary.percentage >= 90
                  ? 'Great job! Keep maintaining excellent attendance.'
                  : summary.percentage >= 75
                  ? 'Attendance is acceptable but can be improved.'
                  : summary.percentage >= 60
                  ? 'Your attendance is below recommended levels. Please improve.'
                  : 'Critical — you are at risk of not meeting the 60% minimum requirement.'}
              </p>
            </div>
          </div>

          {/* ─── Stat cards ─── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Attendance gauge */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <AttendanceGauge percentage={summary.percentage} />
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Attendance Rate</p>
                <p className={`mt-1 text-sm font-semibold ${statusInfo.text}`}>{statusInfo.label}</p>
              </div>
            </div>

            {/* Days present */}
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CalendarCheck className="h-7 w-7 text-green-700" />
              </div>
              <p className="text-4xl font-bold text-green-700">{summary.totalPresent}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">Days Present</p>
              <p className="text-xs text-green-600 opacity-75">
                out of {summary.totalPresent + summary.totalAbsent} school days
              </p>
            </div>

            {/* Days absent */}
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <CalendarX className="h-7 w-7 text-red-700" />
              </div>
              <p className="text-4xl font-bold text-red-700">{summary.totalAbsent}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">Days Absent</p>
              <p className="text-xs text-red-600 opacity-75">
                {summary.totalAbsent === 0
                  ? 'Perfect record!'
                  : summary.totalAbsent === 1
                  ? '1 missed day'
                  : `${summary.totalAbsent} missed days`}
              </p>
            </div>
          </div>

          {/* ─── Attendance calendar ─── */}
          <div>
            <h2 className="mb-3 text-base font-semibold text-gray-800">Monthly Calendar</h2>
            {calendarMonths.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {calendarMonths.map(({ year, month }) => (
                  <MonthCalendar key={`${year}-${month}`} year={year} month={month} absentSet={absentSet} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
                No calendar data available for this term.
              </div>
            )}
          </div>

          {/* ─── Absence log ─── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CalendarX className="h-4 w-4 text-red-500" />
                <h2 className="text-base font-semibold text-gray-800">Absence Log</h2>
                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {summary.totalAbsent}
                </span>
              </div>
            </div>

            {summary.totalAbsent === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="mb-2 h-8 w-8 text-green-400" />
                <p className="text-sm font-medium text-gray-500">No absences recorded this term</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {displayedAbsences.map(({ date, reason }, i) => {
                  const d = new Date(date);
                  const formatted = d.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                          <CalendarX className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{formatted}</p>
                          {reason && (
                            <p className="text-xs text-gray-400">{reason}</p>
                          )}
                        </div>
                      </div>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        Absent
                      </span>
                    </div>
                  );
                })}

                {summary.totalAbsent > 5 && (
                  <div className="px-5 py-3">
                    <button
                      onClick={() => setShowAllAbsences((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      {showAllAbsences ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Show all {summary.totalAbsent} absences
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Term history chart ─── */}
      {!historyLoading && chartData.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-gray-800">Attendance History</h2>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="term"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<HistoryTooltip />} />
                <ReferenceLine y={90} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1} label={{ value: '90%', fontSize: 10, fill: '#16a34a', position: 'right' }} />
                <ReferenceLine y={75} stroke="#d97706" strokeDasharray="4 4" strokeWidth={1} label={{ value: '75%', fontSize: 10, fill: '#d97706', position: 'right' }} />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={barColor(entry.attendance)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> ≥90% Excellent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> 75–89% Good
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-600" /> 60–74% Fair
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> &lt;60% Critical
            </span>
          </div>
        </div>
      )}

      {historyLoading && (
        <div className="h-52 animate-pulse rounded-2xl bg-gray-100" />
      )}
    </div>
  );
}
