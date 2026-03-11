import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Brain, BookOpen, Clock, Target, Star,
  Send, MessageCircle, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, Lightbulb,
} from 'lucide-react';

import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

import { useStudentAiInsights, useChatWithAssistant } from '../../hooks/student/useAiAssistant';
import { useSchoolStore } from '../../store/school.store';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../lib/utils';

import type { ChatMessageDto, StudyTipDto, WeeklyStudyPlanDto } from '../../types/ai.types';

// ── Constants ──

const SUGGESTED_QUESTIONS = [
  'How can I improve my weakest subject?',
  'What study techniques work best for Science?',
  'Help me create a study timetable for this week',
  'How should I prepare for my upcoming exams?',
  'Explain a topic I struggle with simply',
];

const MAX_MESSAGES_PER_HOUR = 10;

// ── Main Component ──

export default function AiStudyTips() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { currentTermId, currentTermLabel } = useSchoolStore();
  const termId = currentTermId;

  const insightsQuery = useStudentAiInsights(termId);
  const chatMutation = useChatWithAssistant();

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [input, setInput] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const insights = insightsQuery.data;

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;

    if (messageCount >= MAX_MESSAGES_PER_HOUR) {
      toast({
        title: 'Rate limit reached',
        description: `You can send up to ${MAX_MESSAGES_PER_HOUR} messages per hour. Please try again later.`,
        variant: 'warning',
      });
      return;
    }

    const userMsg: ChatMessageDto = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setMessageCount((c) => c + 1);

    try {
      const response = await chatMutation.mutateAsync({
        message: msg,
        history: messages,
      });
      const assistantMsg: ChatMessageDto = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error && err.message.includes('429')
        ? 'Rate limit reached. Please wait before sending more messages.'
        : 'Failed to get a response. Please try again.';
      toast({ title: 'Error', description: errorMsg, variant: 'danger' });
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
      setMessageCount((c) => Math.max(0, c - 1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* LEFT PANEL: Insights */}
      <div className="w-full space-y-5 lg:w-[420px] lg:shrink-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
            <Brain className="h-5 w-5 text-purple-600" />
            <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Study Assistant</h1>
            <p className="text-xs text-gray-500">
              Powered by Claude AI
              {currentTermLabel && <span className="text-gray-400"> &middot; {currentTermLabel}</span>}
            </p>
          </div>
        </div>

        {/* Insights Loading */}
        {insightsQuery.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        )}

        {/* Insights Content */}
        {insights && (
          <>
            {/* Summary */}
            <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-4 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-bold text-gray-900">Your Study Summary</h2>
              </div>
              <p className="text-sm leading-relaxed text-gray-700">{insights.summary}</p>
            </div>

            {/* Strengths & Areas for Improvement */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {/* Strengths */}
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-bold text-green-900">Your Strengths</h3>
                </div>
                {insights.strengths.length > 0 ? (
                  <ul className="space-y-1">
                    {insights.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-green-800">
                        <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-green-600">Keep working hard!</p>
                )}
              </div>

              {/* Areas for Improvement */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-900">Areas to Improve</h3>
                </div>
                {insights.areasForImprovement.length > 0 ? (
                  <ul className="space-y-1">
                    {insights.areasForImprovement.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                        <Target className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-600">Great progress!</p>
                )}
              </div>
            </div>

            {/* Study Tips */}
            {insights.studyTips.length > 0 && (
              <StudyTipsSection tips={insights.studyTips} />
            )}

            {/* Weekly Study Plan */}
            {insights.weeklyStudyPlan && (
              <WeeklyPlanSection plan={insights.weeklyStudyPlan} />
            )}

            {/* Motivational Message */}
            {insights.motivationalMessage && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <p className="text-sm italic text-blue-800">{insights.motivationalMessage}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* No insights — prompt to wait */}
        {!insightsQuery.isLoading && !insights && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
            <Brain className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              AI insights will appear here once your term results are available.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Chat */}
      <div className="flex min-h-[600px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-md">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-600" />
            <h2 className="font-bold text-gray-900">Chat with Study Assistant</h2>
          </div>
          <Badge variant="neutral" className="text-xs">
            {MAX_MESSAGES_PER_HOUR - messageCount} messages left
          </Badge>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Brain className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                Hi{user?.firstName ? `, ${user.firstName}` : ''}! I&apos;m your study assistant.
              </h3>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                Ask me anything about your subjects, study strategies, or academic performance.
              </p>

              {/* Suggested Questions */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatBubble key={idx} message={msg} />
          ))}

          {chatMutation.isPending && (
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-gray-100 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your studies..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              disabled={chatMutation.isPending}
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || chatMutation.isPending}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400 text-center">
            AI responses are for guidance only. Always consult your teachers for official advice.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ──

function ChatBubble({ message }: { message: ChatMessageDto }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-2', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary text-white' : 'bg-purple-100',
      )}>
        {isUser ? (
          <span className="text-xs font-bold">U</span>
        ) : (
          <Brain className="h-4 w-4 text-purple-600" />
        )}
      </div>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'rounded-tr-none bg-primary text-white'
          : 'rounded-tl-none bg-gray-100 text-gray-800',
      )}>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

function StudyTipsSection({ tips }: { tips: StudyTipDto[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900">Study Tips</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2.5">
          {tips.map((tip, idx) => (
            <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">{tip.subject}</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {tip.weeklyHours}h/week
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-600">{tip.tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeeklyPlanSection({ plan }: { plan: WeeklyStudyPlanDto }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-bold text-gray-900">Weekly Study Plan</h3>
          <Badge variant="neutral" className="text-xs">{plan.totalHoursRecommended}h total</Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {plan.breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-900">{item.subject}</p>
                <p className="text-[10px] text-gray-500">{item.focus}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, (item.hours / plan.totalHoursRecommended) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-bold text-gray-700">{item.hours}h</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
