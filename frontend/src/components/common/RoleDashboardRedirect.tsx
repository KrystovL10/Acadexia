import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { getRoleHome } from '../../hooks/useAuth';
import { ROUTES } from '../../router/routes';

export default function RoleDashboardRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Navigate to={getRoleHome(user.role)} replace />;
}
