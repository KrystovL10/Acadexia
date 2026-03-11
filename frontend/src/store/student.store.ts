import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StudentProfileDto, TermResultSummaryDto } from '../types/student.types';

interface StudentState {
  profile: StudentProfileDto | null;
  selectedTermId: number | null;
  selectedTermLabel: string | null;
  availableTerms: TermResultSummaryDto[];

  setProfile: (profile: StudentProfileDto) => void;
  setSelectedTerm: (termId: number, label: string) => void;
  setAvailableTerms: (terms: TermResultSummaryDto[]) => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      profile: null,
      selectedTermId: null,
      selectedTermLabel: null,
      availableTerms: [],

      setProfile: (profile) => set({ profile }),

      setSelectedTerm: (termId, label) =>
        set({ selectedTermId: termId, selectedTermLabel: label }),

      setAvailableTerms: (terms) => {
        // Default selectedTermId to the most recent generated term
        const generated = terms.filter((t) => t.gpa !== undefined);
        const latest = generated[generated.length - 1] ?? terms[terms.length - 1];
        set({
          availableTerms: terms,
          ...(latest
            ? { selectedTermId: latest.termId, selectedTermLabel: latest.termLabel }
            : {}),
        });
      },
    }),
    {
      name: 'shs_student',
      partialize: (state) => ({
        selectedTermId: state.selectedTermId,
        selectedTermLabel: state.selectedTermLabel,
      }),
    }
  )
);
