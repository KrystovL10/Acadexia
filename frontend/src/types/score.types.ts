import { GradeValue, TermType } from './enums';

export interface Score {
  id: number;
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  termType: TermType;
  classScore: number;
  examScore: number;
  totalScore: number;
  grade: GradeValue;
  gradePoint: number;
  remarks?: string;
}

export interface ScoreEntryRequest {
  studentId: number;
  subjectId: number;
  termType: TermType;
  academicYearId: number;
  classScore: number;
  examScore: number;
}

export interface BulkScoreUpload {
  subjectId: number;
  termType: TermType;
  academicYearId: number;
  file: File;
}
