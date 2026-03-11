import { useState, useRef } from 'react';
import { Search, X, Printer, User, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import {
  useClassStudents,
  useGenerateTranscript,
} from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { teacherApi } from '../../api/teacher.api';
import type { StudentSummaryDto } from '../../types/admin.types';
import type { TermTranscriptDto } from '../../types/teacher.types';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/common/Button';
import DownloadButton from '../../components/common/DownloadButton';
import TranscriptView from '../../components/pdf/TranscriptView';
import { getTranscriptFilename } from '../../lib/downloadUtils';

// ==================== HELPERS ====================

// ==================== STUDENT SELECTOR ====================

function StudentSelector({
  students,
  selectedId,
  onSelect,
}: {
  students: StudentSummaryDto[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(search.toLowerCase()) ||
          s.studentIndex.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const selected = students.find((s) => s.id === selectedId);

  return (
    <div className="relative" ref={containerRef}>
      {selected ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary uppercase">
            {selected.fullName.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{selected.fullName}</p>
            <p className="font-mono text-xs text-gray-500">{selected.studentIndex} · {selected.programName}</p>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search student by name or index…"
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Dropdown */}
      {open && !selected && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.slice(0, 20).map((s) => (
            <button
              key={s.id}
              onMouseDown={() => { onSelect(s.id); setSearch(''); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary uppercase">
                {s.fullName.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.fullName}</p>
                <p className="font-mono text-xs text-gray-400">{s.studentIndex}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== GPA CHART ====================

function GpaChart({ terms }: { terms: TermTranscriptDto[] }) {
  const data = terms.map((t) => ({
    term: t.termLabel.replace('Year ', 'Y').replace('Term ', 'T'),
    gpa: t.gpa,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        GPA Progression
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="term" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v: unknown) => [(v as number).toFixed(2), 'GPA']}
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ fontSize: 11 }}
          />
          <ReferenceLine y={2.0} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Pass (2.0)', fontSize: 9, fill: '#f59e0b' }} />
          <ReferenceLine y={1.6} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Min (1.6)', fontSize: 9, fill: '#ef4444' }} />
          <Line
            type="monotone"
            dataKey="gpa"
            stroke="#1B6B3A"
            strokeWidth={2}
            dot={{ r: 4, fill: '#1B6B3A' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function Transcripts() {
  const teacherStore = useTeacherStore();
  const { data: students = [], isLoading: loadingStudents } = useClassStudents();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const { data: transcript, isLoading: loadingTranscript } = useGenerateTranscript(selectedId);

  const completedTerms = transcript?.terms ?? [];
  const totalCompleted = transcript?.totalTermsCompleted ?? 0;

  const transcriptFilename = transcript
    ? getTranscriptFilename(transcript.studentInfo.studentIndex, transcript.studentInfo.fullName)
    : `transcript_student${selectedId}.pdf`;

  return (
      <div className="space-y-6">
        <PageHeader
          title="Student Transcripts"
          subtitle={`${teacherStore.classRoomName ?? 'Your class'} · Transcripts reflect all completed terms`}
        />

        {/* Student selector */}
        <div className="no-print">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Select Student
          </p>
          {loadingStudents ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" className="text-primary" />
            </div>
          ) : (
            <StudentSelector
              students={students}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Compact student grid (when none selected) */}
        {!selectedId && !loadingStudents && students.length > 0 && (
          <div className="no-print grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary uppercase">
                  {s.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{s.fullName}</p>
                  <p className="font-mono text-xs text-gray-400">{s.studentIndex}</p>
                </div>
                <User className="h-4 w-4 shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        )}

        {/* Loading transcript */}
        {selectedId && loadingTranscript && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary" />
          </div>
        )}

        {/* Transcript viewer */}
        {selectedId && transcript && (
          <div id="transcript-root">
            {/* Action bar */}
            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing <strong>{totalCompleted}</strong> of <strong>9</strong> completed terms
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/print/transcript/${selectedId}`, '_blank')}
                >
                  <Printer className="h-4 w-4" />
                  Print Transcript
                </Button>
                <DownloadButton
                  label="Download PDF"
                  filename={transcriptFilename}
                  fetchFn={() => teacherApi.downloadTranscript(selectedId)}
                  variant="primary"
                  size="sm"
                />
              </div>
            </div>

            {/* Incomplete terms banner */}
            {totalCompleted < 9 && (
              <div className="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                This transcript shows {totalCompleted} of 9 completed terms. Remaining terms will appear as pending.
              </div>
            )}

            {/* GPA chart (interactive, not in print view) */}
            {completedTerms.length > 1 && (
              <div className="mb-4 no-print">
                <GpaChart terms={completedTerms} />
              </div>
            )}

            {/* Transcript document */}
            <div ref={transcriptRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden p-8">
              <TranscriptView transcript={transcript} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedId && !loadingStudents && students.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <User className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No students found in this class.</p>
          </div>
        )}
      </div>
  );
}
