import { useState, useMemo, useCallback } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, Users, Eye, Pencil,
  MoreHorizontal, ArrowUpDown, Download, Info, CheckCircle, X,
  GraduationCap, AlertTriangle, ChevronDown,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';

import {
  useGetAllStudents, useGetStudentById, useCreateStudent,
  useUpdateStudent, usePromoteStudents,
} from '../../hooks/admin/useStudents';
import { useGetAllPrograms, useGetAllClassRooms } from '../../hooks/admin/useAcademic';
import { useStudentWarnings } from '../../hooks/admin/useWarnings';
import { useSchoolStore } from '../../store/school.store';
import { YearGroup } from '../../types/enums';
import type {
  StudentSummaryDto, StudentDto, CreateStudentRequest,
  UpdateStudentRequest,
  ClassRoomDto, ProgramDto,
} from '../../types/admin.types';
import { cn } from '../../lib/utils';

// ==================== CONSTANTS ====================

const YEAR_GROUP_OPTIONS = [
  { value: '__all__', label: 'All Years' },
  { value: YearGroup.SHS1, label: 'SHS 1' },
  { value: YearGroup.SHS2, label: 'SHS 2' },
  { value: YearGroup.SHS3, label: 'SHS 3' },
];

const YEAR_GROUP_REQUIRED = [
  { value: YearGroup.SHS1, label: 'SHS 1' },
  { value: YearGroup.SHS2, label: 'SHS 2' },
  { value: YearGroup.SHS3, label: 'SHS 3' },
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

// Dummy data until Programs & Classes modules are fully wired
const DUMMY_PROGRAMS = [
  { value: '1', label: 'General Science' },
  { value: '2', label: 'General Arts' },
  { value: '3', label: 'Business' },
  { value: '4', label: 'Visual Arts' },
  { value: '5', label: 'Home Economics' },
  { value: '6', label: 'Agricultural Science' },
  { value: '7', label: 'Technical' },
];

const DUMMY_CLASSES: Record<string, { value: string; label: string }[]> = {
  SHS1: [
    { value: '101', label: 'SHS 1A' },
    { value: '102', label: 'SHS 1B' },
    { value: '103', label: 'SHS 1C' },
    { value: '104', label: 'SHS 1D' },
  ],
  SHS2: [
    { value: '201', label: 'SHS 2A' },
    { value: '202', label: 'SHS 2B' },
    { value: '203', label: 'SHS 2C' },
    { value: '204', label: 'SHS 2D' },
  ],
  SHS3: [
    { value: '301', label: 'SHS 3A' },
    { value: '302', label: 'SHS 3B' },
    { value: '303', label: 'SHS 3C' },
    { value: '304', label: 'SHS 3D' },
  ],
};

const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Uncle', label: 'Uncle' },
  { value: 'Aunt', label: 'Aunt' },
  { value: 'Other', label: 'Other' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per page' },
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
];

const YG_BADGE: Record<string, { variant: 'success' | 'info' | 'warning'; label: string }> = {
  SHS1: { variant: 'success', label: 'SHS 1' },
  SHS2: { variant: 'info', label: 'SHS 2' },
  SHS3: { variant: 'warning', label: 'SHS 3' },
};

// ==================== MAIN COMPONENT ====================

export default function ManageStudents() {
  const { toast } = useToast();
  const { schoolId, currentAcademicYearId } = useSchoolStore();
  const sid = schoolId ?? 0;

  // Filters
  const [search, setSearch] = useState('');
  const [filterYearGroup, setFilterYearGroup] = useState('__all__');
  const [filterProgramId, setFilterProgramId] = useState('__all__');
  const [filterClassId, setFilterClassId] = useState('__all__');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewDrawer, setShowViewDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<number>(0);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  // Data queries
  const studentsQuery = useGetAllStudents({
    schoolId: sid,
    page,
    size: pageSize,
    yearGroup: filterYearGroup !== '__all__' ? (filterYearGroup as typeof YearGroup[keyof typeof YearGroup]) : undefined,
    programId: filterProgramId !== '__all__' ? Number(filterProgramId) : undefined,
    classId: filterClassId !== '__all__' ? Number(filterClassId) : undefined,
  });
  const programsQuery = useGetAllPrograms(sid);
  const classRoomsQuery = useGetAllClassRooms(sid, currentAcademicYearId ?? undefined);

  const students = studentsQuery.data;
  const programs = programsQuery.data ?? [];
  const classRooms = classRoomsQuery.data ?? [];

  // Filtered classrooms for filter dropdown
  const filteredClassOptions = useMemo(() => {
    if (classRooms.length > 0) {
      let filtered = classRooms;
      if (filterYearGroup !== '__all__') filtered = filtered.filter((c) => c.yearGroup === filterYearGroup);
      if (filterProgramId !== '__all__') filtered = filtered.filter((c) => c.programId === Number(filterProgramId));
      return [
        { value: '__all__', label: 'All Classes' },
        ...filtered.map((c) => ({ value: String(c.id), label: c.displayName })),
      ];
    }
    const dummyFiltered = filterYearGroup !== '__all__'
      ? (DUMMY_CLASSES[filterYearGroup] ?? [])
      : Object.values(DUMMY_CLASSES).flat();
    return [{ value: '__all__', label: 'All Classes' }, ...dummyFiltered];
  }, [classRooms, filterYearGroup, filterProgramId]);

  const programFilterOptions = useMemo(() => [
    { value: '__all__', label: 'All Programs' },
    ...(programs.length > 0
      ? programs.map((p) => ({ value: String(p.id), label: p.displayName }))
      : DUMMY_PROGRAMS),
  ], [programs]);

  // Selection helpers
  const pageStudents = students?.content ?? [];
  const totalElements = students?.totalElements ?? 0;
  const totalPages = students?.totalPages ?? 0;
  const allSelected = pageStudents.length > 0 && pageStudents.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageStudents.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleView = (id: number) => {
    setActiveStudentId(id);
    setShowViewDrawer(true);
    setOpenActionMenu(null);
  };

  const handleEdit = (id: number) => {
    setActiveStudentId(id);
    setShowEditModal(true);
    setOpenActionMenu(null);
  };

  const handlePromoteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowPromoteModal(true);
  };

  const handleExportCsv = () => {
    const rows = pageStudents.map((s) => ({
      'Student Index': s.studentIndex,
      'Full Name': s.fullName,
      'Year Group': s.yearGroup,
      'Program': s.programName,
      'Class': s.className ?? '',
    }));
    const header = Object.keys(rows[0] ?? {}).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    toast({ title: 'Export complete', description: 'CSV file downloaded successfully', variant: 'success' });
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          {totalElements > 0 && (
            <Badge variant="neutral">{totalElements.toLocaleString()}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={handleExportCsv}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export as CSV
                  </button>
                </div>
              </>
            )}
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or index..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <Select
            value={filterYearGroup}
            onValueChange={(v) => { setFilterYearGroup(v); setFilterClassId('__all__'); setPage(0); }}
            options={YEAR_GROUP_OPTIONS}
            placeholder="All Years"
            className="w-full sm:w-36"
          />
          <Select
            value={filterProgramId}
            onValueChange={(v) => { setFilterProgramId(v); setFilterClassId('__all__'); setPage(0); }}
            options={programFilterOptions}
            placeholder="All Programs"
            className="w-full sm:w-44"
          />
          <Select
            value={filterClassId}
            onValueChange={(v) => { setFilterClassId(v); setPage(0); }}
            options={filteredClassOptions}
            placeholder="All Classes"
            className="w-full sm:w-44"
          />
        </div>
      </Card>

      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} student{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handlePromoteSelected}>
            <ArrowUpDown className="h-3.5 w-3.5" />
            Promote Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* TABLE */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Student Index</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Full Name</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Year Group</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Program</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Class</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-gray-200" /><div className="h-4 w-32 rounded bg-gray-200" /></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                  </tr>
                ))
              ) : pageStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="h-12 w-12 text-gray-300" />
                      <p className="mt-3 text-base font-medium text-gray-900">No students found</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {search ? 'Try a different search term' : 'Add a student to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBySearch(pageStudents, search).map((student) => {
                  const ygInfo = YG_BADGE[student.yearGroup] ?? { variant: 'neutral' as const, label: student.yearGroup };
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelect(student.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-700">{student.studentIndex}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar fallback={student.fullName} size="sm" />
                          <span className="text-sm font-medium text-gray-900">{student.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ygInfo.variant}>{ygInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.programName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.className ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(student.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(student.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setOpenActionMenu(openActionMenu === student.id ? null : student.id)}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {openActionMenu === student.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenu(null)} />
                                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                  <button
                                    onClick={() => { setSelectedIds(new Set([student.id])); setShowPromoteModal(true); setOpenActionMenu(null); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <ArrowUpDown className="h-3.5 w-3.5" /> Promote
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                options={PAGE_SIZE_OPTIONS}
                className="w-36"
              />
              <span className="text-sm text-gray-500">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = getPageNum(page, totalPages, i);
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'h-8 w-8 rounded-lg text-sm font-medium',
                      page === pageNum
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* MODALS */}
      {showAddModal && (
        <AddStudentModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          schoolId={sid}
          programs={programs}
          classRooms={classRooms}
        />
      )}

      {showViewDrawer && activeStudentId > 0 && (
        <ViewStudentDrawer
          open={showViewDrawer}
          onClose={() => { setShowViewDrawer(false); setActiveStudentId(0); }}
          studentId={activeStudentId}
        />
      )}

      {showEditModal && activeStudentId > 0 && (
        <EditStudentModal
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setActiveStudentId(0); }}
          studentId={activeStudentId}
        />
      )}

      {showPromoteModal && (
        <PromoteStudentsModal
          open={showPromoteModal}
          onClose={() => { setShowPromoteModal(false); setSelectedIds(new Set()); }}
          studentIds={Array.from(selectedIds)}
          classRooms={classRooms}
        />
      )}
    </div>
  );
}

// ==================== HELPERS ====================

function filteredBySearch(students: StudentSummaryDto[], query: string): StudentSummaryDto[] {
  if (!query.trim()) return students;
  const q = query.toLowerCase();
  return students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(q) ||
      s.studentIndex.toLowerCase().includes(q)
  );
}

