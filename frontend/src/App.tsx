import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRouter from './router/AppRouter';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:rounded-lg focus:shadow-lg focus:text-primary focus:font-semibold"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
