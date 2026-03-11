import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SchoolState {
  schoolId: number | null;
  schoolName: string | null;
  currentAcademicYearId: number | null;
  currentAcademicYearLabel: string | null;
  currentTermId: number | null;
  currentTermLabel: string | null;

  setSchoolContext: (school: {
    schoolId: number;
    schoolName: string;
  }) => void;

  setTermContext: (context: {
    academicYearId: number;
    academicYearLabel: string;
    termId: number;
    termLabel: string;
  }) => void;

  clearSchoolContext: () => void;
}

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set) => ({
      schoolId: null,
      schoolName: null,
      currentAcademicYearId: null,
      currentAcademicYearLabel: null,
      currentTermId: null,
      currentTermLabel: null,

      setSchoolContext: (school) =>
        set({
          schoolId: school.schoolId,
          schoolName: school.schoolName,
        }),

      setTermContext: (context) =>
        set({
          currentAcademicYearId: context.academicYearId,
          currentAcademicYearLabel: context.academicYearLabel,
          currentTermId: context.termId,
          currentTermLabel: context.termLabel,
        }),

      clearSchoolContext: () =>
        set({
          schoolId: null,
          schoolName: null,
          currentAcademicYearId: null,
          currentAcademicYearLabel: null,
          currentTermId: null,
          currentTermLabel: null,
        }),
    }),
    {
      name: 'shs_school',
      partialize: (state) => ({
        schoolId: state.schoolId,
        schoolName: state.schoolName,
        currentAcademicYearId: state.currentAcademicYearId,
        currentAcademicYearLabel: state.currentAcademicYearLabel,
        currentTermId: state.currentTermId,
        currentTermLabel: state.currentTermLabel,
      }),
    }
  )
);
