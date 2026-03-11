import { TermType } from './enums';

export interface TermReport {
  studentId: number;
  studentName: string;
  className: string;
  term: TermType;
  academicYear: string;
  subjects: SubjectResult[];
  gpa: number;
  totalCredits: number;
  classPosition?: number;
  classSize?: number;
  conductRemark?: string;
  interestRemark?: string;
  classTeacherRemark?: string;
  headmasterRemark?: string;
}

export interface SubjectResult {
  subjectName: string;
  classScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  position?: number;
  remark: string;
}

export interface Transcript {
  studentId: number;
  studentName: string;
  program: string;
  terms: TermReport[];
  cumulativeGpa: number;
}

export interface PowerRanking {
  rank: number;
  studentId: number;
  studentName: string;
  className: string;
  program: string;
  gpa: number;
  totalScore: number;
}
