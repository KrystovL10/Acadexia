// ── Student Profile ──────────────────────────────────────────────────────────

export interface StudentProfileDto {
  userId: number;
  studentIndex: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  hometown: string;
  residentialAddress: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
  currentClassName: string;
  currentYearGroup: string;
  currentProgramName: string;
  admissionDate: string;
  beceAggregate: number | null;
  beceYear: string | null;
  isActive: boolean;
  hasGraduated: boolean;
  profilePhotoUrl: string | null;
}

export interface UpdateStudentProfileRequest {
  phoneNumber?: string;
  residentialAddress?: string;
  profilePhotoUrl?: string;
}

// ── Results ──────────────────────────────────────────────────────────────────

export interface StudentScoreDto {
  subjectName: string;
  classScore: number | null;
  examScore: number | null;
  total: number | null;
  grade: string | null;
  gradePoint: number | null;
  remarks: string | null;
  isAbsent: boolean;
}

export interface StudentTermResultDto {
  termLabel: string;
  yearGroup: string;
  programName: string;
  className: string;
  scores: StudentScoreDto[];
  gpa: number;
  positionInClass: number;
  totalStudentsInClass: number;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  attendancePercentage: number;
  conductRating: string;
  classTeacherRemarks: string;
  headmasterRemarks: string | null;
  isGenerated: boolean;
  generatedAt: string;
}

export interface TermResultSummaryDto {
  termId: number;
  termLabel: string;
  yearGroup: string;
  gpa: number;
  positionInClass: number;
  totalStudents: number;
  subjectsPassed: number;
  subjectsFailed: number;
  attendancePercentage: number;
  conductRating: string;
}

// ── GPA History ──────────────────────────────────────────────────────────────

export interface TermGpaDto {
  termLabel: string;
  yearGroup: string;
  gpa: number;
  positionInClass: number;
  totalStudents: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface CgpaPointDto {
  termLabel: string;
  cgpaAfterThisTerm: number;
}

export interface StudentGpaHistoryDto {
  currentCgpa: number;
  currentClassification: string;
  termHistory: TermGpaDto[];
  cgpaProgression: CgpaPointDto[];
}

// ── Subject Performance ──────────────────────────────────────────────────────

export interface SubjectStatDto {
  subjectName: string;
  termsAppeared: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  bestGrade: string;
  latestGrade: string;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface SubjectPerformanceSummaryDto {
  strongestSubjects: SubjectStatDto[];
  weakestSubjects: SubjectStatDto[];
  allSubjects: SubjectStatDto[];
}

// ── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceSummaryDto {
  termLabel: string;
  totalPresent: number;
  totalAbsent: number;
  percentage: number;
  absentDates: Array<{ date: string; reason: string | null }>;
}

// ── Transcript ───────────────────────────────────────────────────────────────

export interface TranscriptTermSubject {
  subjectName: string;
  classScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  remark: string;
}

export interface TranscriptTermDto {
  termType: string;
  academicYear: string;
  subjects: TranscriptTermSubject[];
  gpa: number;
  classPosition?: number;
  classSize?: number;
  conductRemark?: string;
  classTeacherRemark?: string;
  headmasterRemark?: string;
}

export interface TranscriptDto {
  studentId: number;
  studentName: string;
  program: string;
  terms: TranscriptTermDto[];
  cumulativeGpa: number;
}

// ── Legacy aliases (kept for backwards compatibility) ─────────────────────────

export interface Student {
  id: number;
  studentId: string;
  fullName: string;
  email: string;
  phone?: string;
  program: string;
  yearGroup: string;
  className: string;
  enrollmentDate: string;
  active: boolean;
  gpa?: number;
}

export interface CreateStudentRequest {
  fullName: string;
  email: string;
  phone?: string;
  program: string;
  yearGroup: string;
  className: string;
}

export interface StudentListParams {
  page?: number;
  size?: number;
  program?: string;
  yearGroup?: string;
  className?: string;
  search?: string;
}
