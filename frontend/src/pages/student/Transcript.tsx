import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import {
  Printer,
  Share2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  FileText,
} from 'lucide-react';

import { useAuthStore } from '../../store/auth.store';
import {
  useMyTranscript,
  useMyGpaHistory,
  useMyProfile,
  useMyAllTermResults,
} from '../../hooks/student';
import { studentApi } from '../../api/student.api';
import type {
  TranscriptTermDto,
  TranscriptTermSubject,
  TermResultSummaryDto,
} from '../../types/student.types';
import { ROUTES } from '../../router/routes';
import { cn } from '../../lib/utils';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import GradeBadge from '../../components/common/GradeBadge';
import DownloadButton from '../../components/common/DownloadButton';
import Avatar from '../../components/ui/Avatar';

// ── Constants ─────────────────────────────────────────────────────────────────

const CORE_SUBJECTS = new Set([
  'English Language', 'Mathematics', 'Core Mathematics',
  'Integrated Science', 'Social Studies', 'English',
]);

const CLASSIFICATION_TABLE = [
  { min: 3.6, max: 4.0, label: 'Distinction',  meaning: 'Exceptional performance',      color: 'emerald' },
  { min: 3.0, max: 3.59, label: 'Very Good',   meaning: 'Above average performance',     color: 'green' },
  { min: 2.5, max: 2.99, label: 'Good',        meaning: 'Good performance',              color: 'blue' },
  { min: 2.0, max: 2.49, label: 'Credit',      meaning: 'Satisfactory performance',      color: 'amber' },
  { min: 1.6, max: 1.99, label: 'Pass',        meaning: 'Minimum passing standard',      color: 'orange' },
  { min: 0.0, max: 1.59, label: 'Fail',        meaning: 'Below passing standard',        color: 'red' },
];

const TERM_TYPE_LABELS: Record<string, string> = {
  TERM_1: 'Term 1', TERM_2: 'Term 2', TERM_3: 'Term 3',
  FIRST: 'Term 1', SECOND: 'Term 2', THIRD: 'Term 3',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function gpaColor(gpa: number): string {
  if (gpa >= 3.6) return 'text-emerald-600';
  if (gpa >= 3.0) return 'text-green-600';
  if (gpa >= 2.0) return 'text-amber-600';
  return 'text-red-600';
}

function gpaVariant(gpa: number): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (gpa >= 3.6) return 'success';
  if (gpa >= 2.5) return 'info';
  if (gpa >= 2.0) return 'warning';
  return 'danger';
}

function classificationFor(cgpa: number) {
  return CLASSIFICATION_TABLE.find((c) => cgpa >= c.min && cgpa <= c.max) ?? CLASSIFICATION_TABLE[5];
}

function termLabel(term: TranscriptTermDto): string {
  const t = TERM_TYPE_LABELS[term.termType] ?? term.termType;
  return `${t} — ${term.academicYear}`;
}

function termShort(term: TranscriptTermDto): string {
  return TERM_TYPE_LABELS[term.termType] ?? term.termType;
}

function scoreTextColor(score: number): string {
  if (score >= 70) return 'text-green-700 font-bold';
  if (score >= 50) return 'text-blue-700 font-semibold';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600 font-bold';
}

// ── Subject aggregate (across terms) ─────────────────────────────────────────

interface SubjectAggregate {
  subjectName: string;
  termCount: number;
  avgScore: number;
  bestGrade: string;
  latestGrade: string;
  scores: number[];
}

function buildSubjectAggregates(terms: TranscriptTermDto[]): SubjectAggregate[] {
  const map = new Map<string, { scores: number[]; grades: string[] }>();
  for (const term of terms) {
    for (const s of term.subjects) {
      if (!map.has(s.subjectName)) map.set(s.subjectName, { scores: [], grades: [] });
      map.get(s.subjectName)!.scores.push(s.totalScore);
      map.get(s.subjectName)!.grades.push(s.grade);
    }
  }
  const gradeOrder = ['A1', 'A2', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];
  return Array.from(map.entries())
    .map(([subjectName, { scores, grades }]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const bestGrade = grades.slice().sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b))[0];
      return {
        subjectName,
        termCount: scores.length,
        avgScore: avg,
        bestGrade: bestGrade ?? '—',
        latestGrade: grades[grades.length - 1] ?? '—',
        scores,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);
}

