import { useState, useMemo } from 'react';
import {
  Trophy, RefreshCw, Crown, TrendingUp, TrendingDown, Star,
  GraduationCap, Award, Medal, BookOpen,
  ArrowUp, ArrowDown,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';

import { usePowerRankings, useScholarshipCandidates } from '../../hooks/admin/useRankings';
import { useGetAllAcademicYears } from '../../hooks/admin/useAcademic';
import { useSchoolStore } from '../../store/school.store';
import { YearGroup } from '../../types/enums';
import type {
  StudentRankDto, ClassTopStudentDto, SubjectTopStudentDto,
  ScholarshipCandidateDto, PowerRankingDto,
} from '../../types/stats.types';
import { cn } from '../../lib/utils';

// ==================== CONSTANTS ====================

const GRADE_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-800',
  A2: 'bg-green-100 text-green-800',
  B2: 'bg-teal-100 text-teal-800',
  B3: 'bg-cyan-100 text-cyan-800',
  C4: 'bg-blue-100 text-blue-800',
  C5: 'bg-indigo-100 text-indigo-800',
  C6: 'bg-yellow-100 text-yellow-800',
  D7: 'bg-orange-100 text-orange-800',
  E8: 'bg-red-100 text-red-800',
  F9: 'bg-red-200 text-red-900',
};

function gpaColor(gpa: number): string {
  if (gpa >= 3.5) return 'text-emerald-600';
  if (gpa >= 3.0) return 'text-green-600';
  if (gpa >= 2.5) return 'text-blue-600';
  if (gpa >= 2.0) return 'text-yellow-600';
  if (gpa >= 1.6) return 'text-orange-600';
  return 'text-red-600';
}

function gpaBadgeVariant(gpa: number): 'success' | 'info' | 'warning' | 'danger' {
  if (gpa >= 3.5) return 'success';
  if (gpa >= 2.5) return 'info';
  if (gpa >= 1.6) return 'warning';
  return 'danger';
}

// ==================== SKELETONS ====================

