export const ROUTES = {
  LOGIN: '/login',
  CHANGE_PASSWORD: '/change-password',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_CLASSES: '/admin/classes',
  ADMIN_PROGRAMS: '/admin/programs',
  ADMIN_ACADEMIC_YEAR: '/admin/academic-year',
  ADMIN_RANKINGS: '/admin/rankings',
  ADMIN_WARNINGS: '/admin/warnings',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_AI_INSIGHTS: '/admin/ai-insights',
  ADMIN_ATTENDANCE: '/admin/attendance',
  ADMIN_SETTINGS: '/admin/settings',

  // Class Teacher
  TEACHER_DASHBOARD: '/teacher',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_SCORES: '/teacher/scores',
  TEACHER_REPORTS: '/teacher/reports',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_BEHAVIOR: '/teacher/behavior',
  TEACHER_AI_INSIGHTS: '/teacher/ai-insights',

  // Tutor
  TUTOR_DASHBOARD: '/tutor/dashboard',
  TUTOR_SCORE_ENTRY: '/tutor/scores',
  TUTOR_BULK_UPLOAD: '/tutor/upload',
  TUTOR_SUBJECTS: '/tutor/subjects',

  // Class Teacher — My Subjects (dual-role: class teacher who also teaches subjects)
  TEACHER_MY_SUBJECTS: '/teacher/my-subjects',
  TEACHER_MY_SCORE_ENTRY: '/teacher/my-scores',
  TEACHER_MY_BULK_UPLOAD: '/teacher/my-upload',

  // Student
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_RESULTS: '/student/results',
  STUDENT_TRANSCRIPT: '/student/transcript',
  STUDENT_ATTENDANCE: '/student/attendance',
  STUDENT_AI: '/student/ai',
  STUDENT_PROFILE: '/student/profile',

  // Parent
  PARENT_DASHBOARD: '/parent',
  PARENT_RESULTS: '/parent/results',
  PARENT_ALERTS: '/parent/alerts',

  // Print (standalone, no layout)
  PRINT_TRANSCRIPT: '/print/transcript/:studentId',
} as const;
