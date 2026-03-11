import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TutorAssignmentDto } from '../types/tutor.types';

interface TutorState {
  // Currently selected class + subject context for score entry
  selectedClassRoomId: number | null;
  selectedClassRoomName: string | null;
  selectedSubjectId: number | null;
  selectedSubjectName: string | null;
  selectedTermId: number | null;
  selectedTermLabel: string | null;

  // Cached assignments list (loaded on dashboard mount)
  assignments: TutorAssignmentDto[];

  // ── Actions ──
  setSelectedContext: (context: {
    classRoomId: number;
    classRoomName: string;
    subjectId: number;
    subjectName: string;
    termId: number;
    termLabel: string;
  }) => void;

  setAssignments: (assignments: TutorAssignmentDto[]) => void;

  clearContext: () => void;
}

export const useTutorStore = create<TutorState>()(
  persist(
    (set) => ({
      selectedClassRoomId: null,
      selectedClassRoomName: null,
      selectedSubjectId: null,
      selectedSubjectName: null,
      selectedTermId: null,
      selectedTermLabel: null,
      assignments: [],

      setSelectedContext: (context) =>
        set({
          selectedClassRoomId: context.classRoomId,
          selectedClassRoomName: context.classRoomName,
          selectedSubjectId: context.subjectId,
          selectedSubjectName: context.subjectName,
          selectedTermId: context.termId,
          selectedTermLabel: context.termLabel,
        }),

      setAssignments: (assignments) => set({ assignments }),

      clearContext: () =>
        set({
          selectedClassRoomId: null,
          selectedClassRoomName: null,
          selectedSubjectId: null,
          selectedSubjectName: null,
          selectedTermId: null,
          selectedTermLabel: null,
        }),
    }),
    {
      name: 'shs_tutor',
      partialize: (state) => ({
        selectedClassRoomId: state.selectedClassRoomId,
        selectedClassRoomName: state.selectedClassRoomName,
        selectedSubjectId: state.selectedSubjectId,
        selectedSubjectName: state.selectedSubjectName,
        selectedTermId: state.selectedTermId,
        selectedTermLabel: state.selectedTermLabel,
        // Don't persist assignments — they're re-fetched on mount
      }),
    }
  )
);
