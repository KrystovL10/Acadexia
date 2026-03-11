import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useTutorAssignments, useImportScores, useDownloadTemplate } from '../../hooks/tutor';
import type { TutorAssignmentDto, BulkScoreResultDto } from '../../types/tutor.types';
import { cn } from '../../lib/utils';
import Badge from '../../components/ui/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/ui/Spinner';
import PageHeader from '../../components/common/PageHeader';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreviewRow {
  rowNum: number;
  studentIndex: string;
  studentName: string;
  classScore: string;
  examScore: string;
  validationError: string;
}

// ── Ghana grade preview ───────────────────────────────────────────────────────

function previewGrade(cs: string, es: string): string {
  const c = parseFloat(cs);
  const e = parseFloat(es);
  if (isNaN(c) || isNaN(e)) return '—';
  const t = c + e;
  if (t >= 80) return 'A1';
  if (t >= 70) return 'B2';
  if (t >= 65) return 'B3';
  if (t >= 60) return 'C4';
  if (t >= 55) return 'C5';
  if (t >= 50) return 'C6';
  if (t >= 45) return 'D7';
  if (t >= 40) return 'E8';
  return 'F9';
}

function gradeColor(grade: string): string {
  if (grade === 'A1') return 'text-green-700 font-semibold';
  if (grade.startsWith('B')) return 'text-blue-700 font-semibold';
  if (grade.startsWith('C')) return 'text-yellow-700 font-semibold';
  if (grade === 'D7' || grade === 'E8') return 'text-orange-600 font-semibold';
  if (grade === 'F9') return 'text-red-600 font-bold';
  return 'text-gray-400';
}

// ── Excel parser ──────────────────────────────────────────────────────────────

