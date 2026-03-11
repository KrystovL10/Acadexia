import { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Trophy,
  FileText,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';

import { useStudentStore } from '../../store/student.store';
import {
  useMyAllTermResults,
  useMyTermResult,
  useMyAttendanceSummary,
} from '../../hooks/student';
import { studentApi } from '../../api/student.api';
import type { StudentScoreDto, TermResultSummaryDto } from '../../types/student.types';
import { cn } from '../../lib/utils';
import Card from '../../components/common/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import GradeBadge from '../../components/common/GradeBadge';
import DownloadButton from '../../components/common/DownloadButton';

// ── Constants ─────────────────────────────────────────────────────────────────

const CORE_SUBJECTS = new Set([
  'English Language',
  'Mathematics',
  'Core Mathematics',
  'Integrated Science',
  'Social Studies',
  'English',
]);

type SortKey = 'subject' | 'total' | 'grade';

// ── Helpers ───────────────────────────────────────────────────────────────────

function gpaColor(gpa: number): string {
  if (gpa >= 3.6) return 'text-emerald-600';
  if (gpa >= 3.0) return 'text-green-600';
  if (gpa >= 2.0) return 'text-amber-600';
  return 'text-red-600';
}

function gpaClassification(gpa: number): string {
  if (gpa >= 3.6) return 'Distinction';
  if (gpa >= 3.0) return 'Very Good';
  if (gpa >= 2.5) return 'Good';
  if (gpa >= 2.0) return 'Credit';
  if (gpa >= 1.0) return 'Pass';
  return 'Fail';
}

function gpaVariant(gpa: number): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (gpa >= 3.6) return 'success';
  if (gpa >= 2.5) return 'info';
  if (gpa >= 2.0) return 'warning';
  return 'danger';
}

