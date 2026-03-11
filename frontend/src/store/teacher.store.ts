import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { YearGroup } from '../types/enums';

interface ClassContext {
  classRoomId: number;
  classRoomName: string;
  yearGroup: YearGroup | null;
  programName: string | null;
  currentTermId: number | null;
  currentTermLabel: string | null;
}

interface TeacherState {
  classRoomId: number | null;
  classRoomName: string | null;
  yearGroup: YearGroup | null;
  programName: string | null;
  currentTermId: number | null;
  currentTermLabel: string | null;

  // ── Actions ──
  setClassContext: (data: ClassContext) => void;
  setCurrentTerm: (termId: number, termLabel: string) => void;
  clearContext: () => void;
}

export const useTeacherStore = create<TeacherState>()(
  persist(
    (set) => ({
      classRoomId: null,
      classRoomName: null,
      yearGroup: null,
      programName: null,
      currentTermId: null,
      currentTermLabel: null,

      setClassContext: (data) =>
        set({
          classRoomId: data.classRoomId,
          classRoomName: data.classRoomName,
          yearGroup: data.yearGroup,
          programName: data.programName,
          currentTermId: data.currentTermId,
          currentTermLabel: data.currentTermLabel,
        }),

      setCurrentTerm: (termId, termLabel) =>
        set({ currentTermId: termId, currentTermLabel: termLabel }),

      clearContext: () =>
        set({
          classRoomId: null,
          classRoomName: null,
          yearGroup: null,
          programName: null,
          currentTermId: null,
          currentTermLabel: null,
        }),
    }),
    {
      name: 'shs_teacher',
    }
  )
);
