import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Clear localStorage before each test so no stored token leaks between tests
beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('renders without crashing', async () => {
    render(<App />);
    // The login screen shows the sign-in prompt after loading resolves
    expect(await screen.findByText('Sign in to your boutique')).toBeInTheDocument();
  });

  it('shows login form when not authenticated', async () => {
    render(<App />);
    // App renders LoginScreen when no token is in localStorage
    const emailInput = await screen.findByPlaceholderText('admin@vowos.test');
    const passwordInput = await screen.findByPlaceholderText('password123');
    const loginButton = await screen.findByRole('button', { name: /secure login/i });
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(loginButton).toBeInTheDocument();
  });

  it('does not crash when fetch returns health OK', async () => {
    // Mock global fetch so any API calls don't fail
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'OK' }),
    } as Response);

    render(<App />);

    // App should still be in login state (no token) and render without throwing
    expect(await screen.findByText('Sign in to your boutique')).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
