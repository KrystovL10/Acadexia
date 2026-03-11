import { User, BarChart2, Bell } from 'lucide-react';
import { UserRole } from '../../types/enums';
import { ROUTES } from '../../router/routes';
import RoleLayout from './RoleLayout';
import type { SidebarNavItem } from './AppSidebar';

const NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Child Overview', path: ROUTES.PARENT_DASHBOARD, icon: User },
  { label: 'Results', path: ROUTES.PARENT_RESULTS, icon: BarChart2 },
  { label: 'Alerts', path: ROUTES.PARENT_ALERTS, icon: Bell },
];

export default function ParentLayout() {
  return <RoleLayout allowedRoles={[UserRole.PARENT]} navItems={NAV_ITEMS} />;
}