function getPageNum(current: number, total: number, index: number): number {
  if (total <= 5) return index;
  const start = Math.max(0, Math.min(current - 2, total - 5));
  return start + index;
}

// ==================== ADD STUDENT MODAL ====================

function AddStudentModal({
  open, onClose, schoolId, programs, classRooms,
}: {
  open: boolean;
  onClose: () => void;
  schoolId: number;
  programs: ProgramDto[];
  classRooms: ClassRoomDto[];
}) {
  const { toast } = useToast();
  const createMutation = useCreateStudent();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Partial<CreateStudentRequest>>({
    schoolId,
    nationality: 'Ghanaian',
  });

  const set = (field: string, value: string | number | undefined) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const programOptions = programs.length > 0
    ? programs.map((p) => ({ value: String(p.id), label: p.displayName }))
    : DUMMY_PROGRAMS;
  const classOptions = classRooms.length > 0
    ? classRooms
        .filter((c) => {
          if (form.yearGroup && c.yearGroup !== form.yearGroup) return false;
          if (form.programId && c.programId !== form.programId) return false;
          return true;
        })
        .map((c) => ({ value: String(c.id), label: c.displayName }))
    : (form.yearGroup ? (DUMMY_CLASSES[form.yearGroup] ?? []) : Object.values(DUMMY_CLASSES).flat());

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.firstName?.trim()) errs.firstName = 'Required';
      if (!form.lastName?.trim()) errs.lastName = 'Required';
      if (!form.dateOfBirth) errs.dateOfBirth = 'Required';
      if (!form.gender) errs.gender = 'Required';
    } else if (s === 2) {
      if (!form.studentIndex?.trim()) errs.studentIndex = 'Required';
      if (!form.yearGroup) errs.yearGroup = 'Required';
      if (!form.programId) errs.programId = 'Required';
      if (!form.admissionDate) errs.admissionDate = 'Required';
    } else if (s === 3) {
      if (!form.guardianName?.trim()) errs.guardianName = 'Required';
      if (!form.guardianPhone?.trim()) errs.guardianPhone = 'Required';
      if (!form.guardianRelationship) errs.guardianRelationship = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSubmit = () => {
    if (!validateStep(step)) return;
    const email = `${(form.firstName ?? '').toLowerCase()}.${(form.lastName ?? '').toLowerCase()}@student.shs.edu.gh`;
    createMutation.mutate(
      {
        ...form,
        email,
        schoolId,
        programId: Number(form.programId),
        classId: form.classId ? Number(form.classId) : undefined,
      } as CreateStudentRequest,
      {
        onSuccess: () => {
          toast({ title: 'Student created', description: `${form.firstName} ${form.lastName} has been enrolled`, variant: 'success' });
          onClose();
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create student';
          toast({ title: 'Error', description: msg, variant: 'danger' });
        },
      }
    );
  };

  const generatedEmail = `${(form.firstName ?? '').toLowerCase().replace(/\s+/g, '')}.${(form.lastName ?? '').toLowerCase().replace(/\s+/g, '')}@student.shs.edu.gh`;

  return (
    <Modal open={open} onClose={onClose} title="Add New Student" size="lg">
      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-between">
        {['Personal Info', 'Academic Info', 'Guardian Info', 'Credentials'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
              step > i + 1 ? 'bg-green-100 text-green-700' :
              step === i + 1 ? 'bg-primary text-white' :
              'bg-gray-100 text-gray-400'
            )}>
              {step > i + 1 ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('hidden text-xs sm:block', step === i + 1 ? 'font-medium text-gray-900' : 'text-gray-400')}>
              {label}
            </span>
            {i < 3 && <div className={cn('mx-1 h-px w-4 sm:w-8', step > i + 1 ? 'bg-green-300' : 'bg-gray-200')} />}
          </div>
        ))}
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-1">
        {/* Step 1: Personal */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="First Name *" value={form.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} />
            <Input label="Last Name *" value={form.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} error={errors.lastName} />
            <Input label="Date of Birth *" type="date" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value)} error={errors.dateOfBirth} />
            <Select label="Gender *" value={form.gender ?? '__none__'} onValueChange={(v) => set('gender', v === '__none__' ? '' : v)} options={GENDER_OPTIONS} placeholder="Select gender..." error={errors.gender} />
            <Input label="Nationality" value={form.nationality ?? 'Ghanaian'} onChange={(e) => set('nationality', e.target.value)} />
            <Input label="Hometown" value={form.hometown ?? ''} onChange={(e) => set('hometown', e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="Residential Address" value={form.residentialAddress ?? ''} onChange={(e) => set('residentialAddress', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2: Academic */}
        {step === 2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Student Index Number *" value={form.studentIndex ?? ''} onChange={(e) => set('studentIndex', e.target.value)} error={errors.studentIndex} placeholder="e.g. 0012/24" />
            <Select label="Year Group *" value={form.yearGroup ?? '__none__'} onValueChange={(v) => set('yearGroup', v === '__none__' ? '' : v)} options={YEAR_GROUP_REQUIRED} placeholder="Select year group..." error={errors.yearGroup} />
            <Select label="Program *" value={form.programId ? String(form.programId) : '__none__'} onValueChange={(v) => set('programId', v === '__none__' ? undefined : Number(v))} options={programOptions} placeholder="Select program..." error={errors.programId} />
            <Select label="Class" value={form.classId ? String(form.classId) : '__none__'} onValueChange={(v) => set('classId', v === '__none__' ? undefined : Number(v))} options={classOptions} placeholder="Select class..." />
            <Input label="Admission Date *" type="date" value={form.admissionDate ?? ''} onChange={(e) => set('admissionDate', e.target.value)} error={errors.admissionDate} />
            <Input label="BECE Aggregate" type="number" value={form.beceAggregate ?? ''} onChange={(e) => set('beceAggregate', e.target.value ? Number(e.target.value) : undefined)} />
            <Input label="BECE Year" value={form.beceYear ?? ''} onChange={(e) => set('beceYear', e.target.value)} placeholder="e.g. 2023" />
          </div>
        )}

        {/* Step 3: Guardian */}
        {step === 3 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Guardian Name *" value={form.guardianName ?? ''} onChange={(e) => set('guardianName', e.target.value)} error={errors.guardianName} />
            <Input label="Guardian Phone *" value={form.guardianPhone ?? ''} onChange={(e) => set('guardianPhone', e.target.value)} error={errors.guardianPhone} />
            <Select label="Relationship *" value={form.guardianRelationship ?? '__none__'} onValueChange={(v) => set('guardianRelationship', v === '__none__' ? '' : v)} options={GUARDIAN_RELATIONSHIP_OPTIONS} placeholder="Select relationship..." error={errors.guardianRelationship} />
            <Input label="Guardian Email" type="email" value={form.guardianEmail ?? ''} onChange={(e) => set('guardianEmail', e.target.value)} />
          </div>
        )}

        {/* Step 4: Credentials */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Auto-generated credentials</p>
                  <p className="mt-1 text-sm text-blue-700">Student will be required to change password on first login.</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Email</p>
                <p className="mt-0.5 font-mono text-sm text-gray-900">{generatedEmail}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Default Password</p>
                <p className="mt-0.5 font-mono text-sm text-gray-900">{form.studentIndex || '—'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-900">Student Summary</h4>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Name:</span>
                <span className="text-gray-900">{form.firstName} {form.lastName}</span>
                <span className="text-gray-500">Index:</span>
                <span className="font-mono text-gray-900">{form.studentIndex}</span>
                <span className="text-gray-500">Year Group:</span>
                <span className="text-gray-900">{form.yearGroup}</span>
                <span className="text-gray-500">Guardian:</span>
                <span className="text-gray-900">{form.guardianName}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <div />
        )}
        {step < 4 ? (
          <Button onClick={handleNext}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            <GraduationCap className="h-4 w-4" /> Create Student
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ==================== VIEW STUDENT DRAWER ====================

function ViewStudentDrawer({
  open, onClose, studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: number;
}) {
  const studentQuery = useGetStudentById(studentId);
  const warningsQuery = useStudentWarnings(studentId);
  const student = studentQuery.data;

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}

      {/* Drawer */}
      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Student Details</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {studentQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : !student ? (
          <div className="px-6 py-20 text-center text-sm text-gray-500">Student not found.</div>
        ) : (
          <div className="px-6 py-4">
            {/* Student header */}
            <div className="flex items-center gap-4 pb-4">
              <Avatar fallback={student.fullName} size="lg" src={student.profilePhotoUrl || undefined} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">{student.fullName}</h3>
                <p className="font-mono text-sm text-gray-500">{student.studentIndex}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {student.currentYearGroup && <Badge variant={YG_BADGE[student.currentYearGroup]?.variant ?? 'neutral'}>{YG_BADGE[student.currentYearGroup]?.label ?? student.currentYearGroup}</Badge>}
                  <Badge variant="neutral">{student.currentProgramName}</Badge>
                  {student.currentClassName && <Badge variant="info">{student.currentClassName}</Badge>}
                </div>
              </div>
            </div>

            <Tabs defaultValue="profile">
              <TabsList className="w-full">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="warnings">Warnings</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <div className="space-y-4">
                  <DetailSection title="Personal Information">
                    <DetailRow label="Date of Birth" value={student.dateOfBirth} />
                    <DetailRow label="Gender" value={student.gender} />
                    <DetailRow label="Nationality" value={student.nationality} />
                    <DetailRow label="Hometown" value={student.hometown} />
                    <DetailRow label="Address" value={student.residentialAddress} />
                    <DetailRow label="Phone" value={student.phoneNumber} />
                  </DetailSection>
                  <DetailSection title="Guardian Information">
                    <DetailRow label="Name" value={student.guardianName} />
                    <DetailRow label="Phone" value={student.guardianPhone} />
                    <DetailRow label="Email" value={student.guardianEmail} />
                    <DetailRow label="Relationship" value={student.guardianRelationship} />
                  </DetailSection>
                  <DetailSection title="Academic Details">
                    <DetailRow label="BECE Aggregate" value={student.beceAggregate?.toString()} />
                    <DetailRow label="BECE Year" value={student.beceYear} />
                    <DetailRow label="Admission Date" value={student.admissionDate} />
                  </DetailSection>
                  <DetailSection title="Account Information">
                    <DetailRow label="Email" value={student.email} />
                    <DetailRow label="User ID" value={student.userGesId} />
                    <DetailRow label="Status" value={student.isActive ? 'Active' : 'Inactive'} />
                    <DetailRow label="Graduated" value={student.hasGraduated ? 'Yes' : 'No'} />
                  </DetailSection>
                </div>
              </TabsContent>

              <TabsContent value="academic">
                <div className="flex flex-col items-center py-12 text-center">
                  <GraduationCap className="h-10 w-10 text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-600">Academic records will appear here</p>
                  <p className="mt-1 text-xs text-gray-400">Term results and CGPA will be displayed once generated.</p>
                </div>
              </TabsContent>

              <TabsContent value="warnings">
                {warningsQuery.isLoading ? (
                  <div className="flex justify-center py-8"><Spinner className="text-primary" /></div>
                ) : warningsQuery.data && warningsQuery.data.length > 0 ? (
                  <div className="space-y-2">
                    {warningsQuery.data.map((w) => (
                      <div key={w.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={w.warningLevel === 'CRITICAL' ? 'danger' : w.warningLevel === 'HIGH' ? 'warning' : 'info'}>
                            {w.warningLevel}
                          </Badge>
                          <span className="text-xs text-gray-400">{w.generatedAt?.slice(0, 10)}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-gray-700">{w.description}</p>
                        {w.isResolved && (
                          <p className="mt-1 text-xs text-green-600">Resolved: {w.resolutionNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <CheckCircle className="h-10 w-10 text-green-400" />
                    <p className="mt-2 text-sm text-gray-500">No warnings for this student.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </>
  );
}

// ==================== DETAIL SECTION HELPERS ====================

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h4>
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value || '—'}</span>
    </div>
  );
}

// ==================== EDIT STUDENT MODAL ====================

function EditStudentModal({
  open, onClose, studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: number;
}) {
  const { toast } = useToast();
  const studentQuery = useGetStudentById(studentId);
  const updateMutation = useUpdateStudent();
  const student = studentQuery.data;

  const [form, setForm] = useState<UpdateStudentRequest>({});

  // Populate form when student data loads
  const populated = useCallback((s: StudentDto) => ({
    guardianName: s.guardianName ?? '',
    guardianPhone: s.guardianPhone ?? '',
    guardianEmail: s.guardianEmail ?? '',
    guardianRelationship: s.guardianRelationship ?? '',
    residentialAddress: s.residentialAddress ?? '',
    phoneNumber: s.phoneNumber ?? '',
    profilePhotoUrl: s.profilePhotoUrl ?? '',
  }), []);

  // Set form data once student loads
  if (student && !form.guardianName && !form.phoneNumber) {
    setForm(populated(student));
  }

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    updateMutation.mutate(
      { studentId, data: form },
      {
        onSuccess: () => {
          toast({ title: 'Student updated', variant: 'success' });
          onClose();
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed';
          toast({ title: 'Error', description: msg, variant: 'danger' });
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Student" size="lg">
      {studentQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner className="text-primary" /></div>
      ) : !student ? (
        <p className="py-8 text-center text-sm text-gray-500">Student not found.</p>
      ) : (
        <>
          {/* Read-only info */}
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <Avatar fallback={student.fullName} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
              <p className="font-mono text-xs text-gray-500">{student.studentIndex} · {student.currentYearGroup} · {student.currentProgramName}</p>
            </div>
          </div>

          <div className="max-h-[380px] space-y-4 overflow-y-auto pr-1">
            <h4 className="text-sm font-medium text-gray-700">Contact Information</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Phone" value={form.phoneNumber ?? ''} onChange={(e) => set('phoneNumber', e.target.value)} />
              <Input label="Address" value={form.residentialAddress ?? ''} onChange={(e) => set('residentialAddress', e.target.value)} />
              <div className="sm:col-span-2">
                <Input label="Profile Photo URL" value={form.profilePhotoUrl ?? ''} onChange={(e) => set('profilePhotoUrl', e.target.value)} />
              </div>
            </div>

            <h4 className="text-sm font-medium text-gray-700">Guardian Information</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Guardian Name" value={form.guardianName ?? ''} onChange={(e) => set('guardianName', e.target.value)} />
              <Input label="Guardian Phone" value={form.guardianPhone ?? ''} onChange={(e) => set('guardianPhone', e.target.value)} />
              <Select label="Relationship" value={form.guardianRelationship || '__none__'} onValueChange={(v) => set('guardianRelationship', v === '__none__' ? '' : v)} options={GUARDIAN_RELATIONSHIP_OPTIONS} placeholder="Select relationship..." />
              <Input label="Guardian Email" type="email" value={form.guardianEmail ?? ''} onChange={(e) => set('guardianEmail', e.target.value)} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} loading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ==================== PROMOTE STUDENTS MODAL ====================

function PromoteStudentsModal({
  open, onClose, studentIds, classRooms,
}: {
  open: boolean;
  onClose: () => void;
  studentIds: number[];
  classRooms: ClassRoomDto[];
}) {
  const { toast } = useToast();
  const { currentAcademicYearId } = useSchoolStore();
  const promoteMutation = usePromoteStudents();

  const [targetYearGroup, setTargetYearGroup] = useState('__none__');
  const [targetClassId, setTargetClassId] = useState('__none__');

  const targetClassOptions = classRooms
    .filter((c) => targetYearGroup !== '__none__' && c.yearGroup === targetYearGroup)
    .map((c) => ({ value: String(c.id), label: c.displayName }));

  const handlePromote = () => {
    if (targetYearGroup === '__none__' || targetClassId === '__none__' || !currentAcademicYearId) return;

    promoteMutation.mutate(
      {
        studentIds,
        targetYearGroup: targetYearGroup as typeof YearGroup[keyof typeof YearGroup],
        targetClassId: Number(targetClassId),
        targetAcademicYearId: currentAcademicYearId,
      },
      {
        onSuccess: () => {
          toast({ title: 'Students promoted', description: `${studentIds.length} student(s) promoted successfully`, variant: 'success' });
          onClose();
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Promotion failed';
          toast({ title: 'Error', description: msg, variant: 'danger' });
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Promote Students" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              This will update enrollment records for <strong>{studentIds.length}</strong> student{studentIds.length > 1 ? 's' : ''}.
            </p>
          </div>
        </div>

        <Select
          label="Target Year Group *"
          value={targetYearGroup}
          onValueChange={(v) => { setTargetYearGroup(v); setTargetClassId('__none__'); }}
          options={YEAR_GROUP_REQUIRED}
          placeholder="Select year group..."
        />

        <Select
          label="Target Class *"
          value={targetClassId}
          onValueChange={setTargetClassId}
          options={targetClassOptions}
          placeholder="Select class..."
          disabled={targetYearGroup === '__none__'}
        />

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handlePromote}
            loading={promoteMutation.isPending}
            disabled={targetYearGroup === '__none__' || targetClassId === '__none__'}
          >
            Promote {studentIds.length} Student{studentIds.length > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
