import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Mock the useNavigate hook (Login calls navigate() after login)
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock ThemeContext so components relying on useTheme render without a provider
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ mode: 'light' }),
  ThemeProvider: ({ children }) => children,
}));

// Mock AuthContext so we can control the login() behaviour without any network
const mockLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    loading: false,
  }),
  AuthProvider: ({ children }) => children,
}));

// Helper to render with the router (other providers are mocked above)
const renderWithProviders = (component) =>
  render(<BrowserRouter>{component}</BrowserRouter>);

describe('Login Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogin.mockReset();
  });

  it('renders login form correctly', () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('validates empty form submission', async () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(emailInput).toBeInvalid();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('validates invalid email format', async () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toBeInvalid();
    });
  });

  it('handles successful login', async () => {
    mockLogin.mockResolvedValue({ success: true });

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'Test@123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'test@example.com',
        'Test@123456',
        expect.objectContaining({ rememberThisMonth: false })
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('displays error message on failed login', async () => {
    mockLogin.mockResolvedValue({ success: false, message: 'Invalid credentials' });

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    renderWithProviders(<Login />);

    const passwordInput = screen.getByLabelText(/^password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('provides a link to the register page', () => {
    renderWithProviders(<Login />);

    const signUpLink = screen.getByRole('link', { name: /sign up/i });
    expect(signUpLink).toHaveAttribute('href', '/register');
  });
});
