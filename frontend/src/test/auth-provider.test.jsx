import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AuthProvider from '../context/AuthProvider';
import { useAuth } from '../context/AuthContext';
import api, { setAuthFailureHandler } from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  setAuthFailureHandler: vi.fn(),
}));

const AuthState = () => {
  const { loading, token, user } = useAuth();
  if (loading) return <p>Loading</p>;
  return <p>{token ? `${user?.name || 'No user'} authenticated` : 'Signed out'}</p>;
};

beforeEach(() => vi.clearAllMocks());

describe('AuthProvider', () => {
  test('restores the current user from a stored token', async () => {
    localStorage.setItem('token', 'stored-token');
    api.get.mockResolvedValue({ data: { user: { id: 'user-1', name: 'Test User' } } });

    render(<AuthProvider><AuthState /></AuthProvider>);

    expect(await screen.findByText('Test User authenticated')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/auth/me', {
      headers: { Authorization: 'Bearer stored-token' },
    });
  });

  test('clears context state through the registered global auth-failure handler', async () => {
    localStorage.setItem('token', 'stored-token');
    api.get.mockResolvedValue({ data: { user: { id: 'user-1', name: 'Test User' } } });
    render(<AuthProvider><AuthState /></AuthProvider>);
    await screen.findByText('Test User authenticated');

    const handler = setAuthFailureHandler.mock.calls[0][0];
    await act(async () => handler());

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBeNull();
  });
});
