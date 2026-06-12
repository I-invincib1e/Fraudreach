import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
process.env.NODE_ENV = 'test';
import app from './server.js'; // Ensure app is exported in server.js

// Using Bun's fetch API directly against the running Express app instance
let server;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  if (server) server.close();
});

describe('API Unit Tests', () => {
  
  it('GET /health should return status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.services.consensusEngine).toBe('active');
  });

  it('GET /api/pincode/:pinCode/consensus should return valid risk scores', async () => {
    const res = await fetch(`${baseUrl}/api/pincode/110001/consensus`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pinCode).toBe('110001');
    expect(data.consensus).toBeDefined();
    expect(data.consensus.fraudRiskScore).toBeGreaterThanOrEqual(0);
    expect(data.consensus.fraudRiskScore).toBeLessThanOrEqual(1);
    expect(data.sources).toBeDefined();
  });

  it('GET /api/pincode/:pinCode/consensus should return 404 for unknown PIN', async () => {
    const res = await fetch(`${baseUrl}/api/pincode/999999/consensus`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('not found');
  });

  it('GET /api/pincodes/all should return a list of PIN codes', async () => {
    const res = await fetch(`${baseUrl}/api/pincodes/all`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('GET /api/pincodes/high-risk should filter out low risk pins', async () => {
    const res = await fetch(`${baseUrl}/api/pincodes/high-risk?threshold=0.65`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.pincodes)).toBe(true);
    // Ensure all returned PINs have risk >= 0.65
    data.pincodes.forEach(pin => {
      expect(pin.fraudRiskScore).toBeGreaterThanOrEqual(0.65);
    });
  });

  it('POST /api/shopify/simulate-order should trigger order processing', async () => {
    const res = await fetch(`${baseUrl}/api/shopify/simulate-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pincode: '800001',
        amount: 5000,
        customerName: 'Unit Test User'
      })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.simulated).toBe(true);
    expect(data.action).toBeDefined();
    expect(data.riskTier).toBeDefined();
  });

});
