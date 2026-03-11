import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/testUtils';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import {
  mockAdminUser,
  mockDashboardStats,
  mockPowerRankings,
  mockTermComparison,
  mockGradeDistribution,
  mockClassPerformance,
  mockWarningSummary,
} from '../mocks/mockData';

// Mock auth store
vi.mock('../../store/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    user: mockAdminUser,
  })),
}));

// State for overrides
let schoolStoreState = {
  schoolId: 1 as number | null,
  currentTermId: 1 as number | null,
  currentTermLabel: 'Term 1' as string | null,
  currentAcademicYearLabel: '2024/2025' as string | null,
};

let statsLoading = false;
let statsData: typeof mockDashboardStats | undefined = mockDashboardStats;

// Mock school store
vi.mock('../../store/school.store', () => ({
  useSchoolStore: vi.fn(() => schoolStoreState),
}));

// Mock admin hooks
vi.mock('../../hooks/admin/useStats', () => ({
  useAdminDashboardStats: vi.fn(() => ({
    data: statsData,
    isLoading: statsLoading,
  })),
  useTermComparisonData: vi.fn(() => ({
    data: mockTermComparison,
    isLoading: false,
  })),
  useGradeDistribution: vi.fn(() => ({
    data: mockGradeDistribution,
    isLoading: false,
  })),
  useClassPerformance: vi.fn(() => ({
    data: mockClassPerformance,
    isLoading: false,
  })),
}));

vi.mock('../../hooks/admin/useWarnings', () => ({
  useWarningSummary: vi.fn(() => ({
    data: mockWarningSummary,
    isLoading: false,
  })),
}));

vi.mock('../../hooks/admin/useRankings', () => ({
  usePowerRankings: vi.fn(() => ({
    data: mockPowerRankings,
    isLoading: false,
  })),
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

// Mock theme
vi.mock('../../lib/theme', () => ({
  colors: {
    primary: '#1B6B3A',
    accent: '#FCD116',
    primaryDark: '#0f4a27',
  },
}));

// Mock routes
vi.mock('../../router/routes', () => ({
  ROUTES: {
    ADMIN_DASHBOARD: '/admin/dashboard',
    ADMIN_WARNINGS: '/admin/warnings',
    ADMIN_RANKINGS: '/admin/rankings',
    ADMIN_ACADEMIC_YEAR: '/admin/academic-year',
  },
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    schoolStoreState = {
      schoolId: 1,
      currentTermId: 1,
      currentTermLabel: 'Term 1',
      currentAcademicYearLabel: '2024/2025',
    };
    statsLoading = false;
    statsData = mockDashboardStats;
  });

  it('renders greeting with admin name', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText(/System/)).toBeInTheDocument();
  });

  it('renders all 4 stat cards', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('School Average GPA')).toBeInTheDocument();
    // "Pass Rate" appears both in stat card and class performance table header
    const passRateElements = screen.getAllByText('Pass Rate');
    expect(passRateElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Active Warnings')).toBeInTheDocument();
  });

  it('shows correct total students count', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('847')).toBeInTheDocument();
  });

  it('shows school average GPA', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('2.84')).toBeInTheDocument();
  });

  it('shows pass rate percentage', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('78.4%')).toBeInTheDocument();
  });

  it('shows active warnings count', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('renders term comparison bar chart', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Term Performance Comparison')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders grade distribution section', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Grade Distribution This Term')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows class performance ranking table', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Class Performance Ranking')).toBeInTheDocument();
    // Class names may appear in both the ranking table and top students section
    expect(screen.getAllByText('SHS 2 Science A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SHS 3 Science A')).toBeInTheDocument();
    expect(screen.getByText('SHS 1 Business A')).toBeInTheDocument();
  });

  it('shows early warnings panel with level labels', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Early Warnings')).toBeInTheDocument();
    // CRITICAL appears both in the level summary badge and in individual student warning badges
    expect(screen.getAllByText('CRITICAL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('shows critical students list', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Esi Adjei')).toBeInTheDocument();
    expect(screen.getByText('Yaw Darko')).toBeInTheDocument();
  });

  it('shows top students section', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Top Students This Term')).toBeInTheDocument();
    expect(screen.getByText('Kwame Mensah')).toBeInTheDocument();
    expect(screen.getByText('Ama Serwaa')).toBeInTheDocument();
    expect(screen.getByText('Kofi Asante')).toBeInTheDocument();
  });

  it('shows term and year badges', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Term 1 — 2024/2025')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Refresh Data')).toBeInTheDocument();
  });

  it('shows pass rate progress bar description', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Students above C6')).toBeInTheDocument();
  });

  it('shows active students enrolled label', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText('Active students enrolled')).toBeInTheDocument();
  });
});

describe('AdminDashboard - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    schoolStoreState = {
      schoolId: 1,
      currentTermId: 1,
      currentTermLabel: 'Term 1',
      currentAcademicYearLabel: '2024/2025',
    };
    statsLoading = true;
    statsData = undefined;
  });

  it('shows skeleton loaders while data is fetching', () => {
    const { container } = renderWithProviders(<AdminDashboard />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('AdminDashboard - No School Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    schoolStoreState = {
      schoolId: null,
      currentTermId: null,
      currentTermLabel: null,
      currentAcademicYearLabel: null,
    };
    statsLoading = false;
    statsData = undefined;
  });

  it('shows empty state when no term results exist', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText(/no results recorded yet/i)).toBeInTheDocument();
  });

  it('shows setup button', () => {
    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText(/set up academic year/i)).toBeInTheDocument();
  });
});
