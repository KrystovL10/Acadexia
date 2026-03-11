// ── Users ────────────────────────────────────────────────────────────────────

export const mockAdminUser = {
  userId: 'GES-ADM-0001',
  firstName: 'System',
  lastName: 'Administrator',
  email: 'admin@shs.edu.gh',
  role: 'SUPER_ADMIN' as const,
  isFirstLogin: false,
  requiresPasswordChange: false,
  schoolName: 'Achimota School',
};

export const mockStudentUser = {
  userId: 'GES-STU-0042',
  firstName: 'Kwame',
  lastName: 'Mensah',
  email: 'student@shs.edu.gh',
  role: 'STUDENT' as const,
  isFirstLogin: false,
  requiresPasswordChange: false,
};

export const mockTutorUser = {
  userId: 'GES-TUT-0010',
  firstName: 'Abena',
  lastName: 'Owusu',
  email: 'tutor@shs.edu.gh',
  role: 'TUTOR' as const,
  isFirstLogin: false,
  requiresPasswordChange: false,
  assignedSubjects: ['Chemistry'],
};

export const mockTeacherUser = {
  userId: 'GES-TCH-0005',
  firstName: 'Yaw',
  lastName: 'Boateng',
  email: 'teacher@shs.edu.gh',
  role: 'CLASS_TEACHER' as const,
  isFirstLogin: false,
  requiresPasswordChange: false,
  assignedClassName: 'SHS 2 Science A',
};

// ── Admin Dashboard ──────────────────────────────────────────────────────────

export const mockDashboardStats = {
  totalStudents: 847,
  totalTeachers: 52,
  totalClasses: 18,
  averageSchoolGpa: 2.84,
  passRate: 78.4,
  activeWarnings: 23,
  scholarshipCandidates: 12,
  currentTermName: 'Term 1 — 2024/2025',
};

export const mockTermComparison = [
  { termLabel: 'Term 1', shs1Avg: 2.6, shs2Avg: 2.8, shs3Avg: 3.0 },
  { termLabel: 'Term 2', shs1Avg: 2.7, shs2Avg: 2.9, shs3Avg: 3.1 },
];

export const mockGradeDistribution = [
  { grade: 'A1', count: 45, percentage: 8.2 },
  { grade: 'B2', count: 78, percentage: 14.3 },
  { grade: 'B3', count: 92, percentage: 16.8 },
  { grade: 'C4', count: 110, percentage: 20.1 },
  { grade: 'C5', count: 85, percentage: 15.5 },
  { grade: 'C6', count: 52, percentage: 9.5 },
  { grade: 'D7', count: 38, percentage: 6.9 },
  { grade: 'E8', count: 25, percentage: 4.6 },
  { grade: 'F9', count: 22, percentage: 4.0 },
];

export const mockClassPerformance = [
  { className: 'SHS 2 Science A', avgGpa: 3.15, studentCount: 32, passRate: 89.2 },
  { className: 'SHS 3 Science A', avgGpa: 3.02, studentCount: 28, passRate: 85.7 },
  { className: 'SHS 1 Business A', avgGpa: 2.78, studentCount: 35, passRate: 74.3 },
];

export const mockWarningSummary = {
  criticalCount: 5,
  highCount: 8,
  mediumCount: 10,
  lowCount: 12,
  unresolvedCount: 23,
  criticalStudents: [
    {
      id: 1,
      studentName: 'Esi Adjei',
      studentClassName: 'SHS 2 Arts A',
      warningLevel: 'CRITICAL',
      warningType: 'ACADEMIC',
      description: 'GPA below 1.0 for 2 consecutive terms',
    },
    {
      id: 2,
      studentName: 'Yaw Darko',
      studentClassName: 'SHS 1 Business B',
      warningLevel: 'CRITICAL',
      warningType: 'ATTENDANCE',
      description: 'Attendance below 50%',
    },
  ],
};

// ── Power Rankings ───────────────────────────────────────────────────────────

export const mockPowerRankings = {
  bestStudent: {
    rank: 1,
    fullName: 'Kwame Mensah',
    className: 'SHS 2 Science A',
    gpa: 3.95,
    cgpa: 3.82,
  },
  topTenStudents: [
    {
      studentId: 1,
      fullName: 'Kwame Mensah',
      className: 'SHS 2 Science A',
      programName: 'General Science',
      gpa: 3.95,
      cgpa: 3.82,
      profilePhotoUrl: null,
    },
    {
      studentId: 2,
      fullName: 'Ama Serwaa',
      className: 'SHS 2 Science A',
      programName: 'General Science',
      gpa: 3.88,
      cgpa: 3.75,
      profilePhotoUrl: null,
    },
    {
      studentId: 3,
      fullName: 'Kofi Asante',
      className: 'SHS 3 Arts A',
      programName: 'General Arts',
      gpa: 3.80,
      cgpa: 3.70,
      profilePhotoUrl: null,
    },
  ],
  mostImproved: null,
  mostDeclined: null,
  scholarshipCandidates: [],
};

