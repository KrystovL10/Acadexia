import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAttendanceSheet } from '../../hooks/teacher';

// ==================== HELPERS ====================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function startOfMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

function endOfMonth(year: number, month: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}


function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface CalendarDay {
  day: number;
  iso: string;
  isWeekend: boolean;
  /** 1=Mon .. 5=Fri */
  weekdayIndex: number;
}

function getWeekdayDays(year: number, month: number): CalendarDay[][] {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const weeks: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay(); // 0=Sun
    if (dow === 0 || dow === 6) continue; // skip weekends

    const weekdayIndex = dow; // 1=Mon..5=Fri

    // Start a new week on Monday
    if (weekdayIndex === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push({
      day: d,
      iso: isoDate(year, month, d),
      isWeekend: false,
      weekdayIndex,
    });
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

// ==================== TYPES ====================

interface AttendanceCalendarProps {
  studentId?: number;
  classRoomId?: number;
  termId: number;
  year: number;
  month: number; // 0-indexed
  onDayClick?: (date: string) => void;
}

type CellStatus = 'present' | 'absent' | 'late' | 'not-marked' | 'no-school';

// ==================== COMPONENT ====================

export function AttendanceCalendar({
  studentId,
  classRoomId: _classRoomId,
  termId,
  year,
  month,
  onDayClick,
}: AttendanceCalendarProps) {
  const [currentYear, setCurrentYear] = useState(year);
  const [currentMonth, setCurrentMonth] = useState(month);

  const start = startOfMonth(currentYear, currentMonth);
  const end = endOfMonth(currentYear, currentMonth);

  const { data: sheet } = useAttendanceSheet(termId, start, end);

  const weeks = useMemo(() => getWeekdayDays(currentYear, currentMonth), [currentYear, currentMonth]);

  // Build lookup: date -> status (or for single student: date -> status)
  const statusMap = useMemo(() => {
    if (!sheet) return new Map<string, CellStatus>();
    const map = new Map<string, CellStatus>();

    for (const date of sheet.dates) {
      if (studentId) {
        // Single student mode
        const val = sheet.attendanceMatrix[studentId]?.[date];
        if (val === undefined) {
          map.set(date, 'not-marked');
        } else if (val === true) {
          // Check late - we treat the boolean matrix as present/absent
          // Late info would need expanded API; for now present = present
          map.set(date, 'present');
        } else {
          map.set(date, 'absent');
        }
      } else {
        // Class mode: show aggregate (marked vs not)
        const hasData = sheet.students.some(
          (s) => sheet.attendanceMatrix[s.id]?.[date] !== undefined
        );
        if (hasData) {
          // Count overall
          const total = sheet.students.length;
          const present = sheet.students.filter(
            (s) => sheet.attendanceMatrix[s.id]?.[date] === true
          ).length;
          const pct = total > 0 ? (present / total) * 100 : 0;
          if (pct >= 90) map.set(date, 'present');
          else if (pct >= 50) map.set(date, 'late');
          else map.set(date, 'absent');
        } else {
          map.set(date, 'not-marked');
        }
      }
    }
    return map;
  }, [sheet, studentId]);

  // Tooltip builder
  function getTooltip(date: string, status: CellStatus) {
    if (studentId && sheet) {
      const student = sheet.students.find((s) => s.id === studentId);
      const name = student?.fullName ?? 'Student';
      const label = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : status === 'late' ? 'Late' : 'Not marked';
      return `${name} - ${date}: ${label}`;
    }
    if (status === 'present') return `${date}: High attendance`;
    if (status === 'absent') return `${date}: Low attendance`;
    if (status === 'late') return `${date}: Moderate attendance`;
    return `${date}: Not marked`;
  }

  function goToPrev() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNext() {
    const now = new Date();
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    // Don't go past current month
    if (nextYear > now.getFullYear() || (nextYear === now.getFullYear() && nextMonth > now.getMonth())) {
      return;
    }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  }

  const statusStyles: Record<CellStatus, string> = {
    present: 'bg-green-500',
    absent: 'bg-red-500',
    late: 'bg-amber-500',
    'not-marked': 'bg-gray-200 border border-dashed border-gray-300',
    'no-school': 'bg-gray-100',
  };

  const now = new Date();
  const isNextDisabled =
    (currentYear === now.getFullYear() && currentMonth >= now.getMonth()) ||
    currentYear > now.getFullYear();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={goToPrev}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={goToNext}
          disabled={isNextDisabled}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            isNextDisabled
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:bg-gray-100'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        {weeks.map((week, wi) => {
          // Pad week to 5 cells
          const cells: (CalendarDay | null)[] = [];
          let nextIdx = 1;
          for (const day of week) {
            while (nextIdx < day.weekdayIndex) {
              cells.push(null);
              nextIdx++;
            }
            cells.push(day);
            nextIdx = day.weekdayIndex + 1;
          }
          while (cells.length < 5) cells.push(null);

          return (
            <div key={wi} className="grid grid-cols-5 gap-1">
              {cells.map((cell, ci) => {
                if (!cell) {
                  return <div key={ci} className="aspect-square" />;
                }
                const status = statusMap.get(cell.iso) ?? 'no-school';
                const tooltip = status !== 'no-school' ? getTooltip(cell.iso, status) : undefined;
                const isClickable = onDayClick && !cell.isWeekend;
                const today = new Date().toISOString().slice(0, 10);

                return (
                  <button
                    key={ci}
                    onClick={() => isClickable && onDayClick(cell.iso)}
                    disabled={!isClickable}
                    title={tooltip}
                    className={cn(
                      'relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors',
                      isClickable && 'hover:ring-2 hover:ring-primary/30 cursor-pointer',
                      !isClickable && 'cursor-default',
                      cell.iso === today && 'ring-2 ring-primary/50'
                    )}
                  >
                    <span className="text-[11px] font-medium text-gray-600 mb-0.5">
                      {cell.day}
                    </span>
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        statusStyles[status]
                      )}
                    />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        {[
          { label: 'Present', color: 'bg-green-500' },
          { label: 'Absent', color: 'bg-red-500' },
          { label: 'Late', color: 'bg-amber-500' },
          { label: 'Not marked', color: 'bg-gray-200 border border-dashed border-gray-300' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', color)} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
