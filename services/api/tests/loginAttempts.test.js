import { vi } from 'vitest';

const loginAttempts = require('../src/services/loginAttempts');
const { config } = require('../src/config/env');

const LOCK_MS = config.loginLock.lockMinutes * 60_000;

describe('Verrouillage après échecs de connexion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    loginAttempts.resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('verrouille le compte après le nombre maximal d’échecs', () => {
    for (let i = 0; i < config.loginLock.maxAttempts; i += 1) {
      expect(loginAttempts.getLockSeconds('User@Example.com')).toBe(0);
      loginAttempts.recordFailure('user@example.com');
    }

    expect(loginAttempts.getLockSeconds('user@example.com')).toBeGreaterThan(0);
  });

  it('libère le compte après la durée de verrouillage', () => {
    for (let i = 0; i < config.loginLock.maxAttempts; i += 1) {
      loginAttempts.recordFailure('user@example.com');
    }
    expect(loginAttempts.getLockSeconds('user@example.com')).toBeGreaterThan(0);

    vi.advanceTimersByTime(LOCK_MS + 1000);

    expect(loginAttempts.getLockSeconds('user@example.com')).toBe(0);
  });

  it('réinitialise le compteur après une connexion réussie', () => {
    loginAttempts.recordFailure('user@example.com');
    loginAttempts.recordFailure('user@example.com');
    loginAttempts.clearFailures('user@example.com');

    for (let i = 0; i < config.loginLock.maxAttempts - 1; i += 1) {
      loginAttempts.recordFailure('user@example.com');
    }

    expect(loginAttempts.getLockSeconds('user@example.com')).toBe(0);
  });
});
