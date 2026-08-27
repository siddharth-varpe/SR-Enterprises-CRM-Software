import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthBoundary';
import { ProtectedRoute } from '../App';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function DummyDashboard() {
  return <div data-testid="dashboard-view">CRM Secret Dashboard Content</div>;
}

function DummyCustomers() {
  return <div data-testid="customers-view">Customer Directory Private Ledger</div>;
}

function DummyLogin() {
  return <div data-testid="login-page">SR Enterprises CRM Login Page</div>;
}

function TestAppRouter({ initialEntry = '/dashboard' }: { initialEntry?: string }) {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<DummyLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DummyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <DummyCustomers />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Master Authentication & Route Protection Security Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('TEST A: Direct navigation to /dashboard without session redirects to /login', async () => {
    (apiClient.get as any).mockRejectedValueOnce(new Error('401 Unauthorized'));

    render(<TestAppRouter initialEntry="/dashboard" />);

    // While checking, the security loader is shown (Dashboard is NOT shown)
    expect(screen.queryByTestId('dashboard-view')).toBeNull();

    // After auth check fails with 401, redirect to /login
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    // Dashboard must NEVER have been rendered
    expect(screen.queryByTestId('dashboard-view')).toBeNull();
  });

  it('TEST B: Direct navigation to /customers without session redirects to /login', async () => {
    (apiClient.get as any).mockRejectedValueOnce(new Error('401 Unauthorized'));

    render(<TestAppRouter initialEntry="/customers" />);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    expect(screen.queryByTestId('customers-view')).toBeNull();
  });

  it('TEST H: Access to /dashboard with valid authenticated session renders dashboard', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: 'user-001',
          username: 'admin',
          displayName: 'Shailendra Rajput',
          email: 'admin@srenterprises.com',
          role: 'Super Admin',
        },
        permissions: ['*'],
      },
    });

    render(<TestAppRouter initialEntry="/dashboard" />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-view')).toBeDefined();
    });

    expect(screen.queryByTestId('login-page')).toBeNull();
  });

  it('TEST J & K: Calling logout destroys session and immediately denies access', async () => {
    let capturedLogout: any = null;

    function TestLogoutComponent() {
      const { logout, isAuthenticated } = useAuth();
      capturedLogout = logout;
      return <div data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</div>;
    }

    (apiClient.get as any).mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: 'user-001',
          username: 'admin',
          displayName: 'Admin User',
          role: 'Super Admin',
        },
        permissions: ['*'],
      },
    });
    (apiClient.post as any).mockResolvedValueOnce({ success: true });

    render(
      <AuthProvider>
        <TestLogoutComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('LOGGED_IN')).toBeDefined();
    });

    // Execute logout
    await capturedLogout();

    await waitFor(() => {
      expect(screen.getByText('LOGGED_OUT')).toBeDefined();
    });
  });
});
