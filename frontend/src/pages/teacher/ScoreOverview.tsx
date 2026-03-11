import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Filter, Eye, EyeOff } from 'lucide-react';
import { useClassScoreOverview } from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import type { ScoreDto } from '../../types/tutor.types';
import type { SubjectCompletionDto } from '../../types/teacher.types';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/common/Button';
import { cn } from '../../lib/utils';

// ==================== HELPERS ====================

function gradeColor(score: ScoreDto | null | undefined) {
  if (!score) return 'bg-gray-50 text-gray-300';
  if (score.isAbsent) return 'bg-purple-50 text-purple-500';
  const gp = score.gradePoint;
  if (gp === null) return 'bg-gray-100 text-gray-400';
  if (gp >= 3.6) return 'bg-green-100 text-green-700 font-semibold';
  if (gp >= 3.0) return 'bg-emerald-50 text-emerald-600 font-semibold';
  if (gp >= 2.0) return 'bg-blue-50 text-blue-600';
  if (gp >= 1.6) return 'bg-amber-50 text-amber-600';
  return 'bg-red-50 text-red-600 font-semibold';
}

function failHighlight(score: ScoreDto | null | undefined, highlight: boolean) {
  if (!highlight) return '';
  if (!score || score.isAbsent) return '';
  if (score.gradePoint !== null && score.gradePoint < 1.6) return 'ring-2 ring-red-500 ring-inset';
  return '';
}

function cellText(score: ScoreDto | null | undefined) {
  if (!score) return '';
  if (score.isAbsent) return 'ABS';
  if (score.grade) return score.grade;
  if (score.totalScore !== null) return String(score.totalScore);
  return '';
}

function progressColor(pct: number) {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-500';
}

// ==================== COMPLETION CARDS ====================

