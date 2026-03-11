import type { YearGroup } from './enums';

// ==================== DASHBOARD ====================

export interface AdminDashboardStatsDto {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  currentTermName: string;
  averageSchoolGpa: number | null;
  passRate: number | null;
  failRate: number | null;
  activeWarnings: number;
  scholarshipCandidates: number;
  byYearGroup: YearGroupStatsDto[];
  subjectPerformance: SubjectPerformanceDto[];
}

export interface YearGroupStatsDto {
  yearGroup: YearGroup;
  studentCount: number;
  avgGpa: number | null;
  passRate: number | null;
}

export interface SubjectPerformanceDto {
  subjectName: string;
  avgScore: number | null;
  passRate: number | null;
  highestScore: number | null;
  lowestScore: number | null;
}

// ==================== TERM COMPARISON ====================

export interface TermComparisonDto {
  termLabel: string;
  shs1Avg: number | null;
  shs2Avg: number | null;
  shs3Avg: number | null;
}

// ==================== GRADE DISTRIBUTION ====================

export interface GradeDistributionDto {
  grade: string;
  count: number;
  percentage: number | null;
}

// ==================== CLASS PERFORMANCE ====================

export interface ClassPerformanceDto {
  className: string;
  avgGpa: number | null;
  studentCount: number;
  passRate: number | null;
}

// ==================== SUBJECT WEAKNESS ====================

export interface SubjectWeaknessDto {
  subjectName: string;
  failingStudents: number;
  totalStudents: number;
  avgScore: number | null;
  classesAffected: number;
}

// ==================== ENROLLMENT TRENDS ====================

export interface EnrollmentTrendDto {
  academicYear: string;
  programName: string;
  studentCount: number;
}

// ==================== RANKINGS ====================

export interface StudentRankDto {
  rank: number;
  studentId: number;
  studentIndex: string;
  fullName: string;
  className: string;
  programName: string;
  yearGroup: YearGroup;
  gpa: number;
  cgpa: number | null;
  profilePhotoUrl: string | null;
}

export interface ClassTopStudentDto {
  classId: number;
  className: string;
  student: StudentRankDto;
}

export interface YearGroupTopStudentDto {
  yearGroup: YearGroup;
  student: StudentRankDto;
}

export interface SubjectTopStudentDto {
  subjectId: number;
  subjectName: string;
  student: StudentRankDto;
  score: number;
  grade: string;
}

export interface ImprovementDto {
  student: StudentRankDto;
  previousTermLabel: string;
  currentTermLabel: string;
  previousGpa: number;
  currentGpa: number;
  delta: number;
  percentageChange: number;
}

export interface ScholarshipCandidateDto {
  student: StudentRankDto;
  cgpa: number;
  termsCompleted: number;
  consecutiveTermsAbove35: number;
}

export interface PowerRankingDto {
  bestStudent: StudentRankDto | null;
  topTenStudents: StudentRankDto[];
  topStudentPerClass: ClassTopStudentDto[];
  topStudentPerYearGroup: YearGroupTopStudentDto[];
  topStudentPerSubject: SubjectTopStudentDto[];
  mostImproved: ImprovementDto | null;
  mostDeclined: ImprovementDto | null;
  topFiveImproved: ImprovementDto[];
  scholarshipCandidates: ScholarshipCandidateDto[];
}
