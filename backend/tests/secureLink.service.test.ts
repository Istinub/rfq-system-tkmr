import { afterEach, describe, expect, it } from '@jest/globals';
import { SecureLinkService } from '../src/services/secureLink.service';

describe('SecureLinkService', () => {
  afterEach(() => {
    SecureLinkService.reset();
  });

  it('creates metadata with defaults for one-time links', () => {
    const secureLink = SecureLinkService.create('123', { oneTime: true });

    expect(secureLink).toEqual({
      token: expect.any(String),
      rfqId: '123',
      createdAt: expect.any(String),
      expires: expect.any(String),
      oneTime: true,
      firstAccessAt: null,
      accessCount: 0,
      accessLogs: [],
    });

    expect(Number.isNaN(Date.parse(secureLink.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(secureLink.expires))).toBe(false);
  });

  it('marks one-time links as consumed after first access', () => {
    const secureLink = SecureLinkService.create('123', { oneTime: true });

    const firstAccess = SecureLinkService.validateAndAccess(secureLink.token, '127.0.0.1', 'jest');
    expect(firstAccess.status).toBe('ok');
    if (firstAccess.status === 'ok') {
      expect(firstAccess.link.firstAccessAt).toEqual(expect.any(String));
      expect(firstAccess.link.accessCount).toBe(1);
      expect(firstAccess.link.accessLogs).toHaveLength(1);
      expect(firstAccess.link.accessLogs[0]).toEqual({
        time: expect.any(String),
        ip: '127.0.0.1',
        userAgent: 'jest',
      });
    }

    const secondAccess = SecureLinkService.validateAndAccess(secureLink.token);
    expect(secondAccess.status).toBe('consumed');
  });
});
