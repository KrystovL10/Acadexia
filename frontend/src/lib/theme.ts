/**
 * Color tokens as JS constants for use in Recharts and other
 * libraries that don't read Tailwind classes.
 */
export const colors = {
  primary: '#1B6B3A',
  primaryLight: '#2D8653',
  primaryDark: '#144F2B',
  accent: '#FCD116',
  accentDark: '#E5B800',
  danger: '#DC2626',
  dangerLight: '#EF4444',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  success: '#16A34A',
  successLight: '#22C55E',
  surface: '#F8FAFC',
  surfaceDark: '#1E293B',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
} as const;

/** A chart-friendly palette for multi-series data */
export const chartPalette = [
  colors.primary,
  colors.accent,
  colors.success,
  colors.danger,
  colors.warning,
  colors.primaryLight,
  '#7C3AED', // violet
  '#0891B2', // cyan
] as const;

export type ThemeColor = keyof typeof colors;
