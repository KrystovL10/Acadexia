import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, title?: string) =>
    sonnerToast.success(title || 'Success', {
      description: message,
      duration: 3000,
    }),

  error: (message: string, title?: string) =>
    sonnerToast.error(title || 'Error', {
      description: message,
      duration: 5000,
    }),

  warning: (message: string, title?: string) =>
    sonnerToast.warning(title || 'Warning', {
      description: message,
      duration: 4000,
    }),

  info: (message: string, title?: string) =>
    sonnerToast.info(title || 'Info', {
      description: message,
      duration: 3000,
    }),

  loading: (message: string) =>
    sonnerToast.loading(message),

  dismiss: (id: string | number) =>
    sonnerToast.dismiss(id),

  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string },
  ) =>
    sonnerToast.promise(promise, {
      loading: msgs.loading,
      success: msgs.success,
      error: msgs.error,
    }),
};
