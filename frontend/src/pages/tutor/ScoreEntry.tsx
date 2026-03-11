import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useTutorStore } from '../../store/tutor.store';
import {
  useTutorAssignments,
  useScoreSheet,
  useEnterScore,
  useEnterBulkScores,
  useMarkAbsent,
} from '../../hooks/tutor';
import type { TutorAssignmentDto, StudentScoreRow } from '../../types/tutor.types';
import { cn } from '../../lib/utils';
import { BookOpen } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/ui/Spinner';

// ── Ghana grade calculator (mirrors backend GradeCalculator) ──────────────────

function computeGrade(total: number): { grade: string; remarks: string } {
  if (total >= 80) return { grade: 'A1', remarks: 'Excellent' };
  if (total >= 70) return { grade: 'B2', remarks: 'Very Good' };
  if (total >= 65) return { grade: 'B3', remarks: 'Good' };
  if (total >= 60) return { grade: 'C4', remarks: 'Credit' };
  if (total >= 55) return { grade: 'C5', remarks: 'Credit' };
  if (total >= 50) return { grade: 'C6', remarks: 'Credit' };
  if (total >= 45) return { grade: 'D7', remarks: 'Pass' };
  if (total >= 40) return { grade: 'E8', remarks: 'Pass' };
  return { grade: 'F9', remarks: 'Fail' };
}

function gradeColor(grade: string | null): string {
  if (!grade) return 'text-gray-400';
  if (grade === 'A1') return 'text-green-700 font-semibold';
  if (grade.startsWith('B')) return 'text-blue-700 font-semibold';
  if (grade.startsWith('C')) return 'text-yellow-700 font-semibold';
  if (grade === 'D7' || grade === 'E8') return 'text-orange-600 font-semibold';
  return 'text-red-600 font-bold';
}

// ── Assignment status helpers ─────────────────────────────────────────────────

type AssignmentStatus = 'LOCKED' | 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';

