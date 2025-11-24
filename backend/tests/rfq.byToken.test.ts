process.env.NODE_ENV = 'test';

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { RFQService } from '../src/services/rfq.service';
import type { RFQ } from '@rfq-system/shared';

describe('GET /api/rfq/by-token/:token', () => {
  const buildRFQ = (): RFQ => ({
    company: 'Acme Corporation',
    contact: {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
    },
    items: [
      {
        description: 'Widget',
        quantity: 5,
        unit: 'pcs',
      },
    ],
  });

  beforeEach(() => {
    RFQService.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns RFQ data when given a valid token', async () => {
    const rfqPayload = buildRFQ();

    const createResponse = await request(app)
      .post('/api/rfq')
      .send(rfqPayload)
      .expect(201);

    const rfqId: string = createResponse.body.data.id;

    const secureLinkResponse = await request(app)
      .post(`/api/rfq/${rfqId}/secure-link`)
      .expect(201);

    const token: string = secureLinkResponse.body.data.token;

    const { status, body } = await request(app).get(`/api/rfq/by-token/${token}`);

    expect(status).toBe(200);
    expect(body).toEqual(rfqPayload);
  });

  it('returns 404 when the token does not exist', async () => {
    const { status, body } = await request(app).get('/api/rfq/by-token/invalid-token');

    expect(status).toBe(404);
    expect(body).toEqual({ error: 'Invalid or expired token' });
  });

  it('returns 410 when the token has expired', async () => {
    const rfqPayload = buildRFQ();

    const createResponse = await request(app)
      .post('/api/rfq')
      .send(rfqPayload)
      .expect(201);

    const rfqId: string = createResponse.body.data.id;

    const { token } = RFQService.createSecureLink(rfqId, -1000);

    const { status, body } = await request(app).get(`/api/rfq/by-token/${token}`);

    expect(status).toBe(410);
    expect(body).toEqual({ error: 'Secure link has expired' });
  });

  it('validates token format and returns 400 when missing', async () => {
    const { status, body } = await request(app).get('/api/rfq/by-token/%20');

    expect(status).toBe(400);
    expect(body).toEqual({ error: 'Secure token is required' });
  });
});

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
  },
  moduleNameMapper: {
    '^@rfq-system/shared/(.*)$': '<rootDir>/../shared/dist/$1',
    '^@rfq-system/shared$': '<rootDir>/../shared/dist/index.js',
  },
};