// ── Students List ────────────────────────────────────────────────────────────

export const mockStudentsList = {
  content: [
    {
      id: 1,
      studentIndex: '0240123456',
      firstName: 'Kwame',
      lastName: 'Mensah',
      currentClassName: 'SHS 2 Science A',
      currentYearGroup: 'SHS2',
      currentProgramName: 'General Science',
      isActive: true,
    },
  ],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
};

// ── Student Results ──────────────────────────────────────────────────────────

export const mockLatestResult = {
  termLabel: 'Term 1 — 2024/2025',
  yearGroup: 'SHS2',
  gpa: 3.02,
  positionInClass: 4,
  totalStudentsInClass: 32,
  attendancePercentage: 92,
  totalDaysPresent: 46,
  totalDaysAbsent: 4,
  conductRating: 'Very Good',
  isGenerated: true,
  scores: [
    { subjectName: 'Mathematics', total: 78, grade: 'A2' },
    { subjectName: 'Physics', total: 65, grade: 'B3' },
    { subjectName: 'Chemistry', total: 72, grade: 'B2' },
    { subjectName: 'English Language', total: 58, grade: 'C5' },
    { subjectName: 'Social Studies', total: 82, grade: 'A1' },
    { subjectName: 'Core Mathematics', total: 45, grade: 'D7' },
  ],
};

// ── Student Profile ──────────────────────────────────────────────────────────

export const mockStudentProfile = {
  firstName: 'Kwame',
  lastName: 'Mensah',
  email: 'student@shs.edu.gh',
  studentIndex: '0240123456',
  currentYearGroup: 'SHS2',
  currentClassName: 'SHS 2 Science A',
  currentProgramName: 'General Science',
};

// ── GPA History ──────────────────────────────────────────────────────────────

export const mockGpaHistory = {
  currentCgpa: 2.94,
  currentClassification: 'GOOD',
  termHistory: [
    { termLabel: 'Term 1 — 2023/2024', gpa: 2.86, positionInClass: 7, totalStudents: 32, trend: 'STABLE' as const },
    { termLabel: 'Term 2 — 2023/2024', gpa: 2.78, positionInClass: 9, totalStudents: 32, trend: 'DOWN' as const },
    { termLabel: 'Term 3 — 2023/2024', gpa: 2.95, positionInClass: 5, totalStudents: 32, trend: 'UP' as const },
    { termLabel: 'Term 1 — 2024/2025', gpa: 3.02, positionInClass: 4, totalStudents: 32, trend: 'UP' as const },
  ],
  cgpaProgression: [
    { cgpaAfterThisTerm: 2.86 },
    { cgpaAfterThisTerm: 2.82 },
    { cgpaAfterThisTerm: 2.87 },
    { cgpaAfterThisTerm: 2.94 },
  ],
};

// ── Student Warnings ─────────────────────────────────────────────────────────

export const mockWarnings = [
  {
    id: 1,
    warningType: 'ACADEMIC',
    warningLevel: 'MEDIUM',
    description: 'GPA dropped below 2.5',
    suggestedAction: 'Focus on Mathematics and Core Mathematics.',
    isResolved: false,
    createdAt: '2024-12-01',
  },
];

// ── Subject Performance ──────────────────────────────────────────────────────

export const mockSubjectPerformance = {
  strongestSubjects: [
    { subjectName: 'Social Studies', averageScore: 82, bestGrade: 'A1', bestScore: 86, trend: 'UP' as const },
    { subjectName: 'Mathematics', averageScore: 76, bestGrade: 'A2', bestScore: 80, trend: 'STABLE' as const },
    { subjectName: 'Chemistry', averageScore: 70, bestGrade: 'B2', bestScore: 75, trend: 'UP' as const },
  ],
  weakestSubjects: [
    { subjectName: 'Core Mathematics', averageScore: 48, latestGrade: 'D7', worstScore: 42, trend: 'DOWN' as const },
    { subjectName: 'English Language', averageScore: 55, latestGrade: 'C5', worstScore: 50, trend: 'STABLE' as const },
  ],
};

// ── Score Sheet ──────────────────────────────────────────────────────────────

export const mockScoreSheet = {
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

export const mockLockedScoreSheet = {
  ...mockScoreSheet,
  isLocked: true,
};
