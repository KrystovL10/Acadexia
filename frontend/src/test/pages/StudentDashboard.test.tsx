import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/testUtils';
import StudentDashboard from '../../pages/student/StudentDashboard';
import {
  mockStudentUser,
  mockLatestResult,
  mockGpaHistory,
  mockWarnings,
  mockSubjectPerformance,
  mockStudentProfile,
} from '../mocks/mockData';

// Mock auth store
vi.mock('../../store/auth.store', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      user: mockStudentUser,
      isAuthenticated: true,
      accessToken: 'mock-token',
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock student store
vi.mock('../../store/student.store', () => ({
  useStudentStore: vi.fn(() => ({
    selectedTermId: 1,
  })),
}));

// Mock routes
vi.mock('../../router/routes', () => ({
  ROUTES: {
    STUDENT_DASHBOARD: '/student/dashboard',
    STUDENT_RESULTS: '/student/results',
    STUDENT_TRANSCRIPT: '/student/transcript',
    STUDENT_AI: '/student/ai',
    STUDENT_PROFILE: '/student/profile',
    STUDENT_ATTENDANCE: '/student/attendance',
  },
}));

// State for hook return values - allows override per test
let latestResultData: typeof mockLatestResult | null = mockLatestResult;
let gpaHistoryData: typeof mockGpaHistory | null = mockGpaHistory;
let warningsData: typeof mockWarnings = mockWarnings;
let subjectPerfData: typeof mockSubjectPerformance | null = mockSubjectPerformance;

vi.mock('../../hooks/student', () => ({
  useMyProfile: vi.fn(() => ({
    data: mockStudentProfile,
    isLoading: false,
  })),
  useMyLatestTermResult: vi.fn(() => ({
    data: latestResultData,
    isLoading: false,
  })),
  useMyGpaHistory: vi.fn(() => ({
    data: gpaHistoryData,
    isLoading: false,
  })),
  useMyWarnings: vi.fn(() => ({
    data: warningsData,
    isLoading: false,
  })),
  useMySubjectPerformance: vi.fn(() => ({
    data: subjectPerfData,
    isLoading: false,
  })),
  useDownloadTranscript: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
  Area: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('StudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestResultData = mockLatestResult;
    gpaHistoryData = mockGpaHistory;
    warningsData = mockWarnings;
    subjectPerfData = mockSubjectPerformance;
  });

  it('shows personalized greeting with student name', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText(/Kwame/)).toBeInTheDocument();
  });

  it('displays GPA from latest term result', () => {
    renderWithProviders(<StudentDashboard />);

    const gpaElements = screen.getAllByText('3.02');
    expect(gpaElements.length).toBeGreaterThan(0);
  });

  it('displays student index', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('#0240123456')).toBeInTheDocument();
  });

  it('displays class and year group', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText(/SHS2.*SHS 2 Science A/)).toBeInTheDocument();
  });

  it('displays program name', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('General Science')).toBeInTheDocument();
  });

  it('displays term label', () => {
    renderWithProviders(<StudentDashboard />);

    const termLabels = screen.getAllByText('Term 1 — 2024/2025');
    expect(termLabels.length).toBeGreaterThan(0);
  });

  it('displays GPA classification badge', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('VERY GOOD')).toBeInTheDocument();
  });

  it('displays class position', () => {
    renderWithProviders(<StudentDashboard />);

    const positionElements = screen.getAllByText('#4');
    expect(positionElements.length).toBeGreaterThan(0);
  });

  it('displays out of total students', () => {
    renderWithProviders(<StudentDashboard />);

    const outOfElements = screen.getAllByText(/out of 32/);
    expect(outOfElements.length).toBeGreaterThan(0);
  });

  it('displays CGPA stat card', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('CGPA')).toBeInTheDocument();
    expect(screen.getByText('2.94')).toBeInTheDocument();
  });

  it('displays subjects passed count', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('Subjects')).toBeInTheDocument();
  });

  it('displays attendance percentage', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('Attendance')).toBeInTheDocument();
    // AttendanceRing renders the percentage, and stat card shows it too
    const pctElements = screen.getAllByText('92%');
    expect(pctElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays GPA progression chart area', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('My Academic Journey')).toBeInTheDocument();
  });

  it('displays strongest subjects', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('Social Studies')).toBeInTheDocument();
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
  });

  it('displays focus areas (weakest subjects)', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('Core Mathematics')).toBeInTheDocument();
    expect(screen.getByText('English Language')).toBeInTheDocument();
  });

  it('shows active warnings when warnings exist', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('Academic Alert')).toBeInTheDocument();
  });

  it('displays conduct rating', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('My Conduct')).toBeInTheDocument();
  });

  it('displays quick action buttons', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('View Results')).toBeInTheDocument();
    expect(screen.getByText('Download Transcript')).toBeInTheDocument();
    expect(screen.getByText('Study Assistant')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });

  it('shows recent term results with score chips', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('Recent Term Results')).toBeInTheDocument();
    expect(screen.getByText(/Mathematics: A2/)).toBeInTheDocument();
    expect(screen.getByText(/Physics: B3/)).toBeInTheDocument();
  });
});

describe('StudentDashboard - No Results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestResultData = null;
    gpaHistoryData = null;
    warningsData = [];
    subjectPerfData = null;
  });

  it('shows "no results" state when no published results', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText(/your term results will appear here/i)).toBeInTheDocument();
  });

  it('hides warnings section when no active warnings', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.queryByText('Academic Alert')).not.toBeInTheDocument();
  });

  it('shows results pending badge', () => {
    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText('Results Pending')).toBeInTheDocument();
  });
});
