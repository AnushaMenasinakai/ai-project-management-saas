import { afterEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requestHandler: null, responseErrorHandler: null }));

vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: (handler) => { mocks.requestHandler = handler; } },
        response: { use: (_success, failure) => { mocks.responseErrorHandler = failure; } },
      },
    }),
  },
}));

const { setAuthFailureHandler } = await import('../services/api');

afterEach(() => setAuthFailureHandler(null));

describe('API session handling', () => {
  test('clears an authenticated session after a 401 response', async () => {
    const onAuthFailure = vi.fn();
    localStorage.setItem('token', 'expired-token');
    setAuthFailureHandler(onAuthFailure);
    await expect(mocks.responseErrorHandler({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledOnce();
  });

  test.each([404, 500])('does not clear authentication after a %s response', async (status) => {
    const onAuthFailure = vi.fn();
    localStorage.setItem('token', 'valid-token');
    setAuthFailureHandler(onAuthFailure);
    await expect(mocks.responseErrorHandler({ response: { status } })).rejects.toBeTruthy();
    expect(localStorage.getItem('token')).toBe('valid-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  test('does not trigger global logout for a 401 without a stored token', async () => {
    const onAuthFailure = vi.fn();
    setAuthFailureHandler(onAuthFailure);
    await expect(mocks.responseErrorHandler({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});
