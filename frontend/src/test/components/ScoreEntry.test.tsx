import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/testUtils';
import ScoreEntry from '../../pages/tutor/ScoreEntry';

// Mock the tutor store
const mockSetSelectedContext = vi.fn();
vi.mock('../../store/tutor.store', () => ({
  useTutorStore: vi.fn(() => ({
    selectedClassRoomId: 1,
    selectedClassRoomName: 'SHS 2 Science A',
    selectedSubjectId: 1,
    selectedSubjectName: 'Chemistry',
    selectedTermId: 1,
    selectedTermLabel: 'Term 1 — 2024/2025',
    setSelectedContext: mockSetSelectedContext,
  })),
}));

// Mock the tutor hooks — shared state for overrides
let mockSheetData: Record<string, unknown> | null = null;

const defaultSheet = {
  subjectName: 'Chemistry',
  className: 'SHS 2 Science A',
  termLabel: 'Term 1',
  isLocked: false,
  completionStats: { total: 32, submitted: 20, pending: 12, percentage: 62.5 },
  students: [
    {
      studentId: 1,
      studentIndex: '0240123456',
      fullName: 'Kwame Mensah',
      classScore: 25,
      examScore: 53,
      totalScore: 78,
      grade: 'A2',
      remarks: 'Very Good',
      isAbsent: false,
    },
    {
      studentId: 2,
      studentIndex: '0240123457',
      fullName: 'Ama Serwaa',
      classScore: null,
      examScore: null,
      totalScore: null,
      grade: null,
      remarks: null,
      isAbsent: false,
    },
    {
      studentId: 3,
      studentIndex: '0240123458',
      fullName: 'Kofi Asante',
      classScore: null,
      examScore: null,
      totalScore: null,
      grade: null,
      remarks: null,
      isAbsent: true,
    },
  ],
};

vi.mock('../../hooks/tutor', () => ({
  useTutorAssignments: vi.fn(() => ({
    data: [
      {
        classRoomId: 1,
        className: 'SHS 2 Science A',
        subjectId: 1,
        subjectName: 'Chemistry',
        termId: 1,
        termLabel: 'Term 1 — 2024/2025',
        studentsCount: 32,
        scoresSubmitted: 20,
        completionPercentage: 62.5,
        isTermLocked: false,
      },
    ],
    isLoading: false,
  })),
  useScoreSheet: vi.fn(() => ({
    data: mockSheetData ?? defaultSheet,
    isLoading: false,
    isError: false,
  })),
  useEnterScore: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useEnterBulkScores: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useMarkAbsent: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

describe('ScoreEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSheetData = null;
  });

  it('renders score sheet with student rows', () => {
    renderWithProviders(<ScoreEntry />);

    // Names appear in both desktop table and mobile card views
    expect(screen.getAllByText('Kwame Mensah').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ama Serwaa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kofi Asante').length).toBeGreaterThanOrEqual(1);
  });

  it('renders assignment sidebar', () => {
    renderWithProviders(<ScoreEntry />);

    expect(screen.getByText('My Assignments')).toBeInTheDocument();
    expect(screen.getByText('Chemistry')).toBeInTheDocument();
  });

  it('shows header with subject and class name', () => {
    renderWithProviders(<ScoreEntry />);

    expect(screen.getByText('Chemistry — SHS 2 Science A')).toBeInTheDocument();
  });

  it('shows completion stats in header', () => {
    renderWithProviders(<ScoreEntry />);

    expect(screen.getByText(/20 submitted/)).toBeInTheDocument();
  });

  it('displays student index numbers', () => {
    renderWithProviders(<ScoreEntry />);

    // Index numbers appear in both desktop table and mobile card views
    expect(screen.getAllByText('0240123456').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0240123457').length).toBeGreaterThanOrEqual(1);
  });

  it('shows existing scores for students with data', () => {
    renderWithProviders(<ScoreEntry />);

    const inputs = screen.getAllByRole('spinbutton');
    // Kwame: classScore=25, examScore=53 (desktop + mobile inputs)
    expect(inputs[0]).toHaveValue(25);
    expect(inputs[1]).toHaveValue(53);
  });

  it('calculates total automatically when class + exam entered', async () => {
    renderWithProviders(<ScoreEntry />);

    // 25 + 53 = 78.0 — appears in score row and summary footer
    await waitFor(() => {
      const totals = screen.getAllByText('78.0');
      expect(totals.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows correct grade for calculated total', async () => {
    renderWithProviders(<ScoreEntry />);

    // 25 + 53 = 78 → computeGrade(78) = B2 (≥70)
    await waitFor(() => {
      const grades = screen.getAllByText('B2');
      expect(grades.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows remarks for calculated grade', async () => {
    renderWithProviders(<ScoreEntry />);

    // 78 → B2 → "Very Good"
    await waitFor(() => {
      const remarks = screen.getAllByText('Very Good');
      expect(remarks.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows absent text for absent students', () => {
    renderWithProviders(<ScoreEntry />);

    const absentTexts = screen.getAllByText('Absent');
    expect(absentTexts.length).toBeGreaterThan(0);
  });

  it('disables inputs for absent students', () => {
    renderWithProviders(<ScoreEntry />);

    const inputs = screen.getAllByRole('spinbutton');
    // Kofi is absent (3rd student) — inputs at index 4,5
    expect(inputs[4]).toBeDisabled();
    expect(inputs[5]).toBeDisabled();
  });

  it('shows class score and exam score column headers', () => {
    renderWithProviders(<ScoreEntry />);

    expect(screen.getByText('Class Score')).toBeInTheDocument();
    expect(screen.getByText('Exam Score')).toBeInTheDocument();
    expect(screen.getByText('(max 30)')).toBeInTheDocument();
    expect(screen.getByText('(max 70)')).toBeInTheDocument();
  });

  it('has class score inputs with max 30', () => {
    renderWithProviders(<ScoreEntry />);

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveAttribute('max', '30');
  });

  it('has exam score inputs with max 70', () => {
    renderWithProviders(<ScoreEntry />);

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[1]).toHaveAttribute('max', '70');
  });
});

describe('ScoreEntry - Locked Term', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSheetData = {
      ...defaultSheet,
      isLocked: true,
      students: [defaultSheet.students[0]],
    };
  });

  it('shows locked banner when term is locked', () => {
    renderWithProviders(<ScoreEntry />);

    expect(screen.getByText(/this term is locked/i)).toBeInTheDocument();
  });

  it('disables score inputs when term is locked', () => {
    renderWithProviders(<ScoreEntry />);

    const inputs = screen.getAllByRole('spinbutton');
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
  });
});
