process.env.NODE_ENV = 'test';

import { beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { RFQService } from '../src/services/rfq.service';
import type { RFQ } from '@rfq-system/shared';

const buildRFQ = (): RFQ => ({
  company: 'Widget Corp',
  contact: {
    name: 'Alice Example',
    email: 'alice@example.com',
  },
  items: [
    {
      description: 'Gadget',
      quantity: 10,
      unit: 'pcs',
    },
  ],
});

describe('GET /api/secure/:token', () => {
  beforeEach(() => {
    RFQService.reset();
  });

  it('returns RFQ payload and secure link metadata', async () => {
    const rfq = RFQService.create(buildRFQ());
    const secureLink = RFQService.createSecureLink(rfq.id, 60_000);

    const response = await request(app).get(`/api/secure/${secureLink.token}`).expect(200);

    expect(response.body).toMatchObject({
      rfq: {
        company: 'Widget Corp',
        contact: {
          name: 'Alice Example',
          email: 'alice@example.com',
        },
      },
      link: {
        token: secureLink.token,
        oneTime: false,
      },
    });

    expect(response.body.link.createdAt).toEqual(expect.any(String));
    expect(response.body.link.expires).toEqual(expect.any(String));
    expect(response.body.link.accessCount).toBe(1);
    expect(response.body.link.firstAccessAt).toEqual(expect.any(String));
    expect(Array.isArray(response.body.link.accessLogs)).toBe(true);
    expect(response.body.link.accessLogs).toHaveLength(1);
    expect(response.body.link.accessLogs[0]).toEqual(
      expect.objectContaining({
        time: expect.any(String),
      })
    );
  });
});
