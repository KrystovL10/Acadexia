import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, TrendingUp, Users, CheckCircle, XCircle, Calendar } from 'lucide-react';

import Card from '../../components/common/Card';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

import { useMyChildren, useChildTermResults } from '../../hooks/parent';
import type { TermResultDto } from '../../types/admin.types';
import { cn } from '../../lib/utils';

// ==================== HELPERS ====================

function gpaColor(gpa: number) {
  if (gpa >= 3.5) return 'text-green-600';
  if (gpa >= 2.5) return 'text-blue-600';
  if (gpa >= 1.5) return 'text-amber-600';
  return 'text-red-600';
}

function gpaLabel(gpa: number | null | undefined) {
  if (gpa == null) return { label: 'Pending', variant: 'neutral' as const };
  if (gpa >= 3.5) return { label: 'Distinction', variant: 'success' as const };
  if (gpa >= 2.5) return { label: 'Merit', variant: 'info' as const };
  if (gpa >= 1.5) return { label: 'Pass', variant: 'warning' as const };
  return { label: 'Fail', variant: 'danger' as const };
}

// ==================== SUB-COMPONENTS ====================

function TermCard({ result }: { result: TermResultDto }) {
  const gpaBadge = gpaLabel(result.gpa);

  return (
    <Card>
      {/* Term header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-900">{result.termName}</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500">{result.academicYearLabel}</span>
        </div>
        <Badge variant={gpaBadge.variant}>{gpaBadge.label}</Badge>
      </div>

      <div className="p-6 space-y-5">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <div className={cn('text-2xl font-bold', gpaColor(result.gpa ?? 0))}>
              {result.gpa?.toFixed(2) ?? '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">GPA</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {result.positionInClass ?? '—'}
              <span className="text-sm font-normal text-gray-400">
                /{result.totalStudentsInClass}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Class Position</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
              <CheckCircle className="h-5 w-5" />
              {result.subjectsPassed}
            </div>
            <div className="text-xs text-gray-500 mt-1">Subjects Passed</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-red-600">
              <XCircle className="h-5 w-5" />
              {result.subjectsFailed}
            </div>
            <div className="text-xs text-gray-500 mt-1">Subjects Failed</div>
          </div>
        </div>

        {/* Attendance */}
        {result.attendancePercentage != null && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <Users className="h-4 w-4" />
                Attendance
              </span>
              <span className="font-medium text-gray-900">
                {result.attendancePercentage.toFixed(0)}%
                <span className="ml-1 text-xs text-gray-400">
                  ({result.totalDaysPresent}d present / {result.totalDaysAbsent}d absent)
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn(
                  'h-full rounded-full',
                  result.attendancePercentage >= 75 ? 'bg-green-500' : 'bg-red-500',
                )}
                style={{ width: `${result.attendancePercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Remarks */}
        {(result.classTeacherRemarks || result.conductRating) && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
            {result.conductRating && (
              <div className="mb-1">
                <span className="font-medium text-gray-700">Conduct: </span>
                <span className="text-gray-600">{result.conductRating}</span>
              </div>
            )}
            {result.classTeacherRemarks && (
              <div>
                <span className="font-medium text-gray-700">Teacher's Remark: </span>
                <span className="text-gray-600 italic">"{result.classTeacherRemarks}"</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ==================== MAIN PAGE ====================

export default function ParentResults() {
  const [searchParams] = useSearchParams();
  const initialStudentId = searchParams.get('studentId');

  const { data: children = [], isLoading: childrenLoading } = useMyChildren();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId ?? '');

  // Auto-select first child when loaded if none selected
  useEffect(() => {
    if (!selectedStudentId && children.length > 0) {
      setSelectedStudentId(String(children[0].id));
    }
  }, [children, selectedStudentId]);

  const studentId = selectedStudentId ? Number(selectedStudentId) : null;
  const { data: results = [], isLoading: resultsLoading } = useChildTermResults(studentId);

  const childOptions = children.map((c) => ({
    value: String(c.id),
    label: `${c.fullName} (${c.studentIndex})`,
  }));

  const selectedChild = children.find((c) => c.id === studentId);
  const isLoading = childrenLoading || resultsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Academic Results</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your child's term-by-term academic performance.
        </p>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <Card>
          <div className="p-5">
            <Select
              label="Select Child"
              value={selectedStudentId}
              onValueChange={setSelectedStudentId}
              options={childOptions}
              placeholder="Choose a child..."
            />
          </div>
        </Card>
      )}

      {/* Selected child info */}
      {selectedChild && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
            {selectedChild.fullName.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{selectedChild.fullName}</div>
            <div className="text-sm text-gray-500">
              {selectedChild.studentIndex} · {selectedChild.className ?? selectedChild.yearGroup} · {selectedChild.programName}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-sm text-gray-500">
            <BookOpen className="h-4 w-4" />
            {results.length} term{results.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !studentId ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Select a child to view their results.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No results found.</p>
          <p className="mt-1 text-xs text-gray-400">
            Term results will appear here once they have been generated by the school.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <TermCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
