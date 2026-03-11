import { LayoutDashboard, BarChart2, FileText, CalendarCheck, Brain, User } from 'lucide-react';
import { UserRole } from '../../types/enums';
import { ROUTES } from '../../router/routes';
import RoleLayout from './RoleLayout';
import type { SidebarNavItem } from './AppSidebar';

const NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Dashboard', path: ROUTES.STUDENT_DASHBOARD, icon: LayoutDashboard },
  { label: 'My Results', path: ROUTES.STUDENT_RESULTS, icon: BarChart2 },
  { label: 'My Transcript', path: ROUTES.STUDENT_TRANSCRIPT, icon: FileText },
  { label: 'Attendance', path: ROUTES.STUDENT_ATTENDANCE, icon: CalendarCheck },
  { label: 'AI Study Assistant', path: ROUTES.STUDENT_AI, icon: Brain },
  { label: 'My Profile', path: ROUTES.STUDENT_PROFILE, icon: User },
];

export default function StudentLayout() {
  return <RoleLayout allowedRoles={[UserRole.STUDENT]} navItems={NAV_ITEMS} />;
}
