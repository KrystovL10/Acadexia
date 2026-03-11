import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Upload,
  Trophy,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import { UserRole } from '../../types/enums';
import { ROUTES } from '../../router/routes';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  [UserRole.SUPER_ADMIN]: [
    { label: 'Dashboard', path: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
    { label: 'Students', path: ROUTES.ADMIN_STUDENTS, icon: GraduationCap },
    { label: 'Teachers', path: ROUTES.ADMIN_TEACHERS, icon: Users },
    { label: 'Classes', path: ROUTES.ADMIN_CLASSES, icon: BookOpen },
    { label: 'Programs', path: ROUTES.ADMIN_PROGRAMS, icon: BookOpen },
    { label: 'Power Rankings', path: ROUTES.ADMIN_RANKINGS, icon: Trophy },
    { label: 'Early Warnings', path: ROUTES.ADMIN_WARNINGS, icon: AlertTriangle },
  ],
  [UserRole.CLASS_TEACHER]: [
    { label: 'Dashboard', path: ROUTES.TEACHER_DASHBOARD, icon: LayoutDashboard },
    { label: 'My Students', path: ROUTES.TEACHER_STUDENTS, icon: Users },
    { label: 'Reports', path: ROUTES.TEACHER_REPORTS, icon: FileText },
  ],
  [UserRole.TUTOR]: [
    { label: 'Score Entry', path: ROUTES.TUTOR_SCORE_ENTRY, icon: BookOpen },
    { label: 'Bulk Upload', path: ROUTES.TUTOR_BULK_UPLOAD, icon: Upload },
  ],
  [UserRole.STUDENT]: [
    { label: 'Dashboard', path: ROUTES.STUDENT_DASHBOARD, icon: LayoutDashboard },
    { label: 'Term Results', path: ROUTES.STUDENT_RESULTS, icon: FileText },
    { label: 'Transcript', path: ROUTES.STUDENT_TRANSCRIPT, icon: GraduationCap },
  ],
  [UserRole.PARENT]: [
    { label: 'Dashboard', path: ROUTES.PARENT_DASHBOARD, icon: LayoutDashboard },
  ],
};

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
          GES
        </div>
        <h2 className="text-lg font-bold text-primary-dark">SHS Academic</h2>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
