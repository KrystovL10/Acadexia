import { Construction } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

interface ComingSoonProps {
  title: string;
  description?: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLASS_TEACHER: 'Class Teacher',
  TUTOR: 'Subject Tutor',
  STUDENT: 'Student',
  PARENT: 'Parent',
};

export default function ComingSoon({ title, description }: ComingSoonProps) {
  const user = useAuthStore((s) => s.user);
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';
  const roleLabel = user ? ROLE_LABELS[user.role] || user.role : '';

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {roleLabel}
          </span>
        </div>
        {fullName && (
          <p className="mt-1 text-sm text-gray-500">Welcome, {fullName}</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Construction className="h-8 w-8 text-accent-dark" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Under Construction</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          {description || 'This section is under construction. Check back soon for updates.'}
        </p>
      </div>
    </div>
  );
}
