import { useState, useMemo, useCallback } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, Eye, Pencil,
  MoreHorizontal, Download, X, UserCog, Users, BookOpen,
  Calendar, Mail, Phone, Shield, ChevronDown,
  AlertTriangle, Clock, FileText, CheckCircle,
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
  useGetAllTeachers, useGetTeacherById, useCreateTeacher,
  useUpdateTeacher, useDeactivateTeacher, useReactivateTeacher,
  useAssignClassTeacher, useAssignTutor,
} from '../../hooks/admin/useTeachers';
import { useGetAllPrograms, useGetAllClassRooms, useGetAllSubjects } from '../../hooks/admin/useAcademic';
import { useSchoolStore } from '../../store/school.store';
import type {
  TeacherSummaryDto, TeacherDto, CreateTeacherRequest,
  UpdateTeacherRequest,
  ClassRoomDto, SubjectDto, ProgramDto,
} from '../../types/admin.types';
import { cn } from '../../lib/utils';

// ==================== CONSTANTS ====================

const DEPARTMENT_OPTIONS = [
  { value: '__all__', label: 'All Departments' },
  { value: 'Science Dept', label: 'Science Dept' },
  { value: 'Arts Dept', label: 'Arts Dept' },
  { value: 'Business Dept', label: 'Business Dept' },
  { value: 'Languages Dept', label: 'Languages Dept' },
  { value: 'Math Dept', label: 'Math Dept' },
  { value: 'Social Studies Dept', label: 'Social Studies Dept' },
];

const DEPARTMENT_REQUIRED = DEPARTMENT_OPTIONS.filter((d) => d.value !== '__all__');

const ROLE_FILTER_OPTIONS = [
  { value: '__all__', label: 'All Roles' },
  { value: 'CLASS_TEACHER', label: 'Class Teacher' },
  { value: 'TUTOR', label: 'Tutor' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per page' },
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
];

function filteredBySearch(
  teachers: TeacherSummaryDto[],
  search: string,
  roleFilter: string,
  deptFilter: string,
): TeacherSummaryDto[] {
  let result = teachers;
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.staffId.toLowerCase().includes(q),
    );
  }
  if (roleFilter === 'CLASS_TEACHER') {
    result = result.filter((t) => t.isClassTeacher);
  } else if (roleFilter === 'TUTOR') {
    result = result.filter((t) => !t.isClassTeacher);
  }
  if (deptFilter !== '__all__') {
    result = result.filter((t) => t.department === deptFilter);
  }
  return result;
}

// ==================== MAIN COMPONENT ====================

