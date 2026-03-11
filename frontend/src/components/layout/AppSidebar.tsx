import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, GraduationCap, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import { useSidebarStore } from '../../store/sidebar.store';

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
  end?: boolean;
}

interface AppSidebarProps {
  items: SidebarNavItem[];
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLASS_TEACHER: 'Class Teacher',
  TUTOR: 'Subject Tutor',
  STUDENT: 'Student',
  PARENT: 'Parent',
};

export default function AppSidebar({ items }: AppSidebarProps) {
  const store = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';
  const roleLabel = user ? ROLE_LABELS[user.role] || user.role : '';

  // Listen to window resize and update store
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        store.setMobile(true);
        store.setCollapsed(false);
      } else if (width < 1024) {
        store.setMobile(false);
        store.setCollapsed(true);
        store.open();
      } else {
        store.setMobile(false);
        store.setCollapsed(false);
        store.open();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (store.isMobile) store.close();
  }, [location.pathname]);

  /* ── Sidebar content (full width version) ── */
  const sidebarContent = (collapsed: boolean) => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
          <GraduationCap className="h-5 w-5 text-primary-dark" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-white">SHS Academic</h2>
            <p className="truncate text-[10px] text-white/50">Ghana Education Service</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end ?? item.path.split('/').length <= 2}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-white/10 text-accent'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-accent' : 'text-white/50 group-hover:text-white/80'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-white/10 px-4 py-3">
        {collapsed ? (
          <div className="flex justify-center" title={`${fullName} - ${roleLabel}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
              {fullName.charAt(0)}
            </div>
          </div>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-white">{fullName}</p>
            <span className="mt-0.5 inline-block rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {roleLabel}
            </span>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {store.isMobile && store.isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={store.close}
        />
      )}

      {/* Mobile sidebar (slide-in drawer) */}
      {store.isMobile && (
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary transition-transform duration-300',
            store.isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <button
            onClick={store.close}
            className="absolute right-3 top-4 z-10 rounded-lg p-1 text-white/50 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebarContent(false)}
        </aside>
      )}

      {/* Tablet sidebar (collapsed, icons only) */}
      {!store.isMobile && store.isCollapsed && (
        <aside className="flex w-16 shrink-0 flex-col bg-primary">
          {sidebarContent(true)}
        </aside>
      )}

      {/* Desktop sidebar (full width) */}
      {!store.isMobile && !store.isCollapsed && (
        <aside className="flex w-64 shrink-0 flex-col bg-primary">
          {sidebarContent(false)}
        </aside>
      )}
    </>
  );
}
