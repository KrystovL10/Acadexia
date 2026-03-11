import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../pages/auth/LoginPage';
import { renderWithProviders } from '../utils/testUtils';
import { useAuthStore } from '../../store/auth.store';

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('renders email and password inputs', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders login button', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the page title', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('GES SHS Academic System')).toBeInTheDocument();
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByPlaceholderText('you@school.edu.gh')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('prevents form submission with invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);

    await user.clear(emailInput);
    await user.type(emailInput, 'notanemail');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Form should not navigate away — the login form should still be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });

  it('shows validation error for empty password on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'admin@shs.edu.gh');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows error message on invalid credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'wrong@shs.edu.gh');
    await user.type(screen.getByLabelText(/password/i), 'WrongPass@1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // The toggle button is inside the relative div wrapping the password input
    const toggleButtons = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('type') === 'button' && btn.getAttribute('tabindex') === '-1'
    );
    expect(toggleButtons.length).toBe(1);

    await user.click(toggleButtons[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButtons[0]);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows loading spinner during login request', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'admin@shs.edu.gh');
    await user.type(screen.getByLabelText(/password/i), 'Admin@1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Button should be disabled during request
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /sign in/i });
      expect(button).toBeDisabled();
    });
  });

  it('redirects when already authenticated as admin', () => {
    useAuthStore.setState({
      user: {
        userId: 'GES-ADM-0001',
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@shs.edu.gh',
        role: 'SUPER_ADMIN',
        isFirstLogin: false,
        requiresPasswordChange: false,
      },
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      isAuthenticated: true,
    });

    renderWithProviders(<LoginPage />);

    // LoginPage redirects — form should not be visible
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it('redirects to change-password when requiresPasswordChange is true', () => {
    useAuthStore.setState({
      user: {
        userId: 'GES-ADM-0001',
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@shs.edu.gh',
        role: 'SUPER_ADMIN',
        isFirstLogin: true,
        requiresPasswordChange: true,
      },
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      isAuthenticated: true,
    });

    renderWithProviders(<LoginPage />);

    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });
});
