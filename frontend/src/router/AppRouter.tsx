import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './routes';

// Non-page imports (keep static)
import AuthGuard from '../components/common/AuthGuard';
import RoleDashboardRedirect from '../components/common/RoleDashboardRedirect';
import PageLoadingSpinner from '../components/common/PageLoadingSpinner';

// Layouts (keep static)
import AdminLayout from '../components/layout/AdminLayout';
import ClassTeacherLayout from '../components/layout/ClassTeacherLayout';
import TutorLayout from '../components/layout/TutorLayout';
import StudentLayout from '../components/layout/StudentLayout';
import ParentLayout from '../components/layout/ParentLayout';

// Auth pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage'));

// Admin pages
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ManageStudents = lazy(() => import('../pages/admin/ManageStudents'));
const ManageTeachers = lazy(() => import('../pages/admin/ManageTeachers'));
const AcademicStructure = lazy(() => import('../pages/admin/AcademicStructure'));
const PowerRankings = lazy(() => import('../pages/admin/PowerRankings'));
const EarlyWarnings = lazy(() => import('../pages/admin/EarlyWarnings'));
const AdminReports = lazy(() => import('../pages/admin/Reports'));
const AdminAiInsights = lazy(() => import('../pages/admin/AiInsights'));
const AdminSettings = lazy(() => import('../pages/admin/Settings'));
const AttendanceDashboard = lazy(() => import('../pages/admin/AttendanceDashboard'));

// Teacher pages
const ClassTeacherDashboard = lazy(() => import('../pages/teacher/ClassTeacherDashboard'));
const ClassStudentList = lazy(() => import('../pages/teacher/ClassStudentList'));
const ScoreOverview = lazy(() => import('../pages/teacher/ScoreOverview'));
const GenerateReports = lazy(() => import('../pages/teacher/GenerateReports'));
const AttendancePage = lazy(() => import('../pages/teacher/AttendancePage'));
const BehaviorLog = lazy(() => import('../pages/teacher/BehaviorLog'));
const TeacherAiInsights = lazy(() => import('../pages/teacher/TeacherAiInsights'));

// Tutor pages
const TutorDashboard = lazy(() => import('../pages/tutor/TutorDashboard'));
const ScoreEntry = lazy(() => import('../pages/tutor/ScoreEntry'));
const BulkUpload = lazy(() => import('../pages/tutor/BulkUpload'));
const SubjectOverview = lazy(() => import('../pages/tutor/SubjectOverview'));

// Student pages
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'));
const TermResults = lazy(() => import('../pages/student/TermResults'));
const Transcript = lazy(() => import('../pages/student/Transcript'));
const AttendanceView = lazy(() => import('../pages/student/AttendanceView'));
const AiStudyTips = lazy(() => import('../pages/student/AiStudyTips'));
const StudentProfile = lazy(() => import('../pages/student/StudentProfile'));

// Parent pages
const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard'));
const ParentResults = lazy(() => import('../pages/parent/ParentResults'));
const ParentAlerts = lazy(() => import('../pages/parent/ParentAlerts'));

// Print pages
const TranscriptPrintPage = lazy(() => import('../pages/print/TranscriptPrintPage'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingSpinner />}>
        <Routes>
          {/* Public */}
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />

          {/* Authenticated standalone (no sidebar) */}
          <Route
            path={ROUTES.CHANGE_PASSWORD}
            element={
              <AuthGuard>
                <ChangePasswordPage />
              </AuthGuard>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<RoleDashboardRedirect />} />

          {/* ─── Admin ─── */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<ManageStudents />} />
            <Route path="teachers" element={<ManageTeachers />} />
            <Route path="classes" element={<AcademicStructure defaultTab="classes" />} />
            <Route path="programs" element={<AcademicStructure defaultTab="programs" />} />
            <Route path="academic-year" element={<AcademicStructure defaultTab="years" />} />
            <Route path="rankings" element={<PowerRankings />} />
            <Route path="warnings" element={<EarlyWarnings />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="ai-insights" element={<AdminAiInsights />} />
            <Route path="attendance" element={<AttendanceDashboard />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to={ROUTES.ADMIN_DASHBOARD} replace />} />
          </Route>

          {/* ─── Class Teacher ─── */}
          <Route path="/teacher" element={<ClassTeacherLayout />}>
            <Route index element={<ClassTeacherDashboard />} />
            <Route path="students" element={<ClassStudentList />} />
            <Route path="scores" element={<ScoreOverview />} />
            <Route path="reports" element={<GenerateReports />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="behavior" element={<BehaviorLog />} />
            <Route path="ai-insights" element={<TeacherAiInsights />} />
            {/* Dual-role: class teacher who is also assigned to teach subjects */}
            <Route path="my-subjects" element={<SubjectOverview />} />
            <Route path="my-scores" element={<ScoreEntry />} />
            <Route path="my-upload" element={<BulkUpload />} />
            <Route path="*" element={<Navigate to={ROUTES.TEACHER_DASHBOARD} replace />} />
          </Route>

          {/* ─── Tutor ─── */}
          <Route path="/tutor" element={<TutorLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TutorDashboard />} />
            <Route path="scores" element={<ScoreEntry />} />
            <Route path="upload" element={<BulkUpload />} />
            <Route path="subjects" element={<SubjectOverview />} />
            <Route path="*" element={<Navigate to={ROUTES.TUTOR_DASHBOARD} replace />} />
          </Route>

          {/* ─── Student ─── */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="results" element={<TermResults />} />
            <Route path="transcript" element={<Transcript />} />
            <Route path="attendance" element={<AttendanceView />} />
            <Route path="ai" element={<AiStudyTips />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="*" element={<Navigate to={ROUTES.STUDENT_DASHBOARD} replace />} />
          </Route>

          {/* ─── Parent ─── */}
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<ParentDashboard />} />
            <Route path="results" element={<ParentResults />} />
            <Route path="alerts" element={<ParentAlerts />} />
            <Route path="*" element={<Navigate to={ROUTES.PARENT_DASHBOARD} replace />} />
          </Route>

          {/* ─── Print (standalone) ─── */}
          <Route
            path="/print/transcript/:studentId"
            element={
              <AuthGuard>
                <TranscriptPrintPage />
              </AuthGuard>
            }
          />

          {/* Catch-all: redirect to role dashboard if authenticated, login if not */}
          <Route path="*" element={<RoleDashboardRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
