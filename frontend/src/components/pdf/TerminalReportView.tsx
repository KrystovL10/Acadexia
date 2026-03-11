import type { TermResultDto } from '../../types/teacher.types';
import type { ScoreDto } from '../../types/tutor.types';
import GradeBadge from '../common/GradeBadge';
import { cn } from '../../lib/utils';

interface SchoolInfo {
  name: string;
  motto?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
}

interface TerminalReportViewProps {
  termResult: TermResultDto;
  schoolInfo: SchoolInfo;
}

function gpaColor(gpa: number) {
  if (gpa >= 3.0) return 'text-green-700';
  if (gpa >= 2.0) return 'text-blue-700';
  if (gpa >= 1.6) return 'text-amber-700';
  return 'text-red-700';
}

function attendanceColor(pct: number) {
  if (pct >= 90) return 'text-green-700';
  if (pct >= 75) return 'text-amber-700';
  return 'text-red-700';
}

function conductColor(rating: string | null) {
  if (!rating) return 'bg-gray-100 text-gray-600';
  const r = rating.toLowerCase();
  if (r === 'excellent') return 'bg-green-100 text-green-800';
  if (r === 'very good') return 'bg-blue-100 text-blue-800';
  if (r === 'good') return 'bg-primary/10 text-primary';
  return 'bg-amber-100 text-amber-800';
}

const GRADE_SCALE = [
  { grade: 'A1', range: '80–100', gp: '4.0' },
  { grade: 'B2', range: '75–79', gp: '3.5' },
  { grade: 'B3', range: '70–74', gp: '3.0' },
  { grade: 'C4', range: '65–69', gp: '2.5' },
  { grade: 'C5', range: '60–64', gp: '2.0' },
  { grade: 'C6', range: '55–59', gp: '1.5' },
  { grade: 'D7', range: '50–54', gp: '1.0' },
  { grade: 'E8', range: '40–49', gp: '0.5' },
  { grade: 'F9', range: '0–39', gp: '0.0' },
];

