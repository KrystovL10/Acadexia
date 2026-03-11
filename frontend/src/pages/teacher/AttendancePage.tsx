import { useState, useMemo } from 'react';
import {
  CalendarDays, Check, X, Users,
  ChevronLeft, ChevronRight, AlertTriangle,
  Star, Grid3X3, List, Sparkles,
  TrendingUp, Info, Send, Filter,
} from 'lucide-react';
import {
  useClassStudents,
  useAttendanceSummary,
  useAttendanceSheet,
} from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import AttendanceMarkingModal from '../../components/teacher/AttendanceMarkingModal';
import { AttendanceCalendar } from '../../components/teacher/AttendanceCalendar';
import { cn } from '../../lib/utils';

// ==================== HELPERS ====================

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateLong(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getWeekRange(date: string) {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    start: monday.toISOString().slice(0, 10),
    end: friday.toISOString().slice(0, 10),
  };
}

function shiftWeek(start: string, direction: number) {
  const d = new Date(start + 'T00:00:00');
  d.setDate(d.getDate() + direction * 7);
  return getWeekRange(d.toISOString().slice(0, 10));
}

function riskLevel(pct: number) {
  if (pct >= 90) return { label: 'EXCELLENT', color: 'success' as const };
  if (pct >= 75) return { label: 'GOOD', color: 'info' as const };
  if (pct >= 65) return { label: 'AT RISK', color: 'warning' as const };
  return { label: 'CRITICAL', color: 'danger' as const };
}

function attendanceBarColor(pct: number) {
  if (pct >= 90) return 'bg-green-500';
  if (pct >= 75) return 'bg-teal-500';
  if (pct >= 65) return 'bg-amber-500';
  return 'bg-red-500';
}

// ==================== CIRCULAR GAUGE ====================

