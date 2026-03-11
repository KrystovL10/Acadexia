import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Calendar, Lock, Unlock, CheckCircle, Star, Search,
  BookOpen, Users, GraduationCap, Trash2, Pencil,
  X, AlertTriangle, Building2, School, ChevronRight, Layers,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';

import {
  useGetSchoolProfile, useUpdateSchoolProfile,
  useGetAllAcademicYears, useCreateAcademicYear, useSetCurrentAcademicYear,
  useCreateTerm, useSetCurrentTerm, useLockTermScores, useUnlockTermScores,
  useGetAllPrograms, useCreateProgram, useAssignSubjectToProgram, useRemoveSubjectFromProgram,
  useGetAllSubjects, useCreateSubject, useUpdateSubject,
  useGetAllClassRooms, useCreateClassRoom, useUpdateClassRoom, useDeactivateClassRoom,
} from '../../hooks/admin/useAcademic';
import { useGetAllTeachers, useAssignClassTeacher } from '../../hooks/admin/useTeachers';
import { useSchoolStore } from '../../store/school.store';
import { ProgramType, YearGroup, TermType, PROGRAM_LABELS } from '../../types/enums';
import type {
  AcademicYearDto, TermDto, ProgramDto, ProgramSubjectDto,
  SubjectDto, ClassRoomDto, SchoolDto,
} from '../../types/admin.types';
import { cn } from '../../lib/utils';

// ==================== CONSTANTS ====================

const TERM_TYPE_LABELS: Record<string, string> = {
  TERM_1: 'Term 1',
  TERM_2: 'Term 2',
  TERM_3: 'Term 3',
};

const PROGRAM_ICONS: Record<string, { icon: string; color: string }> = {
  GENERAL_SCIENCE: { icon: '🔬', color: 'border-green-300 bg-green-50' },
  GENERAL_ARTS: { icon: '📚', color: 'border-blue-300 bg-blue-50' },
  BUSINESS: { icon: '💼', color: 'border-amber-300 bg-amber-50' },
  VISUAL_ARTS: { icon: '🎨', color: 'border-purple-300 bg-purple-50' },
  HOME_ECONOMICS: { icon: '🏠', color: 'border-pink-300 bg-pink-50' },
  AGRICULTURAL_SCIENCE: { icon: '🌾', color: 'border-lime-300 bg-lime-50' },
  TECHNICAL: { icon: '⚙️', color: 'border-orange-300 bg-orange-50' },
};

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Central', 'Western', 'Eastern',
  'Volta', 'Northern', 'Upper East', 'Upper West', 'Bono',
  'Bono East', 'Ahafo', 'Savannah', 'North East', 'Oti',
  'Western North',
];

const YG_FILTER_OPTIONS = [
  { value: '__all__', label: 'All Year Groups' },
  { value: YearGroup.SHS1, label: 'SHS 1' },
  { value: YearGroup.SHS2, label: 'SHS 2' },
  { value: YearGroup.SHS3, label: 'SHS 3' },
];

const YG_OPTIONS = [
  { value: YearGroup.SHS1, label: 'SHS 1' },
  { value: YearGroup.SHS2, label: 'SHS 2' },
  { value: YearGroup.SHS3, label: 'SHS 3' },
];