export default function ManageTeachers() {
  const { toast } = useToast();
  const { schoolId, currentAcademicYearId } = useSchoolStore();
  const sid = schoolId ?? 0;

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('__all__');
  const [filterDept, setFilterDept] = useState('__all__');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewDrawer, setShowViewDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignClassModal, setShowAssignClassModal] = useState(false);
  const [showAssignTutorModal, setShowAssignTutorModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTeacherId, setActiveTeacherId] = useState<number>(0);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  // Data queries
  const teachersQuery = useGetAllTeachers({ schoolId: sid, page, size: pageSize });
  const classRoomsQuery = useGetAllClassRooms(sid, currentAcademicYearId ?? undefined);
  const subjectsQuery = useGetAllSubjects(sid);
  const programsQuery = useGetAllPrograms(sid);

  const teachers = teachersQuery.data;
  const classRooms = classRoomsQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const programs = programsQuery.data ?? [];

  const pageTeachers = teachers?.content ?? [];
  const totalElements = teachers?.totalElements ?? 0;
  const totalPages = teachers?.totalPages ?? 0;

  const filtered = useMemo(
    () => filteredBySearch(pageTeachers, search, filterRole, filterDept),
    [pageTeachers, search, filterRole, filterDept],
  );

  const handleView = (id: number) => {
    setActiveTeacherId(id);
    setShowViewDrawer(true);
    setOpenActionMenu(null);
  };

  const handleEdit = (id: number) => {
    setActiveTeacherId(id);
    setShowEditModal(true);
    setOpenActionMenu(null);
  };

  const handleAssign = (id: number) => {
    setActiveTeacherId(id);
    setShowAssignClassModal(true);
    setOpenActionMenu(null);
  };

  const handleDeactivate = (id: number) => {
    setActiveTeacherId(id);
    setShowDeactivateModal(true);
    setOpenActionMenu(null);
  };

  const handleExportCsv = () => {
    const rows = filtered.map((t) => ({
      'Staff ID': t.staffId,
      'Full Name': t.fullName,
      'Department': t.department,
      'Role': t.isClassTeacher ? 'Class Teacher' : 'Tutor',
      'Assigned Class': t.assignedClassName ?? '',
    }));
    const header = Object.keys(rows[0] ?? {}).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
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
            Add Teacher
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
                placeholder="Search by name or staff ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <Select
            value={filterRole}
            onValueChange={(v) => { setFilterRole(v); setPage(0); }}
            options={ROLE_FILTER_OPTIONS}
            placeholder="All Roles"
            className="w-full sm:w-40"
          />
          <Select
            value={filterDept}
            onValueChange={(v) => { setFilterDept(v); setPage(0); }}
            options={DEPARTMENT_OPTIONS}
            placeholder="All Departments"
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* TABLE */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Staff ID</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Full Name</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Assignment</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teachersQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-gray-200" /><div className="h-4 w-32 rounded bg-gray-200" /></div></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 rounded-full bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="h-12 w-12 text-gray-300" />
                      <p className="mt-3 text-base font-medium text-gray-900">No teachers found</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {search ? 'Try a different search term' : 'Add a teacher to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-700">{teacher.staffId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar fallback={teacher.fullName} size="sm" />
                        <span className="text-sm font-medium text-gray-900">{teacher.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={teacher.isClassTeacher ? 'success' : 'info'}>
                        {teacher.isClassTeacher ? 'Class Teacher' : 'Tutor'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.department || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {teacher.isClassTeacher
                        ? (teacher.assignedClassName ?? 'Unassigned')
                        : (teacher.assignedClassName ? '1 class' : 'No assignments')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(teacher.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(teacher.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenActionMenu(openActionMenu === teacher.id ? null : teacher.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openActionMenu === teacher.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenu(null)} />
                              <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                <button
                                  onClick={() => handleAssign(teacher.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <UserCog className="h-4 w-4" />
                                  Assign Role
                                </button>
                                <button
                                  onClick={() => handleDeactivate(teacher.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Shield className="h-4 w-4" />
                                  Deactivate
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                options={PAGE_SIZE_OPTIONS}
                className="w-32"
              />
              <span className="text-sm text-gray-500">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = totalPages <= 5
                  ? i
                  : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                      pageNum === page
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100',
                    )}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* MODALS */}
      <AddTeacherModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        schoolId={sid}
        classRooms={classRooms}
        subjects={subjects}
        programs={programs}
      />

      {activeTeacherId > 0 && (
        <>
          <ViewTeacherDrawer
            open={showViewDrawer}
            onClose={() => setShowViewDrawer(false)}
            teacherId={activeTeacherId}
            classRooms={classRooms}
            onAssignTutor={() => { setShowViewDrawer(false); setShowAssignTutorModal(true); }}
            onAssignClass={() => { setShowViewDrawer(false); setShowAssignClassModal(true); }}
          />
          <EditTeacherModal
            open={showEditModal}
            onClose={() => setShowEditModal(false)}
            teacherId={activeTeacherId}
          />
          <AssignClassTeacherModal
            open={showAssignClassModal}
            onClose={() => setShowAssignClassModal(false)}
            teacherId={activeTeacherId}
            classRooms={classRooms}
            subjects={subjects}
            programs={programs}
          />
          <AssignTutorModal
            open={showAssignTutorModal}
            onClose={() => setShowAssignTutorModal(false)}
            teacherId={activeTeacherId}
            classRooms={classRooms}
            subjects={subjects}
            programs={programs}
          />
          <DeactivateTeacherModal
            open={showDeactivateModal}
            onClose={() => setShowDeactivateModal(false)}
            teacherId={activeTeacherId}
          />
        </>
      )}
    </div>
  );
}

// ==================== ADD TEACHER MODAL ====================

interface AddTeacherModalProps {
  open: boolean;
  onClose: () => void;
  schoolId: number;
  classRooms: ClassRoomDto[];
  subjects: SubjectDto[];
  programs: ProgramDto[];
}

function AddTeacherModal({ open, onClose, schoolId, classRooms, subjects, programs }: AddTeacherModalProps) {
  const { toast } = useToast();
  const createTeacher = useCreateTeacher();
  const assignClassTeacher = useAssignClassTeacher();
  const assignTutor = useAssignTutor();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    qualification: '',
    specialization: '',
    dateJoined: '',
    staffId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2
  const [assignmentType, setAssignmentType] = useState<'CLASS_TEACHER' | 'TUTOR'>('CLASS_TEACHER');
  const [selectedClassId, setSelectedClassId] = useState('__none__');
  const [tutorAssignments, setTutorAssignments] = useState<Array<{ classId: string; subjectId: string }>>([
    { classId: '__none__', subjectId: '__none__' },
  ]);

  const classOptions = useMemo(() => [
    { value: '__none__', label: 'Select class...' },
    ...classRooms.map((c) => ({ value: String(c.id), label: c.displayName })),
  ], [classRooms]);

  const getSubjectsForClass = useCallback((classId: string) => {
    if (classId === '__none__') return [{ value: '__none__', label: 'Select subject...' }];
    const cls = classRooms.find((c) => c.id === Number(classId));
    if (!cls) return [{ value: '__none__', label: 'Select subject...' }];
    const program = programs.find((p) => p.id === cls.programId);
    const programSubjectIds = new Set(program?.subjects.map((s) => s.subjectId) ?? []);
    const filtered = subjects.filter((s) => programSubjectIds.has(s.id));
    return [
      { value: '__none__', label: 'Select subject...' },
      ...filtered.map((s) => ({ value: String(s.id), label: s.name })),
    ];
  }, [classRooms, programs, subjects]);

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.staffId.trim()) errs.staffId = 'Staff ID is required';
    if (!form.department) errs.department = 'Department is required';
    if (!form.qualification.trim()) errs.qualification = 'Qualification is required';
    if (!form.specialization.trim()) errs.specialization = 'Specialization is required';
    if (!form.dateJoined) errs.dateJoined = 'Date joined is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async () => {
    const req: CreateTeacherRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      staffId: form.staffId.trim(),
      department: form.department,
      qualification: form.qualification.trim(),
      specialization: form.specialization.trim(),
      dateJoined: form.dateJoined,
      schoolId,
    };

    try {
      const result = await createTeacher.mutateAsync(req);
      const teacherId = result.data.data.id;

      if (assignmentType === 'CLASS_TEACHER' && selectedClassId !== '__none__') {
        try {
          await assignClassTeacher.mutateAsync({
            teacherId,
            classRoomId: Number(selectedClassId),
          });
        } catch {
          toast({ title: 'Teacher created', description: 'But class assignment failed. You can assign later.', variant: 'warning' });
        }
      } else if (assignmentType === 'TUTOR') {
        const validAssignments = tutorAssignments.filter((a) => a.classId !== '__none__' && a.subjectId !== '__none__');
        for (const assignment of validAssignments) {
          try {
            await assignTutor.mutateAsync({
              teacherId,
              classRoomId: Number(assignment.classId),
              subjectId: Number(assignment.subjectId),
            });
          } catch {
            toast({ title: 'Warning', description: 'Subject assignment to class failed. You can assign later.', variant: 'warning' });
          }
        }
      }

      toast({ title: 'Teacher created', description: `${form.firstName} ${form.lastName} has been added successfully`, variant: 'success' });
      resetAndClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to create teacher. Email may already be in use.', variant: 'danger' });
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setForm({ firstName: '', lastName: '', email: '', phoneNumber: '', department: '', qualification: '', specialization: '', dateJoined: '', staffId: '' });
    setErrors({});
    setAssignmentType('CLASS_TEACHER');
    setSelectedClassId('__none__');
    setTutorAssignments([{ classId: '__none__', subjectId: '__none__' }]);
    onClose();
  };

  const addTutorRow = () => {
    setTutorAssignments((prev) => [...prev, { classId: '__none__', subjectId: '__none__' }]);
  };

  const removeTutorRow = (index: number) => {
    setTutorAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTutorRow = (index: number, field: 'classId' | 'subjectId', value: string) => {
    setTutorAssignments((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'classId') return { classId: value, subjectId: '__none__' };
        return { ...row, [field]: value };
      }),
    );
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Add New Teacher"
      description={step === 1 ? 'Step 1 of 2 — Personal & Professional Info' : 'Step 2 of 2 — Role & Assignment'}
      size="lg"
    >
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                s < step ? 'bg-primary text-white' : s === step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500',
              )}
            >
              {s < step ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 2 && <div className={cn('h-0.5 w-12', s < step ? 'bg-primary' : 'bg-gray-200')} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              error={errors.firstName}
              placeholder="e.g. Kwame"
            />
            <Input
              label="Last Name *"
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              error={errors.lastName}
              placeholder="e.g. Mensah"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              error={errors.email}
              placeholder="teacher@school.edu.gh"
            />
            <Input
              label="Phone Number"
              value={form.phoneNumber}
              onChange={(e) => setField('phoneNumber', e.target.value)}
              placeholder="0244xxxxxxx"
            />
          </div>
          <Input
            label="Staff ID *"
            value={form.staffId}
            onChange={(e) => setField('staffId', e.target.value)}
            error={errors.staffId}
            placeholder="e.g. GES-001"
          />
          <Select
            label="Department *"
            value={form.department}
            onValueChange={(v) => setField('department', v)}
            options={DEPARTMENT_REQUIRED}
            error={errors.department}
            placeholder="Select department..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qualification *"
              value={form.qualification}
              onChange={(e) => setField('qualification', e.target.value)}
              error={errors.qualification}
              placeholder="e.g. B.Ed Mathematics"
            />
            <Input
              label="Specialization *"
              value={form.specialization}
              onChange={(e) => setField('specialization', e.target.value)}
              error={errors.specialization}
              placeholder="e.g. Mathematics"
            />
          </div>
          <Input
            label="Date Joined *"
            type="date"
            value={form.dateJoined}
            onChange={(e) => setField('dateJoined', e.target.value)}
            error={errors.dateJoined}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={resetAndClose}>Cancel</Button>
            <Button onClick={handleNext}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Role toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Assignment Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAssignmentType('CLASS_TEACHER')}
                className={cn(
                  'flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
                  assignmentType === 'CLASS_TEACHER'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                <Shield className="mx-auto mb-1 h-5 w-5" />
                Class Teacher
              </button>
              <button
                onClick={() => setAssignmentType('TUTOR')}
                className={cn(
                  'flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
                  assignmentType === 'TUTOR'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                <BookOpen className="mx-auto mb-1 h-5 w-5" />
                Subject Tutor
              </button>
            </div>
          </div>

          {assignmentType === 'CLASS_TEACHER' && (
            <Select
              label="Assign to Class"
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              options={classOptions}
              placeholder="Select class..."
            />
          )}

          {assignmentType === 'TUTOR' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Subject Assignments</label>
              {tutorAssignments.map((row, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Select
                    label={i === 0 ? 'Class' : undefined}
                    value={row.classId}
                    onValueChange={(v) => updateTutorRow(i, 'classId', v)}
                    options={classOptions}
                    placeholder="Select class..."
                    className="flex-1"
                  />
                  <Select
                    label={i === 0 ? 'Subject' : undefined}
                    value={row.subjectId}
                    onValueChange={(v) => updateTutorRow(i, 'subjectId', v)}
                    options={getSubjectsForClass(row.classId)}
                    placeholder="Select subject..."
                    className="flex-1"
                  />
                  {tutorAssignments.length > 1 && (
                    <button
                      onClick={() => removeTutorRow(i)}
                      className="mb-0.5 rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTutorRow}>
                <Plus className="h-3.5 w-3.5" />
                Add Another Subject
              </Button>
            </div>
          )}

          {/* Account info preview */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="text-sm font-semibold text-blue-800">Account Credentials Preview</h4>
            <div className="mt-2 space-y-1 text-sm text-blue-700">
              <p>Email: <span className="font-mono">{form.email}</span></p>
              <p>Default Password: <span className="font-mono">Welcome@GES1</span></p>
              <p className="text-xs text-blue-600">First login will require password change</p>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={resetAndClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                loading={createTeacher.isPending || assignClassTeacher.isPending || assignTutor.isPending}
              >
                Create Teacher
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ==================== VIEW TEACHER DRAWER ====================

interface ViewTeacherDrawerProps {
  open: boolean;
  onClose: () => void;
  teacherId: number;
  classRooms: ClassRoomDto[];
  onAssignTutor: () => void;
  onAssignClass: () => void;
}

function ViewTeacherDrawer({ open, onClose, teacherId, classRooms, onAssignTutor, onAssignClass }: ViewTeacherDrawerProps) {
  const { toast } = useToast();
  const teacherQuery = useGetTeacherById(teacherId);
  const reactivateTeacher = useReactivateTeacher();
  const deactivateTeacher = useDeactivateTeacher();

  const teacher = teacherQuery.data as TeacherDto | undefined;

  const assignedClass = useMemo(() => {
    if (!teacher?.assignedClassId) return null;
    return classRooms.find((c) => c.id === teacher.assignedClassId) ?? null;
  }, [teacher, classRooms]);

  const handleToggleStatus = async () => {
    if (!teacher) return;
    try {
      if (teacher.isActive) {
        await deactivateTeacher.mutateAsync(teacher.id);
        toast({ title: 'Teacher deactivated', variant: 'warning' });
      } else {
        await reactivateTeacher.mutateAsync(teacher.id);
        toast({ title: 'Teacher reactivated', variant: 'success' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update teacher status', variant: 'danger' });
    }
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-lg transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Teacher Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {teacherQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : !teacher ? (
          <div className="py-20 text-center text-sm text-gray-500">Teacher not found</div>
        ) : (
          <div className="p-6">
            {/* Teacher header */}
            <div className="flex items-center gap-4">
              <Avatar fallback={teacher.fullName} size="lg" src={teacher.profilePhotoUrl} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{teacher.fullName}</h3>
                <p className="font-mono text-sm text-gray-500">{teacher.staffId}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={teacher.isClassTeacher ? 'success' : 'info'}>
                    {teacher.isClassTeacher ? 'Class Teacher' : 'Tutor'}
                  </Badge>
                  <Badge variant={teacher.isActive ? 'success' : 'danger'}>
                    {teacher.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick info */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm font-medium text-gray-900">{teacher.department || '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Qualification</p>
                <p className="text-sm font-medium text-gray-900">{teacher.qualification || '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Specialization</p>
                <p className="text-sm font-medium text-gray-900">{teacher.specialization || '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Date Joined</p>
                <p className="text-sm font-medium text-gray-900">{teacher.dateJoined || '—'}</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="profile" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                <TabsTrigger value="assignments" className="flex-1">Assignments</TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
              </TabsList>

              {/* Profile tab */}
              <TabsContent value="profile" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{teacher.phoneNumber || 'No phone number'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Joined {teacher.dateJoined || '—'}</span>
                  </div>
                </div>

                {/* Status toggle */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Status</p>
                    <p className="text-xs text-gray-500">
                      {teacher.isActive ? 'Teacher can access the system' : 'Teacher is locked out'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleStatus}
                    disabled={deactivateTeacher.isPending || reactivateTeacher.isPending}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      teacher.isActive ? 'bg-primary' : 'bg-gray-300',
                      (deactivateTeacher.isPending || reactivateTeacher.isPending) && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
                        teacher.isActive ? 'translate-x-5' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
              </TabsContent>

              {/* Assignments tab */}
              <TabsContent value="assignments" className="mt-4 space-y-4">
                {teacher.isClassTeacher && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Assigned Class</h4>
                      <Button size="sm" variant="outline" onClick={onAssignClass}>
                        Change Class
                      </Button>
                    </div>
                    {assignedClass ? (
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{assignedClass.displayName}</p>
                            <p className="text-sm text-gray-500">
                              {assignedClass.yearGroup.replace('SHS', 'SHS ')} &middot; {assignedClass.programName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{assignedClass.studentCount}</p>
                            <p className="text-xs text-gray-500">students</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                        <Users className="mx-auto h-8 w-8 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No class assigned yet</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={onAssignClass}>
                          Assign Class
                        </Button>
                      </div>
                    )}

                    {teacher.subjectAssignments.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900">Subjects Taught</h4>
                        <div className="space-y-2">
                          {teacher.subjectAssignments.map((sa, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                              <span className="font-medium text-gray-900">{sa.subjectName}</span>
                              <span className="text-gray-500">{sa.className}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!teacher.isClassTeacher && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Subject Assignments</h4>
                      <Button size="sm" variant="outline" onClick={onAssignTutor}>
                        <Plus className="h-3.5 w-3.5" />
                        Add Subject
                      </Button>
                    </div>
                    {teacher.subjectAssignments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                        <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No subjects assigned yet</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={onAssignTutor}>
                          Assign Subject
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-left">
                              <th className="px-3 py-2 text-xs font-medium uppercase text-gray-500">Subject</th>
                              <th className="px-3 py-2 text-xs font-medium uppercase text-gray-500">Class</th>
                              <th className="px-3 py-2 text-xs font-medium uppercase text-gray-500">Year Group</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {teacher.subjectAssignments.map((sa, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{sa.subjectName}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{sa.className}</td>
                                <td className="px-3 py-2">
                                  <Badge variant="info">{sa.yearGroup.replace('SHS', 'SHS ')}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Activity tab */}
              <TabsContent value="activity" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Last Login</p>
                      <p className="text-sm font-medium text-gray-900">—</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Scores Submitted This Term</p>
                      <p className="text-sm font-medium text-gray-900">—</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Reports Generated</p>
                      <p className="text-sm font-medium text-gray-900">—</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Activity tracking will be available in a future update.</p>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </>
  );
}

// ==================== EDIT TEACHER MODAL ====================

interface EditTeacherModalProps {
  open: boolean;
  onClose: () => void;
  teacherId: number;
}

function EditTeacherModal({ open, onClose, teacherId }: EditTeacherModalProps) {
  const { toast } = useToast();
  const teacherQuery = useGetTeacherById(teacherId);
  const updateTeacher = useUpdateTeacher();
  const teacher = teacherQuery.data as TeacherDto | undefined;

  const [form, setForm] = useState<UpdateTeacherRequest>({});
  const [initialized, setInitialized] = useState(false);

  if (teacher && !initialized) {
    setForm({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      phoneNumber: teacher.phoneNumber || '',
      department: teacher.department || '',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
    });
    setInitialized(true);
  }

  const handleClose = () => {
    setInitialized(false);
    setForm({});
    onClose();
  };

  const handleSubmit = async () => {
    try {
      await updateTeacher.mutateAsync({ teacherId, data: form });
      toast({ title: 'Teacher updated', description: 'Changes saved successfully', variant: 'success' });
      handleClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to update teacher', variant: 'danger' });
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Edit Teacher" size="lg">
      {teacherQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !teacher ? (
        <p className="py-8 text-center text-sm text-gray-500">Teacher not found</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            />
            <Input
              label="Last Name"
              value={form.lastName ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            />
          </div>
          <Input
            label="Phone Number"
            value={form.phoneNumber ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
          />
          <Select
            label="Department"
            value={form.department ?? ''}
            onValueChange={(v) => setForm((p) => ({ ...p, department: v }))}
            options={DEPARTMENT_REQUIRED}
            placeholder="Select department..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qualification"
              value={form.qualification ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))}
            />
            <Input
              label="Specialization"
              value={form.specialization ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} loading={updateTeacher.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ==================== ASSIGN CLASS TEACHER MODAL ====================

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  teacherId: number;
  classRooms: ClassRoomDto[];
  subjects: SubjectDto[];
  programs: ProgramDto[];
}

function AssignClassTeacherModal({ open, onClose, teacherId, classRooms, subjects, programs }: AssignModalProps) {
  const { toast } = useToast();
  const teacherQuery = useGetTeacherById(teacherId);
  const assignClassTeacher = useAssignClassTeacher();
  const assignTutor = useAssignTutor();
  const teacher = teacherQuery.data as TeacherDto | undefined;

  const [assignType, setAssignType] = useState<'CLASS_TEACHER' | 'TUTOR'>('CLASS_TEACHER');
  const [selectedClassId, setSelectedClassId] = useState('__none__');
  const [selectedSubjectId, setSelectedSubjectId] = useState('__none__');

  const classOptions = useMemo(() => [
    { value: '__none__', label: 'Select class...' },
    ...classRooms.map((c) => ({
      value: String(c.id),
      label: `${c.displayName}${c.teacherName ? ` (${c.teacherName})` : ''}`,
    })),
  ], [classRooms]);

  const selectedClass = classRooms.find((c) => c.id === Number(selectedClassId));
  const hasExistingTeacher = selectedClass?.classTeacherId != null && selectedClass.classTeacherId !== teacherId;

  const subjectOptions = useMemo(() => {
    if (selectedClassId === '__none__') return [{ value: '__none__', label: 'Select subject...' }];
    const cls = classRooms.find((c) => c.id === Number(selectedClassId));
    if (!cls) return [{ value: '__none__', label: 'Select subject...' }];
    const program = programs.find((p) => p.id === cls.programId);
    const programSubjectIds = new Set(program?.subjects.map((s) => s.subjectId) ?? []);
    const filtered = subjects.filter((s) => programSubjectIds.has(s.id));
    return [
      { value: '__none__', label: 'Select subject...' },
      ...filtered.map((s) => ({ value: String(s.id), label: s.name })),
    ];
  }, [selectedClassId, classRooms, programs, subjects]);

  const handleSubmit = async () => {
    if (selectedClassId === '__none__') return;
    try {
      if (assignType === 'CLASS_TEACHER') {
        await assignClassTeacher.mutateAsync({ teacherId, classRoomId: Number(selectedClassId) });
        toast({ title: 'Assigned', description: 'Assigned as class teacher successfully', variant: 'success' });
      } else {
        if (selectedSubjectId === '__none__') return;
        await assignTutor.mutateAsync({ teacherId, classRoomId: Number(selectedClassId), subjectId: Number(selectedSubjectId) });
        toast({ title: 'Assigned', description: 'Subject assignment created successfully', variant: 'success' });
      }
      handleClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to assign teacher', variant: 'danger' });
    }
  };

  const handleClose = () => {
    setAssignType('CLASS_TEACHER');
    setSelectedClassId('__none__');
    setSelectedSubjectId('__none__');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Assign Teacher" size="md">
      {teacherQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !teacher ? (
        <p className="py-8 text-center text-sm text-gray-500">Teacher not found</p>
      ) : (
        <div className="space-y-4">
          {/* Teacher info */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <Avatar fallback={teacher.fullName} size="sm" src={teacher.profilePhotoUrl} />
            <div>
              <p className="text-sm font-medium text-gray-900">{teacher.fullName}</p>
              <p className="font-mono text-xs text-gray-500">{teacher.staffId}</p>
            </div>
          </div>

          {/* Assignment type toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Assign as</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setAssignType('CLASS_TEACHER'); setSelectedSubjectId('__none__'); }}
                className={cn(
                  'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                  assignType === 'CLASS_TEACHER'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                Class Teacher
              </button>
              <button
                onClick={() => setAssignType('TUTOR')}
                className={cn(
                  'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                  assignType === 'TUTOR'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                Subject Tutor
              </button>
            </div>
          </div>

          <Select
            label="Class"
            value={selectedClassId}
            onValueChange={(v) => { setSelectedClassId(v); setSelectedSubjectId('__none__'); }}
            options={classOptions}
            placeholder="Select class..."
          />

          {hasExistingTeacher && assignType === 'CLASS_TEACHER' && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                This class already has <span className="font-semibold">{selectedClass?.teacherName}</span> as class teacher.
                Reassigning will remove them.
              </p>
            </div>
          )}

          {assignType === 'TUTOR' && selectedClassId !== '__none__' && (
            <Select
              label="Subject"
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              options={subjectOptions}
              placeholder="Select subject..."
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              loading={assignClassTeacher.isPending || assignTutor.isPending}
              disabled={selectedClassId === '__none__' || (assignType === 'TUTOR' && selectedSubjectId === '__none__')}
            >
              Confirm Assignment
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ==================== ASSIGN TUTOR MODAL ====================

function AssignTutorModal({ open, onClose, teacherId, classRooms, subjects, programs }: AssignModalProps) {
  const { toast } = useToast();
  const teacherQuery = useGetTeacherById(teacherId);
  const assignTutor = useAssignTutor();
  const teacher = teacherQuery.data as TeacherDto | undefined;

  const [assignments, setAssignments] = useState<Array<{ classId: string; subjectId: string }>>([
    { classId: '__none__', subjectId: '__none__' },
  ]);

  const classOptions = useMemo(() => [
    { value: '__none__', label: 'Select class...' },
    ...classRooms.map((c) => ({ value: String(c.id), label: c.displayName })),
  ], [classRooms]);

  const getSubjectsForClass = useCallback((classId: string) => {
    if (classId === '__none__') return [{ value: '__none__', label: 'Select subject...' }];
    const cls = classRooms.find((c) => c.id === Number(classId));
    if (!cls) return [{ value: '__none__', label: 'Select subject...' }];
    const program = programs.find((p) => p.id === cls.programId);
    const programSubjectIds = new Set(program?.subjects.map((s) => s.subjectId) ?? []);
    const filtered = subjects.filter((s) => programSubjectIds.has(s.id));
    return [
      { value: '__none__', label: 'Select subject...' },
      ...filtered.map((s) => ({ value: String(s.id), label: s.name })),
    ];
  }, [classRooms, programs, subjects]);

  const updateRow = (index: number, field: 'classId' | 'subjectId', value: string) => {
    setAssignments((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'classId') return { classId: value, subjectId: '__none__' };
        return { ...row, [field]: value };
      }),
    );
  };

  const addRow = () => setAssignments((prev) => [...prev, { classId: '__none__', subjectId: '__none__' }]);
  const removeRow = (index: number) => setAssignments((prev) => prev.filter((_, i) => i !== index));

  const validAssignments = assignments.filter((a) => a.classId !== '__none__' && a.subjectId !== '__none__');

  const handleSubmit = async () => {
    if (validAssignments.length === 0) return;
    let successCount = 0;
    for (const a of validAssignments) {
      try {
        await assignTutor.mutateAsync({
          teacherId,
          classRoomId: Number(a.classId),
          subjectId: Number(a.subjectId),
        });
        successCount++;
      } catch {
        // continue with others
      }
    }
    if (successCount > 0) {
      toast({ title: 'Assignments created', description: `${successCount} subject assignment(s) added`, variant: 'success' });
    }
    if (successCount < validAssignments.length) {
      toast({ title: 'Warning', description: `${validAssignments.length - successCount} assignment(s) failed`, variant: 'warning' });
    }
    handleClose();
  };

  const handleClose = () => {
    setAssignments([{ classId: '__none__', subjectId: '__none__' }]);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Assign Subject Tutor" description="Assign subjects to teach in specific classes" size="lg">
      {teacherQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !teacher ? (
        <p className="py-8 text-center text-sm text-gray-500">Teacher not found</p>
      ) : (
        <div className="space-y-4">
          {/* Teacher info */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <Avatar fallback={teacher.fullName} size="sm" src={teacher.profilePhotoUrl} />
            <div>
              <p className="text-sm font-medium text-gray-900">{teacher.fullName}</p>
              <p className="text-xs text-gray-500">{teacher.department} &middot; {teacher.specialization}</p>
            </div>
          </div>

          {/* Assignment rows */}
          <div className="space-y-3">
            {assignments.map((row, i) => (
              <div key={i} className="flex items-end gap-2">
                <Select
                  label={i === 0 ? 'Class' : undefined}
                  value={row.classId}
                  onValueChange={(v) => updateRow(i, 'classId', v)}
                  options={classOptions}
                  placeholder="Select class..."
                  className="flex-1"
                />
                <Select
                  label={i === 0 ? 'Subject' : undefined}
                  value={row.subjectId}
                  onValueChange={(v) => updateRow(i, 'subjectId', v)}
                  options={getSubjectsForClass(row.classId)}
                  placeholder="Select subject..."
                  className="flex-1"
                />
                {assignments.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="mb-0.5 rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" />
            Add Another Subject
          </Button>

          {/* Assignment summary */}
          {validAssignments.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">
                {validAssignments.length} assignment{validAssignments.length > 1 ? 's' : ''} ready to submit
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              loading={assignTutor.isPending}
              disabled={validAssignments.length === 0}
            >
              Submit All
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ==================== DEACTIVATE TEACHER MODAL ====================

interface DeactivateModalProps {
  open: boolean;
  onClose: () => void;
  teacherId: number;
}

function DeactivateTeacherModal({ open, onClose, teacherId }: DeactivateModalProps) {
  const { toast } = useToast();
  const teacherQuery = useGetTeacherById(teacherId);
  const deactivateTeacher = useDeactivateTeacher();
  const teacher = teacherQuery.data as TeacherDto | undefined;

  const [confirmName, setConfirmName] = useState('');

  const isMatch = teacher != null && confirmName.trim().toLowerCase() === teacher.fullName.toLowerCase();

  const handleSubmit = async () => {
    if (!isMatch || !teacher) return;
    try {
      await deactivateTeacher.mutateAsync(teacher.id);
      toast({ title: 'Teacher deactivated', description: `${teacher.fullName} has been deactivated`, variant: 'success' });
      handleClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate teacher', variant: 'danger' });
    }
  };

  const handleClose = () => {
    setConfirmName('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Deactivate Teacher" size="md">
      {teacherQuery.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !teacher ? (
        <p className="py-8 text-center text-sm text-gray-500">Teacher not found</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="text-sm text-red-700">
              <p className="font-medium">This action has consequences:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  Deactivating <span className="font-semibold">{teacher.fullName}</span> will prevent them from logging in.
                </li>
                <li>Their class assignment and scores will be preserved.</li>
                {teacher.assignedClassName && (
                  <li>
                    Active class: <span className="font-semibold">{teacher.assignedClassName}</span> — this class will need a new teacher.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Type <span className="font-semibold">{teacher.fullName}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={teacher.fullName}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              loading={deactivateTeacher.isPending}
              disabled={!isMatch}
            >
              Deactivate Teacher
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
