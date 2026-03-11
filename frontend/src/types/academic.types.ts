import { ProgramType, TermType, YearGroup } from './enums';

export interface AcademicYear {
  id: number;
  year: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface AcademicTerm {
  id: number;
  academicYearId: number;
  term: TermType;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  program: ProgramType;
  isCore: boolean;
}

export interface ClassGroup {
  id: number;
  name: string;
  program: ProgramType;
  yearGroup: YearGroup;
  classTeacherId?: number;
  classTeacherName?: string;
  studentCount: number;
}

export interface EarlyWarning {
  id: number;
  studentId: number;
  studentName: string;
  warningLevel: string;
  reason: string;
  gpa: number;
  createdAt: string;
  resolved: boolean;
}
