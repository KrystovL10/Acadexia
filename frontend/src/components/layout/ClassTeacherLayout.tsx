import {
  LayoutDashboard,
  Users,
  BarChart2,
  FileText,
  CheckSquare,
  ClipboardList,
  Brain,
  PenLine,
  Upload,
  BookOpen,
} from 'lucide-react';
import { UserRole } from '../../types/enums';
import { ROUTES } from '../../router/routes';
import RoleLayout from './RoleLayout';
import type { SidebarNavItem } from './AppSidebar';
import { useTutorAssignments } from '../../hooks/tutor';

const BASE_NAV: SidebarNavItem[] = [
  { label: 'Dashboard', path: ROUTES.TEACHER_DASHBOARD, icon: LayoutDashboard },
  { label: 'My Class', path: ROUTES.TEACHER_STUDENTS, icon: Users },
  { label: 'Score Overview', path: ROUTES.TEACHER_SCORES, icon: BarChart2 },
  { label: 'Generate Reports', path: ROUTES.TEACHER_REPORTS, icon: FileText },
  { label: 'Attendance', path: ROUTES.TEACHER_ATTENDANCE, icon: CheckSquare },
  { label: 'Behavior Log', path: ROUTES.TEACHER_BEHAVIOR, icon: ClipboardList },
  { label: 'AI Insights', path: ROUTES.TEACHER_AI_INSIGHTS, icon: Brain },
];

export default function ClassTeacherLayout() {
  const { data: assignments = [] } = useTutorAssignments();

  const pendingCount = assignments
    .filter((a) => !a.isTermLocked)
    .reduce((sum, a) => sum + a.scoresRemaining, 0);

  const subjectNavItems: SidebarNavItem[] = assignments.length > 0
    ? [
        {
          label: 'My Subjects',
          path: ROUTES.TEACHER_MY_SUBJECTS,
          icon: BookOpen,
        },
        {
          label: 'Score Entry',
          path: ROUTES.TEACHER_MY_SCORE_ENTRY,
          icon: PenLine,
          badge: pendingCount > 0 ? pendingCount : undefined,
        },
        {
          label: 'Bulk Upload',
          path: ROUTES.TEACHER_MY_BULK_UPLOAD,
          icon: Upload,
        },
      ]
    : [];

  return (
    <RoleLayout
      allowedRoles={[UserRole.CLASS_TEACHER]}
      navItems={[...BASE_NAV, ...subjectNavItems]}
    />
  );
}
