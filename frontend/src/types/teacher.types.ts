import type { ClassRoomDto, StudentDto, StudentSummaryDto, SubjectDto } from './admin.types';
import type { SchoolDto } from './admin.types';
import type { ScoreDto } from './tutor.types';
import type { EarlyWarningDto } from './warning.types';

// ==================== DASHBOARD ====================

export interface StudentGpaDto {
  studentName: string;
  gpa: number;
}

/**
 * Teacher-context subject performance.
 * More detailed than the admin-level SubjectPerformanceDto in stats.types.ts.
 */
export interface SubjectPerformanceDto {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  avgScore: number;
  passRate: number;
  tutorName: string;
  studentsWithScores: number;
  totalStudents: number;
}

export interface SubjectCompletionDto {
  subjectId: number;
  subjectName: string;
  tutorName: string;
  studentsWithScores: number;
  studentsWithoutScores: number;
  missingStudents: string[];
}

export interface ScoreCompletionStatusDto {
  allComplete: boolean;
  isAllComplete?: boolean; // alias — some views use this
  totalStudents: number;
  totalSubjects: number;
  subjects: SubjectCompletionDto[];
}

export interface RecentActivityDto {
  type: string;
  description: string;
  timestamp: string;
}

export interface ClassDashboardDto {
  classInfo: ClassRoomDto;
  termLabel: string;
  totalStudents: number;
  averageGpa: number | null;
  highestGpa: StudentGpaDto | null;
  lowestGpa: StudentGpaDto | null;
  passRate: number;
  failRate: number;
  subjectPerformance: SubjectPerformanceDto[];
  scoreCompletionStatus: ScoreCompletionStatusDto;
  attendanceSummary: {
    avgAttendance: number;
    studentsBelow75Percent: number;
  };
  activeWarnings: number;
  recentActivity: RecentActivityDto[];
}

// ==================== STUDENT DETAIL ====================

export interface BehaviorSummaryDto {
  achievementCount: number;
  disciplineCount: number;
  lastLogDate: string | null;
}

export interface AttendanceSummaryDto {
  studentId: number;
  studentName: string;
  totalPresent: number;
  totalAbsent: number;
  percentage: number;
}

export interface StudentDetailDto {
  student: StudentDto;
  currentTermScores: ScoreDto[];
  currentGpa: number | null;
  cgpa: number;
  positionInClass: number | null;
  activeWarnings: EarlyWarningDto[];
  attendanceSummary: AttendanceSummaryDto;
  behaviorSummary: BehaviorSummaryDto;
}

// ==================== SCORE OVERVIEW ====================

export interface ClassScoreOverviewDto {
  students: StudentSummaryDto[];
  subjects: SubjectDto[];
  /** studentId → subjectId → ScoreDto */
  scoreMatrix: Record<number, Record<number, ScoreDto | null>>;
  subjectCompletions: SubjectCompletionDto[];
}

// ==================== TERM RESULTS ====================

export interface TermResultDto {
  id: number;
  studentId: number;
  studentName: string;
  studentIndex: string;
  termLabel: string;
  yearGroup: string;
  totalSubjects: number;
  subjectsPassed: number;
  subjectsFailed: number;
  gpa: number;
  positionInClass: number;
  positionInYearGroup: number;
  totalStudentsInClass: number;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  attendancePercentage: number;
  conductRating: string;
  classTeacherRemarks: string;
  headmasterRemarks: string | null;
  isGenerated: boolean;
  isApproved: boolean;
  scores: ScoreDto[];
}

// ==================== TRANSCRIPT ====================

export interface TermTranscriptDto {
  termLabel: string;
  yearGroup: string;
  subjects: Array<{
    subjectName: string;
    classScore: number;
    examScore: number;
    total: number;
    grade: string;
    gradePoint: number;
  }>;
  gpa: number;
  position: number;
  totalStudents: number;
  conductRating: string;
  classTeacherRemarks: string;
  attendancePercentage: number;
}

export interface TranscriptDto {
  studentInfo: StudentDto;
  schoolInfo: SchoolDto;
  programName: string;
  admissionDate: string;
  terms: TermTranscriptDto[];
  cgpa: number;
  classification: string;
  totalTermsCompleted: number;
}

// ==================== ATTENDANCE ====================

export interface AttendanceEntry {
  studentId: number;
  isPresent: boolean;
  isLate: boolean;
  reason?: string;
}

export interface MarkAttendanceRequest {
  classRoomId: number;
  termId: number;
  date: string;
  entries: AttendanceEntry[];
}

export interface AttendanceSheetDto {
  students: StudentSummaryDto[];
  /** ISO date strings (yyyy-MM-dd) */
  dates: string[];
  /** studentId → date string → isPresent */
  attendanceMatrix: Record<number, Record<string, boolean>>;
}

// ==================== BEHAVIOR ====================

export interface BehaviorLogDto {
  id: number;
  studentId: number;
  studentName: string;
  logType: string;
  title: string;
  description: string;
  severity: string | null;
  loggedByName: string;
  loggedAt: string;
}

export interface CreateBehaviorLogRequest {
  studentId: number;
  classRoomId: number;
  termId: number;
  logType: string;
  title: string;
  description: string;
  severity?: string;
}

// ==================== REPORTS ====================

export interface ReportReadinessDto {
  isReady: boolean;
  allScoresSubmitted: boolean;
  missingScoreSubjects: string[];
  attendanceRecorded: boolean;
  studentsCount: number;
  message: string;
}

export interface GenerationResultDto {
  message: string;
  studentsProcessed: number;
  termId: number;
  classRoomId: number;
  success: boolean;
  errors: string[];
}

export interface UpdateRemarksRequest {
  classTeacherRemarks: string;
  conductRating: string;
}

export interface ReportProgressDto {
  key: string;
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
  total: number;
  processed: number;
  failed: number;
  percentage: number;
  message: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}
