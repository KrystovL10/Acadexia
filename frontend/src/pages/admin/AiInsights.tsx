import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Brain, Lightbulb, TrendingUp,
  AlertTriangle, Award, Target, BookOpen, ChevronDown, ChevronUp,
  Copy, Check, Download, Shield, Users, RefreshCw,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

import { useAiInsights, useGenerateAiInsights, useWaecReadinessReport, useGenerateWaecReadiness } from '../../hooks/admin';
import { useSchoolStore } from '../../store/school.store';
import { cn } from '../../lib/utils';

import type { InsightDto, WaecReadinessReportDto, StudentWaecPredictionDto } from '../../types/ai.types';

// ==================== CONSTANTS ====================

const CATEGORY_CONFIG: Record<string, { color: string; icon: typeof TrendingUp; iconColor: string }> = {
  PERFORMANCE: { color: 'bg-green-100 text-green-800 border-green-200', icon: TrendingUp, iconColor: 'text-green-600' },
  WARNING: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, iconColor: 'text-red-600' },
  TREND: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Target, iconColor: 'text-blue-600' },
  RECOMMENDATION: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Lightbulb, iconColor: 'text-purple-600' },
  ACHIEVEMENT: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Award, iconColor: 'text-amber-600' },
};

const CATEGORY_ORDER: Record<string, number> = {
  WARNING: 0, RECOMMENDATION: 1, TREND: 2, PERFORMANCE: 3, ACHIEVEMENT: 4,
};

const LOADING_MESSAGES = [
  'Reviewing student performance trends...',
  'Identifying at-risk students...',
  'Analysing subject performance...',
  'Comparing term-over-term data...',
  'Evaluating attendance patterns...',
  'Preparing recommendations...',
];

const GRADE_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-800',
  A2: 'bg-green-100 text-green-800',
  B2: 'bg-teal-100 text-teal-800',
  B3: 'bg-cyan-100 text-cyan-800',
  C4: 'bg-blue-100 text-blue-800',
  C5: 'bg-indigo-100 text-indigo-800',
  C6: 'bg-yellow-100 text-yellow-800',
  D7: 'bg-orange-100 text-orange-800',
  E8: 'bg-red-100 text-red-800',
  F9: 'bg-red-200 text-red-900',
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

// ==================== MAIN COMPONENT ====================

export default function AiInsights() {
  const { toast } = useToast();
  const { schoolId, schoolName, currentTermId, currentTermLabel } = useSchoolStore();
  const sid = schoolId ?? 0;
  const tid = currentTermId ?? 0;

  const insightsQuery = useAiInsights(sid, tid);
  const generateInsights = useGenerateAiInsights();
  const waecQuery = useWaecReadinessReport(sid, tid);
  const generateWaec = useGenerateWaecReadiness();

  const data = insightsQuery.data;
  const hasData = data != null && data.insights.length > 0;

  const handleGenerate = async () => {
    try {
      await generateInsights.mutateAsync({ schoolId: sid, termId: tid });
      toast({ title: 'AI insights generated successfully', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate insights. Please try again.', variant: 'danger' });
    }
  };

  const handleGenerateWaec = async () => {
    try {
      await generateWaec.mutateAsync({ schoolId: sid, termId: tid });
      toast({ title: 'WAEC readiness report generated', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate WAEC readiness.', variant: 'danger' });
    }
  };

  const isGenerating = generateInsights.isPending;

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
            <Brain className="h-6 w-6 text-purple-600" />
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Academic Insights</h1>
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <span>Powered by Claude AI</span>
              {currentTermLabel && <Badge variant="neutral">{currentTermLabel}</Badge>}
              {schoolName && <span className="text-gray-400">&middot; {schoolName}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.generatedAt && (
            <span className="text-xs text-gray-400">
              Last generated: {formatTimeAgo(data.generatedAt)}
            </span>
          )}
          <Button onClick={handleGenerate} loading={isGenerating}>
            <Sparkles className="h-4 w-4" />
            Generate New Insights
          </Button>
        </div>
      </div>

      {/* LOADING STATE */}
      {isGenerating && <GeneratingAnimation />}

      {/* INITIAL LOADING */}
      {insightsQuery.isLoading && !isGenerating && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {/* EMPTY STATE */}
      {!insightsQuery.isLoading && !hasData && !isGenerating && (
        <EmptyState onGenerate={handleGenerate} />
      )}

      {/* INSIGHTS CONTENT */}
      {hasData && !isGenerating && (
        <>
          {/* TERM SUMMARY */}
          <TermSummaryCard summary={data.summary} />

          {/* INSIGHTS GRID */}
          <InsightsGrid insights={data.insights} />

          {/* WAEC READINESS */}
          <WaecReadinessSection
            waecSummary={data.waecReadiness}
            waecReport={waecQuery.data ?? null}
            isLoadingReport={waecQuery.isLoading}
            onGenerate={handleGenerateWaec}
            isGenerating={generateWaec.isPending}
          />
        </>
      )}
    </div>
  );
}

// ==================== GENERATING ANIMATION ====================

function GeneratingAnimation() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Brain className="h-16 w-16 text-purple-500 animate-pulse" />
          <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-amber-400 animate-bounce" />
        </div>
        <p className="mt-4 text-lg font-semibold text-gray-900">
          Analysing academic data...
        </p>
        <p className="mt-2 h-5 text-sm text-purple-600 transition-all duration-300">
          {LOADING_MESSAGES[msgIndex]}
        </p>

        <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-purple-100">
          <div className="h-full w-1/2 animate-indeterminate rounded-full bg-gradient-to-r from-purple-400 via-purple-600 to-purple-400" />
        </div>
      </div>
    </div>
  );
}

// ==================== EMPTY STATE ====================

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-green-50/30 via-white to-amber-50/30 p-12">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-amber-100">
            <Brain className="h-12 w-12 text-gray-400" />
          </div>
          <Sparkles className="absolute -right-1 top-0 h-6 w-6 text-amber-400" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-gray-900">No insights generated yet</h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Click &quot;Generate New Insights&quot; to let AI analyse this term&apos;s academic data
          and provide actionable recommendations for improving student outcomes.
        </p>
        <Button className="mt-6" size="lg" onClick={onGenerate}>
          <Sparkles className="h-5 w-5" />
          Generate Insights
        </Button>
      </div>
    </div>
  );
}

