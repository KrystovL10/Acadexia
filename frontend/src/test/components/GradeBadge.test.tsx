import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GradeBadge from '../../components/common/GradeBadge';

describe('GradeBadge', () => {
  it('renders A1 with grade-a1 class', () => {
    const { container } = render(<GradeBadge grade="A1" />);
    const badge = container.querySelector('.grade-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('grade-a1');
    expect(badge).toHaveTextContent('A1');
  });

  it('renders B2 with grade-b2 class', () => {
    const { container } = render(<GradeBadge grade="B2" />);
    const badge = container.querySelector('.grade-badge');
    expect(badge).toHaveClass('grade-b2');
    expect(badge).toHaveTextContent('B2');
  });

  it('renders C6 with grade-c6 class', () => {
    const { container } = render(<GradeBadge grade="C6" />);
    const badge = container.querySelector('.grade-badge');
    expect(badge).toHaveClass('grade-c6');
    expect(badge).toHaveTextContent('C6');
  });

  it('renders F9 with grade-f9 class', () => {
    const { container } = render(<GradeBadge grade="F9" />);
    const badge = container.querySelector('.grade-badge');
    expect(badge).toHaveClass('grade-f9');
    expect(badge).toHaveTextContent('F9');
  });

  it('displays grade text correctly', () => {
    render(<GradeBadge grade="B3" />);
    expect(screen.getByText('B3')).toBeInTheDocument();
  });

  it('renders em-dash when grade is null', () => {
    render(<GradeBadge grade={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders em-dash when grade is undefined', () => {
    render(<GradeBadge grade={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('handles case-insensitive grades', () => {
    const { container } = render(<GradeBadge grade="a1" />);
    const badge = container.querySelector('.grade-badge');
    expect(badge).toHaveClass('grade-a1');
    expect(badge).toHaveTextContent('a1');
  });

  it('applies additional className', () => {
    const { container } = render(<GradeBadge grade="A1" className="custom-class" />);
    const badge = container.querySelector('.grade-badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders all valid grades with appropriate classes', () => {
    const grades = ['A1', 'A2', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];
    for (const grade of grades) {
      const { container, unmount } = render(<GradeBadge grade={grade} />);
      const badge = container.querySelector('.grade-badge');
      expect(badge).toHaveClass(`grade-${grade.toLowerCase()}`);
      unmount();
    }
  });
});
