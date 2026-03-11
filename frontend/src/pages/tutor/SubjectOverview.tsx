import { useNavigate } from 'react-router-dom';
import { useTutorAssignments } from '../../hooks/tutor';
import { useTutorStore } from '../../store/tutor.store';
import type { TutorAssignmentDto } from '../../types/tutor.types';
import { ROUTES } from '../../router/routes';
import { cn } from '../../lib/utils';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import PageHeader from '../../components/common/PageHeader';

// ── Status helpers ─────────────────────────────────────────────────────────

type AssignmentStatus = 'LOCKED' | 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';

function getStatus(a: TutorAssignmentDto): AssignmentStatus {
  if (a.isTermLocked) return 'LOCKED';
  if (a.completionPercentage >= 100) return 'COMPLETE';
  if (a.scoresSubmitted > 0) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

const STATUS_CONFIG: Record<
  AssignmentStatus,
  { label: string; variant: 'danger' | 'success' | 'info' | 'neutral' }
> = {
  LOCKED:      { label: 'Locked',      variant: 'danger' },
  COMPLETE:    { label: 'Complete',    variant: 'success' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  NOT_STARTED: { label: 'Not Started', variant: 'neutral' },
};

const YEAR_GROUP_LABEL: Record<string, string> = {
  SHS1: 'SHS 1',
  SHS2: 'SHS 2',
  SHS3: 'SHS 3',
};

// ── Inline progress bar ────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            'h-full rounded-full',
            clamped >= 71 ? 'bg-green-500' : clamped >= 31 ? 'bg-amber-400' : clamped > 0 ? 'bg-red-400' : 'bg-gray-300'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{Math.round(clamped)}%</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SubjectOverview() {
  const navigate = useNavigate();
  const { setSelectedContext } = useTutorStore();

  const { data: assignments = [], isLoading } = useTutorAssignments();

  const termLabel = assignments[0]?.termLabel ?? '';

  const handleEnterScores = (a: TutorAssignmentDto) => {
    setSelectedContext({
      classRoomId:   a.classRoomId,
      classRoomName: a.className,
      subjectId:     a.subjectId,
      subjectName:   a.subjectName,
      termId:        a.termId,
      termLabel:     a.termLabel,
    });
    navigate(ROUTES.TUTOR_SCORE_ENTRY);
  };

  return (
    <div>
      <PageHeader
        title={termLabel ? `My Subjects — ${termLabel}` : 'My Subjects'}
        subtitle="All your subject assignments for this term"
      />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" className="text-primary" />
        </div>
      )}

      {!isLoading && assignments.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-sm text-gray-500">No subject assignments found for this term.</p>
          <p className="mt-1 text-xs text-gray-400">
            Contact your administrator if this looks incorrect.
          </p>
        </div>
      )}

      {!isLoading && assignments.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Year Group</th>
                <th className="px-5 py-3">Program</th>
                <th className="px-5 py-3 text-center">Students</th>
                <th className="px-5 py-3">Completion</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const status = getStatus(a);
                const config = STATUS_CONFIG[status];
                const pct    = Math.min(100, a.completionPercentage);

                return (
                  <tr
                    key={`${a.classRoomId}-${a.subjectId}`}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Subject */}
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-gray-900">{a.subjectName}</span>
                    </td>

                    {/* Class */}
                    <td className="px-5 py-3.5 text-gray-700">{a.className}</td>

                    {/* Year Group */}
                    <td className="px-5 py-3.5">
                      <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {YEAR_GROUP_LABEL[a.yearGroup] ?? a.yearGroup}
                      </span>
                    </td>

                    {/* Program */}
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{a.programName}</td>

                    {/* Students */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-medium text-gray-800">{a.studentsCount}</span>
                      <span className="block text-[10px] text-gray-400">
                        {a.scoresSubmitted} done
                      </span>
                    </td>

                    {/* Completion */}
                    <td className="px-5 py-3.5">
                      <ProgressBar pct={pct} />
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {a.scoresRemaining > 0
                          ? `${a.scoresRemaining} remaining`
                          : 'Complete'}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <Badge variant={config.variant} className="text-[10px]">
                        {config.label}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleEnterScores(a)}
                        disabled={a.isTermLocked}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          a.isTermLocked
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                            : 'bg-primary text-white hover:bg-primary/90'
                        )}
                      >
                        {a.isTermLocked ? 'Locked' : 'Enter Scores'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table footer summary */}
          <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-between text-xs text-gray-500">
            <span>{assignments.length} subject{assignments.length !== 1 ? 's' : ''}</span>
            <span>
              {assignments.reduce((s, a) => s + a.scoresSubmitted, 0)} /{' '}
              {assignments.reduce((s, a) => s + a.studentsCount, 0)} scores submitted
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
