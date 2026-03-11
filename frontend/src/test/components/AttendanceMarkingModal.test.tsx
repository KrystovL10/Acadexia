import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/testUtils';
import AttendanceMarkingModal from '../../components/teacher/AttendanceMarkingModal';

// Mock Radix Dialog to avoid jsdom issues with Radix portals/presence
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Overlay: () => <div data-testid="dialog-overlay" />,
  Content: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Description: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Close: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock teacher store
vi.mock('../../store/teacher.store', () => ({
  useTeacherStore: vi.fn(() => ({
    classRoomName: 'SHS 2 Science A',
  })),
}));

// Mock teacher hooks
const mockMarkAttendanceMutate = vi.fn();

// Stable references to prevent infinite re-render loops
const stableStudents = [
  { id: 1, fullName: 'Kwame Mensah', studentIndex: '0240123456' },
  { id: 2, fullName: 'Ama Serwaa', studentIndex: '0240123457' },
  { id: 3, fullName: 'Kofi Asante', studentIndex: '0240123458' },
];
const stableSheet = { dates: [] as string[], students: [] as Array<{ id: number }>, attendanceMatrix: {} as Record<number, Record<string, boolean | undefined>> };

vi.mock('../../hooks/teacher', () => ({
  useClassStudents: vi.fn(() => ({
    data: stableStudents,
    isLoading: false,
  })),
  useMarkAttendance: vi.fn(() => ({
    mutate: mockMarkAttendanceMutate,
    isPending: false,
  })),
  useAttendanceSheet: vi.fn(() => ({
    data: stableSheet,
  })),
}));

describe('AttendanceMarkingModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    classRoomId: 1,
    termId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all students in class', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    expect(screen.getByText('Kwame Mensah')).toBeInTheDocument();
    expect(screen.getByText('Ama Serwaa')).toBeInTheDocument();
    expect(screen.getByText('Kofi Asante')).toBeInTheDocument();
  });

  it('renders student index numbers', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    expect(screen.getByText('0240123456')).toBeInTheDocument();
    expect(screen.getByText('0240123457')).toBeInTheDocument();
    expect(screen.getByText('0240123458')).toBeInTheDocument();
  });

  it('renders present, absent, and late buttons for each student', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    const presentButtons = screen.getAllByText('Present');
    const absentButtons = screen.getAllByText('Absent');
    const lateButtons = screen.getAllByText('Late');

    expect(presentButtons).toHaveLength(3);
    expect(absentButtons).toHaveLength(3);
    expect(lateButtons).toHaveLength(3);
  });

  it('marks all present when "Mark All Present" clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    await user.click(screen.getByText('Mark All Present'));

    await waitFor(() => {
      expect(screen.getByText('3 present')).toBeInTheDocument();
    });
  });

  it('shows reason input when student marked absent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    const absentButtons = screen.getAllByText('Absent');
    await user.click(absentButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/reason/i)).toBeInTheDocument();
    });
  });

  it('shows quick reason buttons when student marked absent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    const absentButtons = screen.getAllByText('Absent');
    await user.click(absentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Illness')).toBeInTheDocument();
      expect(screen.getByText('Family Event')).toBeInTheDocument();
      expect(screen.getByText('No reason')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
    });
  });

  it('shows progress counter as students marked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    expect(screen.getByText('Marked: 0 of 3 students')).toBeInTheDocument();

    const presentButtons = screen.getAllByText('Present');
    await user.click(presentButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Marked: 1 of 3 students')).toBeInTheDocument();
    });
  });

  it('shows search input for filtering students', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/search student/i)).toBeInTheDocument();
  });

  it('filters students by search text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/search student/i), 'Kwame');

    await waitFor(() => {
      expect(screen.getByText('Kwame Mensah')).toBeInTheDocument();
      expect(screen.queryByText('Ama Serwaa')).not.toBeInTheDocument();
      expect(screen.queryByText('Kofi Asante')).not.toBeInTheDocument();
    });
  });

  it('shows "Not yet marked" filter toggle', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    expect(screen.getByText('Not yet marked')).toBeInTheDocument();
  });

  it('enables submit when all students are marked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    await user.click(screen.getByText('Mark All Present'));

    await waitFor(() => {
      const submitButton = screen.getByText('Submit Attendance');
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows submit anyway flow when not all students marked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    const presentButtons = screen.getAllByText('Present');
    await user.click(presentButtons[0]);

    await user.click(screen.getByText('Submit Attendance'));

    await waitFor(() => {
      expect(screen.getByText(/not marked/)).toBeInTheDocument();
      expect(screen.getByText('Submit Anyway')).toBeInTheDocument();
    });
  });

  it('renders date input', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    const dateInput = screen.getByDisplayValue(new Date().toISOString().slice(0, 10));
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute('max', new Date().toISOString().slice(0, 10));
  });

  it('shows cancel button', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render content when isOpen is false', () => {
    renderWithProviders(<AttendanceMarkingModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Kwame Mensah')).not.toBeInTheDocument();
  });
});