// ── Trend icon ────────────────────────────────────────────────────────────────

function TrendArrow({ scores }: { scores: number[] }) {
  if (scores.length < 2) return <Minus className="h-3.5 w-3.5 text-gray-400" />;
  const diff = scores[scores.length - 1] - scores[scores.length - 2];
  if (diff > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  if (diff < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400" />;
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────

function GpaChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs min-w-[140px]">
      <p className="mb-1.5 font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-bold">{p.value?.toFixed(2)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Collapsible Term Panel ────────────────────────────────────────────────────

function TermPanel({
  term,
  termSummary,
  defaultOpen,
  termIndex,
  onNavigateResults,
}: {
  term: TranscriptTermDto;
  termSummary: TermResultSummaryDto | undefined;
  defaultOpen: boolean;
  termIndex: number;
  onNavigateResults: (termId: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showRemarks, setShowRemarks] = useState(false);

  const isPending = term.subjects.length === 0;

  // Best and worst subjects
  const scored = term.subjects.filter((s) => s.totalScore != null);
  const bestSubject = scored.reduce<TranscriptTermSubject | null>(
    (b, s) => (!b || s.totalScore > b.totalScore ? s : b), null
  );
  const worstSubject = scored.reduce<TranscriptTermSubject | null>(
    (b, s) => (!b || s.totalScore < b.totalScore ? s : b), null
  );

  const sortedSubjects = useMemo(() => {
    return [...term.subjects].sort((a, b) => {
      const aCore = CORE_SUBJECTS.has(a.subjectName) ? 0 : 1;
      const bCore = CORE_SUBJECTS.has(b.subjectName) ? 0 : 1;
      return aCore - bCore || a.subjectName.localeCompare(b.subjectName);
    });
  }, [term.subjects]);

  if (isPending) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-400">{termShort(term)}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-400">
              Not yet published
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`term-${termIndex}`}
      className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden print:border print:shadow-none"
    >
      {/* Term header — click to toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50 print:hidden',
          open ? 'border-b border-gray-100' : ''
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-800">{termShort(term)}</span>
          <Badge variant={gpaVariant(term.gpa)} className="text-[10px]">
            {term.gpa.toFixed(2)}
          </Badge>
          {term.classPosition && term.classSize && (
            <span className="text-xs text-gray-400">
              #{term.classPosition} of {term.classSize}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {/* Always-visible on print */}
      <div className={cn(open ? 'block' : 'hidden', 'print:block')}>
        {/* Compact scores table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-5 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-center">Class</th>
                <th className="px-4 py-2 text-center">Exam</th>
                <th className="px-4 py-2 text-center">Total</th>
                <th className="px-4 py-2 text-center">Grade</th>
                <th className="px-4 py-2 text-center">GP</th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.map((s) => {
                const isBest = s.subjectName === bestSubject?.subjectName;
                const isWorst = s.subjectName === worstSubject?.subjectName && s.subjectName !== bestSubject?.subjectName;
                return (
                  <tr
                    key={s.subjectName}
                    className={cn(
                      'border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60',
                      isBest && 'border-l-2 border-l-amber-400',
                      isWorst && 'border-l-2 border-l-red-300'
                    )}
                  >
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        {isBest && <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                        {isWorst && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400" />}
                        <span className="font-medium text-gray-800">{s.subjectName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">{s.classScore}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{s.examScore}</td>
                    <td className={cn('px-4 py-2 text-center text-sm', scoreTextColor(s.totalScore))}>
                      {s.totalScore}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <GradeBadge grade={s.grade} />
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-gray-500">
                      {s.gradePoint.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Term summary row */}
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 bg-gray-50/60 px-5 py-2.5 text-xs text-gray-500">
          <span>
            GPA: <strong className={gpaColor(term.gpa)}>{term.gpa.toFixed(2)}</strong>
          </span>
          {term.classPosition && term.classSize && (
            <span>
              Position: <strong className="text-gray-700">#{term.classPosition}</strong>/{term.classSize}
            </span>
          )}
          {termSummary && (
            <>
              <span>
                Attendance: <strong className="text-gray-700">{termSummary.attendancePercentage.toFixed(0)}%</strong>
              </span>
              <span>
                Conduct: <strong className="text-gray-700">{termSummary.conductRating.replace(/_/g, ' ')}</strong>
              </span>
            </>
          )}
        </div>

        {/* Remarks toggle */}
        {(term.classTeacherRemark || term.conductRemark) && (
          <div className="border-t border-gray-100 px-5 py-3">
            <button
              onClick={() => setShowRemarks((r) => !r)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline print:hidden"
            >
              {showRemarks ? 'Hide' : 'View'} remarks
              {showRemarks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <div className={cn(showRemarks ? 'mt-3 block' : 'hidden', 'print:mt-2 print:block space-y-3')}>
              {term.classTeacherRemark && (
                <blockquote className="border-l-4 border-primary/30 bg-gray-50 px-4 py-2.5 rounded-r-lg">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Class Teacher</p>
                  <p className="text-sm italic text-gray-600 leading-relaxed">"{term.classTeacherRemark}"</p>
                </blockquote>
              )}
              {term.conductRemark && (
                <blockquote className="border-l-4 border-amber-300/50 bg-amber-50/50 px-4 py-2.5 rounded-r-lg">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Conduct</p>
                  <p className="text-sm italic text-gray-600">{term.conductRemark}</p>
                </blockquote>
              )}
            </div>
          </div>
        )}

        {/* Term actions */}
        {termSummary && (
          <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 print:hidden">
            <DownloadButton
              label="Download Report"
              filename={`report-${term.termType}-${term.academicYear}.pdf`}
              fetchFn={() => studentApi.downloadMyTermReport(termSummary.termId).then((r) => r.data)}
              variant="outline"
              size="sm"
            />
            <button
              onClick={() => onNavigateResults(termSummary.termId)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              View Full Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Transcript() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: transcript, isLoading: transcriptLoading, isError } = useMyTranscript();
  const { data: gpaHistory, isLoading: gpaLoading } = useMyGpaHistory();
  const { data: profile } = useMyProfile();
  const { data: allTermSummaries = [] } = useMyAllTermResults();

  const [copied, setCopied] = useState(false);

  const isLoading = transcriptLoading || gpaLoading;

  // ── Derived data ────────────────────────────────────────────────────────

  // Group terms by academicYear
  const yearGroups = useMemo(() => {
    if (!transcript?.terms) return [];
    const map = new Map<string, TranscriptTermDto[]>();
    for (const term of transcript.terms) {
      if (!map.has(term.academicYear)) map.set(term.academicYear, []);
      map.get(term.academicYear)!.push(term);
    }
    // Sort by academicYear chronologically
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, terms], i) => ({
        year,
        terms: [...terms].sort((a, b) => a.termType.localeCompare(b.termType)),
        yearNumber: i + 1,
        yearLabel: ['YEAR ONE', 'YEAR TWO', 'YEAR THREE'][i] ?? `YEAR ${i + 1}`,
        yearShort: ['SHS 1', 'SHS 2', 'SHS 3'][i] ?? `SHS ${i + 1}`,
      }));
  }, [transcript]);

  // Compute year average GPAs
  const yearAvgGpa = useMemo(() => {
    return yearGroups.map(({ terms }) => {
      const gpas = terms.map((t) => t.gpa).filter((g) => g > 0);
      return gpas.length ? gpas.reduce((a, b) => a + b, 0) / gpas.length : 0;
    });
  }, [yearGroups]);

  // GPA chart data
  const chartData = useMemo(() => {
    if (!gpaHistory) return [];
    return gpaHistory.termHistory.map((t, i) => ({
      term: t.termLabel,
      gpa: t.gpa,
      cgpa: gpaHistory.cgpaProgression[i]?.cgpaAfterThisTerm ?? null,
    }));
  }, [gpaHistory]);

  // Best term
  const bestTerm = useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((b, c) => (c.gpa > b.gpa ? c : b));
  }, [chartData]);

  // Subject aggregates
  const subjectAggregates = useMemo(() => {
    if (!transcript?.terms) return [];
    return buildSubjectAggregates(transcript.terms);
  }, [transcript]);

  // Classification
  const classification = gpaHistory?.currentCgpa != null
    ? classificationFor(gpaHistory.currentCgpa)
    : null;

  // Match summary to TranscriptTermDto by label
  function findSummaryForTerm(term: TranscriptTermDto): TermResultSummaryDto | undefined {
    const label = termLabel(term);
    return allTermSummaries.find((s) => s.termLabel === label);
  }

  // Most recent term (last in last group)
  const mostRecentTermLabel = useMemo(() => {
    const last = yearGroups[yearGroups.length - 1];
    if (!last) return null;
    const lastTerm = last.terms[last.terms.length - 1];
    return lastTerm ? termLabel(lastTerm) : null;
  }, [yearGroups]);

  // Quick stats
  const totalPassed = useMemo(() => {
    return transcript?.terms.reduce(
      (acc, t) => acc + t.subjects.filter((s) => s.totalScore >= 50).length, 0
    ) ?? 0;
  }, [transcript]);

  const overallAttendance = useMemo(() => {
    if (!allTermSummaries.length) return null;
    const vals = allTermSummaries.map((t) => t.attendancePercentage);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [allTermSummaries]);

  const mostConsistentSubject = useMemo(() => {
    if (!subjectAggregates.length) return null;
    return [...subjectAggregates]
      .filter((s) => s.termCount >= 2)
      .sort((a, b) => {
        const stdA = Math.sqrt(a.scores.reduce((acc, v) => acc + (v - a.avgScore) ** 2, 0) / a.scores.length);
        const stdB = Math.sqrt(b.scores.reduce((acc, v) => acc + (v - b.avgScore) ** 2, 0) / b.scores.length);
        return stdA - stdB;
      })[0] ?? null;
  }, [subjectAggregates]);

  // Student name
  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : transcript?.studentName ?? user?.firstName ?? 'Student';

  // Share handler
  const handleShare = useCallback(async () => {
    const code = `GES-${profile?.studentIndex ?? transcript?.studentId ?? 'N/A'}-TRANSCRIPT`;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [profile, transcript]);

  // Navigate to results with a term selected
  const handleNavigateResults = useCallback(
    (termId: number) => {
      navigate(ROUTES.STUDENT_RESULTS, { state: { termId } });
    },
    [navigate]
  );

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!isLoading && !isError && (!transcript || transcript.terms.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <GraduationCap className="h-12 w-12 text-gray-300" />
        </div>
        <h2 className="text-lg font-semibold text-gray-700">Your transcript is empty</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-400">
          Results will appear here after your class teacher publishes each term's reports.
        </p>
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-6 py-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-600 mb-1">Expected timeline</p>
          <p>Results are typically published at the end of each term.</p>
          <p>Check back after your end-of-term examinations.</p>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Academic Transcript</h1>
          <p className="mt-0.5 text-sm text-gray-500">Complete SHS academic record</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton
            label="Download PDF"
            filename="transcript.pdf"
            fetchFn={() => studentApi.downloadMyTranscript().then((r) => r.data)}
            variant="primary"
            size="sm"
          />
          <button
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            onClick={handleShare}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all',
              copied
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-primary" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load transcript. Please try again.
        </div>
      )}

      {!isLoading && !isError && transcript && (
        <div className="print-area space-y-6">

          {/* ── Summary Hero ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Gold divider top */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

                {/* Student identity */}
                <div className="flex items-center gap-4">
                  <Avatar
                    src={profile?.profilePhotoUrl ?? undefined}
                    fallback={fullName}
                    size="lg"
                    className="h-20 w-20 shrink-0 text-2xl"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
                    {profile?.studentIndex && (
                      <p className="font-mono text-xs text-gray-400 mt-0.5">
                        #{profile.studentIndex}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="inline-flex rounded-full bg-primary/8 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {profile?.currentProgramName ?? transcript.program}
                      </span>
                      {profile?.currentYearGroup && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                          {profile.currentYearGroup}
                        </span>
                      )}
                    </div>
                    {user?.schoolName && (
                      <p className="mt-1 text-xs text-gray-500">{user.schoolName}</p>
                    )}
                  </div>
                </div>

                {/* Academic summary */}
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  {gpaHistory && (
                    <>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400">CGPA</p>
                        <p className={cn('text-5xl font-black', gpaColor(gpaHistory.currentCgpa))}>
                          {gpaHistory.currentCgpa.toFixed(2)}
                        </p>
                      </div>
                      {classification && (
                        <span className={cn(
                          'rounded-full px-4 py-1 text-sm font-bold border-2',
                          classification.label === 'Distinction'
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : classification.label === 'Very Good' || classification.label === 'Good'
                            ? 'border-green-400 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-gray-50 text-gray-600'
                        )}>
                          {classification.label.toUpperCase()}
                        </span>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          <strong className="text-gray-700">{gpaHistory.termHistory.length}</strong>
                          {' '}of 9 terms
                        </span>
                        {profile?.isActive ? (
                          <Badge variant="success" className="text-[10px]">ACTIVE</Badge>
                        ) : profile?.hasGraduated ? (
                          <Badge variant="info" className="text-[10px]">GRADUATED</Badge>
                        ) : null}
                      </div>
                      {profile?.admissionDate && (
                        <p className="text-xs text-gray-400">
                          Admitted: {new Date(profile.admissionDate).getFullYear()}
                          {' '}· Expected graduation: {new Date(profile.admissionDate).getFullYear() + 3}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Gold divider */}
              <div className="my-5 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {bestTerm && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Best Term GPA</p>
                    <p className={cn('text-xl font-black', gpaColor(bestTerm.gpa))}>
                      {bestTerm.gpa.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{bestTerm.term}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Subjects Passed</p>
                  <p className="text-xl font-black text-gray-900">{totalPassed}</p>
                  <p className="text-[11px] text-gray-500">across all terms</p>
                </div>
                {mostConsistentSubject && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Most Consistent</p>
                    <p className="text-sm font-bold text-gray-800 leading-tight">
                      {mostConsistentSubject.subjectName}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      avg {mostConsistentSubject.avgScore.toFixed(1)}
                    </p>
                  </div>
                )}
                {overallAttendance != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Overall Attendance</p>
                    <p className={cn(
                      'text-xl font-black',
                      overallAttendance >= 85 ? 'text-green-600' : overallAttendance >= 75 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {overallAttendance.toFixed(0)}%
                    </p>
                    <p className="text-[11px] text-gray-500">overall</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── GPA Journey Chart ────────────────────────────────────────── */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-1 text-base font-semibold text-gray-900">GPA Journey</h3>
              <p className="mb-4 text-xs text-gray-500">Your GPA progression across all terms</p>
              <div className="h-64 print:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="transcriptGpaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B6B3A" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1B6B3A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="term"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 4]}
                      ticks={[0, 1, 2, 3, 3.6, 4]}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<GpaChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <ReferenceLine y={2.0} stroke="#f59e0b" strokeDasharray="4 3"
                      label={{ value: 'Pass', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
                    <ReferenceLine y={3.0} stroke="#3b82f6" strokeDasharray="4 3"
                      label={{ value: 'Very Good', position: 'insideTopRight', fontSize: 9, fill: '#3b82f6' }} />
                    <ReferenceLine y={3.6} stroke="#10b981" strokeDasharray="4 3"
                      label={{ value: 'Distinction', position: 'insideTopRight', fontSize: 9, fill: '#10b981' }} />
                    <Area
                      type="monotone"
                      dataKey="gpa"
                      name="Term GPA"
                      stroke="#1B6B3A"
                      strokeWidth={2.5}
                      fill="url(#transcriptGpaGrad)"
                      dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: { term: string; gpa: number } };
                        const isBest = payload.term === bestTerm?.term;
                        return (
                          <g key={`dot-${payload.term}`}>
                            <circle
                              cx={cx} cy={cy} r={isBest ? 7 : 4}
                              fill={isBest ? '#FCD116' : '#1B6B3A'}
                              stroke="#fff" strokeWidth={2}
                            />
                            {isBest && (
                              <text x={cx} y={cy - 12} textAnchor="middle" fontSize={9} fill="#B45309" fontWeight={600}>
                                Best
                              </text>
                            )}
                          </g>
                        );
                      }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cgpa"
                      name="Cumulative GPA"
                      stroke="#FCD116"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 3, fill: '#FCD116', strokeWidth: 2, stroke: '#fff' }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Academic Record by Year ─────────────────────────────────── */}
          <div className="space-y-6">
            {yearGroups.map((yg, yi) => (
              <div key={yg.year} className="space-y-3 print:break-inside-avoid">
                {/* Year banner */}
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-3">
                  <div>
                    <h3 className="font-bold text-amber-900">
                      {yg.yearLabel} — {yg.yearShort} — {yg.year}
                    </h3>
                  </div>
                  <Badge variant="warning" className="text-xs">
                    Avg GPA: {yearAvgGpa[yi].toFixed(2)}
                  </Badge>
                </div>

                {/* Terms */}
                <div className="space-y-2">
                  {yg.terms.map((term, ti) => {
                    const summary = findSummaryForTerm(term);
                    const isLatestTerm = termLabel(term) === mostRecentTermLabel;
                    // Open most recent by default, collapse older
                    const defaultOpen = isLatestTerm || (yi === yearGroups.length - 1 && ti === yg.terms.length - 1);
                    return (
                      <TermPanel
                        key={`${term.termType}-${term.academicYear}`}
                        term={term}
                        termSummary={summary}
                        defaultOpen={defaultOpen}
                        termIndex={yi * 3 + ti}
                        onNavigateResults={handleNavigateResults}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── Cumulative Subject Performance ──────────────────────────── */}
          {subjectAggregates.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">Overall Subject Performance</h3>
                <p className="mt-0.5 text-xs text-gray-500">Average scores across all terms</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-2.5 text-left">Subject</th>
                      <th className="px-4 py-2.5 text-center">Terms</th>
                      <th className="px-4 py-2.5 text-center">Avg Score</th>
                      <th className="px-4 py-2.5 text-center">Best Grade</th>
                      <th className="px-4 py-2.5 text-center">Latest Grade</th>
                      <th className="px-4 py-2.5 text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectAggregates.map((s, i) => {
                      const isBest = i === 0;
                      const isWorst = i === subjectAggregates.length - 1;
                      return (
                        <tr
                          key={s.subjectName}
                          className={cn(
                            'border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/60',
                            isBest && 'bg-green-50/40',
                            isWorst && 'bg-red-50/30'
                          )}
                        >
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">{s.subjectName}</span>
                              {isBest && (
                                <span className="rounded-sm bg-green-100 px-1.5 text-[9px] font-bold uppercase text-green-700">
                                  Best
                                </span>
                              )}
                              {isWorst && (
                                <span className="rounded-sm bg-red-100 px-1.5 text-[9px] font-bold uppercase text-red-600">
                                  Lowest
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500">{s.termCount}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn('text-sm', scoreTextColor(s.avgScore))}>
                                {s.avgScore.toFixed(1)}
                              </span>
                              <div className="h-1 w-16 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    s.avgScore >= 70 ? 'bg-green-500' : s.avgScore >= 50 ? 'bg-blue-500' : 'bg-red-400'
                                  )}
                                  style={{ width: `${Math.min(s.avgScore, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <GradeBadge grade={s.bestGrade} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <GradeBadge grade={s.latestGrade} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <TrendArrow scores={s.scores} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Classification Guide ─────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Grading Classification Guide</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-2.5 text-left">CGPA Range</th>
                    <th className="px-5 py-2.5 text-left">Classification</th>
                    <th className="px-5 py-2.5 text-left">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSIFICATION_TABLE.map((row) => {
                    const isCurrent = gpaHistory?.currentCgpa != null &&
                      gpaHistory.currentCgpa >= row.min && gpaHistory.currentCgpa <= row.max;
                    return (
                      <tr
                        key={row.label}
                        className={cn(
                          'border-b border-gray-50 last:border-0',
                          isCurrent && 'bg-green-50 font-semibold'
                        )}
                      >
                        <td className="px-5 py-2.5 font-mono text-xs text-gray-600">
                          {row.min.toFixed(2)} – {row.max.toFixed(2)}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={cn(
                            'font-semibold',
                            isCurrent ? 'text-green-700' : 'text-gray-700'
                          )}>
                            {row.label}
                          </span>
                          {isCurrent && (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              YOUR LEVEL
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-gray-500">{row.meaning}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
