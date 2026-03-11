import { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  Calendar,
  Trophy,
  AlertTriangle,
  FileText,
  Brain,
  Settings,
  CheckSquare,
} from 'lucide-react';
import { UserRole } from '../../types/enums';
import { ROUTES } from '../../router/routes';
import RoleLayout from './RoleLayout';
import type { SidebarNavItem } from './AppSidebar';
import { useAdminContext } from '../../hooks/admin/useAcademic';
import { useSchoolStore } from '../../store/school.store';

const NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Dashboard', path: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  { label: 'Students', path: ROUTES.ADMIN_STUDENTS, icon: Users },
  { label: 'Teachers', path: ROUTES.ADMIN_TEACHERS, icon: GraduationCap },
  { label: 'Classes', path: ROUTES.ADMIN_CLASSES, icon: School },
  { label: 'Programs & Subjects', path: ROUTES.ADMIN_PROGRAMS, icon: BookOpen },
  { label: 'Academic Year', path: ROUTES.ADMIN_ACADEMIC_YEAR, icon: Calendar },
  { label: 'Power Rankings', path: ROUTES.ADMIN_RANKINGS, icon: Trophy },
  { label: 'Early Warnings', path: ROUTES.ADMIN_WARNINGS, icon: AlertTriangle },
  { label: 'Attendance', path: ROUTES.ADMIN_ATTENDANCE, icon: CheckSquare },
  { label: 'Reports', path: ROUTES.ADMIN_REPORTS, icon: FileText },
  { label: 'AI Insights', path: ROUTES.ADMIN_AI_INSIGHTS, icon: Brain },
  { label: 'Settings', path: ROUTES.ADMIN_SETTINGS, icon: Settings },
];

function AdminContextInitializer() {
  const { data: context } = useAdminContext();
  const { setSchoolContext, setTermContext, schoolId } = useSchoolStore();

  useEffect(() => {
    if (!context) return;

    // Only update if school context is not already set correctly
    if (schoolId !== context.schoolId) {
      setSchoolContext({ schoolId: context.schoolId, schoolName: context.schoolName });
    }

    if (context.academicYearId && context.termId) {
      setTermContext({
        academicYearId: context.academicYearId,
        academicYearLabel: context.academicYearLabel ?? '',
        termId: context.termId,
        termLabel: context.termLabel ?? '',
      });
    }
  }, [context, schoolId, setSchoolContext, setTermContext]);

  return null;
}

export default function AdminLayout() {
  return (
    <>
      <AdminContextInitializer />
      <RoleLayout allowedRoles={[UserRole.SUPER_ADMIN]} navItems={NAV_ITEMS} />
    </>
  );
}