function PodiumSkeleton() {
  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {[140, 180, 120].map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
          <div className="h-16 w-16 rounded-full bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div style={{ height: h }} className="w-28 rounded-t-xl bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="h-4 w-8 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded-full bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="flex-1" />
          <div className="h-5 w-14 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function PowerRankings() {
  const { toast } = useToast();
  const { schoolId, currentTermId } = useSchoolStore();
  const sid = schoolId ?? 0;

  const yearsQuery = useGetAllAcademicYears(sid);
  const years = yearsQuery.data ?? [];

  // Build term options from all academic years
  const termOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    for (const year of years) {
      for (const term of year.terms) {
        options.push({
          value: String(term.id),
          label: `${term.termType.replace('_', ' ')} — ${year.yearLabel}${term.isCurrent ? ' (Current)' : ''}`,
        });
      }
    }
    return options;
  }, [years]);

  const [selectedTermId, setSelectedTermId] = useState('');
  const effectiveTermId = selectedTermId ? Number(selectedTermId) : (currentTermId ?? 0);

  const rankingsQuery = usePowerRankings(sid, effectiveTermId);
  const scholarshipQuery = useScholarshipCandidates(sid);

  const rankings = rankingsQuery.data as PowerRankingDto | undefined;
  const scholarshipCandidates = scholarshipQuery.data ?? [];

  const [ygTab, setYgTab] = useState<string>(YearGroup.SHS1);

  const handleRefresh = () => {
    rankingsQuery.refetch();
    scholarshipQuery.refetch();
    toast({ title: 'Rankings refreshed', variant: 'success' });
  };

  const isLoading = rankingsQuery.isLoading;

  // Year group breakdown from topTenStudents + topStudentPerYearGroup
  const ygStudents = useMemo(() => {
    if (!rankings) return [];
    return rankings.topTenStudents.filter((s) => s.yearGroup === ygTab).slice(0, 5);
  }, [rankings, ygTab]);

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Trophy className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Power Rankings</h1>
            <p className="text-sm text-gray-500">Student performance rankings across all programs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {termOptions.length > 0 && (
            <Select
              value={selectedTermId || (currentTermId ? String(currentTermId) : '')}
              onValueChange={setSelectedTermId}
              options={termOptions}
              placeholder="Current Term"
              className="w-64"
            />
          )}
          <Button variant="outline" onClick={handleRefresh} loading={rankingsQuery.isFetching}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <>
          <PodiumSkeleton />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 p-6">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="mt-4 h-10 w-10 rounded-full bg-gray-200" />
                <div className="mt-3 h-4 w-32 rounded bg-gray-200" />
                <div className="mt-2 h-6 w-20 rounded bg-gray-200" />
              </div>
            ))}
          </div>
          <TableSkeleton rows={10} />
        </>
      ) : !rankings || rankings.topTenStudents.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Trophy className="mx-auto h-16 w-16 text-gray-200" />
            <p className="mt-4 text-lg font-medium text-gray-900">No Rankings Available</p>
            <p className="mt-1 text-sm text-gray-500">
              Rankings will appear once term results have been generated.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* HERO — TOP 3 PODIUM */}
          <PodiumSection students={rankings.topTenStudents.slice(0, 3)} />

          {/* FOUR-COLUMN HIGHLIGHTS */}
          <HighlightsSection rankings={rankings} />

          {/* FULL TOP 10 TABLE */}
          <TopTenTable students={rankings.topTenStudents} />

          {/* CLASS CHAMPIONS */}
          {rankings.topStudentPerClass.length > 0 && (
            <ClassChampionsSection champions={rankings.topStudentPerClass} />
          )}

          {/* SUBJECT CHAMPIONS */}
          {rankings.topStudentPerSubject.length > 0 && (
            <SubjectChampionsSection champions={rankings.topStudentPerSubject} />
          )}

          {/* SCHOLARSHIP CANDIDATES */}
          <ScholarshipSection candidates={scholarshipCandidates} />

          {/* YEAR GROUP BREAKDOWN */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Rankings by Year Group</h2>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
              {[
                { value: YearGroup.SHS1, label: 'SHS 1' },
                { value: YearGroup.SHS2, label: 'SHS 2' },
                { value: YearGroup.SHS3, label: 'SHS 3' },
              ].map((yg) => (
                <button
                  key={yg.value}
                  onClick={() => setYgTab(yg.value)}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                    ygTab === yg.value
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {yg.label}
                </button>
              ))}
            </div>

            <Card className="overflow-hidden">
              {ygStudents.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No ranked students for this year group
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Rank</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Class</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">GPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ygStudents.map((s, i) => (
                        <tr key={s.studentId} className={cn('hover:bg-gray-50', i < 3 && 'bg-amber-50/30')}>
                          <td className="px-4 py-3">
                            <RankBadge rank={i + 1} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar fallback={s.fullName} size="sm" src={s.profilePhotoUrl ?? undefined} />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{s.fullName}</p>
                                <p className="text-xs text-gray-500">{s.studentIndex}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{s.className}</td>
                          <td className="px-4 py-3">
                            <span className={cn('text-sm font-bold', gpaColor(s.gpa))}>
                              {s.gpa.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== PODIUM SECTION ====================

function PodiumSection({ students }: { students: StudentRankDto[] }) {
  if (students.length === 0) return null;

  const first = students[0];
  const second = students[1] ?? null;
  const third = students[2] ?? null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50 via-white to-white border border-amber-200/50 px-4 py-8 sm:px-8">
      {/* Subtle shimmer overlay for 1st place */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/20 to-transparent animate-pulse pointer-events-none" />

      <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center sm:gap-8">
        {/* 2nd Place */}
        {second && (
          <div className="flex flex-col items-center order-2 sm:order-1">
            <PodiumStudent student={second} rank={2} />
            <div className="mt-3 hidden sm:flex h-28 w-24 items-start justify-center rounded-t-xl bg-gradient-to-b from-gray-200 to-gray-300 pt-3 sm:w-32 sm:h-32">
              <span className="text-2xl font-black text-gray-500">2</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        <div className="flex flex-col items-center order-first sm:order-2">
          <PodiumStudent student={first} rank={1} />
          <div className="mt-3 hidden sm:flex h-36 w-28 items-start justify-center rounded-t-xl bg-gradient-to-b from-amber-300 to-amber-400 pt-3 sm:w-36 sm:h-44">
            <span className="text-3xl font-black text-amber-700">1</span>
          </div>
        </div>

        {/* 3rd Place */}
        {third && (
          <div className="flex flex-col items-center order-3 sm:order-3">
            <PodiumStudent student={third} rank={3} />
            <div className="mt-3 hidden sm:flex h-24 w-24 items-start justify-center rounded-t-xl bg-gradient-to-b from-orange-200 to-orange-300 pt-3 sm:w-32 sm:h-24">
              <span className="text-2xl font-black text-orange-600">3</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumStudent({ student, rank }: { student: StudentRankDto; rank: number }) {
  const ringColor = rank === 1 ? 'ring-amber-400' : rank === 2 ? 'ring-gray-400' : 'ring-orange-400';
  const labelColor = rank === 1 ? 'text-amber-600 bg-amber-100' : rank === 2 ? 'text-gray-600 bg-gray-100' : 'text-orange-600 bg-orange-100';
  const label = rank === 1 ? 'Best Student' : rank === 2 ? '2nd Place' : '3rd Place';

  return (
    <div className="flex flex-col items-center text-center">
      {rank === 1 && (
        <Crown className="mb-1 h-6 w-6 text-amber-500 drop-shadow-sm" />
      )}
      <div className={cn('rounded-full ring-4 ring-offset-2', ringColor)}>
        <Avatar
          fallback={student.fullName}
          src={student.profilePhotoUrl ?? undefined}
          size={rank === 1 ? 'lg' : 'md'}
          className={rank === 1 ? 'h-16 w-16 sm:h-20 sm:w-20 text-lg' : undefined}
        />
      </div>
      <p className="mt-2 text-sm font-bold text-gray-900 max-w-[120px] truncate">{student.fullName}</p>
      <p className="text-xs text-gray-500">{student.className}</p>
      <span className={cn('mt-1 text-lg font-black', gpaColor(student.gpa))}>
        {student.gpa.toFixed(2)}
      </span>
      <span className={cn('mt-1 rounded-full px-2 py-0.5 text-xs font-semibold', labelColor)}>
        {label}
      </span>
    </div>
  );
}

// ==================== HIGHLIGHTS SECTION ====================

function HighlightsSection({ rankings }: { rankings: PowerRankingDto }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Most Improved */}
      <HighlightCard
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        iconBg="bg-green-100"
        title="Most Improved"
        student={rankings.mostImproved?.student ?? null}
        content={rankings.mostImproved ? (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{rankings.mostImproved.previousGpa.toFixed(2)}</span>
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="font-medium text-gray-900">{rankings.mostImproved.currentGpa.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xl font-black text-green-600">+{rankings.mostImproved.delta.toFixed(2)} GPA</p>
            <p className="text-xs text-gray-400">
              {rankings.mostImproved.previousTermLabel} → {rankings.mostImproved.currentTermLabel}
            </p>
          </div>
        ) : null}
        emptyText="No improvement data yet"
      />

      {/* Most Declined */}
      <HighlightCard
        icon={<TrendingDown className="h-5 w-5 text-red-600" />}
        iconBg="bg-red-100"
        title="Needs Support"
        student={rankings.mostDeclined?.student ?? null}
        content={rankings.mostDeclined ? (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{rankings.mostDeclined.previousGpa.toFixed(2)}</span>
              <ArrowDown className="h-3 w-3 text-red-500" />
              <span className="font-medium text-gray-900">{rankings.mostDeclined.currentGpa.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xl font-black text-red-600">{rankings.mostDeclined.delta.toFixed(2)} GPA</p>
            <p className="text-xs text-gray-400">
              {rankings.mostDeclined.previousTermLabel} → {rankings.mostDeclined.currentTermLabel}
            </p>
          </div>
        ) : null}
        emptyText="No decline data"
      />

      {/* Top Scholar */}
      <HighlightCard
        icon={<Star className="h-5 w-5 text-amber-600" />}
        iconBg="bg-amber-100"
        title="Top Scholar"
        student={rankings.bestStudent}
        content={rankings.bestStudent ? (
          <div className="mt-2">
            <p className={cn('text-xl font-black', gpaColor(rankings.bestStudent.cgpa ?? rankings.bestStudent.gpa))}>
              {(rankings.bestStudent.cgpa ?? rankings.bestStudent.gpa).toFixed(2)} CGPA
            </p>
            {(rankings.bestStudent.cgpa ?? rankings.bestStudent.gpa) >= 3.5 && (
              <Badge variant="success" className="mt-1">Distinction</Badge>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {rankings.bestStudent.yearGroup.replace('SHS', 'SHS ')} &middot; {rankings.bestStudent.programName}
            </p>
          </div>
        ) : null}
        emptyText="No data available"
      />

      {/* Rising Students */}
      <div className="rounded-xl border border-gray-200 p-5 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Rising Students</h3>
        </div>
        {rankings.topFiveImproved.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No improvement data</p>
        ) : (
          <div className="mt-3 space-y-2">
            {rankings.topFiveImproved.slice(0, 5).map((imp, i) => (
              <div key={imp.student.studentId} className="flex items-center gap-2">
                <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-gray-700">{imp.student.fullName}</span>
                <Badge variant="success" className="text-xs">+{imp.delta.toFixed(2)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightCard({
  icon, iconBg, title, student, content, emptyText,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  student: StudentRankDto | null;
  content: React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-5 shadow-md">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBg)}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {student ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Avatar fallback={student.fullName} size="sm" src={student.profilePhotoUrl ?? undefined} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{student.fullName}</p>
              <p className="text-xs text-gray-500">{student.className}</p>
            </div>
          </div>
          {content}
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-400">{emptyText}</p>
      )}
    </div>
  );
}

// ==================== TOP 10 TABLE ====================

function TopTenTable({ students }: { students: StudentRankDto[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">Top 10 Students This Term</h2>
      <Card className="overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Rank</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Index</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Class</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Program</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Term GPA</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">CGPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.slice(0, 10).map((s, i) => {
                const borderColor =
                  i === 0 ? 'border-l-4 border-l-amber-400 bg-amber-50/40' :
                  i === 1 ? 'border-l-4 border-l-gray-400 bg-gray-50/40' :
                  i === 2 ? 'border-l-4 border-l-orange-400 bg-orange-50/40' :
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';

                return (
                  <tr key={s.studentId} className={cn('hover:bg-gray-50 transition-colors', borderColor)}>
                    <td className="px-4 py-3">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar fallback={s.fullName} size="sm" src={s.profilePhotoUrl ?? undefined} />
                        <span className="text-sm font-medium text-gray-900">{s.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{s.studentIndex}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.className}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.programName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={gpaBadgeVariant(s.gpa)}>
                        {s.gpa.toFixed(2)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-semibold', gpaColor(s.cgpa ?? s.gpa))}>
                        {s.cgpa != null ? s.cgpa.toFixed(2) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==================== RANK BADGE ====================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 shadow-sm shadow-amber-200">
        <Trophy className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-400 shadow-sm">
        <Medal className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-400 shadow-sm">
        <Award className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center text-sm font-bold text-gray-500">
      {rank}
    </span>
  );
}

// ==================== CLASS CHAMPIONS ====================

function ClassChampionsSection({ champions }: { champions: ClassTopStudentDto[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">Class Champions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {champions.map((c) => (
          <div
            key={c.classId}
            className="rounded-xl border border-gray-200 p-4 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <Badge variant="info">{c.className}</Badge>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Avatar
                fallback={c.student.fullName}
                size="md"
                src={c.student.profilePhotoUrl ?? undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{c.student.fullName}</p>
                <p className="text-xs text-gray-500">Best in {c.className}</p>
              </div>
              <span className={cn('text-lg font-black', gpaColor(c.student.gpa))}>
                {c.student.gpa.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SUBJECT CHAMPIONS ====================

function SubjectChampionsSection({ champions }: { champions: SubjectTopStudentDto[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">Subject Champions</h2>
      <Card className="overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Top Student</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Class</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Score</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {champions.map((ch) => (
                <tr key={ch.subjectId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{ch.subjectName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar fallback={ch.student.fullName} size="sm" src={ch.student.profilePhotoUrl ?? undefined} />
                      <span className="text-sm text-gray-700">{ch.student.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ch.student.className}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-gray-900">{ch.score}</span>
                    <span className="text-xs text-gray-400">/100</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
                      GRADE_COLORS[ch.grade] ?? 'bg-gray-100 text-gray-800',
                    )}>
                      {ch.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==================== SCHOLARSHIP SECTION ====================

function ScholarshipSection({ candidates }: { candidates: ScholarshipCandidateDto[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
          <GraduationCap className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Scholarship Candidates</h2>
          <p className="text-xs text-gray-500">Students with CGPA &ge; 3.50 (Distinction level)</p>
        </div>
      </div>

      <Card className="overflow-hidden shadow-md">
        {candidates.length === 0 ? (
          <div className="py-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-200" />
            <p className="mt-3 text-sm font-medium text-gray-900">No Scholarship Candidates Yet</p>
            <p className="mt-1 text-xs text-gray-500">
              No students have achieved Distinction CGPA yet this term
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-amber-50/50 text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Rank</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Year Group</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Program</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">CGPA</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Terms</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidates.map((c, i) => (
                  <tr key={c.student.studentId} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar fallback={c.student.fullName} size="sm" src={c.student.profilePhotoUrl ?? undefined} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.student.fullName}</p>
                          <p className="font-mono text-xs text-gray-500">{c.student.studentIndex}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{c.student.yearGroup.replace('SHS', 'SHS ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.student.programName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-0.5 text-sm font-black text-amber-700 ring-1 ring-amber-300">
                        {c.cgpa.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.termsCompleted}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Distinction</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
