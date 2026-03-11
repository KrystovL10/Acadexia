import { http, HttpResponse } from 'msw';
import {
  mockAdminUser,
  mockStudentUser,
  mockDashboardStats,
  mockPowerRankings,
  mockStudentsList,
  mockLatestResult,
  mockScoreSheet,
  mockGpaHistory,
  mockWarnings,
  mockSubjectPerformance,
  mockStudentProfile,
  mockTermComparison,
  mockGradeDistribution,
  mockClassPerformance,
  mockWarningSummary,
} from './mockData';

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === 'admin@shs.edu.gh' && body.password === 'Admin@1234') {
      return HttpResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
          requiresPasswordChange: false,
          user: mockAdminUser,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (body.email === 'student@shs.edu.gh' && body.password === 'Student@1234') {
      return HttpResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'mock-student-token',
          refreshToken: 'mock-student-refresh',
          tokenType: 'Bearer',
          expiresIn: 3600,
          requiresPasswordChange: false,
          user: mockStudentUser,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (body.email === 'newuser@shs.edu.gh' && body.password === 'Temp@1234') {
      return HttpResponse.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'mock-temp-token',
          refreshToken: 'mock-temp-refresh',
          tokenType: 'Bearer',
          expiresIn: 3600,
          requiresPasswordChange: true,
          user: {
            ...mockAdminUser,
            requiresPasswordChange: true,
            isFirstLogin: true,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    return HttpResponse.json(
      {
        success: false,
        message: 'Invalid email or password',
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 401 },
    );
  }),

  // ── Admin Dashboard Stats ────────────────────────────────────────
  http.get('/api/v1/admin/stats/dashboard', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockDashboardStats,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Power Rankings ───────────────────────────────────────────────
  http.get('/api/v1/admin/rankings', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockPowerRankings,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Students List ────────────────────────────────────────────────
  http.get('/api/v1/admin/users/students', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockStudentsList,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Student Results ──────────────────────────────────────────────
  http.get('/api/v1/student/results/latest', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockLatestResult,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Tutor Score Sheet ────────────────────────────────────────────
  http.get('/api/v1/tutor/scores/sheet', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockScoreSheet,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Tutor Assignments ────────────────────────────────────────────
  http.get('/api/v1/tutor/assignments', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
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
        {
          classRoomId: 2,
          className: 'SHS 1 Science B',
          subjectId: 1,
          subjectName: 'Chemistry',
          termId: 1,
          termLabel: 'Term 1 — 2024/2025',
          studentsCount: 28,
          scoresSubmitted: 28,
          completionPercentage: 100,
          isTermLocked: false,
        },
      ],
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Enter Score ──────────────────────────────────────────────────
  http.post('/api/v1/tutor/scores/enter', () => {
    return HttpResponse.json({
      success: true,
      message: 'Score saved',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Bulk Scores ──────────────────────────────────────────────────
  http.post('/api/v1/tutor/scores/bulk', () => {
    return HttpResponse.json({
      success: true,
      message: 'Scores saved',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Mark Absent ──────────────────────────────────────────────────
  http.post('/api/v1/tutor/scores/absent', () => {
    return HttpResponse.json({
      success: true,
      message: 'Student marked absent',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Student Profile ──────────────────────────────────────────────
  http.get('/api/v1/student/profile', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockStudentProfile,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── GPA History ──────────────────────────────────────────────────
  http.get('/api/v1/student/gpa/history', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockGpaHistory,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Student Warnings ─────────────────────────────────────────────
  http.get('/api/v1/student/warnings', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockWarnings,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Subject Performance ──────────────────────────────────────────
  http.get('/api/v1/student/subjects/performance', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockSubjectPerformance,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Class Students (for attendance) ──────────────────────────────
  http.get('/api/v1/teacher/class/students', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: [
        { id: 1, fullName: 'Kwame Mensah', studentIndex: '0240123456' },
        { id: 2, fullName: 'Ama Serwaa', studentIndex: '0240123457' },
        { id: 3, fullName: 'Kofi Asante', studentIndex: '0240123458' },
      ],
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Mark Attendance ──────────────────────────────────────────────
  http.post('/api/v1/teacher/attendance/mark', () => {
    return HttpResponse.json({
      success: true,
      message: 'Attendance marked',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Attendance Sheet ─────────────────────────────────────────────
  http.get('/api/v1/teacher/attendance/sheet', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: { dates: [], students: [], attendanceMatrix: {} },
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Term Comparison ──────────────────────────────────────────────
  http.get('/api/v1/admin/stats/term-comparison', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockTermComparison,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Grade Distribution ───────────────────────────────────────────
  http.get('/api/v1/admin/stats/grade-distribution', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockGradeDistribution,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Class Performance ────────────────────────────────────────────
  http.get('/api/v1/admin/stats/class-performance', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockClassPerformance,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Warning Summary ──────────────────────────────────────────────
  http.get('/api/v1/admin/warnings/summary', () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockWarningSummary,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Student Transcript Download ──────────────────────────────────
  http.get('/api/v1/student/transcript/download', () => {
    return new HttpResponse(new Blob(['mock pdf']), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),
];
