import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { getRoleHome } from '../../hooks/useAuth';
import { ROUTES } from '../../router/routes';
import { UserRole } from '../../types/enums';
import AppSidebar, { type SidebarNavItem } from './AppSidebar';
import AppNavbar from './AppNavbar';
import PageTransition from '../common/PageTransition';

interface RoleLayoutProps {
  allowedRoles: UserRole[];
  navItems: SidebarNavItem[];
}

export default function RoleLayout({ allowedRoles, navItems }: RoleLayoutProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (user.requiresPasswordChange && location.pathname !== ROUTES.CHANGE_PASSWORD) {
    return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar items={navItems} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppNavbar />
        <main id="main-content" className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
