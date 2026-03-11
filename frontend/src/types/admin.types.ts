import type { ProgramType, TermType, YearGroup } from './enums';

// ==================== ADMIN PROFILE ====================

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
}

// ==================== TEACHER ====================

export interface CreateTeacherRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  staffId: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  dateJoined?: string;
  schoolId: number;
}

export interface UpdateTeacherRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
}

export interface SubjectClassDto {
  subjectName: string;
  className: string;
  yearGroup: YearGroup;
}

export interface TeacherDto {
  id: number;
  userId: number;
  userGesId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePhotoUrl: string;
  staffId: string;
  department: string;
  qualification: string;
  specialization: string;
  dateJoined: string;
  schoolId: number;
  schoolName: string;
  isClassTeacher: boolean;
  assignedClassId: number | null;
  assignedClassName: string | null;
  isActive: boolean;
  subjectAssignments: SubjectClassDto[];
  createdAt: string;
}

export interface TeacherSummaryDto {
  id: number;
  staffId: string;
  fullName: string;
  department: string;
  isClassTeacher: boolean;
  assignedClassName: string | null;
}

export interface AssignClassTeacherRequest {
  teacherId: number;
  classRoomId: number;
}

export interface AssignTutorRequest {
  teacherId: number;
  classRoomId: number;
  subjectId: number;
}

// ==================== STUDENT ====================

export interface CreateStudentRequest {
  firstName: string;
  lastName: string;
  email: string;
  studentIndex: string;
  dateOfBirth: string;
  gender: string;
  nationality?: string;
  hometown?: string;
  residentialAddress?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelationship?: string;
  beceAggregate?: number;
  beceYear?: string;
  admissionDate?: string;
  yearGroup: YearGroup;
  schoolId: number;
  programId: number;
  classId?: number;
}

export interface UpdateStudentRequest {
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelationship?: string;
  residentialAddress?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
}

export interface StudentDto {
  id: number;
  userId: number;
  userGesId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePhotoUrl: string;
  studentIndex: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  hometown: string;
  residentialAddress: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelationship: string;
  beceAggregate: number;
  beceYear: string;
  admissionDate: string;
  schoolId: number;
  schoolName: string;
  currentYearGroup: YearGroup;
  currentProgramId: number;
  currentProgramName: string;
  currentClassId: number | null;
  currentClassName: string | null;
  isActive: boolean;
  hasGraduated: boolean;
  createdAt: string;
}

export interface StudentSummaryDto {
  id: number;
  studentIndex: string;
  fullName: string;
  className: string | null;
  yearGroup: YearGroup;
  programName: string;
}

export interface PromoteStudentsRequest {
  studentIds: number[];
  targetYearGroup: YearGroup;
  targetClassId: number;
  targetAcademicYearId: number;
}

export interface GetStudentsParams {
  schoolId: number;
  page?: number;
  size?: number;
  yearGroup?: YearGroup;
  programId?: number;
  classId?: number;
}

// ==================== ADMIN CONTEXT ====================

export interface AdminContextDto {
  schoolId: number;
  schoolName: string;
  academicYearId: number | null;
  academicYearLabel: string | null;
  termId: number | null;
  termLabel: string | null;
  termLocked: boolean;
}

// ==================== SCHOOL ====================

