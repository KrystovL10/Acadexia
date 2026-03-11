import { BookOpen, Bell, GraduationCap, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { ROUTES } from '../../router/routes';
import { useMyChildren } from '../../hooks/parent';
import Spinner from '../../components/ui/Spinner';
import { cn } from '../../lib/utils';

export default function ParentDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: children = [], isLoading } = useMyChildren();

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {user?.schoolName ? `${user.schoolName} · ` : ''}Parent Portal
        </p>
      </div>

      {/* Children section */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Your Children
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No linked students found.</p>
            <p className="mt-1 text-xs text-gray-400">
              Contact the school administrator to link your child's account to your email.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {/* Avatar + name */}
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {child.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold text-gray-900">{child.fullName}</div>
                    <div className="text-xs text-gray-500">{child.studentIndex}</div>
                  </div>
                </div>

                {/* Meta */}
                <div className="mb-4 space-y-1 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Class</span>
                    <span className="font-medium text-gray-800">{child.className ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Programme</span>
                    <span className="font-medium text-gray-800">{child.programName}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Year Group</span>
                    <span className="font-medium text-gray-800">{child.yearGroup}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`${ROUTES.PARENT_RESULTS}?studentId=${child.id}`)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                      'bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors',
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                    View Results
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`${ROUTES.PARENT_ALERTS}?studentId=${child.id}`)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                      'bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors',
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    View Alerts
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats legend */}
      {children.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <TrendingUp className="h-4 w-4 text-primary" />
            GPA Reference Guide
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[
              { range: '3.5 – 4.0', label: 'Distinction', color: 'text-green-600 bg-green-50' },
              { range: '2.5 – 3.4', label: 'Merit', color: 'text-blue-600 bg-blue-50' },
              { range: '1.5 – 2.4', label: 'Pass', color: 'text-amber-600 bg-amber-50' },
              { range: '0.0 – 1.4', label: 'Fail', color: 'text-red-600 bg-red-50' },
            ].map(({ range, label, color }) => (
              <div key={label} className={cn('rounded-lg px-3 py-2 font-medium', color)}>
                <div className="font-semibold">{label}</div>
                <div className="opacity-80">{range}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Tip for parents</p>
            <p className="mt-0.5 text-blue-700">
              If your child is not listed here, ask the school administrator to update your
              child's guardian email to match your login email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
