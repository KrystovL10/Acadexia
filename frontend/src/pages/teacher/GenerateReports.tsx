import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, XCircle, AlertTriangle, Download, Eye, Pencil,
  FileText, Printer, X, ChevronDown,
} from 'lucide-react';
import {
  useReportReadiness,
  useGenerateReports,
  useDownloadReport,
  useUpdateRemarks,
} from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import { teacherApi } from '../../api/teacher.api';
import type { TermResultDto, UpdateRemarksRequest } from '../../types/teacher.types';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DownloadButton from '../../components/common/DownloadButton';
import ProgressModal from '../../components/common/ProgressModal';
import TerminalReportView from '../../components/pdf/TerminalReportView';
import Spinner from '../../components/ui/Spinner';
import { cn } from '../../lib/utils';

// ==================== HELPERS ====================

function gpaColor(gpa: number) {
  if (gpa >= 3.0) return 'text-green-600 bg-green-50';
  if (gpa >= 2.0) return 'text-blue-600 bg-blue-50';
  if (gpa >= 1.6) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function positionBadge(pos: number) {
  if (pos === 1) return 'bg-yellow-400 text-yellow-900';
  if (pos === 2) return 'bg-gray-300 text-gray-800';
  if (pos === 3) return 'bg-amber-600 text-white';
  return 'bg-gray-100 text-gray-600';
}

// ==================== READINESS CARD ====================

function ReadinessCard({
  classRoomId,
  termId,
  studentsCount,
  onGenerate,
}: {
  classRoomId: number | null;
  termId: number | null;
  studentsCount: number;
  onGenerate: () => void;
}) {
  const { data: readiness, isLoading } = useReportReadiness(classRoomId, termId);

  if (isLoading) {
    return (
      <Card title="Pre-Generation Checklist">
        <div className="flex justify-center py-8">
          <Spinner size="md" className="text-primary" />
        </div>
      </Card>
    );
  }

  if (!readiness) {
    return (
      <Card title="Pre-Generation Checklist">
        <p className="text-sm text-gray-500">
          {!termId ? 'No active term set. Contact your administrator.' : 'Could not load readiness status.'}
        </p>
      </Card>
    );
  }

  const checks = [
    {
      ok: readiness.allScoresSubmitted,
      label: `All score entries submitted (${readiness.missingScoreSubjects.length === 0 ? 'all' : `${readiness.missingScoreSubjects.length} missing`})`,
      failAction: { label: 'Go to Score Overview', to: '/teacher/scores' },
      detail: readiness.missingScoreSubjects.length > 0
        ? `Missing: ${readiness.missingScoreSubjects.join(', ')}`
        : undefined,
    },
    {
      ok: readiness.attendanceRecorded,
      label: 'Attendance data recorded for this term',
      failAction: { label: 'Go to Attendance', to: '/teacher/attendance' },
    },
    {
      ok: !readiness.ready || readiness.ready, // always show as ok (no "locked" endpoint)
      label: 'Term results not yet locked',
    },
  ];

  return (
    <Card title="Pre-Generation Checklist">
      <div className="space-y-3">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-3">
            {check.ok ? (
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            )}
            <div className="flex-1">
              <p className={cn('text-sm', check.ok ? 'text-gray-700' : 'text-gray-900 font-medium')}>
                {check.label}
              </p>
              {check.detail && (
                <p className="text-xs text-red-600 mt-0.5">{check.detail}</p>
              )}
              {!check.ok && check.failAction && (
                <Link
                  to={check.failAction.to}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {check.failAction.label} →
                </Link>
              )}
            </div>
          </div>
        ))}

        <div className={cn(
          'mt-4 rounded-lg px-4 py-3',
          readiness.ready
            ? 'border border-green-200 bg-green-50'
            : 'border border-amber-200 bg-amber-50'
        )}>
          <p className={cn(
            'text-sm font-medium',
            readiness.ready ? 'text-green-700' : 'text-amber-700'
          )}>
            {readiness.ready
              ? '✅ All checks passed. Ready to generate reports.'
              : '⚠️ Complete the checklist before generating reports.'}
          </p>
          {readiness.message && !readiness.ready && (
            <p className="mt-1 text-xs text-amber-600">{readiness.message}</p>
          )}
        </div>

        {readiness.ready && (
          <Button size="lg" variant="primary" onClick={onGenerate} className="w-full mt-2">
            <FileText className="h-5 w-5" />
            Generate All Reports for {studentsCount} Students
          </Button>
        )}
      </div>
    </Card>
  );
}