function CompletionCard({ subj }: { subj: SubjectCompletionDto }) {
  const total = subj.studentsWithScores + subj.studentsWithoutScores;
  const pct = total > 0 ? (subj.studentsWithScores / total) * 100 : 0;
  return (
    <div className="min-w-[180px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="truncate text-sm font-semibold text-gray-800" title={subj.subjectName}>
        {subj.subjectName}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {subj.studentsWithScores}/{total} students
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={cn('h-1.5 rounded-full transition-all', progressColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{pct.toFixed(0)}% complete</span>
        {subj.studentsWithoutScores > 0 && (
          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600">
            {subj.studentsWithoutScores} missing
          </span>
        )}
      </div>
    </div>
  );
}

// ==================== EXCEL EXPORT ====================

function exportExcel(
  students: { id: number; fullName: string; studentIndex: string }[],
  subjects: { id: number; name: string; subjectCode: string }[],
  scoreMatrix: Record<number, Record<number, ScoreDto | null>>
) {
  const headers = [
    '#',
    'Student Index',
    'Full Name',
    ...subjects.flatMap((s) => [
      `${s.subjectCode} Class`,
      `${s.subjectCode} Exam`,
      `${s.subjectCode} Total`,
      `${s.subjectCode} Grade`,
    ]),
  ];

  const rows = students.map((s, idx) => {
    const studentScores = scoreMatrix[s.id] ?? {};
    const scoreCols = subjects.flatMap((subj) => {
      const sc = studentScores[subj.id];
      if (!sc) return ['', '', '', ''];
      if (sc.isAbsent) return ['ABS', 'ABS', 'ABS', 'ABS'];
      return [
        sc.classScore ?? '',
        sc.examScore ?? '',
        sc.totalScore ?? '',
        sc.grade ?? '',
      ];
    });
    return [idx + 1, s.studentIndex, s.fullName, ...scoreCols];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Score Overview');
  XLSX.writeFile(wb, 'score_overview.xlsx');
}

// ==================== MAIN PAGE ====================

type FilterMode = 'all' | 'missing' | 'failing';

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'All students' },
  { value: 'missing', label: 'Missing scores' },
  { value: 'failing', label: 'Failing students' },
];

export default function ScoreOverview() {
  const teacherStore = useTeacherStore();
  const { currentTermId: schoolTermId } = useSchoolStore();
  const termId = teacherStore.currentTermId ?? schoolTermId;

  const { data: overview, isLoading, isError } = useClassScoreOverview(termId ?? undefined);

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [highlightFailing, setHighlightFailing] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');

  const filteredStudents = useMemo(() => {
    if (!overview) return [];
    let list = [...overview.students];

    if (searchStudent.trim()) {
      const q = searchStudent.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentIndex.toLowerCase().includes(q)
      );
    }

    if (filterMode === 'missing') {
      list = list.filter((s) => {
        const studentScores = overview.scoreMatrix[s.id] ?? {};
        return overview.subjects.some((subj) => !studentScores[subj.id]);
      });
    } else if (filterMode === 'failing') {
      list = list.filter((s) => {
        const studentScores = overview.scoreMatrix[s.id] ?? {};
        return overview.subjects.some((subj) => {
          const sc = studentScores[subj.id];
          return sc && !sc.isAbsent && sc.gradePoint !== null && sc.gradePoint < 1.6;
        });
      });
    }

    return list;
  }, [overview, filterMode, searchStudent]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div>
        <PageHeader title="Score Overview" subtitle="Class score matrix for this term" />
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {isError
            ? 'Failed to load score overview. Please try again.'
            : 'No score data available.'}
        </div>
      </div>
    );
  }

  const { students, subjects, scoreMatrix, subjectCompletions } = overview;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Score Overview"
        subtitle={`${teacherStore.classRoomName ?? 'Your class'} · ${students.length} students · ${subjects.length} subjects`}
      />

      {/* Completion Cards */}
      {subjectCompletions.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Subject Completion
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {subjectCompletions.map((subj) => (
              <CompletionCard key={subj.subjectId} subj={subj} />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchStudent}
          onChange={(e) => setSearchStudent(e.target.value)}
          placeholder="Search student…"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <Filter className="ml-1.5 h-3.5 w-3.5 text-gray-400" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterMode(opt.value)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                filterMode === opt.value
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setHighlightFailing((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
            highlightFailing
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          )}
        >
          {highlightFailing ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {highlightFailing ? 'Hide Highlights' : 'Highlight Failing'}
        </button>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel(students, subjects, scoreMatrix)}
            disabled={!students.length}
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Score Matrix Table */}
      {filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No students match the current filter.</p>
        </div>
      ) : (
        <div
          className="overflow-auto rounded-xl border border-gray-200 shadow-sm"
          style={{ maxHeight: '70vh' }}
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 border-b border-r border-gray-200 bg-gray-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                  Student
                </th>
                {subjects.map((subj) => (
                  <th
                    key={subj.id}
                    className="sticky top-0 z-20 border-b border-r border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap last:border-r-0"
                  >
                    <span title={subj.name}>{subj.subjectCode}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const studentScores = scoreMatrix[student.id] ?? {};
                return (
                  <tr
                    key={student.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}
                  >
                    <td className="sticky left-0 z-10 border-b border-r border-gray-100 bg-inherit px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                          {student.fullName.charAt(0)}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">
                            {student.fullName}
                          </p>
                          <p className="font-mono text-[10px] text-gray-400">
                            {student.studentIndex}
                          </p>
                        </div>
                      </div>
                    </td>

                    {subjects.map((subj) => {
                      const sc = studentScores[subj.id];
                      return (
                        <td
                          key={subj.id}
                          className={cn(
                            'border-b border-r border-gray-100 px-2 py-2.5 text-center text-xs last:border-r-0',
                            gradeColor(sc),
                            failHighlight(sc, highlightFailing)
                          )}
                          title={
                            sc && !sc.isAbsent && sc.totalScore !== null
                              ? `${sc.subjectName}: ${sc.totalScore} (${sc.grade ?? '—'})`
                              : sc?.isAbsent
                              ? 'Absent'
                              : 'No score'
                          }
                        >
                          {cellText(sc)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
        {[
          { color: 'bg-green-100', label: 'A1 (≥3.6)' },
          { color: 'bg-emerald-50 border border-emerald-100', label: 'B2–B3 (3.0–3.5)' },
          { color: 'bg-blue-50 border border-blue-100', label: 'C4–C5 (2.0–2.9)' },
          { color: 'bg-amber-50 border border-amber-100', label: 'C6 (1.6–1.9)' },
          { color: 'bg-red-50 border border-red-100', label: 'D7–F9 (<1.6)' },
          { color: 'bg-purple-50 border border-purple-100', label: 'Absent' },
          { color: 'bg-gray-50 border border-dashed border-gray-200', label: 'No score' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn('inline-block h-3 w-3 rounded-sm', item.color)} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
