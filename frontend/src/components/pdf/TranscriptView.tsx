import type { TranscriptDto, TermTranscriptDto } from '../../types/teacher.types';
import GradeBadge from '../common/GradeBadge';
import { cn } from '../../lib/utils';

interface TranscriptViewProps {
  transcript: TranscriptDto;
}

function gpaColor(gpa: number) {
  if (gpa >= 3.0) return 'text-green-700';
  if (gpa >= 2.0) return 'text-blue-700';
  if (gpa >= 1.6) return 'text-amber-700';
  return 'text-red-700';
}

function classificationColor(cls: string) {
  if (cls?.includes('Distinction')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (cls?.includes('Very Good')) return 'bg-green-100 text-green-800 border-green-300';
  if (cls?.includes('Good')) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (cls?.includes('Credit')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
  if (cls?.includes('Pass')) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

// Group terms by yearGroup
function groupByYear(terms: TermTranscriptDto[]) {
  const map = new Map<string, TermTranscriptDto[]>();
  for (const t of terms) {
    const key = t.yearGroup || 'Unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}

function TermTable({ term }: { term: TermTranscriptDto }) {
  return (
    <div className="mb-4 no-page-break">
      <div className="mb-1.5 flex items-center justify-between rounded bg-gray-100 px-3 py-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-700">
          {term.termLabel}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-gray-600">
          <span>GPA: <strong className={gpaColor(term.gpa)}>{term.gpa.toFixed(2)}</strong></span>
          <span>Pos: <strong>#{term.position}/{term.totalStudents}</strong></span>
          <span>Att: <strong>{term.attendancePercentage.toFixed(0)}%</strong></span>
        </div>
      </div>

      <table className="scores-table w-full border-collapse text-[10px]">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="border border-gray-200 px-2 py-1 text-left font-semibold">Subject</th>
            <th className="border border-gray-200 px-1 py-1 text-center font-semibold">Class</th>
            <th className="border border-gray-200 px-1 py-1 text-center font-semibold">Exam</th>
            <th className="border border-gray-200 px-1 py-1 text-center font-semibold">Total</th>
            <th className="border border-gray-200 px-1 py-1 text-center font-semibold">Grade</th>
            <th className="border border-gray-200 px-1 py-1 text-center font-semibold">GP</th>
          </tr>
        </thead>
        <tbody>
          {term.subjects.map((s, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="border border-gray-200 px-2 py-1 font-medium text-gray-800">{s.subjectName}</td>
              <td className="border border-gray-200 px-1 py-1 text-center text-gray-600">{s.classScore}</td>
              <td className="border border-gray-200 px-1 py-1 text-center text-gray-600">{s.examScore}</td>
              <td className="border border-gray-200 px-1 py-1 text-center font-semibold text-gray-800">{s.total}</td>
              <td className="border border-gray-200 px-1 py-1 text-center">
                <GradeBadge grade={s.grade} />
              </td>
              <td className="border border-gray-200 px-1 py-1 text-center text-gray-600">{s.gradePoint.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {term.classTeacherRemarks && (
        <p className="mt-1 px-1 text-[9px] italic text-gray-500">
          Remarks: "{term.classTeacherRemarks}"
        </p>
      )}
    </div>
  );
}

export default function TranscriptView({ transcript: t }: TranscriptViewProps) {
  const school = t.schoolInfo;
  const student = t.studentInfo;
  const yearGroups = groupByYear(t.terms);
  const today = new Date().toLocaleDateString('en-GH', { dateStyle: 'long' });

  // Compute stats
  const allSubjectGps: Record<string, number[]> = {};
  for (const term of t.terms) {
    for (const s of term.subjects) {
      if (!allSubjectGps[s.subjectName]) allSubjectGps[s.subjectName] = [];
      allSubjectGps[s.subjectName].push(s.gradePoint);
    }
  }
  const subjectAvgs = Object.entries(allSubjectGps)
    .map(([name, gps]) => ({
      name,
      avg: gps.reduce((a, b) => a + b, 0) / gps.length,
    }))
    .sort((a, b) => b.avg - a.avg);
  const strongest = subjectAvgs[0];
  const weakest = subjectAvgs[subjectAvgs.length - 1];
  const bestTerm = t.terms.length
    ? t.terms.reduce((best, term) => (term.gpa > best.gpa ? term : best))
    : null;

  return (
    <div className="print-area mx-auto max-w-[595px] bg-white text-sm">
      {/* ── Header ── */}
      <div className="transcript-header no-page-break mb-4 border-b-2 border-gray-200 pb-4 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
          <span className="text-sm font-bold text-primary">GES</span>
        </div>
        <h1 className="text-lg font-bold uppercase tracking-wider text-gray-900">
          {school.name}
        </h1>
        <p className="text-[10px] text-gray-500">
          {school.region} Region {school.district ? `· ${school.district}` : ''}
        </p>
        {school.motto && (
          <p className="mt-0.5 text-[9px] italic text-gray-400">"{school.motto}"</p>
        )}
        <div className="mt-2 inline-block rounded-full border border-gray-300 bg-white px-5 py-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700">
            Academic Transcript
          </p>
        </div>
        <p className="mt-1 text-[8px] text-gray-400">Generated: {today}</p>
      </div>

      {/* ── Student Identification ── */}
      <div className="no-page-break mb-4">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
          Student Identification
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-gray-200 p-3 text-[10px]">
          {([
            ['Full Name', student.fullName],
            ['Index Number', student.studentIndex],
            ['Gender', student.gender],
            ['Date of Birth', student.dateOfBirth],
            ['Programme', t.programName],
            ['Admission Date', t.admissionDate],
            ['Status', student.isActive ? 'Active' : 'Graduated'],
            ['School', school.name],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-gray-500">{k}:</span>
              <span className="font-medium text-gray-800 text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cumulative Summary ── */}
      <div className="no-page-break mb-4 grid grid-cols-4 gap-2">
        <div className="rounded border border-gray-200 p-2.5 text-center">
          <p className={cn('text-xl font-bold', gpaColor(t.cgpa))}>{t.cgpa.toFixed(2)}</p>
          <p className="text-[8px] text-gray-500">Cumulative GPA</p>
        </div>
        <div className="rounded border border-gray-200 p-2.5 text-center">
          <span className={cn(
            'inline-block rounded border px-2 py-0.5 text-[10px] font-bold',
            classificationColor(t.classification)
          )}>
            {t.classification}
          </span>
          <p className="mt-0.5 text-[8px] text-gray-500">Classification</p>
        </div>
        <div className="rounded border border-gray-200 p-2.5 text-center">
          <p className="text-xl font-bold text-gray-800">
            {t.totalTermsCompleted}<span className="text-sm text-gray-400">/9</span>
          </p>
          <p className="text-[8px] text-gray-500">Terms Completed</p>
        </div>
        <div className="rounded border border-gray-200 p-2.5 text-center">
          <p className={cn('text-lg font-bold', bestTerm ? gpaColor(bestTerm.gpa) : 'text-gray-300')}>
            {bestTerm ? bestTerm.gpa.toFixed(2) : '—'}
          </p>
          <p className="text-[8px] text-gray-500">Best Term GPA</p>
          {bestTerm && <p className="text-[7px] text-gray-400">{bestTerm.termLabel}</p>}
        </div>
      </div>

      {/* ── Subject Highlights ── */}
      {strongest && weakest && strongest.name !== weakest.name && (
        <div className="no-page-break mb-4 grid grid-cols-2 gap-3">
          <div className="rounded border border-green-200 bg-green-50 p-2.5">
            <p className="text-[8px] font-semibold uppercase tracking-wide text-green-600">Strongest Subject</p>
            <p className="mt-0.5 text-[11px] font-bold text-green-800">{strongest.name}</p>
            <p className="text-[9px] text-green-600">Avg GP: {strongest.avg.toFixed(2)}</p>
          </div>
          <div className="rounded border border-red-200 bg-red-50 p-2.5">
            <p className="text-[8px] font-semibold uppercase tracking-wide text-red-600">Weakest Subject</p>
            <p className="mt-0.5 text-[11px] font-bold text-red-800">{weakest.name}</p>
            <p className="text-[9px] text-red-600">Avg GP: {weakest.avg.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* ── Academic Record (per year group) ── */}
      <div className="mb-4">
        <p className="mb-2 border-b border-gray-200 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1B6B3A' }}>
          Academic Record
        </p>

        {Array.from(yearGroups.entries()).map(([yearGroup, terms]) => (
          <div key={yearGroup} className="transcript-year-section mb-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                {yearGroup}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            {terms.map((term, i) => (
              <TermTable key={i} term={term} />
            ))}
          </div>
        ))}
      </div>

      {/* ── Signatures ── */}
      <div className="no-page-break mt-6 grid grid-cols-3 gap-6 text-[9px] text-gray-500">
        <div className="border-t border-gray-400 pt-2 text-center">Class Teacher</div>
        <div className="border-t border-gray-400 pt-2 text-center">Headmaster / Headmistress</div>
        <div className="border-t border-gray-400 pt-2 text-center">School Stamp & Date</div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-4 border-t border-gray-200 pt-2 text-center text-[7px] text-gray-400">
        <p>Generated by GES SHS Academic System | {school.name} | {today}</p>
      </div>
    </div>
  );
}