export interface SchoolDto {
  id: number;
  schoolCode: string;
  name: string;
  region: string;
  district: string;
  address: string;
  phoneNumber: string;
  email: string;
  motto: string;
  logoUrl: string;
  headmasterName: string;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateSchoolRequest {
  name?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  motto?: string;
  headmasterName?: string;
  logoUrl?: string;
}

// ==================== ACADEMIC YEAR ====================

export interface AcademicYearDto {
  id: number;
  schoolId: number;
  schoolName: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms: TermDto[];
  createdAt: string;
}

export interface CreateAcademicYearRequest {
  yearLabel: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

// ==================== TERM ====================

export interface TermDto {
  id: number;
  academicYearId: number;
  termType: TermType;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isScoresLocked: boolean;
  createdAt: string;
}

export interface CreateTermRequest {
  academicYearId: number;
  termType: TermType;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

// ==================== PROGRAM ====================

export interface ProgramSubjectDto {
  id: number;
  programId: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  yearGroup: YearGroup;
  isCompulsory: boolean;
}

export interface ProgramDto {
  id: number;
  programType: ProgramType;
  displayName: string;
  description: string;
  schoolId: number;
  schoolName: string;
  isActive: boolean;
  subjects: ProgramSubjectDto[];
  createdAt: string;
}

export interface CreateProgramRequest {
  programType: ProgramType;
  description?: string;
}

export interface AssignSubjectRequest {
  programId: number;
  subjectId: number;
  yearGroup: YearGroup;
  isCompulsory?: boolean;
}

// ==================== SUBJECT ====================

export interface SubjectDto {
  id: number;
  subjectCode: string;
  name: string;
  isCore: boolean;
  isElective: boolean;
  schoolId: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSubjectRequest {
  name: string;
  subjectCode?: string;
  isCore?: boolean;
  isElective?: boolean;
}

export interface UpdateSubjectRequest {
  name?: string;
  subjectCode?: string;
  isCore?: boolean;
  isElective?: boolean;
}

// ==================== CLASSROOM ====================

export interface ClassRoomDto {
  id: number;
  classCode: string;
  displayName: string;
  yearGroup: YearGroup;
  programId: number;
  programName: string;
  schoolId: number;
  academicYearId: number;
  academicYearLabel: string;
  classTeacherId: number | null;
  teacherName: string | null;
  capacity: number;
  isActive: boolean;
  studentCount: number;
  createdAt: string;
}

export interface CreateClassRoomRequest {
  schoolId: number;
  academicYearId: number;
  programId: number;
  yearGroup: YearGroup;
  displayName: string;
  classCode: string;
  capacity?: number;
}

export interface UpdateClassRoomRequest {
  displayName?: string;
  classCode?: string;
  capacity?: number;
}

// ==================== REPORTS ====================

export interface ScoreCompletionStatusDto {
  classRoomId: number;
  className: string;
  termId: number;
  termName: string;
  overallCompletionPercentage: number;
  allComplete: boolean;
  totalStudents: number;
  totalSubjects: number;
  subjects: SubjectCompletionDto[];
}

export interface SubjectCompletionDto {
  subjectId: number;
  subjectName: string;
  tutorName: string;
  studentsWithScores: number;
  studentsWithoutScores: number;
  missingStudents: StudentSummaryDto[];
}

export interface TermResultDto {
  id: number;
  studentId: number;
  studentIndex: string;
  studentName: string;
  termId: number;
  termName: string;
  academicYearId: number;
  academicYearLabel: string;
  classRoomId: number;
  className: string;
  yearGroup: YearGroup;
  programName: string;
  totalSubjects: number;
  subjectsPassed: number;
  subjectsFailed: number;
  totalPoints: number;
  gpa: number;
  classification: string;
  positionInClass: number;
  positionInYearGroup: number;
  totalStudentsInClass: number;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  attendancePercentage: number;
  conductRating: string | null;
  classTeacherRemarks: string | null;
  headmasterRemarks: string | null;
  isGenerated: boolean;
  isApproved: boolean;
  generatedAt: string | null;
  approvedAt: string | null;
}

export interface CumulativeGPADto {
  id: number;
  studentId: number;
  studentIndex: string;
  studentName: string;
  programName: string;
  academicYearId: number;
  academicYearLabel: string;
  totalTermsCompleted: number;
  totalGradePoints: number;
  cgpa: number;
  classification: string;
  lastUpdated: string;
  termBreakdown: TermGpaBreakdownDto[];
}

export interface TermGpaBreakdownDto {
  termId: number;
  termName: string;
  academicYear: string;
  gpa: number;
  classification: string;
  positionInClass: number;
  totalStudentsInClass: number;
}
