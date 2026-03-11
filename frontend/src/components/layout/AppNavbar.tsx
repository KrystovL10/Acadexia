import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, KeyRound, User, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useSidebarStore } from '../../store/sidebar.store';
import { useLogout, getRoleHome } from '../../hooks/useAuth';
import { ROUTES } from '../../router/routes';
import Avatar from '../ui/Avatar';

export default function AppNavbar() {
  const user = useAuthStore((s) => s.user);
  const sidebarStore = useSidebarStore();
  const handleLogout = useLogout();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Left: hamburger + school info */}
      <div className="flex items-center">
        <button
          onClick={sidebarStore.toggle}
          className="mr-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          {user?.schoolName && (
            <p className="text-sm font-medium text-gray-700">{user.schoolName}</p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
          >
            <Avatar src={user?.profilePhotoUrl} fallback={fullName} size="sm" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-700">{fullName}</p>
              <p className="text-[11px] text-gray-500">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  if (user?.role === 'SUPER_ADMIN') navigate(ROUTES.ADMIN_SETTINGS);
                  else if (user?.role === 'STUDENT') navigate(ROUTES.STUDENT_PROFILE);
                  else if (user) navigate(getRoleHome(user.role));
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate(ROUTES.CHANGE_PASSWORD);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <KeyRound className="h-4 w-4" />
                Change Password
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