// ==================== SKELETON ====================

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 p-4">
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
      <div className="mt-3 h-3 w-20 rounded bg-gray-200" />
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function AcademicStructure({ defaultTab = 'years' }: { defaultTab?: string }) {
  const { schoolId, currentAcademicYearId } = useSchoolStore();
  const sid = schoolId ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Academic Structure</h1>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="years" className="flex-1 sm:flex-initial">
            <Calendar className="mr-1.5 h-4 w-4" />
            Years & Terms
          </TabsTrigger>
          <TabsTrigger value="programs" className="flex-1 sm:flex-initial">
            <BookOpen className="mr-1.5 h-4 w-4" />
            Programs & Subjects
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex-1 sm:flex-initial">
            <Users className="mr-1.5 h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="school" className="flex-1 sm:flex-initial">
            <School className="mr-1.5 h-4 w-4" />
            School Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="years">
          <AcademicYearsTab schoolId={sid} />
        </TabsContent>
        <TabsContent value="programs">
          <ProgramsSubjectsTab schoolId={sid} />
        </TabsContent>
        <TabsContent value="classes">
          <ClassesTab schoolId={sid} currentAcademicYearId={currentAcademicYearId} />
        </TabsContent>
        <TabsContent value="school">
          <SchoolProfileTab schoolId={sid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ================================================================
// TAB 1 — ACADEMIC YEARS & TERMS
// ================================================================

function AcademicYearsTab({ schoolId }: { schoolId: number }) {
  const { toast } = useToast();
  const yearsQuery = useGetAllAcademicYears(schoolId);
  const setCurrentYear = useSetCurrentAcademicYear();
  const years = yearsQuery.data ?? [];

  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [showAddTermModal, setShowAddTermModal] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState<TermDto | null>(null);

  const selectedYear = years.find((y) => y.id === selectedYearId) ?? years.find((y) => y.isCurrent) ?? years[0] ?? null;

  const handleSetCurrentYear = async (yearId: number) => {
    try {
      await setCurrentYear.mutateAsync(yearId);
      toast({ title: 'Academic year updated', description: 'Current academic year has been set', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update academic year', variant: 'danger' });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* LEFT — Academic Years */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Academic Years</h2>
          <Button size="sm" onClick={() => setShowAddYearModal(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Year
          </Button>
        </div>

        {yearsQuery.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        ) : years.length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No academic years created yet</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {years.map((year) => (
              <button
                key={year.id}
                onClick={() => setSelectedYearId(year.id)}
                className={cn(
                  'w-full rounded-lg border p-4 text-left transition-all',
                  selectedYear?.id === year.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{year.yearLabel}</span>
                  {year.isCurrent && <Badge variant="success">CURRENT</Badge>}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {year.startDate ? `${year.startDate} — ${year.endDate}` : 'No dates set'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{year.terms.length} term{year.terms.length !== 1 ? 's' : ''}</span>
                  {!year.isCurrent && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleSetCurrentYear(year.id); }}
                      loading={setCurrentYear.isPending}
                    >
                      <Star className="h-3 w-3" />
                      Set Current
                    </Button>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — Terms for selected year */}
      <div className="lg:col-span-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Terms {selectedYear ? `— ${selectedYear.yearLabel}` : ''}
          </h2>
          {selectedYear && selectedYear.terms.length < 3 && (
            <Button size="sm" onClick={() => setShowAddTermModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Term
            </Button>
          )}
        </div>

        {!selectedYear ? (
          <Card>
            <div className="py-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Select an academic year to view terms</p>
            </div>
          </Card>
        ) : selectedYear.terms.length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No terms created for this year</p>
              <Button size="sm" className="mt-3" onClick={() => setShowAddTermModal(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Term
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {selectedYear.terms
              .sort((a, b) => a.termType.localeCompare(b.termType))
              .map((term) => (
                <TermCard
                  key={term.id}
                  term={term}
                  onLock={() => setShowLockConfirm(term)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddAcademicYearModal
        open={showAddYearModal}
        onClose={() => setShowAddYearModal(false)}
        schoolId={schoolId}
      />
      {selectedYear && (
        <AddTermModal
          open={showAddTermModal}
          onClose={() => setShowAddTermModal(false)}
          academicYearId={selectedYear.id}
          existingTermTypes={selectedYear.terms.map((t) => t.termType)}
        />
      )}
      {showLockConfirm && (
        <LockScoresModal
          term={showLockConfirm}
          onClose={() => setShowLockConfirm(null)}
        />
      )}
    </div>
  );
}

// ---- Term Card ----

function TermCard({ term, onLock }: { term: TermDto; onLock: () => void }) {
  const { toast } = useToast();
  const setCurrentTerm = useSetCurrentTerm();
  const unlockScores = useUnlockTermScores();

  const handleSetCurrent = async () => {
    try {
      await setCurrentTerm.mutateAsync(term.id);
      toast({ title: 'Term updated', description: `${TERM_TYPE_LABELS[term.termType]} set as current`, variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to set current term', variant: 'danger' });
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockScores.mutateAsync(term.id);
      toast({ title: 'Scores unlocked', description: 'Tutors can now edit scores', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlock scores', variant: 'danger' });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{TERM_TYPE_LABELS[term.termType]}</h3>
        <div className="flex items-center gap-1">
          {term.isCurrent && <Badge variant="success">CURRENT</Badge>}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {term.startDate ? `${term.startDate} — ${term.endDate}` : 'No dates set'}
      </p>

      <div>
        {term.isScoresLocked ? (
          <Badge variant="danger">
            <Lock className="mr-1 h-3 w-3" />
            Scores Locked
          </Badge>
        ) : (
          <Badge variant="success">
            <Unlock className="mr-1 h-3 w-3" />
            Scores Open
          </Badge>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {!term.isCurrent && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSetCurrent}
            loading={setCurrentTerm.isPending}
            className="flex-1"
          >
            Set Current
          </Button>
        )}
        {term.isScoresLocked ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleUnlock}
            loading={unlockScores.isPending}
            className="flex-1"
          >
            <Unlock className="h-3 w-3" />
            Unlock
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onLock}
            className="flex-1"
          >
            <Lock className="h-3 w-3" />
            Lock
          </Button>
        )}
      </div>
    </div>
  );
}

// ---- Add Academic Year Modal ----

const addYearSchema = z.object({
  yearLabel: z.string().min(1, 'Required').regex(/^\d{4}\/\d{4}$/, 'Format: YYYY/YYYY'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
});
type AddYearForm = z.infer<typeof addYearSchema>;

function AddAcademicYearModal({ open, onClose, schoolId }: { open: boolean; onClose: () => void; schoolId: number }) {
  const { toast } = useToast();
  const createYear = useCreateAcademicYear();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddYearForm>({
    resolver: zodResolver(addYearSchema),
    defaultValues: { isCurrent: false },
  });

  const onSubmit = async (data: AddYearForm) => {
    try {
      await createYear.mutateAsync({
        schoolId,
        data: {
          yearLabel: data.yearLabel,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          isCurrent: data.isCurrent,
        },
      });
      toast({ title: 'Academic year created', variant: 'success' });
      reset();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to create academic year', variant: 'danger' });
    }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add Academic Year">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Year Label *</label>
          <input
            {...register('yearLabel')}
            placeholder="2025/2026"
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              errors.yearLabel ? 'border-danger' : 'border-gray-300',
            )}
          />
          {errors.yearLabel && <p className="mt-1 text-xs text-danger">{errors.yearLabel.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Date</label>
            <input type="date" {...register('startDate')} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">End Date</label>
            <input type="date" {...register('endDate')} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isCurrent')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          Set as current year
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={createYear.isPending}>Create Year</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Add Term Modal ----

function AddTermModal({
  open, onClose, academicYearId, existingTermTypes,
}: {
  open: boolean; onClose: () => void; academicYearId: number; existingTermTypes: string[];
}) {
  const { toast } = useToast();
  const createTerm = useCreateTerm();
  const [termType, setTermType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  const availableTerms = [TermType.TERM_1, TermType.TERM_2, TermType.TERM_3].filter(
    (t) => !existingTermTypes.includes(t),
  );

  const handleSubmit = async () => {
    if (!termType) return;
    try {
      await createTerm.mutateAsync({
        academicYearId,
        termType: termType as typeof TermType[keyof typeof TermType],
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isCurrent: isCurrent || undefined,
      });
      toast({ title: 'Term created', variant: 'success' });
      handleClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to create term', variant: 'danger' });
    }
  };

  const handleClose = () => {
    setTermType('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Term">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Term Type *</label>
          <div className="flex gap-2">
            {availableTerms.map((t) => (
              <button
                key={t}
                onClick={() => setTermType(t)}
                className={cn(
                  'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                  termType === t
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                {TERM_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {availableTerms.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">All 3 terms have been created for this year.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          Set as current term
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={createTerm.isPending} disabled={!termType}>Create Term</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Lock Scores Confirmation ----

function LockScoresModal({ term, onClose }: { term: TermDto; onClose: () => void }) {
  const { toast } = useToast();
  const lockScores = useLockTermScores();

  const handleLock = async () => {
    try {
      await lockScores.mutateAsync(term.id);
      toast({ title: 'Scores locked', description: `${TERM_TYPE_LABELS[term.termType]} scores are now locked`, variant: 'success' });
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to lock scores', variant: 'danger' });
    }
  };

  return (
    <Modal open onClose={onClose} title="Lock Scores">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium">Are you sure you want to lock scores?</p>
            <p className="mt-1">
              Locking scores will prevent tutors from editing scores for this term.
              This is usually done after reports are generated.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleLock} loading={lockScores.isPending}>
            <Lock className="h-4 w-4" />
            Lock Scores
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ================================================================
// TAB 2 — PROGRAMS & SUBJECTS
// ================================================================

function ProgramsSubjectsTab({ schoolId }: { schoolId: number }) {
  const { toast } = useToast();
  const programsQuery = useGetAllPrograms(schoolId);
  const subjectsQuery = useGetAllSubjects(schoolId);
  const createProgram = useCreateProgram();

  const programs = programsQuery.data ?? [];
  const allSubjects = subjectsQuery.data ?? [];

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [subjectYgTab, setSubjectYgTab] = useState<string>(YearGroup.SHS1);
  const [showAssignSubjectModal, setShowAssignSubjectModal] = useState(false);
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDto | null>(null);
  const [subjectSearch, setSubjectSearch] = useState('');

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) ?? programs[0] ?? null;

  const filteredProgramSubjects = useMemo(() => {
    if (!selectedProgram) return [];
    return selectedProgram.subjects.filter((s) => s.yearGroup === subjectYgTab);
  }, [selectedProgram, subjectYgTab]);

  const filteredAllSubjects = useMemo(() => {
    if (!subjectSearch) return allSubjects;
    const q = subjectSearch.toLowerCase();
    return allSubjects.filter((s) => s.name.toLowerCase().includes(q) || s.subjectCode.toLowerCase().includes(q));
  }, [allSubjects, subjectSearch]);

  // Program types not yet created
  const availableProgramTypes = Object.values(ProgramType).filter(
    (pt) => !programs.some((p) => p.programType === pt),
  );

  const handleCreateProgram = async (programType: string) => {
    try {
      await createProgram.mutateAsync({ schoolId, data: { programType: programType as typeof ProgramType[keyof typeof ProgramType] } });
      toast({ title: 'Program created', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create program', variant: 'danger' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Programs + Subject assignments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEFT — Programs list */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Programs</h2>

          {programsQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          ) : (
            <>
              <div className="space-y-2">
                {programs.map((prog) => {
                  const meta = PROGRAM_ICONS[prog.programType] ?? { icon: '📖', color: 'border-gray-300 bg-gray-50' };
                  return (
                    <button
                      key={prog.id}
                      onClick={() => setSelectedProgramId(prog.id)}
                      className={cn(
                        'w-full rounded-lg border p-4 text-left transition-all',
                        selectedProgram?.id === prog.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : `${meta.color} hover:shadow-sm`,
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{prog.displayName}</p>
                          <p className="text-xs text-gray-500">{prog.subjects.length} subject{prog.subjects.length !== 1 ? 's' : ''} assigned</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick add program */}
              {availableProgramTypes.length > 0 && (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Add Program</p>
                  <div className="flex flex-wrap gap-1">
                    {availableProgramTypes.map((pt) => (
                      <button
                        key={pt}
                        onClick={() => handleCreateProgram(pt)}
                        disabled={createProgram.isPending}
                        className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary transition-colors"
                      >
                        + {PROGRAM_LABELS[pt]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT — Subjects for selected program */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Subjects {selectedProgram ? `— ${selectedProgram.displayName}` : ''}
            </h2>
            {selectedProgram && (
              <Button size="sm" onClick={() => setShowAssignSubjectModal(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Subject
              </Button>
            )}
          </div>

          {!selectedProgram ? (
            <Card>
              <div className="py-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Select a program to view subjects</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Year Group sub-tabs */}
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {YG_OPTIONS.map((yg) => (
                  <button
                    key={yg.value}
                    onClick={() => setSubjectYgTab(yg.value)}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      subjectYgTab === yg.value
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {yg.label}
                  </button>
                ))}
              </div>

              {filteredProgramSubjects.length === 0 ? (
                <Card>
                  <div className="py-8 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No subjects assigned for {YG_OPTIONS.find((o) => o.value === subjectYgTab)?.label}
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredProgramSubjects.map((ps) => (
                    <ProgramSubjectRow key={ps.id} ps={ps} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ALL SUBJECTS TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Subjects</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="h-9 w-48 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button size="sm" onClick={() => setShowCreateSubjectModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Subject
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          {subjectsQuery.isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Programs</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAllSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No subjects found</td>
                    </tr>
                  ) : (
                    filteredAllSubjects.map((sub) => {
                      const usedIn = programs.filter((p) => p.subjects.some((s) => s.subjectId === sub.id));
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-700">{sub.subjectCode}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{sub.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant={sub.isCore ? 'success' : 'info'}>
                              {sub.isCore ? 'Core' : 'Elective'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {usedIn.length > 0 ? usedIn.map((p) => p.displayName).join(', ') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingSubject(sub)}
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      {selectedProgram && (
        <AssignSubjectModal
          open={showAssignSubjectModal}
          onClose={() => setShowAssignSubjectModal(false)}
          program={selectedProgram}
          allSubjects={allSubjects}
          schoolId={schoolId}
        />
      )}
      <CreateSubjectModal
        open={showCreateSubjectModal}
        onClose={() => setShowCreateSubjectModal(false)}
        schoolId={schoolId}
      />
      {editingSubject && (
        <EditSubjectModal
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
        />
      )}
    </div>
  );
}

// ---- Program Subject Row ----

function ProgramSubjectRow({ ps }: { ps: ProgramSubjectDto }) {
  const { toast } = useToast();
  const removeSubject = useRemoveSubjectFromProgram();

  const handleRemove = async () => {
    try {
      await removeSubject.mutateAsync(ps.id);
      toast({ title: 'Subject removed from program', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove subject', variant: 'danger' });
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{ps.subjectName}</p>
          <p className="text-xs text-gray-500">{ps.subjectCode}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={ps.isCompulsory ? 'success' : 'info'}>
          {ps.isCompulsory ? 'Core' : 'Elective'}
        </Badge>
        <button
          onClick={handleRemove}
          disabled={removeSubject.isPending}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Remove from program"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---- Assign Subject to Program Modal ----

function AssignSubjectModal({
  open, onClose, program, allSubjects, schoolId,
}: {
  open: boolean; onClose: () => void; program: ProgramDto; allSubjects: SubjectDto[]; schoolId: number;
}) {
  const { toast } = useToast();
  const assignSubject = useAssignSubjectToProgram();
  const createSubject = useCreateSubject();

  const [selectedSubjectId, setSelectedSubjectId] = useState('__none__');
  const [yearGroup, setYearGroup] = useState<YearGroup>(YearGroup.SHS1);
  const [isCompulsory, setIsCompulsory] = useState(true);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectIsCore, setNewSubjectIsCore] = useState(true);

  const subjectOptions = useMemo(() => {
    const assignedIds = new Set(program.subjects.filter((s) => s.yearGroup === yearGroup).map((s) => s.subjectId));
    return [
      { value: '__none__', label: 'Select subject...' },
      ...allSubjects.filter((s) => !assignedIds.has(s.id)).map((s) => ({ value: String(s.id), label: `${s.name} (${s.subjectCode})` })),
    ];
  }, [allSubjects, program.subjects, yearGroup]);

  const handleSubmit = async () => {
    let subjectId = Number(selectedSubjectId);

    // Create inline if needed
    if (showInlineCreate && newSubjectName.trim()) {
      try {
        const result = await createSubject.mutateAsync({
          schoolId,
          data: {
            name: newSubjectName.trim(),
            subjectCode: newSubjectCode.trim() || undefined,
            isCore: newSubjectIsCore,
            isElective: !newSubjectIsCore,
          },
        });
        subjectId = result.data.data.id;
      } catch {
        toast({ title: 'Error', description: 'Failed to create subject', variant: 'danger' });
        return;
      }
    }

    if (!subjectId) return;

    try {
      await assignSubject.mutateAsync({
        programId: program.id,
        subjectId,
        yearGroup: yearGroup as typeof YearGroup[keyof typeof YearGroup],
        isCompulsory,
      });
      toast({ title: 'Subject assigned', variant: 'success' });
      handleClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to assign subject', variant: 'danger' });
    }
  };

  const handleClose = () => {
    setSelectedSubjectId('__none__');
    setYearGroup(YearGroup.SHS1);
    setIsCompulsory(true);
    setShowInlineCreate(false);
    setNewSubjectName('');
    setNewSubjectCode('');
    setNewSubjectIsCore(true);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Add Subject to ${program.displayName}`}>
      <div className="space-y-4">
        <Select
          label="Year Group *"
          value={yearGroup}
          onValueChange={(v) => setYearGroup(v as typeof YearGroup[keyof typeof YearGroup])}
          options={YG_OPTIONS}
        />

        {!showInlineCreate ? (
          <>
            <Select
              label="Subject *"
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              options={subjectOptions}
              placeholder="Select subject..."
            />
            <button
              onClick={() => setShowInlineCreate(true)}
              className="text-sm text-primary hover:underline"
            >
              + Create new subject instead
            </button>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800">Create New Subject</p>
              <Input
                label="Subject Name *"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Mathematics"
              />
              <Input
                label="Subject Code"
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value)}
                placeholder="e.g. MATH"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newSubjectIsCore}
                  onChange={(e) => setNewSubjectIsCore(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Core subject
              </label>
            </div>
            <button
              onClick={() => setShowInlineCreate(false)}
              className="text-sm text-primary hover:underline"
            >
              Select from existing subjects instead
            </button>
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isCompulsory}
            onChange={(e) => setIsCompulsory(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Compulsory for this program
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={assignSubject.isPending || createSubject.isPending}
            disabled={!showInlineCreate && selectedSubjectId === '__none__'}
          >
            Assign Subject
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Create Subject Modal ----

const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  subjectCode: z.string().optional(),
  isCore: z.boolean(),
});
type CreateSubjectForm = z.infer<typeof createSubjectSchema>;

function CreateSubjectModal({ open, onClose, schoolId }: { open: boolean; onClose: () => void; schoolId: number }) {
  const { toast } = useToast();
  const createSubject = useCreateSubject();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateSubjectForm>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: { isCore: true },
  });

  const onSubmit = async (data: CreateSubjectForm) => {
    try {
      await createSubject.mutateAsync({
        schoolId,
        data: {
          name: data.name.trim(),
          subjectCode: data.subjectCode?.trim() || undefined,
          isCore: data.isCore,
          isElective: !data.isCore,
        },
      });
      toast({ title: 'Subject created', variant: 'success' });
      reset();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to create subject', variant: 'danger' });
    }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Create New Subject">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Subject Name *</label>
          <input
            {...register('name')}
            placeholder="e.g. Mathematics"
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              errors.name ? 'border-danger' : 'border-gray-300',
            )}
          />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Subject Code</label>
          <input
            {...register('subjectCode')}
            placeholder="e.g. MATH"
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isCore')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          Core subject
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={createSubject.isPending}>Create Subject</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Edit Subject Modal ----

function EditSubjectModal({ subject, onClose }: { subject: SubjectDto; onClose: () => void }) {
  const { toast } = useToast();
  const updateSubject = useUpdateSubject();

  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.subjectCode);
  const [isCore, setIsCore] = useState(subject.isCore);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await updateSubject.mutateAsync({
        subjectId: subject.id,
        data: { name: name.trim(), subjectCode: code.trim() || undefined, isCore, isElective: !isCore },
      });
      toast({ title: 'Subject updated', variant: 'success' });
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to update subject', variant: 'danger' });
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit Subject">
      <div className="space-y-4">
        <Input label="Subject Name *" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Subject Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isCore} onChange={(e) => setIsCore(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          Core subject
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={updateSubject.isPending}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

// ================================================================
// TAB 3 — CLASSES
// ================================================================

function ClassesTab({ schoolId, currentAcademicYearId }: { schoolId: number; currentAcademicYearId: number | null }) {
  const yearsQuery = useGetAllAcademicYears(schoolId);
  const years = yearsQuery.data ?? [];

  const [filterYg, setFilterYg] = useState('__all__');
  const [filterYearId, setFilterYearId] = useState(currentAcademicYearId ? String(currentAcademicYearId) : '');

  const effectiveYearId = filterYearId ? Number(filterYearId) : (currentAcademicYearId ?? undefined);
  const classRoomsQuery = useGetAllClassRooms(schoolId, effectiveYearId);
  const programsQuery = useGetAllPrograms(schoolId);
  const classRooms = classRoomsQuery.data ?? [];
  const programs = programsQuery.data ?? [];

  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoomDto | null>(null);
  const [assignTeacherClass, setAssignTeacherClass] = useState<ClassRoomDto | null>(null);

  const yearOptions = useMemo(() => [
    ...years.map((y) => ({ value: String(y.id), label: y.yearLabel + (y.isCurrent ? ' (Current)' : '') })),
  ], [years]);

  const filteredClasses = useMemo(() => {
    let result = classRooms;
    if (filterYg !== '__all__') result = result.filter((c) => c.yearGroup === filterYg);
    return result;
  }, [classRooms, filterYg]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={filterYg}
            onValueChange={setFilterYg}
            options={YG_FILTER_OPTIONS}
            placeholder="All Year Groups"
            className="w-40"
          />
          {yearOptions.length > 0 && (
            <Select
              value={filterYearId}
              onValueChange={setFilterYearId}
              options={yearOptions}
              placeholder="Academic Year"
              className="w-48"
            />
          )}
        </div>
        <Button onClick={() => setShowAddClassModal(true)}>
          <Plus className="h-4 w-4" />
          Add Class
        </Button>
      </div>

      {/* Classes grid */}
      {classRoomsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-base font-medium text-gray-900">No classes set up</p>
            <p className="mt-1 text-sm text-gray-500">
              {filterYg !== '__all__' ? 'No classes for this year group.' : 'Add classes to start enrolling students.'}
            </p>
            <Button className="mt-4" onClick={() => setShowAddClassModal(true)}>
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onEdit={() => setEditingClass(cls)}
              onAssignTeacher={() => setAssignTeacherClass(cls)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddClassModal
        open={showAddClassModal}
        onClose={() => setShowAddClassModal(false)}
        schoolId={schoolId}
        years={years}
        programs={programs}
        currentAcademicYearId={currentAcademicYearId}
      />
      {editingClass && (
        <EditClassModal
          cls={editingClass}
          onClose={() => setEditingClass(null)}
        />
      )}
      {assignTeacherClass && (
        <AssignTeacherToClassModal
          cls={assignTeacherClass}
          onClose={() => setAssignTeacherClass(null)}
          schoolId={schoolId}
        />
      )}
    </div>
  );
}

// ---- Class Card ----

function ClassCard({ cls, onEdit, onAssignTeacher }: { cls: ClassRoomDto; onEdit: () => void; onAssignTeacher: () => void }) {
  const { toast } = useToast();
  const deactivateClass = useDeactivateClassRoom();

  const capacityPct = cls.capacity > 0 ? Math.min(100, Math.round((cls.studentCount / cls.capacity) * 100)) : 0;

  const handleDeactivate = async () => {
    try {
      await deactivateClass.mutateAsync(cls.id);
      toast({ title: 'Class deactivated', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate class', variant: 'danger' });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{cls.displayName}</h3>
          <Badge variant="neutral" className="mt-1">{cls.classCode}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="info">{cls.yearGroup.replace('SHS', 'SHS ')}</Badge>
        <Badge variant="neutral">{cls.programName}</Badge>
      </div>

      <div className="text-sm">
        {cls.teacherName ? (
          <p className="text-gray-600">
            <span className="font-medium">{cls.teacherName}</span>
          </p>
        ) : (
          <p className="text-red-500 text-xs font-medium">No Teacher Assigned</p>
        )}
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{cls.studentCount}/{cls.capacity} students</span>
          <span>{capacityPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              capacityPct > 90 ? 'bg-red-500' : capacityPct > 70 ? 'bg-yellow-500' : 'bg-primary',
            )}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">{cls.academicYearLabel}</p>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onEdit} className="flex-1">
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={onAssignTeacher} className="flex-1">
          <Users className="h-3 w-3" />
          Teacher
        </Button>
        <button
          onClick={handleDeactivate}
          disabled={deactivateClass.isPending}
          className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          title="Deactivate"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---- Add Class Modal ----

const addClassSchema = z.object({
  displayName: z.string().min(1, 'Class name is required'),
  classCode: z.string().min(1, 'Class code is required'),
  yearGroup: z.string().min(1, 'Year group is required').refine((v) => v !== '__none__', 'Year group is required'),
  programId: z.string().min(1, 'Program is required').refine((v) => v !== '__none__', 'Program is required'),
  academicYearId: z.string().min(1, 'Academic year is required').refine((v) => v !== '__none__', 'Academic year is required'),
  capacity: z.string().optional(),
});
type AddClassForm = z.infer<typeof addClassSchema>;

function AddClassModal({
  open, onClose, schoolId, years, programs, currentAcademicYearId,
}: {
  open: boolean; onClose: () => void; schoolId: number;
  years: AcademicYearDto[]; programs: ProgramDto[]; currentAcademicYearId: number | null;
}) {
  const { toast } = useToast();
  const createClass = useCreateClassRoom();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AddClassForm>({
    resolver: zodResolver(addClassSchema),
    defaultValues: {
      academicYearId: currentAcademicYearId ? String(currentAcademicYearId) : '__none__',
      capacity: '45',
    },
  });

  const yearOptions = years.map((y) => ({ value: String(y.id), label: y.yearLabel + (y.isCurrent ? ' (Current)' : '') }));
  const programOptions = [
    { value: '__none__', label: 'Select program...' },
    ...programs.map((p) => ({ value: String(p.id), label: p.displayName })),
  ];
  const yearGroupOptions = [{ value: '__none__', label: 'Select year group...' }, ...YG_OPTIONS];
  const academicYearSelectOptions = [{ value: '__none__', label: 'Select year...' }, ...yearOptions];

  const onSubmit = async (data: AddClassForm) => {
    try {
      await createClass.mutateAsync({
        schoolId,
        academicYearId: Number(data.academicYearId),
        programId: Number(data.programId),
        yearGroup: data.yearGroup as typeof YearGroup[keyof typeof YearGroup],
        displayName: data.displayName.trim(),
        classCode: data.classCode.trim(),
        capacity: data.capacity ? Number(data.capacity) : undefined,
      });
      toast({ title: 'Class created', variant: 'success' });
      reset();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to create class', variant: 'danger' });
    }
  };

  // Auto-suggest class code from display name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('displayName', name);
    const code = name.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
    setValue('classCode', code);
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add New Class" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Display Name *</label>
          <input
            {...register('displayName')}
            onChange={handleNameChange}
            placeholder="e.g. SHS 1 Science A"
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              errors.displayName ? 'border-danger' : 'border-gray-300',
            )}
          />
          {errors.displayName && <p className="mt-1 text-xs text-danger">{errors.displayName.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Class Code *</label>
          <input
            {...register('classCode')}
            placeholder="e.g. SHS-1-SCI-A"
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm font-mono shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              errors.classCode ? 'border-danger' : 'border-gray-300',
            )}
          />
          {errors.classCode && <p className="mt-1 text-xs text-danger">{errors.classCode.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Academic Year *"
            value={watch('academicYearId')}
            onValueChange={(v) => setValue('academicYearId', v)}
            options={academicYearSelectOptions}
            error={errors.academicYearId?.message}
          />
          <Select
            label="Year Group *"
            value={watch('yearGroup') ?? '__none__'}
            onValueChange={(v) => setValue('yearGroup', v)}
            options={yearGroupOptions}
            error={errors.yearGroup?.message}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Program *"
            value={watch('programId') ?? '__none__'}
            onValueChange={(v) => setValue('programId', v)}
            options={programOptions}
            error={errors.programId?.message}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Capacity</label>
            <input
              {...register('capacity')}
              type="number"
              placeholder="45"
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={createClass.isPending}>Create Class</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Edit Class Modal ----

function EditClassModal({ cls, onClose }: { cls: ClassRoomDto; onClose: () => void }) {
  const { toast } = useToast();
  const updateClass = useUpdateClassRoom();

  const [displayName, setDisplayName] = useState(cls.displayName);
  const [classCode, setClassCode] = useState(cls.classCode);
  const [capacity, setCapacity] = useState(String(cls.capacity));

  const handleSubmit = async () => {
    if (!displayName.trim() || !classCode.trim()) return;
    try {
      await updateClass.mutateAsync({
        classRoomId: cls.id,
        data: {
          displayName: displayName.trim(),
          classCode: classCode.trim(),
          capacity: capacity ? Number(capacity) : undefined,
        },
      });
      toast({ title: 'Class updated', variant: 'success' });
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to update class', variant: 'danger' });
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit Class">
      <div className="space-y-4">
        <Input label="Display Name *" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Input label="Class Code *" value={classCode} onChange={(e) => setClassCode(e.target.value)} />
        <Input label="Capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={updateClass.isPending}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Assign Teacher to Class Modal ----

function AssignTeacherToClassModal({ cls, onClose, schoolId }: { cls: ClassRoomDto; onClose: () => void; schoolId: number }) {
  const { toast } = useToast();
  const teachersQuery = useGetAllTeachers({ schoolId, size: 200 });
  const assignClassTeacher = useAssignClassTeacher();

  const teachers = teachersQuery.data?.content ?? [];

  const [selectedTeacherId, setSelectedTeacherId] = useState(cls.classTeacherId ? String(cls.classTeacherId) : '__none__');

  const teacherOptions = useMemo(() => {
    // Show teachers without a class assignment + current teacher for this class
    const available = teachers.filter(
      (t) => !t.assignedClassName || t.id === cls.classTeacherId,
    );
    return [
      { value: '__none__', label: 'Select teacher...' },
      ...available.map((t) => ({
        value: String(t.id),
        label: `${t.fullName}${t.id === cls.classTeacherId ? ' (Current)' : ''} — ${t.department}`,
      })),
    ];
  }, [teachers, cls.classTeacherId]);

  const handleSubmit = async () => {
    if (selectedTeacherId === '__none__') return;
    try {
      await assignClassTeacher.mutateAsync({
        teacherId: Number(selectedTeacherId),
        classRoomId: cls.id,
      });
      toast({ title: 'Teacher assigned', description: `Class teacher for ${cls.displayName} updated`, variant: 'success' });
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to assign teacher', variant: 'danger' });
    }
  };

  return (
    <Modal open onClose={onClose} title={`Assign Teacher — ${cls.displayName}`}>
      <div className="space-y-4">
        {cls.teacherName && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Current Teacher</p>
            <p className="text-sm font-medium text-gray-900">{cls.teacherName}</p>
          </div>
        )}

        {teachersQuery.isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <Select
            label="Class Teacher"
            value={selectedTeacherId}
            onValueChange={setSelectedTeacherId}
            options={teacherOptions}
            placeholder="Select teacher..."
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={assignClassTeacher.isPending}
            disabled={selectedTeacherId === '__none__'}
          >
            Assign Teacher
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ================================================================
// TAB 4 — SCHOOL PROFILE
// ================================================================

const schoolProfileSchema = z.object({
  name: z.string().min(1, 'School name is required'),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  motto: z.string().optional(),
  headmasterName: z.string().optional(),
  logoUrl: z.string().optional(),
  region: z.string().optional(),
  district: z.string().optional(),
});
type SchoolProfileForm = z.infer<typeof schoolProfileSchema>;

function SchoolProfileTab({ schoolId }: { schoolId: number }) {
  const { toast } = useToast();
  const schoolQuery = useGetSchoolProfile(schoolId);
  const updateSchool = useUpdateSchoolProfile();
  const programsQuery = useGetAllPrograms(schoolId);
  const classRoomsQuery = useGetAllClassRooms(schoolId);

  const school = schoolQuery.data as SchoolDto | undefined;
  const programs = programsQuery.data ?? [];
  const classRooms = classRoomsQuery.data ?? [];

  const activeClasses = classRooms.filter((c) => c.isActive).length;
  const totalStudents = classRooms.reduce((sum, c) => sum + c.studentCount, 0);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SchoolProfileForm>({
    resolver: zodResolver(schoolProfileSchema),
    values: school ? {
      name: school.name ?? '',
      address: school.address ?? '',
      phoneNumber: school.phoneNumber ?? '',
      email: school.email ?? '',
      motto: school.motto ?? '',
      headmasterName: school.headmasterName ?? '',
      logoUrl: school.logoUrl ?? '',
      region: school.region ?? '',
      district: school.district ?? '',
    } : undefined,
  });

  const onSubmit = async (data: SchoolProfileForm) => {
    try {
      await updateSchool.mutateAsync({
        schoolId,
        data: {
          name: data.name.trim(),
          address: data.address?.trim() || undefined,
          phoneNumber: data.phoneNumber?.trim() || undefined,
          email: data.email?.trim() || undefined,
          motto: data.motto?.trim() || undefined,
          headmasterName: data.headmasterName?.trim() || undefined,
          logoUrl: data.logoUrl?.trim() || undefined,
        },
      });
      toast({ title: 'School profile updated', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update school profile', variant: 'danger' });
    }
  };

  if (schoolQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!school) {
    return (
      <Card>
        <div className="py-12 text-center">
          <School className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">School profile not found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">School Information</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">School Name *</label>
                <input
                  {...register('name')}
                  className={cn(
                    'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                    errors.name ? 'border-danger' : 'border-gray-300',
                  )}
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">School Code</label>
                <input
                  value={school.schoolCode}
                  disabled
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Region</label>
                <select
                  {...register('region')}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select region...</option>
                  {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">District</label>
                <input
                  {...register('district')}
                  placeholder="e.g. Kumasi Metropolitan"
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Address</label>
              <input
                {...register('address')}
                placeholder="School address"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  {...register('phoneNumber')}
                  placeholder="0302xxxxxxx"
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="school@ges.gov.gh"
                  className={cn(
                    'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                    errors.email ? 'border-danger' : 'border-gray-300',
                  )}
                />
                {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Motto</label>
                <input
                  {...register('motto')}
                  placeholder="School motto"
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Headmaster Name</label>
                <input
                  {...register('headmasterName')}
                  placeholder="e.g. Prof. Kwame Mensah"
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Logo URL</label>
              <input
                {...register('logoUrl')}
                placeholder="https://..."
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {school.logoUrl && (
                <div className="mt-2">
                  <img
                    src={school.logoUrl}
                    alt="School logo"
                    className="h-16 w-16 rounded-lg border border-gray-200 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={updateSchool.isPending} disabled={!isDirty}>
                <CheckCircle className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <Layers className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{programs.length}</p>
          <p className="text-xs text-gray-500">Total Programs</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <Users className="mx-auto h-8 w-8 text-blue-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{activeClasses}</p>
          <p className="text-xs text-gray-500">Active Classes</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalStudents.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total Students</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <Building2 className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">—</p>
          <p className="text-xs text-gray-500">Total Staff</p>
        </div>
      </div>
    </div>
  );
}
