export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLASS_TEACHER: 'CLASS_TEACHER',
  TUTOR: 'TUTOR',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProgramType = {
  GENERAL_SCIENCE: 'GENERAL_SCIENCE',
  GENERAL_ARTS: 'GENERAL_ARTS',
  BUSINESS: 'BUSINESS',
  VISUAL_ARTS: 'VISUAL_ARTS',
  HOME_ECONOMICS: 'HOME_ECONOMICS',
  AGRICULTURAL_SCIENCE: 'AGRICULTURAL_SCIENCE',
  TECHNICAL: 'TECHNICAL',
} as const;
export type ProgramType = (typeof ProgramType)[keyof typeof ProgramType];

export const YearGroup = {
  SHS1: 'SHS1',
  SHS2: 'SHS2',
  SHS3: 'SHS3',
} as const;
export type YearGroup = (typeof YearGroup)[keyof typeof YearGroup];

export const TermType = {
  TERM_1: 'TERM_1',
  TERM_2: 'TERM_2',
  TERM_3: 'TERM_3',
} as const;
export type TermType = (typeof TermType)[keyof typeof TermType];

export const WarningLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type WarningLevel = (typeof WarningLevel)[keyof typeof WarningLevel];

export const GradeValue = {
  A1: 'A1',
  A2: 'A2',
  B2: 'B2',
  B3: 'B3',
  C4: 'C4',
  C5: 'C5',
  C6: 'C6',
  D7: 'D7',
  E8: 'E8',
  F9: 'F9',
} as const;
export type GradeValue = (typeof GradeValue)[keyof typeof GradeValue];

export const GRADE_POINTS: Record<GradeValue, number> = {
  [GradeValue.A1]: 4.0,
  [GradeValue.A2]: 3.6,
  [GradeValue.B2]: 3.2,
  [GradeValue.B3]: 2.8,
  [GradeValue.C4]: 2.4,
  [GradeValue.C5]: 2.0,
  [GradeValue.C6]: 1.6,
  [GradeValue.D7]: 1.2,
  [GradeValue.E8]: 0.8,
  [GradeValue.F9]: 0.0,
};

export const PROGRAM_LABELS: Record<ProgramType, string> = {
  [ProgramType.GENERAL_SCIENCE]: 'General Science',
  [ProgramType.GENERAL_ARTS]: 'General Arts',
  [ProgramType.BUSINESS]: 'Business',
  [ProgramType.VISUAL_ARTS]: 'Visual Arts',
  [ProgramType.HOME_ECONOMICS]: 'Home Economics',
  [ProgramType.AGRICULTURAL_SCIENCE]: 'Agricultural Science',
  [ProgramType.TECHNICAL]: 'Technical',
};