function getAssignmentStatus(a: TutorAssignmentDto): AssignmentStatus {
  if (a.isTermLocked) return 'LOCKED';
  if (a.completionPercentage >= 100) return 'COMPLETE';
  if (a.scoresSubmitted > 0) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

const statusBadge: Record<AssignmentStatus, { label: string; variant: 'neutral' | 'success' | 'info' | 'warning' | 'danger' }> = {
  LOCKED:      { label: 'Locked',      variant: 'danger' },
  COMPLETE:    { label: 'Complete',    variant: 'success' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  NOT_STARTED: { label: 'Not Started', variant: 'neutral' },
};

// ── Dirty row state ───────────────────────────────────────────────────────────

interface DirtyRow {
  classScore: string;
  examScore: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScoreEntry() {
  const {
    selectedClassRoomId,
    selectedClassRoomName,
    selectedSubjectId,
    selectedSubjectName,
    selectedTermId,
    selectedTermLabel,
    setSelectedContext,
  } = useTutorStore();

  // Mobile sidebar toggle
  const [showAssignments, setShowAssignments] = useState(false);

  // Local dirty state: studentId → {classScore, examScore}
  const [dirtyRows, setDirtyRows] = useState<Record<number, DirtyRow>>({});
  // Track which rows are currently saving
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());

  // Data
  const { data: assignments = [], isLoading: loadingAssignments } = useTutorAssignments();
  const { data: sheet, isLoading: loadingSheet, isError: sheetError } = useScoreSheet(
    selectedClassRoomId,
    selectedSubjectId,
    selectedTermId
  );

  // Mutations
  const enterScore = useEnterScore();
  const enterBulkScores = useEnterBulkScores();
  const markAbsent = useMarkAbsent();

  // Sync dirty rows when sheet loads / changes
  useEffect(() => {
    if (!sheet) return;
    const initial: Record<number, DirtyRow> = {};
    for (const s of sheet.students) {
      initial[s.studentId] = {
        classScore: s.classScore != null ? String(s.classScore) : '',
        examScore:  s.examScore  != null ? String(s.examScore)  : '',
      };
    }
    setDirtyRows(initial);
  }, [sheet]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const isDirty = useMemo(() => {
    if (!sheet) return false;
    return sheet.students.some((s) => {
      const dirty = dirtyRows[s.studentId];
      if (!dirty) return false;
      const origClass = s.classScore != null ? String(s.classScore) : '';
      const origExam  = s.examScore  != null ? String(s.examScore)  : '';
      return dirty.classScore !== origClass || dirty.examScore !== origExam;
    });
  }, [sheet, dirtyRows]);

  // Summary stats computed over dirty preview values
  const summaryStats = useMemo(() => {
    if (!sheet || sheet.students.length === 0) return null;
    const totals: number[] = [];

    for (const s of sheet.students) {
      if (s.isAbsent) continue;
      const dirty = dirtyRows[s.studentId];
      const cs = dirty ? parseFloat(dirty.classScore) : (s.classScore ?? NaN);
      const es = dirty ? parseFloat(dirty.examScore)  : (s.examScore  ?? NaN);
      if (!isNaN(cs) && !isNaN(es)) totals.push(cs + es);
    }

    if (totals.length === 0) return null;

    const avg     = totals.reduce((a, b) => a + b, 0) / totals.length;
    const highest = Math.max(...totals);
    const lowest  = Math.min(...totals);
    const passes  = totals.filter((t) => t >= 50).length;
    const fails   = totals.filter((t) => t < 50).length;
    const passRate = (passes / totals.length) * 100;

    return { avg, highest, lowest, passes, fails, passRate, count: totals.length };
  }, [sheet, dirtyRows]);

  // ── Keyboard-nav ref tracking ───────────────────────────────────────────────
  // inputRefs[rowIndex][0] = classScore input, [1] = examScore input
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const inputKey = (rowIdx: number, col: 0 | 1) => `${rowIdx}-${col}`;

  const focusInput = useCallback((rowIdx: number, col: 0 | 1) => {
    const el = inputRefs.current[inputKey(rowIdx, col)];
    el?.focus();
    el?.select();
  }, []);

  // ── Row save logic ──────────────────────────────────────────────────────────

  const saveRow = useCallback(
    (student: StudentScoreRow) => {
      if (!selectedClassRoomId || !selectedSubjectId || !selectedTermId) return;
      const dirty = dirtyRows[student.studentId];
      if (!dirty) return;

      const cs = dirty.classScore !== '' ? parseFloat(dirty.classScore) : null;
      const es = dirty.examScore  !== '' ? parseFloat(dirty.examScore)  : null;

      // Skip if nothing changed
      const origClass = student.classScore != null ? String(student.classScore) : '';
      const origExam  = student.examScore  != null ? String(student.examScore)  : '';
      if (dirty.classScore === origClass && dirty.examScore === origExam) return;

      setSavingRows((prev) => new Set(prev).add(student.studentId));

      enterScore.mutate(
        {
          studentId:   student.studentId,
          subjectId:   selectedSubjectId,
          classRoomId: selectedClassRoomId,
          termId:      selectedTermId,
          classScore:  cs,
          examScore:   es,
        },
        {
          onSettled: () => {
            setSavingRows((prev) => {
              const next = new Set(prev);
              next.delete(student.studentId);
              return next;
            });
          },
        }
      );
    },
    [dirtyRows, selectedClassRoomId, selectedSubjectId, selectedTermId, enterScore]
  );

  // ── Bulk save ───────────────────────────────────────────────────────────────

  const saveAll = useCallback(() => {
    if (!sheet || !selectedClassRoomId || !selectedSubjectId || !selectedTermId) return;

    const scores = sheet.students
      .filter((s) => !s.isAbsent)
      .map((s) => {
        const dirty = dirtyRows[s.studentId];
        const cs = dirty?.classScore !== '' ? parseFloat(dirty?.classScore ?? '') : null;
        const es = dirty?.examScore  !== '' ? parseFloat(dirty?.examScore  ?? '') : null;
        return {
          studentId:   s.studentId,
          subjectId:   selectedSubjectId,
          classRoomId: selectedClassRoomId,
          termId:      selectedTermId,
          classScore:  isNaN(cs as number) ? null : cs,
          examScore:   isNaN(es as number) ? null : es,
        };
      });

    enterBulkScores.mutate({
      subjectId:   selectedSubjectId,
      classRoomId: selectedClassRoomId,
      termId:      selectedTermId,
      scores,
    });
  }, [sheet, dirtyRows, selectedClassRoomId, selectedSubjectId, selectedTermId, enterBulkScores]);

  // ── Absent toggle ───────────────────────────────────────────────────────────

  const toggleAbsent = useCallback(
    (student: StudentScoreRow) => {
      if (!selectedClassRoomId || !selectedSubjectId || !selectedTermId) return;
      markAbsent.mutate({
        studentId:   student.studentId,
        subjectId:   selectedSubjectId,
        classRoomId: selectedClassRoomId,
        termId:      selectedTermId,
      });
    },
    [selectedClassRoomId, selectedSubjectId, selectedTermId, markAbsent]
  );

  // ── Select assignment ───────────────────────────────────────────────────────

  const selectAssignment = (a: TutorAssignmentDto) => {
    setSelectedContext({
      classRoomId:   a.classRoomId,
      classRoomName: a.className,
      subjectId:     a.subjectId,
      subjectName:   a.subjectName,
      termId:        a.termId,
      termLabel:     a.termLabel,
    });
    setShowAssignments(false);
  };

  const isSelected = (a: TutorAssignmentDto) =>
    a.classRoomId === selectedClassRoomId && a.subjectId === selectedSubjectId;

  const isLocked = sheet?.isLocked ?? false;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Mobile sidebar overlay ── */}
      {showAssignments && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setShowAssignments(false)}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside className={cn(
        'flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white',
        showAssignments
          ? 'fixed inset-y-0 left-0 z-50 lg:relative'
          : 'hidden lg:flex',
      )}>
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">My Assignments</h2>
          <p className="text-xs text-gray-400 mt-0.5">Select a class to enter scores</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loadingAssignments && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" className="text-primary" />
            </div>
          )}

          {!loadingAssignments && assignments.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-gray-500">No assignments found for this term.</p>
            </div>
          )}

          {assignments.map((a) => {
            const status = getAssignmentStatus(a);
            const badge  = statusBadge[status];
            const pct    = Math.min(100, Math.round(a.completionPercentage));
            const selected = isSelected(a);

            return (
              <button
                key={`${a.classRoomId}-${a.subjectId}`}
                onClick={() => selectAssignment(a)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-all',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{a.subjectName}</p>
                    <p className="truncate text-xs text-gray-500">{a.className}</p>
                  </div>
                  <Badge variant={badge.variant} className="shrink-0 text-[10px]">
                    {badge.label}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-primary' : 'bg-gray-300'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                    <span>{a.scoresSubmitted}/{a.studentsCount} submitted</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="flex flex-1 flex-col overflow-hidden bg-gray-50">
        {/* No selection empty state */}
        {!selectedClassRoomId && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-gray-100 p-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-gray-700">No assignment selected</p>
              <p className="mt-1 text-sm text-gray-400">Choose a class from the sidebar to start entering scores.</p>
            </div>
          </div>
        )}

        {/* Selected: loading */}
        {selectedClassRoomId && loadingSheet && (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="lg" className="text-primary" />
          </div>
        )}

        {/* Selected: error */}
        {selectedClassRoomId && sheetError && !loadingSheet && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-red-500">Failed to load score sheet. Please try again.</p>
          </div>
        )}

        {/* Selected: sheet loaded */}
        {selectedClassRoomId && sheet && !loadingSheet && (
          <>
            {/* Sheet header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {selectedSubjectName} — {selectedClassRoomName}
                </h1>
                <p className="text-sm text-gray-500">
                  {selectedTermLabel} · {sheet.students.length} students
                  {sheet.completionStats && (
                    <> · <span className="text-primary font-medium">{sheet.completionStats.submitted} submitted</span></>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isDirty && !isLocked && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={enterBulkScores.isPending}
                    onClick={saveAll}
                  >
                    Save All Changes
                  </Button>
                )}
              </div>
            </div>

            {/* Locked banner */}
            {isLocked && (
              <div className="flex items-center gap-2 bg-red-50 px-6 py-2.5 border-b border-red-100">
                <svg className="h-4 w-4 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 font-medium">
                  This term is locked. Score editing is disabled. Contact an administrator to unlock.
                </p>
              </div>
            )}

            {/* Score table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="hidden md:table w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-8">#</th>
                    <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Index No.</th>
                    <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student Name</th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-28">
                      Class Score<br /><span className="font-normal text-gray-400 normal-case">(max 30)</span>
                    </th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-28">
                      Exam Score<br /><span className="font-normal text-gray-400 normal-case">(max 70)</span>
                    </th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-20">Total</th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-16">Grade</th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-24">Remarks</th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-20">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.students.map((student, rowIdx) => {
                    const dirty     = dirtyRows[student.studentId] ?? { classScore: '', examScore: '' };
                    const isSaving  = savingRows.has(student.studentId);
                    const absent    = student.isAbsent;

                    // Live preview of total/grade from dirty values
                    const cs = parseFloat(dirty.classScore);
                    const es = parseFloat(dirty.examScore);
                    const previewTotal = !isNaN(cs) && !isNaN(es) ? cs + es : null;
                    const previewGrade = previewTotal != null ? computeGrade(previewTotal) : null;

                    const rowDirty =
                      dirty.classScore !== (student.classScore != null ? String(student.classScore) : '') ||
                      dirty.examScore  !== (student.examScore  != null ? String(student.examScore)  : '');

                    return (
                      <tr
                        key={student.studentId}
                        className={cn(
                          'border-b border-gray-100 transition-colors',
                          absent ? 'bg-gray-50 opacity-60' : rowDirty ? 'bg-amber-50/40' : 'bg-white hover:bg-gray-50/60'
                        )}
                      >
                        {/* Row number */}
                        <td className="py-2 px-3 text-gray-400 text-xs">{rowIdx + 1}</td>

                        {/* Index */}
                        <td className="py-2 px-3 font-mono text-xs text-gray-600">{student.studentIndex}</td>

                        {/* Name */}
                        <td className="py-2 px-3 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {student.fullName}
                            {isSaving && <Spinner size="sm" className="text-primary" />}
                          </div>
                        </td>

                        {/* Class Score */}
                        <td className="py-1.5 px-2 text-center">
                          <input
                            ref={(el) => { inputRefs.current[inputKey(rowIdx, 0)] = el; }}
                            type="number"
                            min={0}
                            max={30}
                            step={0.5}
                            disabled={absent || isLocked}
                            value={dirty.classScore}
                            onChange={(e) =>
                              setDirtyRows((prev) => ({
                                ...prev,
                                [student.studentId]: { ...prev[student.studentId], classScore: e.target.value },
                              }))
                            }
                            onBlur={() => saveRow(student)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); saveRow(student); focusInput(rowIdx, 1); }
                              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); focusInput(rowIdx, 1); }
                            }}
                            className={cn(
                              'w-20 rounded border px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary',
                              absent || isLocked
                                ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            )}
                          />
                        </td>

                        {/* Exam Score */}
                        <td className="py-1.5 px-2 text-center">
                          <input
                            ref={(el) => { inputRefs.current[inputKey(rowIdx, 1)] = el; }}
                            type="number"
                            min={0}
                            max={70}
                            step={0.5}
                            disabled={absent || isLocked}
                            value={dirty.examScore}
                            onChange={(e) =>
                              setDirtyRows((prev) => ({
                                ...prev,
                                [student.studentId]: { ...prev[student.studentId], examScore: e.target.value },
                              }))
                            }
                            onBlur={() => saveRow(student)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveRow(student);
                                const nextIdx = rowIdx + 1;
                                if (nextIdx < sheet.students.length) focusInput(nextIdx, 0);
                              }
                              if (e.key === 'Tab' && !e.shiftKey) {
                                e.preventDefault();
                                const nextIdx = rowIdx + 1;
                                if (nextIdx < sheet.students.length) focusInput(nextIdx, 0);
                              }
                            }}
                            className={cn(
                              'w-20 rounded border px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary',
                              absent || isLocked
                                ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            )}
                          />
                        </td>

                        {/* Total (live preview) */}
                        <td className="py-2 px-3 text-center text-sm font-medium text-gray-800">
                          {absent ? (
                            <span className="text-gray-400 text-xs">Absent</span>
                          ) : previewTotal != null ? (
                            previewTotal.toFixed(1)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Grade */}
                        <td className={cn('py-2 px-3 text-center text-sm', gradeColor(previewGrade?.grade ?? null))}>
                          {absent ? (
                            <span className="text-gray-400">—</span>
                          ) : previewGrade ? (
                            previewGrade.grade
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="py-2 px-3 text-center text-xs text-gray-500">
                          {absent ? (
                            <span className="text-gray-400">—</span>
                          ) : previewGrade ? (
                            previewGrade.remarks
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Absent toggle */}
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => !isLocked && toggleAbsent(student)}
                            disabled={isLocked || markAbsent.isPending}
                            className={cn(
                              'inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                              isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                              absent ? 'bg-red-500' : 'bg-gray-200'
                            )}
                            title={absent ? 'Mark as present' : 'Mark as absent'}
                          >
                            <span
                              className={cn(
                                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                                absent ? 'translate-x-4' : 'translate-x-0.5'
                              )}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {sheet.students.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-sm text-gray-500">No students enrolled in this class.</p>
                </div>
              )}

              {/* Mobile card view */}
              <div className="space-y-3 md:hidden">
                {sheet.students.map((student) => {
                  const dirty = dirtyRows[student.studentId] ?? { classScore: '', examScore: '' };
                  const cs = parseFloat(dirty.classScore);
                  const es = parseFloat(dirty.examScore);
                  const previewTotal = !isNaN(cs) && !isNaN(es) ? cs + es : null;
                  const previewGrade = previewTotal != null ? computeGrade(previewTotal) : null;

                  return (
                    <div key={student.studentId} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{student.fullName}</p>
                          <p className="text-xs text-gray-500">{student.studentIndex}</p>
                        </div>
                        {previewGrade && (
                          <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', gradeColor(previewGrade.grade))}>
                            {previewGrade.grade}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Class (max 30)</label>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            step={0.5}
                            value={dirty.classScore}
                            disabled={student.isAbsent || isLocked}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:opacity-60"
                            onChange={(e) =>
                              setDirtyRows((prev) => ({
                                ...prev,
                                [student.studentId]: { ...prev[student.studentId], classScore: e.target.value },
                              }))
                            }
                            onBlur={() => saveRow(student)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Exam (max 70)</label>
                          <input
                            type="number"
                            min={0}
                            max={70}
                            step={0.5}
                            value={dirty.examScore}
                            disabled={student.isAbsent || isLocked}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:opacity-60"
                            onChange={(e) =>
                              setDirtyRows((prev) => ({
                                ...prev,
                                [student.studentId]: { ...prev[student.studentId], examScore: e.target.value },
                              }))
                            }
                            onBlur={() => saveRow(student)}
                          />
                        </div>
                      </div>
                      {previewTotal != null && (
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>Total: {previewTotal.toFixed(1)}</span>
                          <span>{previewGrade?.remarks}</span>
                        </div>
                      )}
                      {student.isAbsent && (
                        <p className="mt-2 text-xs font-medium text-red-500">Absent</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SUMMARY FOOTER ── */}
            {summaryStats && (
              <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-3">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Summary</span>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Average:</span>
                    <span className="font-semibold text-gray-800">{summaryStats.avg.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Highest:</span>
                    <span className="font-semibold text-green-700">{summaryStats.highest.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Lowest:</span>
                    <span className="font-semibold text-red-600">{summaryStats.lowest.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Pass Rate:</span>
                    <span className={cn('font-semibold', summaryStats.passRate >= 50 ? 'text-green-700' : 'text-red-600')}>
                      {summaryStats.passRate.toFixed(0)}%
                    </span>
                    <span className="text-gray-400 text-xs">({summaryStats.passes}/{summaryStats.count})</span>
                  </div>

                  {summaryStats.fails > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Failing:</span>
                      <span className="font-semibold text-red-600">{summaryStats.fails}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile assignment toggle */}
      <button
        onClick={() => setShowAssignments(!showAssignments)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:hidden"
        aria-label="Show assignments"
      >
        <BookOpen className="h-5 w-5" />
      </button>
    </div>
  );
}