export default function TerminalReportView({
  termResult: r,
  schoolInfo: school,
}: TerminalReportViewProps) {
  const today = new Date().toLocaleDateString('en-GH', { dateStyle: 'long' });

  return (
    <div className="print-area mx-auto max-w-[595px] bg-white text-sm">
      {/* ── Section 1: School Header ── */}
      <div className="report-header no-page-break mb-4">
        <div className="flex items-start gap-4">
          {/* Crest placeholder */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border-2 border-primary/30 bg-primary/5">
            <span className="text-[10px] font-bold text-primary">CREST</span>
          </div>

          {/* School name */}
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
              {school.name}
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              Senior High School
            </p>
            {school.motto && (
              <p className="mt-0.5 text-[9px] italic text-gray-500">"{school.motto}"</p>
            )}
            {school.address && (
              <p className="text-[8px] text-gray-400">{school.address}</p>
            )}
            {(school.phoneNumber || school.email) && (
              <p className="text-[8px] text-gray-400">
                {[school.phoneNumber, school.email].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>

          {/* Report label */}
          <div className="shrink-0 text-right">
            <p className="text-sm font-extrabold uppercase tracking-wide text-gray-800">Terminal</p>
            <p className="text-sm font-extrabold uppercase tracking-wide text-gray-800">Report</p>
          </div>
        </div>

        {/* Gold divider */}
        <div className="mt-2 h-[3px] rounded-full" style={{ background: '#FCD116' }} />
      </div>

      {/* ── Section 2: Report ID Bar ── */}
      <div
        className="no-page-break mb-3 flex items-center justify-between rounded px-3 py-1.5 text-[10px] font-semibold text-white"
        style={{ backgroundColor: '#1B6B3A' }}
      >
        <span>ACADEMIC YEAR: {r.termLabel.split(' - ')[0] || r.termLabel}</span>
        <span className="text-xs font-bold uppercase">{r.termLabel}</span>
        <span>DATE: {today}</span>
      </div>

      {/* ── Section 3: Student Info Grid ── */}
      <div className="no-page-break mb-3">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {([
              ['NAME', r.studentName, 'INDEX NO.', r.studentIndex],
              ['YEAR GROUP', r.yearGroup, 'CLASS', r.termLabel],
              ['POSITION', `${r.positionInClass} / ${r.totalStudentsInClass}`, 'GPA', r.gpa.toFixed(2)],
              ['SUBJECTS PASSED', String(r.subjectsPassed), 'SUBJECTS FAILED', String(r.subjectsFailed)],
            ] as [string, string, string, string][]).map(([l1, v1, l2, v2], i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-200 px-2 py-1 font-semibold text-gray-500 w-[22%]">{l1}</td>
                <td className="border border-gray-200 px-2 py-1 font-medium text-gray-800 w-[28%]">
                  {l1 === 'POSITION' && r.positionInClass <= 3 ? (
                    <span className="rounded px-1 py-0.5" style={{ backgroundColor: '#FCD116', color: '#92400e' }}>{v1}</span>
                  ) : l1 === 'GPA' ? (
                    <span className={cn('font-bold', gpaColor(r.gpa))}>{v1}</span>
                  ) : v1}
                </td>
                <td className="border border-gray-200 px-2 py-1 font-semibold text-gray-500 w-[22%]">{l2}</td>
                <td className="border border-gray-200 px-2 py-1 font-medium text-gray-800 w-[28%]">
                  {l2 === 'GPA' ? (
                    <span className={cn('font-bold', gpaColor(r.gpa))}>{v2}</span>
                  ) : v2}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Section 4: Academic Performance Table ── */}
      <div className="no-page-break mb-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
          Academic Performance
        </p>
        <table className="scores-table w-full border-collapse text-[10px]">
          <thead>
            <tr style={{ backgroundColor: '#1B6B3A' }} className="text-white">
              <th className="border border-green-800 px-2 py-1 text-left font-semibold" style={{ width: '28%' }}>Subject</th>
              <th className="border border-green-800 px-1 py-1 text-center font-semibold" style={{ width: '13%' }}>Class (30%)</th>
              <th className="border border-green-800 px-1 py-1 text-center font-semibold" style={{ width: '13%' }}>Exam (70%)</th>
              <th className="border border-green-800 px-1 py-1 text-center font-semibold" style={{ width: '13%' }}>Total</th>
              <th className="border border-green-800 px-1 py-1 text-center font-semibold" style={{ width: '10%' }}>Grade</th>
              <th className="border border-green-800 px-1 py-1 text-left font-semibold" style={{ width: '23%' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {r.scores.map((sc: ScoreDto, i: number) => (
              <tr key={sc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                <td className="border border-gray-200 px-2 py-1 font-medium text-gray-800">{sc.subjectName}</td>
                <td className="border border-gray-200 px-1 py-1 text-center text-gray-600">
                  {sc.isAbsent ? <span className="text-red-600 font-semibold">ABS</span> : (sc.classScore ?? '—')}
                </td>
                <td className="border border-gray-200 px-1 py-1 text-center text-gray-600">
                  {sc.isAbsent ? <span className="text-red-600 font-semibold">ABS</span> : (sc.examScore ?? '—')}
                </td>
                <td className="border border-gray-200 px-1 py-1 text-center font-semibold text-gray-800">
                  {sc.isAbsent ? <span className="text-red-600">ABS</span> : (sc.totalScore ?? '—')}
                </td>
                <td className="border border-gray-200 px-1 py-1 text-center">
                  {sc.isAbsent ? '—' : <GradeBadge grade={sc.grade} />}
                </td>
                <td className="border border-gray-200 px-1 py-1 text-[9px] text-gray-500 italic">
                  {sc.remarks ?? '—'}
                </td>
              </tr>
            ))}
            {/* Summary row */}
            <tr style={{ backgroundColor: '#28825020' }} className="font-semibold">
              <td className="border border-gray-300 px-2 py-1.5 text-gray-700" colSpan={3}>
                GPA: <span className={cn('font-bold', gpaColor(r.gpa))}>{r.gpa.toFixed(2)}</span>
              </td>
              <td className="border border-gray-300 px-1 py-1.5 text-center text-gray-600" colSpan={3}>
                Passed: {r.subjectsPassed} | Failed: {r.subjectsFailed}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Section 5: Attendance & Conduct ── */}
      <div className="no-page-break mb-3 grid grid-cols-2 gap-3">
        {/* Attendance */}
        <div className="rounded border border-gray-200 p-2.5">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
            Attendance Record
          </p>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Days Present:</span>
              <span className="font-medium text-gray-800">{r.totalDaysPresent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Days Absent:</span>
              <span className="font-medium text-gray-800">{r.totalDaysAbsent}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-1">
              <span className="font-semibold text-gray-600">Attendance Rate:</span>
              <span className={cn('font-bold', attendanceColor(r.attendancePercentage))}>
                {r.attendancePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Conduct */}
        <div className="rounded border border-gray-200 p-2.5">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
            Conduct & Attitude
          </p>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Conduct:</span>
              <span className={cn('rounded px-2 py-0.5 text-[9px] font-bold', conductColor(r.conductRating))}>
                {r.conductRating || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interest:</span>
              <span className="text-gray-400">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Attitude:</span>
              <span className="text-gray-400">—</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 6: Remarks ── */}
      <div className="no-page-break mb-3 space-y-2">
        {/* Class Teacher */}
        <div className="rounded border border-gray-200 p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
            Class Teacher's Remarks
          </p>
          <p className="mt-1 min-h-[24px] text-[10px] italic text-gray-700">
            {r.classTeacherRemarks || 'No remarks entered.'}
          </p>
          <div className="mt-2 flex items-end justify-between border-t border-dashed border-gray-200 pt-2">
            <div className="text-[8px] text-gray-400">
              <span>Signature: </span>
              <span className="inline-block w-24 border-b border-gray-300">&nbsp;</span>
            </div>
            <div className="text-[8px] text-gray-400">
              <span>Date: </span>
              <span className="inline-block w-16 border-b border-gray-300">&nbsp;</span>
            </div>
          </div>
        </div>

        {/* Headmaster */}
        <div className="rounded border border-gray-200 p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
            Headmaster's Remarks
          </p>
          <p className="mt-1 min-h-[24px] text-[10px] italic text-gray-700">
            {r.headmasterRemarks || '—'}
          </p>
          <div className="mt-2 flex items-end justify-between border-t border-dashed border-gray-200 pt-2">
            <div className="text-[8px] text-gray-400">
              <span>Signature: </span>
              <span className="inline-block w-24 border-b border-gray-300">&nbsp;</span>
            </div>
            <div className="text-[8px] text-gray-400">
              <span>Date: </span>
              <span className="inline-block w-16 border-b border-gray-300">&nbsp;</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 7: Grading Scale ── */}
      <div className="no-page-break mb-3">
        <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-gray-400">
          Grading Scale
        </p>
        <div className="flex gap-0.5">
          {GRADE_SCALE.map((g) => (
            <div key={g.grade} className="flex-1 rounded border border-gray-200 p-1 text-center">
              <GradeBadge grade={g.grade} className="text-[7px] !min-w-0 !px-1" />
              <p className="mt-0.5 text-[6px] text-gray-500">{g.range}</p>
              <p className="text-[6px] font-medium text-gray-400">GP {g.gp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 8: Footer ── */}
      <div className="border-t border-gray-200 pt-2 text-center text-[7px] text-gray-400">
        <p>Generated by GES SHS Academic System | {school.name} | {today}</p>
      </div>
    </div>
  );
}
