import { LogOut } from 'lucide-react';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import Avatar from '../ui/Avatar';

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const handleLogout = useLogout();

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Avatar src={user?.profilePhotoUrl} fallback={fullName} size="sm" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{fullName}</p>
            <p className="text-xs text-gray-500">
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
