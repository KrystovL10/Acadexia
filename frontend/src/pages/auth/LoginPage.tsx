import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useLogin, getRoleHome } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import { ROUTES } from '../../router/routes';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { isAuthenticated, user } = useAuthStore();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  if (isAuthenticated && user) {
    if (user.requiresPasswordChange) {
      return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
    }
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const errorMessage = loginMutation.isError
    ? (loginMutation.error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || 'Invalid email or password. Please try again.'
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-dark via-primary to-primary-light">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <GraduationCap className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-white">GES SHS Academic System</h1>
            <p className="mt-1 text-sm text-white/70">
              Ghana Education Service - School Management Portal
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-xl bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Sign in to your account</h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your credentials to access the portal
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                id="email"
                label="Email Address"
                type="email"
                placeholder="you@school.edu.gh"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="relative">
                <Input
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {errorMessage && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loginMutation.isPending}
              >
                Sign In
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-white/50">
            Powered by Ghana Education Service
          </p>
        </div>
      </div>
    </div>
  );
}