function CircularGauge({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const color =
    value >= 90 ? '#16A34A' :
    value >= 75 ? '#0D9488' :
    value >= 65 ? '#F59E0B' : '#DC2626';

  return (
    <svg width={size} height={size} className="block">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#F3F4F6"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm font-bold"
        fill={color}
      >
        {value.toFixed(0)}%
      </text>
    </svg>
  );
}

// ==================== STAT CARDS ====================

type FilterMode = 'all' | 'at-risk' | 'critical' | 'perfect';

function OverviewStats({
  summaries,
  todayMarked,
  presentToday,
  absentToday,
  onFilter,
  activeFilter,
  onMarkNow,
}: {
  summaries: { percentage: number }[];
  todayMarked: boolean;
  presentToday: number;
  absentToday: number;
  onFilter: (f: FilterMode) => void;
  activeFilter: FilterMode;
  onMarkNow: () => void;
}) {
  const avgPct = summaries.length > 0
    ? summaries.reduce((s, r) => s + r.percentage, 0) / summaries.length
    : 0;
  const perfectCount = summaries.filter((s) => s.percentage === 100).length;
  const atRiskCount = summaries.filter((s) => s.percentage < 75).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Card 1: Average Attendance */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col items-center">
        <CircularGauge value={avgPct} />
        <p className="mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Class Avg. Attendance
        </p>
      </div>

      {/* Card 2: Perfect Attendance */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-green-500" />
          <span className="text-3xl font-bold text-green-600">{perfectCount}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">Students</p>
        <button
          onClick={() => onFilter(activeFilter === 'perfect' ? 'all' : 'perfect')}
          className={cn(
            'mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors',
            activeFilter === 'perfect'
              ? 'bg-green-100 text-green-700'
              : 'text-green-600 hover:bg-green-50'
          )}
        >
          Perfect Attendance
        </button>
      </div>

      {/* Card 3: At Risk */}
      <button
        onClick={() => onFilter(activeFilter === 'at-risk' ? 'all' : 'at-risk')}
        className={cn(
          'rounded-xl border p-4 flex flex-col items-center justify-center transition-colors text-left',
          activeFilter === 'at-risk'
            ? 'border-amber-300 bg-amber-50'
            : 'border-gray-200 bg-white hover:border-amber-200'
        )}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('h-5 w-5', atRiskCount > 0 ? 'text-amber-500' : 'text-gray-300')} />
          <span className={cn('text-3xl font-bold', atRiskCount > 0 ? 'text-amber-600' : 'text-gray-300')}>
            {atRiskCount}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">Need attention</p>
        <span className="mt-1 text-[10px] text-amber-600 font-medium">{'< 75% Attendance'}</span>
      </button>

      {/* Card 4: Today's Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col items-center justify-center">
        {todayMarked ? (
          <>
            <div className="flex items-center gap-1.5 text-green-600">
              <Check className="h-5 w-5" />
              <span className="text-sm font-semibold">Marked</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-green-600 font-medium">{presentToday} present</span>
              <span className="text-red-600 font-medium">{absentToday} absent</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-red-500">
              <X className="h-5 w-5" />
              <span className="text-sm font-semibold">Not Marked</span>
            </div>
            <Button size="sm" variant="primary" className="mt-2" onClick={onMarkNow}>
              Mark Now
            </Button>
          </>
        )}
        <p className="mt-1 text-[10px] text-gray-400 uppercase tracking-wide">Today's Status</p>
      </div>
    </div>
  );
}

// ==================== SUMMARY TABLE ====================

function SummaryTable({
  termId,
  termLabel,
  filter,
  onFilter,
  onViewCalendar,
}: {
  termId: number;
  termLabel: string;
  filter: FilterMode;
  onFilter: (f: FilterMode) => void;
  onViewCalendar: (studentId: number) => void;
}) {
  const { data: summaries, isLoading } = useAttendanceSummary(termId);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    if (!summaries) return [];
    let list = [...summaries];
    if (filter === 'at-risk') list = list.filter((s) => s.percentage < 75);
    else if (filter === 'critical') list = list.filter((s) => s.percentage < 65);
    else if (filter === 'perfect') list = list.filter((s) => s.percentage === 100);
    return list.sort((a, b) => a.percentage - b.percentage);
  }, [summaries, filter]);

  function toggleSelect(id: number) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedStudents.size === filtered.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filtered.map((s) => s.studentId)));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" className="text-primary" />
      </div>
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
        <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No attendance records for this term yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title & filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Student Attendance Summary — {termLabel}
        </h3>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          {(['all', 'at-risk', 'critical', 'perfect'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilter(f)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors capitalize',
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {f === 'all' ? 'All' : f === 'at-risk' ? 'At Risk' : f === 'critical' ? 'Critical' : 'Perfect'}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedStudents.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5">
          <span className="text-xs font-medium text-primary">{selectedStudents.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setSelectedStudents(new Set())}>
            Clear
          </Button>
          <Button size="sm" variant="primary">
            <Send className="h-3.5 w-3.5" />
            Send Warning
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2.5 text-left w-8">
                <input
                  type="checkbox"
                  checked={selectedStudents.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Student
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Days Present
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Days Absent
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Late
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-36">
                Attendance %
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                Risk Level
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((s) => {
              const risk = riskLevel(s.percentage);
              const lateArrivals = 0; // API doesn't provide late count in summary — placeholder
              return (
                <tr key={s.studentId} className="hover:bg-gray-50/50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(s.studentId)}
                      onChange={() => toggleSelect(s.studentId)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                        {s.studentName.charAt(0)}
                      </span>
                      <span className="truncate font-medium text-gray-800">{s.studentName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-green-600">
                    {s.totalPresent}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-red-600">
                    {s.totalAbsent}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-amber-600">
                    {lateArrivals}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', attendanceBarColor(s.percentage))}
                          style={{ width: `${Math.min(s.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right text-gray-700">
                        {s.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant={risk.color}>{risk.label}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewCalendar(s.studentId)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View Calendar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== SHEET MATRIX ====================

function SheetMatrix({ termId }: { termId: number }) {
  const [week, setWeek] = useState(() => getWeekRange(todayISO()));
  const { data: sheet, isLoading } = useAttendanceSheet(termId, week.start, week.end);

  const weekLabel = `${formatDate(week.start)} — ${formatDate(week.end)}`;
  const dates = sheet?.dates ?? [];
  const students = sheet?.students ?? [];
  const matrix = sheet?.attendanceMatrix ?? {};

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setWeek(shiftWeek(week.start, -1))}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <p className="text-sm font-medium text-gray-700">{weekLabel}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setWeek(shiftWeek(week.start, 1))}
          disabled={week.end >= todayISO()}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {dates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <CalendarDays className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No attendance data for this week.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-r border-gray-200 min-w-[180px]">
                  Student
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap"
                  >
                    <div className="text-[10px] text-gray-400">
                      {new Date(d + 'T00:00:00').toLocaleDateString('en-GH', { weekday: 'short' })}
                    </div>
                    <div>{new Date(d + 'T00:00:00').getDate()}</div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-l border-gray-200">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => {
                const presentCount = dates.filter((d) => matrix[s.id]?.[d] === true).length;
                const absentCount = dates.filter((d) => matrix[s.id]?.[d] === false).length;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                          {s.fullName.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <span className="truncate text-sm font-medium text-gray-800 block">{s.fullName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{s.studentIndex}</span>
                        </div>
                      </div>
                    </td>
                    {dates.map((d) => {
                      const val = matrix[s.id]?.[d];
                      return (
                        <td key={d} className="px-3 py-2.5 text-center">
                          {val === undefined ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300">
                              <span className="h-2 w-2 rounded-full bg-gray-200" />
                            </span>
                          ) : val ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            </span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center border-l border-gray-100">
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <span className="text-green-600 font-medium">{presentCount}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-red-600 font-medium">{absentCount}</span>
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

// ==================== AI CORRELATION MODAL ====================

function CorrelationModal({
  isOpen,
  onClose,
  termId: _termId,
}: {
  isOpen: boolean;
  onClose: () => void;
  termId: number;
}) {
  // Placeholder — this would call GET /api/teacher/attendance/correlation?termId=
  // For now show a meaningful placeholder UI
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Attendance-Performance Correlation"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <Badge variant="info">ANALYSIS</Badge>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            AI-powered attendance-performance correlation analysis requires sufficient
            attendance and score data. Once enough data is available, this section will
            display correlation insights, at-risk student cards, and intervention suggestions.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">What this analysis covers:</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Correlation strength between attendance and academic performance</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span>At-risk students with low attendance impacting their GPA</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>AI-generated intervention suggestions and class recommendations</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== STUDENT CALENDAR MODAL ====================

function StudentCalendarModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  termId,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
  termId: number;
}) {
  const now = new Date();
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Attendance Calendar — ${studentName}`}
      size="lg"
    >
      <AttendanceCalendar
        studentId={studentId}
        termId={termId}
        year={now.getFullYear()}
        month={now.getMonth()}
      />
    </Modal>
  );
}

// ==================== MAIN PAGE ====================

type ViewMode = 'summary' | 'matrix';

export default function AttendancePage() {
  const teacherStore = useTeacherStore();
  const { currentTermId: schoolTermId } = useSchoolStore();
  const termId = teacherStore.currentTermId ?? schoolTermId;
  const classRoomId = teacherStore.classRoomId;
  const termLabel = teacherStore.currentTermLabel ?? 'Current Term';

  const { data: students = [], isLoading: loadingStudents } = useClassStudents();
  const { data: summaries = [] } = useAttendanceSummary(termId ?? undefined);

  // Check if today is marked via sheet
  const todayDate = todayISO();
  const { data: todaySheet } = useAttendanceSheet(termId ?? undefined, todayDate, todayDate);
  const todayMarked = useMemo(() => {
    if (!todaySheet?.dates?.length) return false;
    return todaySheet.dates.includes(todayDate) &&
      todaySheet.students.some(
        (s) => todaySheet.attendanceMatrix[s.id]?.[todayDate] !== undefined
      );
  }, [todaySheet, todayDate]);

  const presentToday = useMemo(() => {
    if (!todaySheet || !todayMarked) return 0;
    return todaySheet.students.filter(
      (s) => todaySheet.attendanceMatrix[s.id]?.[todayDate] === true
    ).length;
  }, [todaySheet, todayMarked, todayDate]);

  const absentToday = useMemo(() => {
    if (!todaySheet || !todayMarked) return 0;
    return todaySheet.students.filter(
      (s) => todaySheet.attendanceMatrix[s.id]?.[todayDate] === false
    ).length;
  }, [todaySheet, todayMarked, todayDate]);

  // UI state
  const [markingOpen, setMarkingOpen] = useState(false);
  const [markingDate, setMarkingDate] = useState<string | undefined>();
  const [correlationOpen, setCorrelationOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [calendarStudent, setCalendarStudent] = useState<{
    id: number;
    name: string;
  } | null>(null);

  function openMarking(date?: string) {
    setMarkingDate(date);
    setMarkingOpen(true);
  }

  if (!termId || !classRoomId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance Management"
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
      {/* Page header */}
      <PageHeader
        title="Attendance Management"
        subtitle={`${teacherStore.classRoomName ?? 'Your class'} · ${students.length} students`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCorrelationOpen(true)}>
              <Sparkles className="h-4 w-4" />
              View Correlation Analysis
            </Button>
            <Button variant="primary" onClick={() => openMarking()}>
              <CalendarDays className="h-4 w-4" />
              Mark Today's Attendance
            </Button>
          </div>
        }
      />

      {/* Class chip + term */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">{teacherStore.classRoomName}</Badge>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs font-medium text-gray-600">{termLabel}</span>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs text-gray-500">{formatDateLong(todayDate)}</span>
      </div>

      {loadingStudents ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <OverviewStats
            summaries={summaries}
            todayMarked={todayMarked}
            presentToday={presentToday}
            absentToday={absentToday}
            onFilter={setFilter}
            activeFilter={filter}
            onMarkNow={() => openMarking()}
          />

          {/* View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setViewMode('summary')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'summary'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <List className="h-3.5 w-3.5" />
                Summary View
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'matrix'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                Calendar Matrix View
              </button>
            </div>
          </div>

          {/* Content */}
          {viewMode === 'summary' ? (
            <SummaryTable
              termId={termId}
              termLabel={termLabel}
              filter={filter}
              onFilter={setFilter}
              onViewCalendar={(id) => {
                const student = summaries.find((s) => s.studentId === id);
                if (student) {
                  setCalendarStudent({ id, name: student.studentName });
                }
              }}
            />
          ) : (
            <SheetMatrix termId={termId} />
          )}
        </>
      )}

      {/* Modals */}
      <AttendanceMarkingModal
        isOpen={markingOpen}
        onClose={() => setMarkingOpen(false)}
        defaultDate={markingDate}
        classRoomId={classRoomId}
        termId={termId}
      />

      <CorrelationModal
        isOpen={correlationOpen}
        onClose={() => setCorrelationOpen(false)}
        termId={termId}
      />

      {calendarStudent && (
        <StudentCalendarModal
          isOpen={!!calendarStudent}
          onClose={() => setCalendarStudent(null)}
          studentId={calendarStudent.id}
          studentName={calendarStudent.name}
          termId={termId}
        />
      )}
    </div>
  );
}