// ==================== TERM SUMMARY ====================

function TermSummaryCard({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLong = summary.length > 300;
  const displayText = isLong && !expanded ? summary.slice(0, 300) + '...' : summary;

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900">Term Summary from AI</h2>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{displayText}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

// ==================== INSIGHTS GRID ====================

function InsightsGrid({ insights }: { insights: InsightDto[] }) {
  const sorted = useMemo(() =>
    [...insights].sort((a, b) =>
      (CATEGORY_ORDER[a.category] ?? 5) - (CATEGORY_ORDER[b.category] ?? 5)
    ),
    [insights],
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">AI Insights</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sorted.map((insight, idx) => (
          <InsightCard
            key={idx}
            insight={insight}
            fullWidth={insight.priority === 'HIGH'}
          />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight, fullWidth }: { insight: InsightDto; fullWidth: boolean }) {
  const config = CATEGORY_CONFIG[insight.category] ?? CATEGORY_CONFIG.TREND;
  const Icon = config.icon;

  return (
    <div className={cn(
      'rounded-xl border border-gray-200 p-5 shadow-md hover:shadow-lg transition-shadow',
      fullWidth && 'lg:col-span-2',
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-opacity-20', config.color.split(' ')[0])}>
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold', config.color)}>
              {insight.category}
            </span>
            {insight.priority === 'HIGH' && (
              <Badge variant="danger" className="text-xs">HIGH PRIORITY</Badge>
            )}
          </div>
          <h3 className="mt-2 text-sm font-bold text-gray-900">{insight.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{insight.body}</p>

          <p className="mt-2 text-xs font-medium text-gray-500">{insight.affectedScope}</p>

          {insight.suggestedAction && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">{insight.suggestedAction}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== WAEC READINESS ====================

interface WaecReadinessSectionProps {
  waecSummary: { overallReadiness: number; shs3AtRiskCount: number; criticalSubjects: string[]; recommendation: string } | null;
  waecReport: WaecReadinessReportDto | null;
  isLoadingReport: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
}

function WaecReadinessSection({ waecSummary, waecReport, isLoadingReport, onGenerate, isGenerating }: WaecReadinessSectionProps) {
  const [showPredictions, setShowPredictions] = useState(false);

  // Determine which data to show
  const readinessPercentage = waecReport?.schoolReadinessPercentage ?? waecSummary?.overallReadiness ?? null;
  const atRiskCount = waecReport?.atRiskCount ?? waecSummary?.shs3AtRiskCount ?? 0;
  const criticalSubjects = waecReport?.criticalSubjects ?? waecSummary?.criticalSubjects ?? [];
  const recommendation = waecReport?.overallRecommendation ?? waecSummary?.recommendation ?? '';
  const predictions = waecReport?.studentPredictions ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">WASSCE Readiness — SHS3</h2>
        </div>
        <div className="flex items-center gap-2">
          {predictions.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowPredictions(!showPredictions)}>
              <Users className="h-3.5 w-3.5" />
              {showPredictions ? 'Hide' : 'Show'} Predictions ({predictions.length})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onGenerate} loading={isGenerating}>
            <RefreshCw className="h-3.5 w-3.5" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {readinessPercentage !== null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {/* Readiness Gauge */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-md">
            <div className="relative mx-auto h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={readinessPercentage >= 70 ? '#22c55e' : readinessPercentage >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${readinessPercentage * 2.64} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-gray-900">{readinessPercentage}%</span>
              </div>
            </div>
            <p className="mt-2 text-xs font-medium text-gray-500">School Readiness</p>
          </div>

          {/* At Risk Count */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 text-center shadow-md">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-3xl font-black text-red-600">{atRiskCount}</p>
            <p className="text-xs font-medium text-red-500">Students At Risk</p>
          </div>

          {/* Critical Subjects */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
            <BookOpen className="mx-auto h-6 w-6 text-amber-600" />
            <p className="mt-2 text-sm font-bold text-gray-900">Critical Subjects</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {criticalSubjects.length > 0 ? criticalSubjects.map((s) => (
                <span key={s} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {s}
                </span>
              )) : (
                <span className="text-xs text-gray-400">None identified</span>
              )}
            </div>
          </div>

          {/* Readiness Breakdown */}
          {waecReport && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
              <p className="text-sm font-bold text-gray-900">Readiness Breakdown</p>
              <div className="mt-3 space-y-2">
                <ReadinessBar label="High" count={waecReport.highReadinessCount} total={waecReport.totalShs3Students} color="bg-green-500" />
                <ReadinessBar label="Medium" count={waecReport.mediumReadinessCount} total={waecReport.totalShs3Students} color="bg-amber-500" />
                <ReadinessBar label="Low" count={waecReport.lowReadinessCount} total={waecReport.totalShs3Students} color="bg-orange-500" />
                <ReadinessBar label="At Risk" count={waecReport.atRiskCount} total={waecReport.totalShs3Students} color="bg-red-500" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Recommendation */}
      {recommendation && (
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
          <div className="flex gap-2">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
            <p className="text-sm text-purple-800">{recommendation}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoadingReport && !waecReport && (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      )}

      {/* Predictions Table */}
      {showPredictions && predictions.length > 0 && (
        <PredictionsTable predictions={predictions} />
      )}
    </div>
  );
}

function ReadinessBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-gray-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-bold text-gray-700">{count}</span>
    </div>
  );
}

function PredictionsTable({ predictions }: { predictions: StudentWaecPredictionDto[] }) {
  const coreSubjects = useMemo(() => {
    if (predictions.length === 0) return [];
    return Object.keys(predictions[0].predictedGrades);
  }, [predictions]);

  const handleExport = () => {
    const header = ['Student', 'Index', 'Class', ...coreSubjects, 'Readiness %', 'Risk Level'];
    const rows = predictions.map((s) => [
      s.studentName, s.studentIndex, s.className,
      ...coreSubjects.map((sub) => s.predictedGrades[sub] ?? '-'),
      String(s.readinessScore),
      s.overallReadiness,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waec_readiness_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskConfig: Record<string, { badge: 'success' | 'warning' | 'danger' | 'neutral'; label: string; rowBg: string }> = {
    HIGH: { badge: 'success', label: 'Ready', rowBg: '' },
    MEDIUM: { badge: 'warning', label: 'Borderline', rowBg: 'bg-amber-50/40' },
    LOW: { badge: 'danger', label: 'Low', rowBg: 'bg-orange-50/40' },
    AT_RISK: { badge: 'danger', label: 'At Risk', rowBg: 'bg-red-50/40' },
  };

  return (
    <Card className="overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-900">Student Predictions</p>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-left">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Class</th>
              {coreSubjects.map((sub) => (
                <th key={sub} className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  {sub}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Readiness</th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {predictions.map((s) => {
              const risk = riskConfig[s.overallReadiness] ?? riskConfig.MEDIUM;
              return (
                <tr key={s.studentId} className={cn('hover:bg-gray-50 transition-colors', risk.rowBg)}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                      <p className="text-xs text-gray-400">{s.studentIndex}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.className}</td>
                  {coreSubjects.map((sub) => {
                    const grade = s.predictedGrades[sub] ?? '-';
                    return (
                      <td key={sub} className="px-3 py-3 text-center">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
                          GRADE_COLORS[grade] ?? 'bg-gray-100 text-gray-700',
                        )}>
                          {grade}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            s.readinessScore >= 70 ? 'bg-green-500' :
                            s.readinessScore >= 50 ? 'bg-amber-500' : 'bg-red-500',
                          )}
                          style={{ width: `${s.readinessScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{s.readinessScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={risk.badge}>{risk.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
