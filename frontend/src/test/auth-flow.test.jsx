import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Login from '../pages/Login';
import ProtectedRoute from '../components/ProtectedRoute';

const mockLogin = vi.fn();
let mockAuth = { token: null, loading: false, login: mockLogin };

vi.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));

beforeEach(() => {
  mockLogin.mockReset();
  mockAuth = { token: null, loading: false, login: mockLogin };
});

describe('authentication critical flows', () => {
  test('redirects unauthenticated protected content to login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<p>Login destination</p>} />
          <Route path="/dashboard" element={<ProtectedRoute><p>Private dashboard</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Login destination')).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  test('renders protected content for an authenticated user', () => {
    mockAuth = { ...mockAuth, token: 'test-token' };
    render(<MemoryRouter><ProtectedRoute><p>Private dashboard</p></ProtectedRoute></MemoryRouter>);
    expect(screen.getByText('Private dashboard')).toBeInTheDocument();
  });

  test('submits login credentials and navigates to the dashboard', async () => {
    mockLogin.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<p>Dashboard destination</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@test.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('owner@test.local', 'password-123');
      expect(screen.getByText('Dashboard destination')).toBeInTheDocument();
    });
  });

  test('shows the backend message when login fails', async () => {
    mockLogin.mockRejectedValue({ response: { data: { message: 'Invalid email or password.' } } });
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@test.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });
});
