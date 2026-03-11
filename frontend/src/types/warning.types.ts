import type { WarningLevel } from './enums';

export interface EarlyWarningDto {
  id: number;
  studentId: number;
  studentIndex: string;
  studentName: string;
  studentClassName: string | null;
  termId: number;
  termName: string;
  warningLevel: WarningLevel;
  warningType: string;
  description: string;
  suggestedAction: string;
  subjectsFailing: string | null;
  previousGpa: number | null;
  currentGpa: number | null;
  attendancePercentage: number | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
  generatedAt: string;
  isAiGenerated: boolean;
}

export interface EarlyWarningSummaryDto {
  termId: number;
  termName: string;
  totalWarnings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unresolvedCount: number;
  resolvedCount: number;
  criticalStudents: EarlyWarningDto[];
  recentWarnings: EarlyWarningDto[];
}

export interface ResolveWarningRequest {
  resolutionNote: string;
}
