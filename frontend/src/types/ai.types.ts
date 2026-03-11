// ── AI Insight Types (Admin & Teacher) ──────────────────────────────────────

export interface InsightDto {
  category: string;
  title: string;
  body: string;
  affectedScope: string;
  suggestedAction: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface WaecReadinessDto {
  overallReadiness: number;
  shs3AtRiskCount: number;
  criticalSubjects: string[];
  recommendation: string;
}

export interface SchoolInsightsDto {
  summary: string;
  insights: InsightDto[];
  waecReadiness: WaecReadinessDto | null;
  generatedAt: string;
  schoolId: number;
  termId: number;
}

export interface ClassInsightsDto {
  summary: string;
  insights: InsightDto[];
  studentHighlights: {
    mostImproved: string[];
    needsSupport: string[];
  } | null;
  subjectRecommendations: SubjectRecommendation[];
  generatedAt: string;
  classRoomId: number;
  termId: number;
}

export interface SubjectRecommendation {
  subjectName: string;
  recommendation: string;
}

// ── WAEC Readiness (Admin) ──────────────────────────────────────────────────

export interface StudentWaecPredictionDto {
  studentId: number;
  studentName: string;
  studentIndex: string;
  className: string;
  predictedGrades: Record<string, string>;
  overallReadiness: string;
  readinessScore: number;
  riskFactors: string[];
  recommendation: string;
}

export interface WaecReadinessReportDto {
  schoolId: number;
  termId: number;
  totalShs3Students: number;
  highReadinessCount: number;
  mediumReadinessCount: number;
  lowReadinessCount: number;
  atRiskCount: number;
  studentPredictions: StudentWaecPredictionDto[];
  criticalSubjects: string[];
  schoolReadinessPercentage: number;
  overallRecommendation: string;
  generatedAt: string;
}

// ── Student AI Study Assistant ──────────────────────────────────────────────

export interface StudyTipDto {
  subject: string;
  tip: string;
  weeklyHours: number;
}

export interface SubjectStudyBreakdownDto {
  subject: string;
  hours: number;
  focus: string;
}

export interface WeeklyStudyPlanDto {
  totalHoursRecommended: number;
  breakdown: SubjectStudyBreakdownDto[];
}

export interface StudentInsightsDto {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  studyTips: StudyTipDto[];
  motivationalMessage: string;
  weeklyStudyPlan: WeeklyStudyPlanDto | null;
  generatedAt: string;
}

export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessageDto[];
}
