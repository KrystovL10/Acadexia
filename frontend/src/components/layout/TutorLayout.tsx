import { LayoutDashboard, PenLine, Upload, BookOpen } from 'lucide-react';
import { UserRole } from '../../types/enums';
import { ROUTES } from '../../router/routes';
import RoleLayout from './RoleLayout';
import type { SidebarNavItem } from './AppSidebar';
import { useTutorAssignments } from '../../hooks/tutor';

export default function TutorLayout() {
  const { data: assignments = [] } = useTutorAssignments();

  const pendingCount = assignments
    .filter((a) => !a.isTermLocked)
    .reduce((sum, a) => sum + a.scoresRemaining, 0);

  const navItems: SidebarNavItem[] = [
    { label: 'Dashboard', path: ROUTES.TUTOR_DASHBOARD, icon: LayoutDashboard, end: true },
    {
      label: 'Score Entry',
      path: ROUTES.TUTOR_SCORE_ENTRY,
      icon: PenLine,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { label: 'Bulk Upload', path: ROUTES.TUTOR_BULK_UPLOAD, icon: Upload },
    { label: 'My Subjects', path: ROUTES.TUTOR_SUBJECTS, icon: BookOpen },
  ];

  return <RoleLayout allowedRoles={[UserRole.TUTOR]} navItems={navItems} />;
}
