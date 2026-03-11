import type { YearGroup } from './enums';

// ==================== ASSIGNMENTS ====================

export interface TutorAssignmentDto {
  classRoomId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  yearGroup: YearGroup;
  programName: string;
  termId: number;
  termLabel: string;
  studentsCount: number;
  scoresSubmitted: number;
  scoresRemaining: number;
  completionPercentage: number;
  isTermLocked: boolean;
}

export interface TutorSubjectDto {
  id: number;
  subjectCode: string;
  name: string;
  isCore: boolean;
  isElective: boolean;
  schoolId: number;
  isActive: boolean;
}

// ==================== SCORE SHEET ====================

export interface StudentScoreRow {
  studentId: number;
  studentIndex: string;
  fullName: string;
  classScore: number | null;
  examScore: number | null;
  total: number | null;
  grade: string | null;
  gradePoint: number | null;
  remarks: string | null;
  isSubmitted: boolean;
  isAbsent: boolean;
}

export interface ScoreSheetCompletionStats {
  total: number;
  submitted: number;
  pending: number;
  percentage: number;
}

export interface TutorScoreSheetDto {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  classRoomId: number;
  className: string;
  termId: number;
  termLabel: string;
  isLocked: boolean;
  completionStats: ScoreSheetCompletionStats;
  /** Students with their score data (null scores = not yet entered). */
  students: StudentScoreRow[];
}

// ==================== SCORE REQUESTS ====================

export interface ScoreEntryRequest {
  studentId: number;
  subjectId: number;
  classRoomId: number;
  termId: number;
  classScore?: number | null;
  examScore?: number | null;
  isAbsent?: boolean;
}

export interface BulkScoreEntryRequest {
  subjectId: number;
  classRoomId: number;
  termId: number;
  scores: ScoreEntryRequest[];
}

export interface ScoreUpdateRequest {
  classScore: number | null;
  examScore: number | null;
}

export interface MarkAbsentRequest {
  studentId: number;
  subjectId: number;
  classRoomId: number;
  termId: number;
}

// ==================== SCORE RESPONSES ====================

export interface ScoreDto {
  id: number;
  studentId: number;
  studentIndex: string;
  studentName: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  classRoomId: number;
  className: string;
  termId: number;
  academicYearId: number;
  academicYearLabel: string;
  enteredById: number;
  enteredByName: string;
  classScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  grade: string | null;
  gradePoint: number | null;
  remarks: string | null;
  isAbsent: boolean;
  isLocked: boolean;
  submittedAt: string;
  updatedAt: string;
}

export interface ScoreEntryError {
  studentId: number | null;
  studentName: string;
  errorMessage: string;
}

export interface BulkScoreResultDto {
  successCount: number;
  failureCount: number;
  totalProcessed: number;
  saved: ScoreDto[];
  errors: ScoreEntryError[];
  message: string;
}

// ==================== COMPLETION ====================

export interface PendingStudentDto {
  id: number;
  studentIndex: string;
  fullName: string;
  className: string | null;
  yearGroup: YearGroup;
  programName: string;
}

export interface ScoreCompletionDto {
  classRoomId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  termId: number;
  termLabel: string;
  totalStudents: number;
  submitted: number;
  pending: number;
  completionPercentage: number;
  isLocked: boolean;
  pendingStudents: PendingStudentDto[];
}
