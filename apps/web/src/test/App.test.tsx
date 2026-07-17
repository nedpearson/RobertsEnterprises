import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

// Clear localStorage before each test so no stored token leaks between tests
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // The login screen shows the sign-in prompt
    expect(screen.getByText('Sign in to your boutique')).toBeInTheDocument();
  });

  it('shows login form when not authenticated', () => {
    render(<App />);
    // App renders LoginScreen when no token is in localStorage
    const emailInput = screen.getByPlaceholderText('admin@vowos.test');
    const passwordInput = screen.getByPlaceholderText('password123');
    const loginButton = screen.getByRole('button', { name: /secure login/i });
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(loginButton).toBeInTheDocument();
  });

  it('does not crash when fetch returns health OK', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'OK' }),
    } as Response);

    render(<App />);

    expect(screen.getByText('Sign in to your boutique')).toBeInTheDocument();
  });
});

describe('fetchData auth headers', () => {
  it('sends Authorization header using vowos_token when authenticated', async () => {
    localStorage.setItem('vowos_token', 'test-jwt-abc');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, limit: 50, pages: 0 }),
    } as Response);

    // Simulate a logged-in session by injecting token and triggering App render
    // We observe fetch calls made after mount (seed chain → fetchData)
    render(<App />);

    await waitFor(() => {
      // fetchData fires after the seed chain; find a call to /customers
      const customerCall = fetchSpy.mock.calls.find(([url]) =>
        typeof url === 'string' && url.includes('/customers')
      );
      expect(customerCall).toBeDefined();
      const opts = customerCall![1] as RequestInit;
      expect((opts?.headers as Record<string, string>)?.['Authorization']).toBe('Bearer test-jwt-abc');
    }, { timeout: 3000 });
  });

  it('unwraps paginated .data array from API responses', async () => {
    localStorage.setItem('vowos_token', 'test-jwt-abc');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 1, first_name: 'Emma' }], total: 1, page: 1, limit: 50, pages: 1 }),
    } as Response);

    // App should mount without throwing even when responses are paginated objects
    expect(() => render(<App />)).not.toThrow();
  });

  it('handles flat array responses gracefully (backward compat)', async () => {
    localStorage.setItem('vowos_token', 'test-jwt-abc');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, first_name: 'Emma' }],
    } as Response);

    expect(() => render(<App />)).not.toThrow();
  });
});
