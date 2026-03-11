import { useState, useMemo } from 'react';
import {
  CalendarDays, Check, X, Clock, Users,
  ChevronLeft, ChevronRight, AlertTriangle, BarChart3,
} from 'lucide-react';
import {
  useClassStudents,
  useMarkAttendance,
  useAttendanceSummary,
  useAttendanceSheet,
} from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import type { AttendanceEntry } from '../../types/teacher.types';
import type { StudentSummaryDto } from '../../types/admin.types';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Spinner from '../../components/ui/Spinner';
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

function attendanceColor(pct: number) {
  if (pct >= 90) return 'text-green-600 bg-green-50';
  if (pct >= 75) return 'text-blue-600 bg-blue-50';
  if (pct >= 60) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

// ==================== MARK ATTENDANCE TAB ====================

function MarkAttendanceTab({
  students,
  classRoomId,
  termId,
}: {
  students: StudentSummaryDto[];
  classRoomId: number;
  termId: number;
}) {
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState<Record<number, { isPresent: boolean; isLate: boolean }>>(() => {
    const init: Record<number, { isPresent: boolean; isLate: boolean }> = {};
    for (const s of students) {
      init[s.id] = { isPresent: true, isLate: false };
    }
    return init;
  });
  const [submitted, setSubmitted] = useState(false);

  const markAttendance = useMarkAttendance();

  // Reset entries when students change
  useMemo(() => {
    const init: Record<number, { isPresent: boolean; isLate: boolean }> = {};
    for (const s of students) {
      init[s.id] = entries[s.id] ?? { isPresent: true, isLate: false };
    }
    setEntries(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length]);

  function togglePresent(studentId: number) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isPresent: !prev[studentId].isPresent,
        isLate: !prev[studentId].isPresent ? prev[studentId].isLate : false,
      },
    }));
    setSubmitted(false);
  }

  function toggleLate(studentId: number) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isLate: !prev[studentId].isLate,
      },
    }));
    setSubmitted(false);
  }

  function markAllPresent() {
    const init: Record<number, { isPresent: boolean; isLate: boolean }> = {};
    for (const s of students) init[s.id] = { isPresent: true, isLate: false };
    setEntries(init);
    setSubmitted(false);
  }

  function markAllAbsent() {
    const init: Record<number, { isPresent: boolean; isLate: boolean }> = {};
    for (const s of students) init[s.id] = { isPresent: false, isLate: false };
    setEntries(init);
    setSubmitted(false);
  }

  function handleSubmit() {
    const attendanceEntries: AttendanceEntry[] = students.map((s) => ({
      studentId: s.id,
      isPresent: entries[s.id]?.isPresent ?? true,
      isLate: entries[s.id]?.isLate ?? false,
    }));

    markAttendance.mutate(
      { classRoomId, termId, date, entries: attendanceEntries },
      { onSuccess: () => setSubmitted(true) }
    );
  }

  const presentCount = Object.values(entries).filter((e) => e.isPresent).length;
  const absentCount = students.length - presentCount;
  const lateCount = Object.values(entries).filter((e) => e.isPresent && e.isLate).length;

  return (
    <div className="space-y-4">
      {/* Date picker + quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => { setDate(e.target.value); setSubmitted(false); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <p className="text-sm text-gray-500">{formatDateLong(date)}</p>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={markAllPresent}>All Present</Button>
          <Button size="sm" variant="ghost" onClick={markAllAbsent}>All Absent</Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <Check className="h-3.5 w-3.5" />
          {presentCount} Present
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
          <X className="h-3.5 w-3.5" />
          {absentCount} Absent
        </div>
        {lateCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            {lateCount} Late
          </div>
        )}
      </div>

      {/* Student list */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 rounded-t-xl">
          <span>Student</span>
          <span className="w-20 text-center">Status</span>
          <span className="w-16 text-center">Late</span>
        </div>

        {students.map((s) => {
          const entry = entries[s.id] ?? { isPresent: true, isLate: false };
          return (
            <div
              key={s.id}
              className={cn(
                'grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 transition-colors',
                !entry.isPresent && 'bg-red-50/30'
              )}
            >
              {/* Student info */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                  {s.fullName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{s.fullName}</p>
                  <p className="font-mono text-xs text-gray-400">{s.studentIndex}</p>
                </div>
              </div>

              {/* Present/Absent toggle */}
              <button
                onClick={() => togglePresent(s.id)}
                className={cn(
                  'flex w-20 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  entry.isPresent
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                )}
              >
                {entry.isPresent ? (
                  <><Check className="h-3.5 w-3.5" /> Present</>
                ) : (
                  <><X className="h-3.5 w-3.5" /> Absent</>
                )}
              </button>

              {/* Late toggle */}
              <button
                onClick={() => toggleLate(s.id)}
                disabled={!entry.isPresent}
                className={cn(
                  'flex w-16 items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  !entry.isPresent && 'opacity-30 cursor-not-allowed',
                  entry.isLate
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        {submitted && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <Check className="h-4 w-4" />
            Attendance saved for {formatDate(date)}
          </div>
        )}
        <Button
          variant="primary"
          size="lg"
          className="ml-auto"
          onClick={handleSubmit}
          loading={markAttendance.isPending}
          disabled={students.length === 0}
        >
          <CalendarDays className="h-5 w-5" />
          Save Attendance ({presentCount}/{students.length} present)
        </Button>
      </div>
    </div>
  );
}

// ==================== SUMMARY TAB ====================

function SummaryTab({ termId }: { termId?: number }) {
  const { data: summaries, isLoading } = useAttendanceSummary(termId);

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

  const sorted = [...summaries].sort((a, b) => a.percentage - b.percentage);
  const avgPct = summaries.reduce((s, r) => s + r.percentage, 0) / summaries.length;
  const below75 = summaries.filter((s) => s.percentage < 75).length;

  return (
    <div className="space-y-4">
      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{summaries.length}</p>
          <p className="mt-1 text-xs text-gray-500">Students Tracked</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className={cn('text-2xl font-bold', attendanceColor(avgPct).split(' ')[0])}>
            {avgPct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-gray-500">Average Attendance</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {summaries.filter((s) => s.percentage >= 90).length}
          </p>
          <p className="mt-1 text-xs text-gray-500">Excellent (90%+)</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className={cn('text-2xl font-bold', below75 > 0 ? 'text-red-600' : 'text-gray-300')}>
            {below75}
          </p>
          <p className="mt-1 text-xs text-gray-500">Below 75%</p>
        </div>
      </div>

      {below75 > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{below75} student{below75 > 1 ? 's have' : ' has'} attendance below 75%. This may trigger early warnings.</span>
        </div>
      )}

      {/* Student rows */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 rounded-t-xl">
          <span>Student</span>
          <span className="w-16 text-center">Present</span>
          <span className="w-16 text-center">Absent</span>
          <span className="w-24 text-center">Rate</span>
        </div>
        {sorted.map((s) => (
          <div key={s.studentId} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                {s.studentName.charAt(0)}
              </span>
              <p className="truncate text-sm font-medium text-gray-800">{s.studentName}</p>
            </div>
            <span className="w-16 text-center text-sm text-green-600 font-medium">{s.totalPresent}</span>
            <span className="w-16 text-center text-sm text-red-600 font-medium">{s.totalAbsent}</span>
            <div className="w-24 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    s.percentage >= 90 ? 'bg-green-500' :
                    s.percentage >= 75 ? 'bg-blue-500' :
                    s.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(s.percentage, 100)}%` }}
                />
              </div>
              <span className={cn('text-xs font-bold w-10 text-right', attendanceColor(s.percentage).split(' ')[0])}>
                {s.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SHEET TAB ====================

function SheetTab({ termId }: { termId?: number }) {
  const [week, setWeek] = useState(() => getWeekRange(todayISO()));

  const { data: sheet, isLoading } = useAttendanceSheet(termId, week.start, week.end);

  const weekLabel = `${formatDate(week.start)} — ${formatDate(week.end)}`;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" className="text-primary" />
      </div>
    );
  }

  const dates = sheet?.dates ?? [];
  const students = sheet?.students ?? [];
  const matrix = sheet?.attendanceMatrix ?? {};

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
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  Student
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap"
                  >
                    {formatDate(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                        {s.fullName.charAt(0)}
                      </span>
                      <span className="truncate text-sm font-medium text-gray-800">{s.fullName}</span>
                    </div>
                  </td>
                  {dates.map((d) => {
                    const val = matrix[s.id]?.[d];
                    return (
                      <td key={d} className="px-3 py-2.5 text-center">
                        {val === undefined ? (
                          <span className="text-gray-300">—</span>
                        ) : val ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN PAGE ====================

type Tab = 'mark' | 'summary' | 'sheet';

export default function Attendance() {
  const teacherStore = useTeacherStore();
  const { currentTermId: schoolTermId } = useSchoolStore();
  const termId = teacherStore.currentTermId ?? schoolTermId;
  const classRoomId = teacherStore.classRoomId;

  const { data: students = [], isLoading: loadingStudents } = useClassStudents();
  const [activeTab, setActiveTab] = useState<Tab>('mark');

  const tabs: { key: Tab; label: string; icon: typeof CalendarDays }[] = [
    { key: 'mark', label: 'Mark Attendance', icon: CalendarDays },
    { key: 'summary', label: 'Summary', icon: BarChart3 },
    { key: 'sheet', label: 'Attendance Sheet', icon: Users },
  ];

  if (!termId || !classRoomId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance"
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
      <PageHeader
        title="Attendance"
        subtitle={`${teacherStore.classRoomName ?? 'Your class'} · ${students.length} students`}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loadingStudents ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : (
        <>
          {activeTab === 'mark' && (
            <MarkAttendanceTab
              students={students}
              classRoomId={classRoomId}
              termId={termId}
            />
          )}
          {activeTab === 'summary' && <SummaryTab termId={termId} />}
          {activeTab === 'sheet' && <SheetTab termId={termId} />}
        </>
      )}
    </div>
  );
}