function scoreBarColor(total: number): string {
  if (total >= 70) return 'bg-green-500';
  if (total >= 50) return 'bg-blue-500';
  if (total >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextColor(total: number): string {
  if (total >= 70) return 'text-green-700 font-bold';
  if (total >= 50) return 'text-blue-700 font-semibold';
  if (total >= 40) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-bold';
}

function gradeToPoints(grade: string | null): number {
  const map: Record<string, number> = {
    A1: 9, A2: 8, B2: 7, B3: 6, C4: 5, C5: 4, C6: 3, D7: 2, E8: 1, F9: 0,
  };
  return map[grade?.toUpperCase() ?? ''] ?? 0;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Grade distribution for pie chart ─────────────────────────────────────────

function buildGradeDistribution(scores: StudentScoreDto[]) {
  const groups = { A: 0, B: 0, C: 0, 'D/E/F': 0 };
  for (const s of scores) {
    if (!s.grade || s.isAbsent) continue;
    const g = s.grade.toUpperCase();
    if (g === 'A1' || g === 'A2') groups.A++;
    else if (g === 'B2' || g === 'B3') groups.B++;
    else if (g === 'C4' || g === 'C5' || g === 'C6') groups.C++;
    else groups['D/E/F']++;
  }
  return [
    { name: 'A Grades (A1–A2)', value: groups.A, color: '#16a34a' },
    { name: 'B Grades (B2–B3)', value: groups.B, color: '#2563eb' },
    { name: 'C Grades (C4–C6)', value: groups.C, color: '#d97706' },
    { name: 'D/E/F Grades', value: groups['D/E/F'], color: '#dc2626' },
  ].filter((d) => d.value > 0);
}

// ── Attendance Ring (CSS only) ────────────────────────────────────────────────

function AttendanceRing({ pct, size = 96 }: { pct: number; size?: number }) {
  const r = (size / 2) * 0.78;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 100) / 100);
  const color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#f59e0b' : '#dc2626';

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        className="-rotate-90"
        style={{ width: size, height: size }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#e5e7eb" strokeWidth={size * 0.08}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={size * 0.08}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-lg font-black text-gray-800">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

// ── Sidebar Term Item ─────────────────────────────────────────────────────────

function TermSidebarItem({
  term,
  isActive,
  onClick,
}: {
  term: TermResultSummaryDto;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-all',
        isActive
          ? 'border-l-[3px] border-primary bg-primary/6 text-primary font-semibold pl-[9px]'
          : 'border-l-[3px] border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <span className="truncate">{term.termLabel}</span>
      <span className={cn('ml-2 shrink-0 text-xs font-bold', gpaColor(term.gpa))}>
        {term.gpa.toFixed(2)}
      </span>
    </button>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <FileText className="h-10 w-10 text-gray-300" />
      </div>
      <h3 className="text-base font-semibold text-gray-700">No results available yet</h3>
      <p className="mt-1 max-w-xs text-sm text-gray-400">
        Your class teacher will publish results at the end of each term.
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TermResults() {
  const { selectedTermId, setSelectedTerm, setAvailableTerms } = useStudentStore();

  const [sortKey, setSortKey] = useState<SortKey>('subject');
  const [sortAsc, setSortAsc] = useState(true);
  const [absentCollapsed, setAbsentCollapsed] = useState(true);

  // All published terms
  const { data: allTerms = [], isLoading: termsLoading } = useMyAllTermResults();

  // Sync available terms into store on first load
  useEffect(() => {
    if (allTerms.length > 0) {
      setAvailableTerms(allTerms);
    }
  }, [allTerms, setAvailableTerms]);

  // Resolve active termId — fallback to latest if store is empty
  const activeTermId = useMemo(() => {
    if (selectedTermId) return selectedTermId;
    return allTerms[allTerms.length - 1]?.termId ?? null;
  }, [selectedTermId, allTerms]);

  // Previous term (index-1 in sorted list)
  const prevTermId = useMemo(() => {
    const idx = allTerms.findIndex((t) => t.termId === activeTermId);
    if (idx > 0) return allTerms[idx - 1].termId;
    return null;
  }, [allTerms, activeTermId]);

  // Detail queries
  const { data: termDetail, isLoading: detailLoading } = useMyTermResult(activeTermId);
  const { data: prevDetail } = useMyTermResult(prevTermId);
  const { data: attendance } = useMyAttendanceSummary(activeTermId);

  // Group terms by yearGroup
  const grouped = useMemo(() => {
    const map = new Map<string, TermResultSummaryDto[]>();
    for (const t of allTerms) {
      if (!map.has(t.yearGroup)) map.set(t.yearGroup, []);
      map.get(t.yearGroup)!.push(t);
    }
    return map;
  }, [allTerms]);

  // Sort & process scores
  const sortedScores = useMemo(() => {
    if (!termDetail) return [];
    const scores = [...termDetail.scores];
    scores.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'subject') {
        const aCore = CORE_SUBJECTS.has(a.subjectName) ? 0 : 1;
        const bCore = CORE_SUBJECTS.has(b.subjectName) ? 0 : 1;
        cmp = aCore - bCore || a.subjectName.localeCompare(b.subjectName);
      } else if (sortKey === 'total') {
        cmp = (a.total ?? -1) - (b.total ?? -1);
      } else {
        cmp = gradeToPoints(b.grade) - gradeToPoints(a.grade);
      }
      return sortAsc ? cmp : -cmp;
    });
    return scores;
  }, [termDetail, sortKey, sortAsc]);

  // Best & worst subject indices (by total)
  const { bestIdx, worstIdx } = useMemo(() => {
    const scored = sortedScores.filter((s) => !s.isAbsent && s.total != null);
    if (!scored.length) return { bestIdx: -1, worstIdx: -1 };
    let best = scored[0], worst = scored[0];
    for (const s of scored) {
      if ((s.total ?? 0) > (best.total ?? 0)) best = s;
      if ((s.total ?? 0) < (worst.total ?? 0)) worst = s;
    }
    return {
      bestIdx: sortedScores.indexOf(best),
      worstIdx: sortedScores.indexOf(worst),
    };
  }, [sortedScores]);

  // Grade distribution for pie
  const gradeDistData = useMemo(
    () => (termDetail ? buildGradeDistribution(termDetail.scores) : []),
    [termDetail]
  );

  // Average score
  const avgScore = useMemo(() => {
    const scored = sortedScores.filter((s) => !s.isAbsent && s.total != null);
    if (!scored.length) return null;
    return scored.reduce((acc, s) => acc + (s.total ?? 0), 0) / scored.length;
  }, [sortedScores]);

  // Current term summary (from allTerms for position context)
  const currentSummary = allTerms.find((t) => t.termId === activeTermId);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(key === 'subject'); }
  }

  function SortButton({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => handleSort(col)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide',
          active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        {label}
        <ArrowUpDown className={cn('h-3 w-3', active && 'text-primary')} />
      </button>
    );
  }

  const isLoading = termsLoading || detailLoading;
  const hasTerms = allTerms.length > 0;
  const hasDetail = !!termDetail;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 gap-0">

      {/* ── Left Sidebar ───────────────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Select Term
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {termsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" className="text-primary" />
            </div>
          ) : !hasTerms ? (
            <p className="px-3 text-xs text-gray-400">No published terms yet</p>
          ) : (
            Array.from(grouped.entries()).map(([yearGroup, terms]) => (
              <div key={yearGroup} className="mb-4">
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {yearGroup}
                </p>
                <div className="space-y-0.5">
                  {terms.map((t) => (
                    <TermSidebarItem
                      key={t.termId}
                      term={t}
                      isActive={t.termId === activeTermId}
                      onClick={() => setSelectedTerm(t.termId, t.termLabel)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Right Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile term selector */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <label className="text-xs font-semibold text-gray-500 shrink-0">Term:</label>
          <select
            value={activeTermId ?? ''}
            onChange={(e) => {
              const t = allTerms.find((x) => x.termId === Number(e.target.value));
              if (t) setSelectedTerm(t.termId, t.termLabel);
            }}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
          >
            {allTerms.map((t) => (
              <option key={t.termId} value={t.termId}>{t.termLabel}</option>
            ))}
          </select>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {isLoading && (
            <div className="flex justify-center py-16">
              <Spinner size="lg" className="text-primary" />
            </div>
          )}

          {!isLoading && !hasTerms && <EmptyState />}

          {!isLoading && hasTerms && !hasDetail && (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-sm text-gray-500">Select a term to view results.</p>
            </div>
          )}

          {!isLoading && hasDetail && termDetail && (
            <>
              {/* ── Result Header ─────────────────────────────────────────── */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{termDetail.termLabel}</h1>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                        {termDetail.yearGroup}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                        {termDetail.programName}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {termDetail.className}
                      </span>
                    </div>
                    {termDetail.generatedAt && (
                      <p className="mt-2 text-xs text-gray-400">
                        Published on: {formatDate(termDetail.generatedAt)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-6">
                    {/* GPA */}
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">GPA</p>
                      <p className={cn('text-4xl font-black', gpaColor(termDetail.gpa))}>
                        {termDetail.gpa.toFixed(2)}
                      </p>
                      <Badge variant={gpaVariant(termDetail.gpa)} className="mt-1 text-[10px]">
                        {gpaClassification(termDetail.gpa)}
                      </Badge>
                    </div>
                    {/* Position */}
                    {termDetail.positionInClass > 0 && (
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Position</p>
                        <div className="flex items-center gap-1">
                          {termDetail.positionInClass <= 3 && (
                            <Trophy className="h-5 w-5 text-amber-500" />
                          )}
                          <p className="text-4xl font-black text-gray-900">
                            #{termDetail.positionInClass}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          of {termDetail.totalStudentsInClass}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Download button */}
                <div className="mt-4 flex justify-end">
                  <DownloadButton
                    label="Download Report"
                    filename={`term-report-${termDetail.termLabel}.pdf`}
                    fetchFn={() =>
                      studentApi.downloadMyTermReport(activeTermId!).then((r) => r.data)
                    }
                    variant="primary"
                    size="sm"
                  />
                </div>
              </div>

              {/* ── Scores Table ──────────────────────────────────────────── */}
              <Card
                title="Subject Performance"
                action={
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    Sort by:
                    <SortButton col="subject" label="Subject" />
                    <SortButton col="total" label="Score" />
                    <SortButton col="grade" label="Grade" />
                  </div>
                }
              >
                <div className="overflow-x-auto -mx-6 -mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        <th className="px-5 py-3 text-left">Subject</th>
                        <th className="px-4 py-3 text-center">Class Score<br /><span className="normal-case font-normal text-gray-300">/ 30</span></th>
                        <th className="px-4 py-3 text-center">Exam Score<br /><span className="normal-case font-normal text-gray-300">/ 70</span></th>
                        <th className="px-4 py-3 text-center">Total<br /><span className="normal-case font-normal text-gray-300">/ 100</span></th>
                        <th className="px-4 py-3 text-center">Grade</th>
                        <th className="px-5 py-3 text-center">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedScores.map((s, i) => {
                        const isCore = CORE_SUBJECTS.has(s.subjectName);
                        const isBest = i === bestIdx;
                        const isWorst = i === worstIdx;
                        return (
                          <tr
                            key={s.subjectName}
                            className={cn(
                              'border-b border-gray-50 transition-colors hover:bg-gray-50/60',
                              isBest && 'border-l-2 border-l-amber-400',
                              isWorst && 'border-l-2 border-l-red-300'
                            )}
                          >
                            {/* Subject */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{s.subjectName}</span>
                                <span className={cn(
                                  'rounded-sm px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide',
                                  isCore
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                                )}>
                                  {isCore ? 'Core' : 'Elective'}
                                </span>
                              </div>
                            </td>

                            {/* Class score */}
                            <td className="px-4 py-3 text-center text-gray-600">
                              {s.isAbsent ? (
                                <span className="text-gray-300">—</span>
                              ) : (
                                s.classScore ?? '—'
                              )}
                            </td>

                            {/* Exam score */}
                            <td className="px-4 py-3 text-center text-gray-600">
                              {s.isAbsent ? (
                                <span className="text-gray-300">—</span>
                              ) : (
                                s.examScore ?? '—'
                              )}
                            </td>

                            {/* Total with bar */}
                            <td className="px-4 py-3 text-center">
                              {s.isAbsent ? (
                                <span className="inline-flex rounded bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-400 tracking-wide">
                                  ABSENT
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={cn('text-sm', scoreTextColor(s.total ?? 0))}>
                                    {s.total ?? '—'}
                                  </span>
                                  {s.total != null && (
                                    <div className="h-1 w-12 rounded-full bg-gray-100 overflow-hidden">
                                      <div
                                        className={cn('h-full rounded-full', scoreBarColor(s.total))}
                                        style={{ width: `${Math.min(s.total, 100)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Grade */}
                            <td className="px-4 py-3 text-center">
                              {s.isAbsent ? (
                                <span className="text-gray-300">—</span>
                              ) : (
                                <GradeBadge grade={s.grade} />
                              )}
                            </td>

                            {/* Remarks */}
                            <td className="px-5 py-3 text-center text-xs text-gray-500">
                              {s.isAbsent ? (
                                <span className="text-gray-400 italic">Absent</span>
                              ) : (
                                s.remarks ?? '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Summary row */}
                      {avgScore != null && (
                        <tr className="border-t border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
                          <td className="px-5 py-2.5" colSpan={3}>Average Score</td>
                          <td className="px-4 py-2.5 text-center font-bold text-gray-900">
                            {avgScore.toFixed(1)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* ── Performance Analysis ──────────────────────────────────── */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* This term vs last term */}
                <Card title="This Term vs Last Term">
                  {prevDetail ? (
                    <>
                      <div className="overflow-x-auto -mx-6">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              <th className="px-5 py-2 text-left">Subject</th>
                              <th className="px-3 py-2 text-center">This</th>
                              <th className="px-3 py-2 text-center">Last</th>
                              <th className="px-3 py-2 text-center">Δ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {termDetail.scores.slice(0, 8).map((s) => {
                              const prev = prevDetail.scores.find(
                                (p) => p.subjectName === s.subjectName
                              );
                              const diff =
                                s.total != null && prev?.total != null
                                  ? s.total - prev.total
                                  : null;
                              return (
                                <tr key={s.subjectName} className="border-b border-gray-50">
                                  <td className="px-5 py-1.5 font-medium text-gray-700 truncate max-w-[110px]">
                                    {s.subjectName}
                                  </td>
                                  <td className={cn('px-3 py-1.5 text-center font-semibold', scoreTextColor(s.total ?? 0))}>
                                    {s.total ?? '—'}
                                  </td>
                                  <td className="px-3 py-1.5 text-center text-gray-500">
                                    {prev?.total ?? '—'}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {diff == null ? (
                                      <span className="text-gray-300">—</span>
                                    ) : diff > 0 ? (
                                      <span className="inline-flex items-center gap-0.5 font-bold text-green-600">
                                        <TrendingUp className="h-3 w-3" />
                                        +{diff}
                                      </span>
                                    ) : diff < 0 ? (
                                      <span className="inline-flex items-center gap-0.5 font-bold text-red-600">
                                        <TrendingDown className="h-3 w-3" />
                                        {diff}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 text-gray-400">
                                        <Minus className="h-3 w-3" />0
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* GPA row */}
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                        <span className="text-xs font-semibold text-gray-500">GPA</span>
                        <div className="flex items-center gap-3">
                          <span className={cn('text-sm font-black', gpaColor(termDetail.gpa))}>
                            {termDetail.gpa.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400">was {prevDetail.gpa.toFixed(2)}</span>
                          {(() => {
                            const d = termDetail.gpa - prevDetail.gpa;
                            if (d > 0) return (
                              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-600">
                                <TrendingUp className="h-3.5 w-3.5" />+{d.toFixed(2)}
                              </span>
                            );
                            if (d < 0) return (
                              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600">
                                <TrendingDown className="h-3.5 w-3.5" />{d.toFixed(2)}
                              </span>
                            );
                            return <span className="text-xs text-gray-400">no change</span>;
                          })()}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="py-6 text-center text-sm text-gray-400 italic">
                      No previous term data to compare.
                    </p>
                  )}
                </Card>

                {/* Ranking context */}
                <Card title="Class Ranking">
                  {currentSummary ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Your Position</span>
                        <div className="flex items-center gap-1">
                          {currentSummary.positionInClass <= 3 && (
                            <Trophy className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="font-bold text-gray-900">
                            {ordinal(currentSummary.positionInClass)}
                          </span>
                          <span className="text-xs text-gray-400">
                            / {currentSummary.totalStudents}
                          </span>
                        </div>
                      </div>

                      {/* Position scale */}
                      {currentSummary.totalStudents > 0 && (
                        <div>
                          <div className="relative h-4 w-full rounded-full bg-gray-100">
                            {/* Gradient: green left → red right */}
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background:
                                  'linear-gradient(to right, #16a34a, #f59e0b, #dc2626)',
                                opacity: 0.25,
                              }}
                            />
                            {/* Position marker */}
                            {(() => {
                              const pct =
                                ((currentSummary.positionInClass - 1) /
                                  Math.max(currentSummary.totalStudents - 1, 1)) *
                                100;
                              return (
                                <div
                                  className="absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary shadow-md"
                                  style={{ left: `${pct}%` }}
                                >
                                  <span className="text-[7px] font-black text-white">
                                    {currentSummary.positionInClass}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                            <span>1st</span>
                            <span>{currentSummary.totalStudents}th</span>
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg bg-primary/6 px-4 py-2.5 text-center">
                        <p className="text-sm font-bold text-primary">
                          Top{' '}
                          {Math.ceil(
                            (currentSummary.positionInClass /
                              Math.max(currentSummary.totalStudents, 1)) *
                              100
                          )}
                          %
                        </p>
                        <p className="text-xs text-gray-500">of your class</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-gray-50 py-2">
                          <p className="font-bold text-gray-800">{currentSummary.subjectsPassed}</p>
                          <p className="text-gray-400">Passed</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 py-2">
                          <p className="font-bold text-gray-800">{currentSummary.subjectsFailed}</p>
                          <p className="text-gray-400">Failed</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No ranking data available.</p>
                  )}
                </Card>
              </div>

              {/* ── Attendance & Conduct ──────────────────────────────────── */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Attendance */}
                <Card title="Attendance">
                  <div className="flex items-center gap-5">
                    <AttendanceRing pct={termDetail.attendancePercentage} />
                    <div className="flex-1 space-y-1.5">
                      <p className="text-2xl font-black text-gray-900">
                        {termDetail.attendancePercentage.toFixed(1)}%
                      </p>
                      {termDetail.attendancePercentage < 75 && (
                        <Badge variant="warning" className="text-[10px]">Below 75%</Badge>
                      )}
                      <div className="space-y-0.5 text-xs text-gray-500">
                        <p>
                          <span className="font-semibold text-green-600">{termDetail.totalDaysPresent}</span> days present
                        </p>
                        <p>
                          <span className="font-semibold text-red-500">{termDetail.totalDaysAbsent}</span> days absent
                        </p>
                      </div>
                    </div>
                  </div>

                  {termDetail.attendancePercentage < 75 && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p className="text-xs text-amber-700">
                        Attendance may affect your academic performance. Try to attend all classes.
                      </p>
                    </div>
                  )}

                  {/* Absent dates */}
                  {attendance?.absentDates && attendance.absentDates.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setAbsentCollapsed((c) => !c)}
                        className="flex w-full items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        <span>Absent dates ({attendance.absentDates.length})</span>
                        {absentCollapsed
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronUp className="h-3.5 w-3.5" />}
                      </button>
                      {!absentCollapsed && (
                        <ul className="mt-2 max-h-36 overflow-y-auto space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-2">
                          {attendance.absentDates.map((d, i) => (
                            <li key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{formatDate(d.date)}</span>
                              <span className="text-gray-400 italic">
                                {d.reason ?? 'No reason recorded'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Card>

                {/* Conduct */}
                <Card title="Conduct & Remarks">
                  <div className="space-y-4">
                    {/* Conduct rating */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Conduct:</span>
                      <Badge
                        variant={
                          termDetail.conductRating === 'EXCELLENT'
                            ? 'success'
                            : termDetail.conductRating === 'VERY_GOOD' ||
                              termDetail.conductRating === 'GOOD'
                            ? 'info'
                            : termDetail.conductRating === 'FAIR'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {termDetail.conductRating.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {/* Class teacher remarks */}
                    {termDetail.classTeacherRemarks && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Class Teacher
                        </p>
                        <blockquote className="border-l-4 border-primary/30 bg-gray-50 px-4 py-3 rounded-r-lg">
                          <p className="text-sm italic text-gray-600 leading-relaxed">
                            "{termDetail.classTeacherRemarks}"
                          </p>
                        </blockquote>
                      </div>
                    )}

                    {/* Headmaster remarks */}
                    {termDetail.headmasterRemarks && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Headmaster
                        </p>
                        <blockquote className="border-l-4 border-amber-400/50 bg-amber-50/50 px-4 py-3 rounded-r-lg">
                          <p className="text-sm italic text-gray-600 leading-relaxed">
                            "{termDetail.headmasterRemarks}"
                          </p>
                        </blockquote>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* ── Grade Distribution Pie ────────────────────────────────── */}
              {gradeDistData.length > 0 && (
                <Card
                  title="Grade Breakdown"
                  subtitle="Distribution of grades this term"
                >
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                    <div className="relative h-52 w-52 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gradeDistData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {gradeDistData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value, name) => [
                              `${value} subject${Number(value) !== 1 ? 's' : ''}`,
                              name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-gray-800">
                          {termDetail.scores.filter((s) => !s.isAbsent).length}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400">subjects</span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-2">
                      {gradeDistData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          <span className="text-sm text-gray-600">
                            {d.name}:{' '}
                            <span className="font-bold text-gray-800">{d.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* ── Download Section ──────────────────────────────────────── */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/6 shrink-0">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Your Official Report</h3>
                      <p className="mt-0.5 text-sm text-gray-500">
                        This is your official GES terminal report card
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">PDF • Approx 150KB</p>
                    </div>
                  </div>
                  <DownloadButton
                    label="Download Terminal Report (PDF)"
                    filename={`term-report-${termDetail.termLabel}.pdf`}
                    fetchFn={() =>
                      studentApi.downloadMyTermReport(activeTermId!).then((r) => r.data)
                    }
                    icon={<Download className="h-4 w-4" />}
                    variant="primary"
                    size="md"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