function parseExcelFile(file: File): Promise<PreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        // Returns array-of-arrays; defval '' ensures empty cells don't vanish
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        // Row 0 = merged title, Row 1 = headers, Row 2+ = data
        const result: PreviewRow[] = [];
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          const idx = String(row[0] ?? '').trim();
          if (!idx) continue;

          const name    = String(row[1] ?? '').trim();
          const csRaw   = row[2] != null && row[2] !== '' ? String(row[2]) : '';
          const esRaw   = row[3] != null && row[3] !== '' ? String(row[3]) : '';

          let validationError = '';
          const cs = parseFloat(csRaw);
          const es = parseFloat(esRaw);

          if (csRaw !== '' && (isNaN(cs) || cs < 0 || cs > 30)) {
            validationError = 'Class score must be 0–30';
          } else if (esRaw !== '' && (isNaN(es) || es < 0 || es > 70)) {
            validationError = 'Exam score must be 0–70';
          }

          result.push({
            rowNum: i + 1,
            studentIndex: idx,
            studentName: name,
            classScore: csRaw,
            examScore: esRaw,
            validationError,
          });
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Select Assignment', 'Upload File', 'Results'] as const;

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav className="flex items-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const stepNum = (idx + 1) as 1 | 2 | 3;
        const done    = current > stepNum;
        const active  = current === stepNum;

        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  done   ? 'bg-green-500 text-white'
                  : active ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
                )}
              >
                {done ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : stepNum}
              </div>
              <span
                className={cn(
                  'text-sm',
                  active ? 'font-semibold text-gray-900' : 'text-gray-500'
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('mx-3 h-px w-12 flex-shrink-0', done ? 'bg-green-500' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ── Assignment status helpers (mirrors ScoreEntry) ────────────────────────────

type AssignmentStatus = 'LOCKED' | 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';

function getStatus(a: TutorAssignmentDto): AssignmentStatus {
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

// ── Main component ────────────────────────────────────────────────────────────

export default function BulkUpload() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<TutorAssignmentDto | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkScoreResultDto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: assignments = [], isLoading: loadingAssignments } = useTutorAssignments();
  const importScores = useImportScores();
  const { download } = useDownloadTemplate();

  // ── File handling ───────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseError('Only .xlsx or .xls files are accepted.');
      return;
    }
    setUploadFile(file);
    setParseError('');
    setIsParsing(true);
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        setParseError('No student rows found. Make sure you are using the downloaded template.');
      }
      setPreviewRows(rows);
    } catch {
      setParseError('Could not read the file. Make sure it is a valid Excel file.');
      setPreviewRows([]);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const clearFile = () => {
    setUploadFile(null);
    setPreviewRows([]);
    setParseError('');
  };

  // ── Download template ───────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!selected) return;
    const filename = `score_template_${selected.className}_${selected.subjectName}.xlsx`
      .replace(/\s+/g, '_')
      .toLowerCase();
    download(selected.classRoomId, selected.subjectId, selected.termId, filename);
  };

  // ── Submit upload ───────────────────────────────────────────────────────────

  const handleUpload = () => {
    if (!selected || !uploadFile) return;

    importScores.mutate(
      {
        classRoomId: selected.classRoomId,
        subjectId:   selected.subjectId,
        termId:      selected.termId,
        file:        uploadFile,
      },
      {
        onSuccess: (res) => {
          setUploadResult(res.data.data);
          setStep(3);
        },
      }
    );
  };

  // ── Validation summary ──────────────────────────────────────────────────────

  const invalidCount  = previewRows.filter((r) => r.validationError).length;
  const filledCount   = previewRows.filter((r) => r.classScore !== '' || r.examScore !== '').length;
  const canSubmit     = uploadFile !== null && previewRows.length > 0 && invalidCount === 0 && !selected?.isTermLocked;

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = () => {
    setStep(1);
    setSelected(null);
    clearFile();
    setUploadResult(null);
    importScores.reset();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Bulk Score Upload"
        subtitle="Upload student scores using a filled Excel template"
      />

      <StepIndicator current={step} />

      {/* ══ STEP 1: Select Assignment ══ */}
      {step === 1 && (
        <div>
          <p className="mb-4 text-sm text-gray-600">
            Select the class and subject you want to upload scores for.
          </p>

          {loadingAssignments && (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" className="text-primary" />
            </div>
          )}

          {!loadingAssignments && assignments.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-sm text-gray-500">No assignments found for this term.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a) => {
              const status   = getStatus(a);
              const badge    = statusBadge[status];
              const pct      = Math.min(100, Math.round(a.completionPercentage));
              const isChosen = selected?.classRoomId === a.classRoomId && selected?.subjectId === a.subjectId;

              return (
                <button
                  key={`${a.classRoomId}-${a.subjectId}`}
                  disabled={a.isTermLocked}
                  onClick={() => setSelected(a)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    a.isTermLocked
                      ? 'cursor-not-allowed opacity-50'
                      : isChosen
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{a.subjectName}</p>
                      <p className="truncate text-sm text-gray-500">{a.className}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{a.programName}</p>
                    </div>
                    <Badge variant={badge.variant} className="shrink-0 text-[10px]">
                      {badge.label}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-primary' : 'bg-gray-300'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {a.scoresSubmitted}/{a.studentsCount} submitted · {pct}%
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={() => setStep(2)}>
                Continue with {selected.subjectName} — {selected.className}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 2: Upload ══ */}
      {step === 2 && selected && (
        <div className="space-y-6">
          {/* Assignment context bar */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setStep(1); clearFile(); }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Change
              </button>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-gray-900">{selected.subjectName}</span>
              <span className="text-gray-400 text-sm">{selected.className}</span>
              <span className="text-gray-400 text-sm">·</span>
              <span className="text-gray-400 text-sm">{selected.termLabel}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template
            </Button>
          </div>

          {/* Drop zone */}
          {!uploadFile && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-14 transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              )}
            >
              <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isDragging ? 'Drop file here' : 'Drag & drop your Excel file, or click to browse'}
                </p>
                <p className="mt-1 text-xs text-gray-400">Accepts .xlsx and .xls files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}

          {/* Parsing spinner */}
          {isParsing && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Spinner size="md" className="text-primary" />
              <span className="text-sm text-gray-500">Parsing file…</span>
            </div>
          )}

          {/* Preview table */}
          {uploadFile && previewRows.length > 0 && !isParsing && (
            <div className="rounded-xl border border-gray-200 bg-white">
              {/* Preview header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h6a1 1 0 010 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                    <p className="text-xs text-gray-400">
                      {previewRows.length} students · {filledCount} with scores entered
                      {invalidCount > 0 && (
                        <span className="ml-2 text-red-600 font-medium">{invalidCount} validation error{invalidCount > 1 ? 's' : ''}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button onClick={clearFile} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Remove file
                </button>
              </div>

              {/* Validation errors warning */}
              {invalidCount > 0 && (
                <div className="border-b border-yellow-100 bg-yellow-50 px-5 py-2.5">
                  <p className="text-sm text-yellow-800">
                    Fix the {invalidCount} validation error{invalidCount > 1 ? 's' : ''} highlighted below before uploading.
                  </p>
                </div>
              )}

              {/* Table */}
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr className="border-b border-gray-200">
                      <th className="py-2.5 px-4 text-left">Row</th>
                      <th className="py-2.5 px-4 text-left">Index No.</th>
                      <th className="py-2.5 px-4 text-left">Student Name</th>
                      <th className="py-2.5 px-4 text-center w-28">Class Score</th>
                      <th className="py-2.5 px-4 text-center w-28">Exam Score</th>
                      <th className="py-2.5 px-4 text-center w-16">Total</th>
                      <th className="py-2.5 px-4 text-center w-16">Grade</th>
                      <th className="py-2.5 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const cs   = parseFloat(row.classScore);
                      const es   = parseFloat(row.examScore);
                      const tot  = !isNaN(cs) && !isNaN(es) ? (cs + es).toFixed(1) : '—';
                      const grd  = !isNaN(cs) && !isNaN(es) ? previewGrade(row.classScore, row.examScore) : '—';
                      const hasScore = row.classScore !== '' || row.examScore !== '';
                      const hasError = !!row.validationError;

                      return (
                        <tr
                          key={row.rowNum}
                          className={cn(
                            'border-b border-gray-100',
                            hasError ? 'bg-red-50' : !hasScore ? 'bg-gray-50/50' : 'bg-white'
                          )}
                        >
                          <td className="py-2 px-4 text-gray-400 text-xs">{row.rowNum}</td>
                          <td className="py-2 px-4 font-mono text-xs text-gray-600">{row.studentIndex}</td>
                          <td className="py-2 px-4 text-gray-900">{row.studentName || <span className="text-gray-400 italic">Unknown</span>}</td>
                          <td className="py-2 px-4 text-center">
                            {row.classScore !== '' ? (
                              <span className={cn('font-medium', hasError && row.validationError.includes('Class') ? 'text-red-600' : 'text-gray-800')}>
                                {row.classScore}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {row.examScore !== '' ? (
                              <span className={cn('font-medium', hasError && row.validationError.includes('Exam') ? 'text-red-600' : 'text-gray-800')}>
                                {row.examScore}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center text-sm font-medium text-gray-800">
                            {hasScore ? tot : <span className="text-gray-300">—</span>}
                          </td>
                          <td className={cn('py-2 px-4 text-center text-sm', gradeColor(grd))}>
                            {hasScore && grd !== '—' ? grd : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 px-4">
                            {hasError ? (
                              <span className="text-xs text-red-600 font-medium">{row.validationError}</span>
                            ) : !hasScore ? (
                              <span className="text-xs text-gray-400">No score entered</span>
                            ) : (
                              <span className="text-xs text-green-600">Ready</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Submit bar */}
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-sm text-gray-500">
                  {canSubmit
                    ? `${filledCount} score${filledCount !== 1 ? 's' : ''} ready to upload`
                    : invalidCount > 0
                    ? 'Resolve errors before uploading'
                    : selected.isTermLocked
                    ? 'Term is locked — upload disabled'
                    : 'No scores entered in file'}
                </p>
                <Button
                  variant="primary"
                  disabled={!canSubmit}
                  loading={importScores.isPending}
                  onClick={handleUpload}
                >
                  Upload Scores
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 3: Results ══ */}
      {step === 3 && uploadResult && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
              <p className="text-3xl font-bold text-green-700">{uploadResult.successCount}</p>
              <p className="mt-1 text-sm font-medium text-green-600">Saved</p>
            </div>
            <div className={cn(
              'rounded-xl border p-5 text-center',
              uploadResult.failureCount > 0
                ? 'border-red-200 bg-red-50'
                : 'border-gray-200 bg-gray-50'
            )}>
              <p className={cn('text-3xl font-bold', uploadResult.failureCount > 0 ? 'text-red-600' : 'text-gray-400')}>
                {uploadResult.failureCount}
              </p>
              <p className={cn('mt-1 text-sm font-medium', uploadResult.failureCount > 0 ? 'text-red-500' : 'text-gray-400')}>
                Failed
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <p className="text-3xl font-bold text-gray-700">{uploadResult.totalProcessed}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">Total Processed</p>
            </div>
          </div>

          {/* Message */}
          <div className={cn(
            'flex items-center gap-3 rounded-lg border px-5 py-3',
            uploadResult.failureCount === 0
              ? 'border-green-200 bg-green-50'
              : 'border-yellow-200 bg-yellow-50'
          )}>
            {uploadResult.failureCount === 0 ? (
              <svg className="h-5 w-5 shrink-0 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <p className={cn('text-sm font-medium', uploadResult.failureCount === 0 ? 'text-green-800' : 'text-yellow-800')}>
              {uploadResult.message}
            </p>
          </div>

          {/* Error details */}
          {uploadResult.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white">
              <div className="border-b border-red-100 px-5 py-3">
                <p className="text-sm font-semibold text-red-700">
                  {uploadResult.errors.length} Error{uploadResult.errors.length > 1 ? 's' : ''}
                </p>
              </div>
              <ul className="divide-y divide-gray-100 max-h-64 overflow-auto">
                {uploadResult.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-3 px-5 py-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{err.studentName}</p>
                      <p className="text-xs text-gray-500">{err.errorMessage}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={reset}>
              Upload Another File
            </Button>
            <Button variant="outline" onClick={() => { setStep(2); setUploadResult(null); importScores.reset(); clearFile(); }}>
              Try Again with Same Assignment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
