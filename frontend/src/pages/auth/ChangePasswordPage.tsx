import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ShieldAlert, Info } from 'lucide-react';
import { useChangePassword } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof schema>;

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const label = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength] || '';
  const color = ['bg-gray-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-primary'][strength];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">Strength: {label}</p>
    </div>
  );
}

export default function ChangePasswordPage() {
  const mutation = useChangePassword();
  const user = useAuthStore((s) => s.user);
  const isFirstLogin = user?.requiresPasswordChange ?? false;

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
  });

  const newPassword = watch('newPassword', '');

  const onSubmit = (data: ChangePasswordForm) => {
    mutation.mutate(data);
  };

  const errorMessage = mutation.isError
    ? (mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Failed to update password. Please try again.'
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Change Password</h1>
          <p className="mt-1 text-sm text-gray-500">Set a secure password for your account</p>
        </div>

        {isFirstLogin && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">First Login</p>
              <p className="mt-0.5 text-xs text-blue-700">
                This is your first login. Please set a secure password before continuing.
              </p>
            </div>
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
            {/* Current Password */}
            <div className="relative">
              <Input
                id="currentPassword"
                label="Current Password"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                autoComplete="current-password"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* New Password */}
            <div>
              <div className="relative">
                <Input
                  id="newPassword"
                  label="New Password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  error={errors.newPassword?.message}
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Input
                id="confirmPassword"
                label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password requirements */}
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-gray-600">Password requirements:</p>
              <ul className="space-y-1 text-xs text-gray-500">
                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                  {newPassword.length >= 8 ? '\u2713' : '\u2022'} At least 8 characters
                </li>
                <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                  {/[A-Z]/.test(newPassword) ? '\u2713' : '\u2022'} One uppercase letter
                </li>
                <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                  {/[0-9]/.test(newPassword) ? '\u2713' : '\u2022'} One number
                </li>
                <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                  {/[^A-Za-z0-9]/.test(newPassword) ? '\u2713' : '\u2022'} One special character
                </li>
              </ul>
            </div>

            {mutation.isSuccess && (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Password updated successfully. Redirecting...
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={mutation.isPending}
            >
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
