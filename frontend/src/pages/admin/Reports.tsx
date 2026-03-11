import { useState } from 'react';
import {
  FileText, CheckCircle, XCircle, Play,
  Users, BookOpen, TrendingUp, Award, RefreshCw,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

import {
  useScoreCompletionStatus,
  useGenerateTermResults,
} from '../../hooks/admin/useReports';
import { useGetAllClassRooms } from '../../hooks/admin/useAcademic';
import { useSchoolStore } from '../../store/school.store';
import type { TermResultDto } from '../../types/admin.types';
import { cn } from '../../lib/utils';

// ==================== HELPERS ====================

function gpaColor(gpa: number) {
  if (gpa >= 3.5) return 'text-green-600';
  if (gpa >= 2.5) return 'text-blue-600';
  if (gpa >= 1.5) return 'text-amber-600';
  return 'text-red-600';
}

// ==================== SUB-COMPONENTS ====================

function ResultsTable({ results }: { results: TermResultDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Index</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">GPA</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Classification</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Passed</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Failed</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Attendance</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Position</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {results.map((r) => (
            <tr key={r.studentId} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{r.studentName}</td>
              <td className="px-4 py-3 text-gray-500">{r.studentIndex}</td>
              <td className="px-4 py-3 text-center">
                <span className={cn('font-bold', gpaColor(r.gpa ?? 0))}>
                  {r.gpa?.toFixed(2) ?? '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-gray-600">{r.classification ?? '—'}</td>
              <td className="px-4 py-3 text-center font-medium text-green-600">{r.subjectsPassed}</td>
              <td className="px-4 py-3 text-center font-medium text-red-600">{r.subjectsFailed}</td>
              <td className="px-4 py-3 text-center text-gray-600">
                {r.attendancePercentage != null
                  ? `${r.attendancePercentage.toFixed(0)}%`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {r.positionInClass ?? '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function Reports() {
  const { toast } = useToast();
  const { schoolId, currentTermId, currentTermLabel } = useSchoolStore();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [generatedResults, setGeneratedResults] = useState<TermResultDto[] | null>(null);

  const { data: classRooms = [], isLoading: classesLoading } = useGetAllClassRooms(
    schoolId ?? 0,
  );

  const classId = selectedClassId ? Number(selectedClassId) : null;

  const { data: scoreStatus, isLoading: statusLoading, refetch: refetchStatus } =
    useScoreCompletionStatus(classId, currentTermId);

  const generateMutation = useGenerateTermResults();

  const classOptions = classRooms.map((c) => ({ value: String(c.id), label: c.displayName }));
  const completionPct = scoreStatus?.overallCompletionPercentage ?? 0;
  const allComplete = scoreStatus?.allComplete ?? false;

  function handleGenerate() {
    if (!classId || !currentTermId) return;
    generateMutation.mutate(
      { classRoomId: classId, termId: currentTermId },
      {
        onSuccess: (data) => {
          setGeneratedResults(data.results);
          toast({ title: 'Results generated', description: `${data.totalGenerated} term result(s) generated successfully`, variant: 'success' });
          refetchStatus();
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to generate term results. Please try again.', variant: 'danger' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Check score completion status and generate term results for your classes.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              {classesLoading ? (
                <div className="flex h-10 items-center gap-2 text-sm text-gray-500">
                  <Spinner size="sm" />
                  Loading classes...
                </div>
              ) : (
                <Select
                  label="Select Class"
                  placeholder="Choose a class..."
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  options={classOptions}
                />
              )}
            </div>

            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Current Term
              </label>
              <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                {currentTermLabel ?? 'No active term set'}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!classId || !currentTermId || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Spinner size="sm" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Generate Results
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Score Completion Status */}
      {classId && currentTermId && (
        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Score Completion Status</h2>
            <Button variant="ghost" size="sm" onClick={() => refetchStatus()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {statusLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : scoreStatus ? (
            <div className="space-y-6 p-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <Users className="mx-auto mb-1 h-5 w-5 text-gray-500" />
                  <div className="text-2xl font-bold text-gray-900">{scoreStatus.totalStudents}</div>
                  <div className="text-xs text-gray-500">Students</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <BookOpen className="mx-auto mb-1 h-5 w-5 text-gray-500" />
                  <div className="text-2xl font-bold text-gray-900">{scoreStatus.totalSubjects}</div>
                  <div className="text-xs text-gray-500">Subjects</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <TrendingUp className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {completionPct.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
                <div className={cn('rounded-lg p-4 text-center', allComplete ? 'bg-green-50' : 'bg-amber-50')}>
                  {allComplete
                    ? <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-600" />
                    : <XCircle className="mx-auto mb-1 h-5 w-5 text-amber-600" />
                  }
                  <div className={cn('text-sm font-semibold', allComplete ? 'text-green-700' : 'text-amber-700')}>
                    {allComplete ? 'Ready to Generate' : 'Incomplete'}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Overall progress</span>
                  <span className="font-medium text-gray-900">{completionPct.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={cn('h-full rounded-full transition-all', allComplete ? 'bg-green-500' : 'bg-primary')}
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              {/* Per-subject table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Tutor</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">With Scores</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Missing</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scoreStatus.subjects.map((s) => (
                      <tr key={s.subjectId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.subjectName}</td>
                        <td className="px-4 py-3 text-gray-500">{s.tutorName || '—'}</td>
                        <td className="px-4 py-3 text-center font-medium text-green-600">
                          {s.studentsWithScores}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-red-600">
                          {s.studentsWithoutScores}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.studentsWithoutScores === 0 ? (
                            <Badge variant="success">Complete</Badge>
                          ) : (
                            <Badge variant="warning">{s.studentsWithoutScores} missing</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-gray-500">
              No data available for the selected class and term.
            </div>
          )}
        </Card>
      )}

      {/* Generated Results */}
      {generatedResults && generatedResults.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-gray-900">
              Generated Results ({generatedResults.length} students)
            </h2>
            <Badge variant="success" className="ml-auto">
              <FileText className="mr-1 h-3 w-3" />
              Generated
            </Badge>
          </div>
          <ResultsTable results={generatedResults} />
        </Card>
      )}

      {/* Empty state */}
      {!classId && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Select a class to view score completion status and generate reports.
          </p>
        </div>
      )}
    </div>
  );
}