// ==================== CONFIRM MODAL ====================

function ConfirmModal({
  studentsCount,
  termLabel,
  onConfirm,
  onClose,
}: {
  studentsCount: number;
  termLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Generate Terminal Reports</h3>
        <p className="mt-2 text-sm text-gray-600">
          You are about to generate terminal reports for{' '}
          <strong>{studentsCount} students</strong> in <strong>{termLabel}</strong>.
        </p>
        <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <p>This will:</p>
          <ul className="ml-4 list-disc space-y-1 text-xs">
            <li>Calculate final GPAs and assign class positions</li>
            <li>Generate AI-powered teacher remarks</li>
            <li>Flag at-risk students with early warnings</li>
            <li>Produce printable PDF report cards</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">Estimated time: 30–60 seconds</p>
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={onConfirm} className="flex-1">
            <FileText className="h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== SUCCESS BANNER ====================

function SuccessBanner({
  results,
  termId,
}: {
  results: TermResultDto[];
  termId: number;
}) {
  const avgGpa = results.length
    ? results.reduce((sum, r) => sum + r.gpa, 0) / results.length
    : 0;
  const passed = results.filter((r) => r.gpa >= 1.6).length;

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="font-semibold text-green-800">
              Reports generated for {results.length} students
            </p>
            <p className="mt-1 text-sm text-green-700">
              Avg GPA: {avgGpa.toFixed(2)} · Pass rate: {results.length > 0 ? Math.round((passed / results.length) * 100) : 0}%
            </p>
          </div>
        </div>
        <DownloadButton
          label="Download All (ZIP)"
          filename={`class_reports_term${termId}.zip`}
          fetchFn={() => teacherApi.downloadClassReports(termId)}
          variant="primary"
          size="sm"
          isLargeFile
        />
      </div>
    </div>
  );
}

// ==================== PREVIEW MODAL ====================

function PreviewModal({
  result,
  schoolName,
  onClose,
  onDownload,
  onEditRemarks,
  isDownloading,
}: {
  result: TermResultDto;
  schoolName: string;
  onClose: () => void;
  onDownload: () => void;
  onEditRemarks: () => void;
  isDownloading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <p className="font-semibold text-gray-900">Report Preview — {result.studentName}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEditRemarks}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Remarks
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button size="sm" variant="primary" onClick={onDownload} loading={isDownloading}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
            <button onClick={onClose} className="ml-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* A4 preview content */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="mx-auto bg-white p-8 shadow-sm">
            <TerminalReportView
              termResult={result}
              schoolInfo={{ name: schoolName }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== EDIT REMARKS MODAL ====================

function EditRemarksModal({
  result,
  onClose,
  onSave,
  isSaving,
}: {
  result: TermResultDto;
  onClose: () => void;
  onSave: (data: UpdateRemarksRequest) => void;
  isSaving: boolean;
}) {
  const [remarks, setRemarks] = useState(result.classTeacherRemarks ?? '');
  const [conduct, setConduct] = useState(result.conductRating ?? 'Good');

  const CONDUCT_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="font-semibold text-gray-900">Edit Remarks</p>
            <p className="text-xs text-gray-500">{result.studentName} · {result.studentIndex}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Remarks textarea */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Class Teacher Remarks</label>
              <span className={cn('text-xs', remarks.length > 280 ? 'text-red-500' : 'text-gray-400')}>
                {remarks.length}/300
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={300}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter teacher remarks…"
            />
          </div>

          {/* Conduct rating */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Conduct Rating</label>
            <div className="relative">
              <select
                value={conduct}
                onChange={(e) => setConduct(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-primary focus:outline-none"
              >
                {CONDUCT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 italic border border-gray-100">
            <p className="font-semibold not-italic text-gray-500 uppercase tracking-wide text-[10px] mb-1">Preview</p>
            {remarks || <span className="text-gray-300">No remarks entered</span>}
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={isSaving}
              onClick={() => onSave({ classTeacherRemarks: remarks, conductRating: conduct })}
            >
              Save Remarks
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== REPORT CARD ====================

function ReportCard({
  result,
  onPreview,
  onEditRemarks,
  onDownload,
  isDownloading,
}: {
  result: TermResultDto;
  onPreview: () => void;
  onEditRemarks: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow sm:flex-row sm:items-center">
      {/* Avatar + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary uppercase">
          {result.studentName.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{result.studentName}</p>
            <span className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
              positionBadge(result.positionInClass)
            )}>
              #{result.positionInClass}
            </span>
          </div>
          <p className="font-mono text-xs text-gray-400">{result.studentIndex}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn('rounded-lg px-2 py-1 font-bold', gpaColor(result.gpa))}>
          GPA {result.gpa.toFixed(2)}
        </span>
        <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-600">
          {result.subjectsPassed}P / {result.subjectsFailed}F
        </span>
        <span className={cn(
          'rounded-lg px-2 py-1',
          result.attendancePercentage < 75 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
        )}>
          {result.attendancePercentage.toFixed(0)}% att.
        </span>
        {result.conductRating && (
          <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-600">
            {result.conductRating}
          </span>
        )}
        {result.isApproved === false && result.gpa < 1.6 && (
          <span className="flex items-center gap-0.5 rounded-lg bg-amber-50 px-2 py-1 text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            At risk
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onPreview}
          title="Preview Report"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={onEditRemarks}
          title="Edit Remarks"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDownload}
          disabled={isDownloading}
          title="Download PDF"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40"
        >
          {isDownloading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

type SortKey = 'gpa' | 'name' | 'position';
type FilterKey = 'all' | 'passed' | 'failed' | 'warnings';

export default function GenerateReports() {
  const teacherStore = useTeacherStore();
  const { currentTermId: schoolTermId, currentTermLabel, schoolName } = useSchoolStore();
  const termId = teacherStore.currentTermId ?? schoolTermId;
  const termLabel = teacherStore.currentTermLabel ?? currentTermLabel ?? 'Current Term';
  const classRoomId = teacherStore.classRoomId;

  const generateReports = useGenerateReports();
  const downloadReport = useDownloadReport();
  const updateRemarks = useUpdateRemarks();

  const [step, setStep] = useState<'idle' | 'confirming' | 'generating' | 'done'>('idle');
  const [results, setResults] = useState<TermResultDto[]>([]);
  const [previewResult, setPreviewResult] = useState<TermResultDto | null>(null);
  const [editRemarksResult, setEditRemarksResult] = useState<TermResultDto | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('position');
  const [filterBy, setFilterBy] = useState<FilterKey>('all');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  function handleGenerate() {
    if (!termId) return;
    setStep('generating');
    generateReports.mutate(termId, {
      onSuccess: (res) => {
        const generated = res.data.data ?? [];
        setResults(generated);
      },
      onError: () => {
        setStep('idle');
      },
    });
  }

  const studentsCount = results.length;

  const sortedFiltered = (() => {
    let list = [...results];
    if (filterBy === 'passed') list = list.filter((r) => r.gpa >= 1.6);
    else if (filterBy === 'failed') list = list.filter((r) => r.gpa < 1.6);
    else if (filterBy === 'warnings') list = list.filter((r) => r.gpa < 2.0 || r.attendancePercentage < 75);

    if (sortBy === 'gpa') list.sort((a, b) => b.gpa - a.gpa);
    else if (sortBy === 'name') list.sort((a, b) => a.studentName.localeCompare(b.studentName));
    else list.sort((a, b) => a.positionInClass - b.positionInClass);

    return list;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Terminal Reports — ${termLabel}`}
        subtitle={teacherStore.classRoomName ?? 'Your class'}
        action={
          step === 'done' && termId && results.length > 0 ? (
            <DownloadButton
              label="Download All (ZIP)"
              filename={`class_reports_term${termId}.zip`}
              fetchFn={() => teacherApi.downloadClassReports(termId)}
              variant="outline"
              size="md"
              isLargeFile
            />
          ) : undefined
        }
      />

      {/* Readiness card — hide after done */}
      {step !== 'done' && (
        <ReadinessCard
          classRoomId={classRoomId}
          termId={termId}
          studentsCount={0}
          onGenerate={() => setStep('confirming')}
        />
      )}

      {/* Success banner */}
      {step === 'done' && results.length > 0 && termId && (
        <SuccessBanner results={results} termId={termId} />
      )}

      {/* Results list */}
      {step === 'done' && results.length > 0 && (
        <div className="space-y-4">
          {/* Sort/filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
              {(['position', 'gpa', 'name'] as SortKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    'rounded-md px-3 py-1.5 font-medium capitalize transition-colors',
                    sortBy === s ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {s === 'position' ? 'Position' : s === 'gpa' ? 'GPA' : 'Name'}
                </button>
              ))}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
              {(['all', 'passed', 'failed', 'warnings'] as FilterKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterBy(f)}
                  className={cn(
                    'rounded-md px-3 py-1.5 font-medium capitalize transition-colors',
                    filterBy === f ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {f === 'warnings' ? 'At Risk' : f}
                </button>
              ))}
            </div>

            <p className="ml-auto text-xs text-gray-400">
              {sortedFiltered.length} of {results.length} students
            </p>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {sortedFiltered.map((result) => (
              <ReportCard
                key={result.id}
                result={result}
                onPreview={() => setPreviewResult(result)}
                onEditRemarks={() => setEditRemarksResult(result)}
                onDownload={() => {
                  if (!termId) return;
                  setDownloadingId(result.studentId);
                  downloadReport.mutate(
                    { studentId: result.studentId, termId },
                    { onSettled: () => setDownloadingId(null) }
                  );
                }}
                isDownloading={downloadingId === result.studentId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {step === 'confirming' && (
        <ConfirmModal
          studentsCount={studentsCount}
          termLabel={termLabel}
          onConfirm={handleGenerate}
          onClose={() => setStep('idle')}
        />
      )}

      {step === 'generating' && classRoomId && termId && (
        <ProgressModal
          isOpen
          title="Generating Terminal Reports"
          classRoomId={classRoomId}
          termId={termId}
          pollFn={(cId, tId) =>
            teacherApi
              .getReportProgress(cId, tId)
              .then((res) => res.data.data ?? null)
          }
          onComplete={() => {
            setTimeout(() => setStep('done'), 400);
          }}
          onClose={() => setStep('done')}
        />
      )}

      {previewResult && termId && (
        <PreviewModal
          result={previewResult}
          schoolName={schoolName ?? 'Ghana Education Service'}
          onClose={() => setPreviewResult(null)}
          onDownload={() => {
            downloadReport.mutate({ studentId: previewResult.studentId, termId });
          }}
          onEditRemarks={() => {
            setEditRemarksResult(previewResult);
            setPreviewResult(null);
          }}
          isDownloading={downloadReport.isPending}
        />
      )}

      {editRemarksResult && (
        <EditRemarksModal
          result={editRemarksResult}
          onClose={() => setEditRemarksResult(null)}
          isSaving={updateRemarks.isPending}
          onSave={(data) => {
            updateRemarks.mutate(
              { termResultId: editRemarksResult.id, data },
              {
                onSuccess: () => {
                  setResults((prev) =>
                    prev.map((r) =>
                      r.id === editRemarksResult.id
                        ? { ...r, ...data }
                        : r
                    )
                  );
                  setEditRemarksResult(null);
                },
              }
            );
          }}
        />
      )}

      {/* No term warning */}
      {!termId && step === 'idle' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-700">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            No active term is set. Contact your administrator to set a current term.
          </p>
        </div>
      )}
    </div>
  );
}
