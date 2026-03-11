import { useState } from 'react';
import {
  Sparkles, Brain, Lightbulb, TrendingUp,
  AlertTriangle, Award, Target, Users, Star,
  ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react';

import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

import { useClassAiInsights, useGenerateClassAiInsights } from '../../hooks/teacher';
import { useTeacherStore } from '../../store/teacher.store';
import { useSchoolStore } from '../../store/school.store';
import { cn } from '../../lib/utils';

import type { InsightDto, SubjectRecommendation } from '../../types/ai.types';

// ── Constants ──

const CATEGORY_CONFIG: Record<string, { color: string; icon: typeof TrendingUp; iconColor: string }> = {
  PERFORMANCE: { color: 'bg-green-100 text-green-800 border-green-200', icon: TrendingUp, iconColor: 'text-green-600' },
  WARNING: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, iconColor: 'text-red-600' },
  TREND: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Target, iconColor: 'text-blue-600' },
  RECOMMENDATION: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Lightbulb, iconColor: 'text-purple-600' },
  ACHIEVEMENT: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Award, iconColor: 'text-amber-600' },
};

const LOADING_MESSAGES = [
  'Reviewing class performance...',
  'Identifying students who need support...',
  'Analysing subject trends...',
  'Preparing recommendations...',
];

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

// ── Main Component ──

export default function TeacherAiInsights() {
  const { toast } = useToast();
  const teacherStore = useTeacherStore();
  const schoolStore = useSchoolStore();
  const termId = teacherStore.currentTermId ?? schoolStore.currentTermId;

  const insightsQuery = useClassAiInsights(termId);
  const generateInsights = useGenerateClassAiInsights();

  const data = insightsQuery.data;
  const hasData = data != null && data.insights.length > 0;

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const handleGenerate = async () => {
    if (!termId) return;
    // Start cycling messages
    const interval = setInterval(() => {
      setLoadingMsgIdx((p) => (p + 1) % LOADING_MESSAGES.length);
    }, 2000);
    try {
      await generateInsights.mutateAsync(termId);
      toast({ title: 'Class insights generated successfully', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate insights.', variant: 'danger' });
    } finally {
      clearInterval(interval);
    }
  };

  const isGenerating = generateInsights.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
            <Brain className="h-6 w-6 text-purple-600" />
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Class AI Insights</h1>
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <span>Powered by Claude AI</span>
              {teacherStore.classRoomName && (
                <Badge variant="neutral">{teacherStore.classRoomName}</Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.generatedAt && (
            <span className="text-xs text-gray-400">
              {formatTimeAgo(data.generatedAt)}
            </span>
          )}
          <Button onClick={handleGenerate} loading={isGenerating} disabled={!termId}>
            <Sparkles className="h-4 w-4" />
            Generate Insights
          </Button>
        </div>
      </div>

      {/* Generating Animation */}
      {isGenerating && (
        <div className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
          <div className="flex flex-col items-center text-center">
            <Brain className="h-14 w-14 text-purple-500 animate-pulse" />
            <p className="mt-4 text-lg font-semibold text-gray-900">Analysing your class...</p>
            <p className="mt-2 h-5 text-sm text-purple-600">{LOADING_MESSAGES[loadingMsgIdx]}</p>
            <div className="mt-5 h-2 w-48 overflow-hidden rounded-full bg-purple-100">
              <div className="h-full w-1/2 animate-indeterminate rounded-full bg-gradient-to-r from-purple-400 via-purple-600 to-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {insightsQuery.isLoading && !isGenerating && (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      )}

      {/* Empty */}
      {!insightsQuery.isLoading && !hasData && !isGenerating && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-green-50/30 via-white to-amber-50/30 p-12">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-amber-100">
              <Brain className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">No insights yet</h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Generate AI-powered analysis of your class performance, student highlights, and subject recommendations.
            </p>
            <Button className="mt-4" onClick={handleGenerate} disabled={!termId}>
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {hasData && !isGenerating && (
        <>
          {/* Summary */}
          <ClassSummaryCard summary={data.summary} />

          {/* Student Highlights */}
          {data.studentHighlights && (
            <StudentHighlights highlights={data.studentHighlights} />
          )}

          {/* Insights */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Insights & Recommendations</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {data.insights.map((insight, idx) => (
                <ClassInsightCard key={idx} insight={insight} />
              ))}
            </div>
          </div>

          {/* Subject Recommendations */}
          {data.subjectRecommendations.length > 0 && (
            <SubjectRecommendationsSection recommendations={data.subjectRecommendations} />
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-Components ──

function ClassSummaryCard({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLong = summary.length > 250;
  const displayText = isLong && !expanded ? summary.slice(0, 250) + '...' : summary;

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-5 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h2 className="font-bold text-gray-900">Class Summary</h2>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{displayText}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-sm font-medium text-purple-600"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Less' : 'More'}
        </button>
      )}
    </div>
  );
}

function StudentHighlights({ highlights }: { highlights: { mostImproved: string[]; needsSupport: string[] } }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Most Improved */}
      <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-5 w-5 text-green-600" />
          <h3 className="font-bold text-green-900">Most Improved</h3>
        </div>
        {highlights.mostImproved.length > 0 ? (
          <ul className="space-y-1.5">
            {highlights.mostImproved.map((name, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-green-800">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-green-600">No data available</p>
        )}
      </div>

      {/* Needs Support */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-red-600" />
          <h3 className="font-bold text-red-900">Needs Support</h3>
        </div>
        {highlights.needsSupport.length > 0 ? (
          <ul className="space-y-1.5">
            {highlights.needsSupport.map((name, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-red-800">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-red-600">No students flagged</p>
        )}
      </div>
    </div>
  );
}

function ClassInsightCard({ insight }: { insight: InsightDto }) {
  const config = CATEGORY_CONFIG[insight.category] ?? CATEGORY_CONFIG.TREND;
  const Icon = config.icon;

  return (
    <div className={cn(
      'rounded-xl border border-gray-200 p-4 shadow-md hover:shadow-lg transition-shadow',
      insight.priority === 'HIGH' && 'lg:col-span-2',
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', config.color.split(' ')[0])}>
          <Icon className={cn('h-4 w-4', config.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full border px-2 py-0.5 text-xs font-bold', config.color)}>
              {insight.category}
            </span>
            {insight.priority === 'HIGH' && <Badge variant="danger" className="text-xs">HIGH</Badge>}
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-gray-900">{insight.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{insight.body}</p>
          {insight.suggestedAction && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
              <div className="flex gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">{insight.suggestedAction}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubjectRecommendationsSection({ recommendations }: { recommendations: SubjectRecommendation[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">Subject Recommendations</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="rounded-xl border border-gray-200 p-4 shadow-md">
            <h4 className="text-sm font-bold text-gray-900">{rec.subjectName}</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{rec.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
