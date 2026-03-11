import { useState, useMemo, useEffect } from 'react';
import {
  Check, X, Clock, Search, RotateCcw, AlertTriangle, Info,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../common/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { cn } from '../../lib/utils';
import { useClassStudents, useMarkAttendance, useAttendanceSheet } from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import type { AttendanceEntry } from '../../types/teacher.types';

// ==================== HELPERS ====================

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLong(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type Status = 'present' | 'absent' | 'late' | null;

interface EntryState {
  status: Status;
  reason: string;
}

const QUICK_REASONS = ['Illness', 'Family Event', 'No reason', 'Travel'];

// ==================== PROPS ====================

interface AttendanceMarkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  classRoomId: number;
  termId: number;
}

// ==================== COMPONENT ====================

export default function AttendanceMarkingModal({
  isOpen,
  onClose,
  defaultDate,
  classRoomId,
  termId,
}: AttendanceMarkingModalProps) {
  const { classRoomName } = useTeacherStore();
  const { data: students = [], isLoading: loadingStudents } = useClassStudents();
  const markAttendance = useMarkAttendance();

  const [date, setDate] = useState(defaultDate ?? todayISO());
  const [entries, setEntries] = useState<Record<number, EntryState>>({});
  const [search, setSearch] = useState('');
  const [filterUnmarked, setFilterUnmarked] = useState(false);

  // Fetch existing attendance for this date to detect previously marked
  const { data: existingSheet } = useAttendanceSheet(
    termId,
    date,
    date
  );

  const isAlreadyMarked = useMemo(() => {
    if (!existingSheet?.dates?.length) return false;
    return existingSheet.dates.includes(date) &&
      existingSheet.students.some(
        (s) => existingSheet.attendanceMatrix[s.id]?.[date] !== undefined
      );
  }, [existingSheet, date]);

  const isToday = date === todayISO();
  const canEdit = isToday || !isAlreadyMarked;

  // Initialize / prefill entries from existing data
  useEffect(() => {
    const init: Record<number, EntryState> = {};
    for (const s of students) {
      if (isAlreadyMarked && existingSheet) {
        const val = existingSheet.attendanceMatrix[s.id]?.[date];
        if (val !== undefined) {
          init[s.id] = {
            status: val ? 'present' : 'absent',
            reason: '',
          };
        } else {
          init[s.id] = { status: null, reason: '' };
        }
      } else {
        init[s.id] = { status: null, reason: '' };
      }
    }
    setEntries(init);
  }, [students, date, isAlreadyMarked, existingSheet]);

  // Derived counts
  const markedCount = Object.values(entries).filter((e) => e.status !== null).length;
  const totalCount = students.length;
  const presentCount = Object.values(entries).filter((e) => e.status === 'present' || e.status === 'late').length;
  const absentCount = Object.values(entries).filter((e) => e.status === 'absent').length;
  const lateCount = Object.values(entries).filter((e) => e.status === 'late').length;
  const allMarked = markedCount === totalCount && totalCount > 0;

  // Actions
  function setStatus(studentId: number, status: Status) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        reason: status !== 'absent' ? '' : (prev[studentId]?.reason ?? ''),
      },
    }));
  }

  function setReason(studentId: number, reason: string) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], reason },
    }));
  }

  function markAllPresent() {
    const updated: Record<number, EntryState> = {};
    for (const s of students) {
      updated[s.id] = { status: 'present', reason: '' };
    }
    setEntries(updated);
  }

  function markAllAbsent() {
    if (!window.confirm('Mark all students as absent? This will clear all current selections.')) return;
    const updated: Record<number, EntryState> = {};
    for (const s of students) {
      updated[s.id] = { status: 'absent', reason: '' };
    }
    setEntries(updated);
  }

  function resetAll() {
    const updated: Record<number, EntryState> = {};
    for (const s of students) {
      updated[s.id] = { status: null, reason: '' };
    }
    setEntries(updated);
  }

  function handleSubmit(force = false) {
    if (!allMarked && !force) return;

    const attendanceEntries: AttendanceEntry[] = students.map((s) => {
      const entry = entries[s.id];
      if (!entry || entry.status === null) {
        // Unmarked → recorded as absent
        return { studentId: s.id, isPresent: false, isLate: false };
      }
      return {
        studentId: s.id,
        isPresent: entry.status === 'present' || entry.status === 'late',
        isLate: entry.status === 'late',
        reason: entry.status === 'absent' && entry.reason ? entry.reason : undefined,
      };
    });

    markAttendance.mutate(
      { classRoomId, termId, date, entries: attendanceEntries },
      { onSuccess: () => onClose() }
    );
  }

  // Filter students
  const filteredStudents = useMemo(() => {
    let list = [...students].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.fullName.toLowerCase().includes(q) || s.studentIndex.toLowerCase().includes(q)
      );
    }
    if (filterUnmarked) {
      list = list.filter((s) => !entries[s.id]?.status);
    }
    return list;
  }, [students, search, filterUnmarked, entries]);

  const [showSubmitAnyway, setShowSubmitAnyway] = useState(false);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isAlreadyMarked ? 'Edit Attendance' : 'Mark Attendance'}
      description={classRoomName ?? undefined}
      size="xl"
      className="max-h-[90vh] flex flex-col"
    >
      <div className="flex flex-col gap-4 -mx-6 -mb-4 px-6 pb-4 overflow-hidden">
        {/* Date & class info */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => {
              setDate(e.target.value);
              setShowSubmitAnyway(false);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-sm font-medium text-gray-700">{formatDateLong(date)}</p>
          {classRoomName && (
            <Badge variant="info">{classRoomName}</Badge>
          )}
        </div>

        {/* Already marked banner */}
        {isAlreadyMarked && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
            <Info className="h-4 w-4 shrink-0" />
            <span>Attendance already marked for this date. {isToday ? 'You can edit and save changes.' : 'Editing is only allowed for today.'}</span>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="success" onClick={markAllPresent} disabled={!canEdit}>
            <Check className="h-3.5 w-3.5" />
            Mark All Present
          </Button>
          <Button size="sm" variant="outline" onClick={markAllAbsent} disabled={!canEdit}>
            <X className="h-3.5 w-3.5 text-red-500" />
            Mark All Absent
          </Button>
          <Button size="sm" variant="ghost" onClick={resetAll} disabled={!canEdit}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        {/* Search & filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search student by name or index..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setFilterUnmarked((f) => !f)}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-medium transition-colors border',
              filterUnmarked
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            )}
          >
            Not yet marked
          </button>
        </div>

        {/* Student list */}
        {loadingStudents ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" className="text-primary" />
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[45vh] rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                {search || filterUnmarked ? 'No matching students.' : 'No students in this class.'}
              </div>
            ) : (
              filteredStudents.map((s) => {
                const entry = entries[s.id] ?? { status: null, reason: '' };
                return (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                          {s.fullName.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{s.fullName}</p>
                          <p className="font-mono text-xs text-gray-400">{s.studentIndex}</p>
                        </div>
                      </div>

                      {/* Status buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setStatus(s.id, 'present')}
                          disabled={!canEdit}
                          className={cn(
                            'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            entry.status === 'present'
                              ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Present
                        </button>
                        <button
                          onClick={() => setStatus(s.id, 'absent')}
                          disabled={!canEdit}
                          className={cn(
                            'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            entry.status === 'absent'
                              ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                          )}
                        >
                          <X className="h-3.5 w-3.5" />
                          Absent
                        </button>
                        <button
                          onClick={() => setStatus(s.id, 'late')}
                          disabled={!canEdit}
                          className={cn(
                            'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            entry.status === 'late'
                              ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                          )}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Late
                        </button>
                      </div>
                    </div>

                    {/* Absence reason */}
                    {entry.status === 'absent' && (
                      <div className="mt-2.5 ml-11 space-y-2">
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={entry.reason}
                          onChange={(e) => setReason(s.id, e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_REASONS.map((r) => (
                            <button
                              key={r}
                              onClick={() => setReason(s.id, r)}
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors border',
                                entry.reason === r
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Progress & submit */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600">
              Marked: {markedCount} of {totalCount} students
            </span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  allMarked ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ width: totalCount > 0 ? `${(markedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Summary chips */}
          {markedCount > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-green-600 font-medium">{presentCount} present</span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-red-600 font-medium">{absentCount} absent</span>
              {lateCount > 0 && (
                <>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-amber-600 font-medium">{lateCount} late</span>
                </>
              )}
            </div>
          )}

          {/* Submit anyway warning */}
          {showSubmitAnyway && !allMarked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {totalCount - markedCount} student{totalCount - markedCount !== 1 ? 's' : ''} not marked.
                They will be recorded as absent. Continue?
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            {allMarked ? (
              <Button
                variant="primary"
                onClick={() => handleSubmit(false)}
                loading={markAttendance.isPending}
                disabled={!canEdit}
              >
                {isAlreadyMarked ? 'Save Changes' : 'Submit Attendance'}
              </Button>
            ) : (
              <>
                {!showSubmitAnyway ? (
                  <Button
                    variant="primary"
                    onClick={() => setShowSubmitAnyway(true)}
                    disabled={markedCount === 0 || !canEdit}
                  >
                    Submit Attendance
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => handleSubmit(true)}
                    loading={markAttendance.isPending}
                    disabled={!canEdit}
                  >
                    Submit Anyway
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
