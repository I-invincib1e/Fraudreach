// Shiprocket connector — mock only (no public PIN-level analytics API)
// Returns realistic mock data for demo purposes

const SHIPROCKET_MOCK = {
  "400001": { fraudRate: 0.14, rtoRate: 0.22, cancellationRate: 0.08, refundRate: 0.06, confidence: 0.65, sampleSize: 312 },
  "400050": { fraudRate: 0.09, rtoRate: 0.15, cancellationRate: 0.05, refundRate: 0.04, confidence: 0.72, sampleSize: 498 },
  "110001": { fraudRate: 0.11, rtoRate: 0.19, cancellationRate: 0.07, refundRate: 0.05, confidence: 0.68, sampleSize: 445 },
  "110020": { fraudRate: 0.17, rtoRate: 0.28, cancellationRate: 0.12, refundRate: 0.08, confidence: 0.61, sampleSize: 287 },
  "600001": { fraudRate: 0.08, rtoRate: 0.13, cancellationRate: 0.04, refundRate: 0.03, confidence: 0.74, sampleSize: 534 },
  "500001": { fraudRate: 0.10, rtoRate: 0.17, cancellationRate: 0.06, refundRate: 0.04, confidence: 0.70, sampleSize: 421 },
  "700001": { fraudRate: 0.13, rtoRate: 0.21, cancellationRate: 0.09, refundRate: 0.06, confidence: 0.63, sampleSize: 356 },
  "560001": { fraudRate: 0.07, rtoRate: 0.12, cancellationRate: 0.03, refundRate: 0.02, confidence: 0.78, sampleSize: 612 },
  "380001": { fraudRate: 0.12, rtoRate: 0.20, cancellationRate: 0.08, refundRate: 0.05, confidence: 0.66, sampleSize: 334 },
  "302001": { fraudRate: 0.15, rtoRate: 0.25, cancellationRate: 0.10, refundRate: 0.07, confidence: 0.62, sampleSize: 278 },
  "226001": { fraudRate: 0.18, rtoRate: 0.30, cancellationRate: 0.13, refundRate: 0.09, confidence: 0.58, sampleSize: 241 },
  "800001": { fraudRate: 0.22, rtoRate: 0.35, cancellationRate: 0.15, refundRate: 0.11, confidence: 0.55, sampleSize: 198 },
  "201301": { fraudRate: 0.09, rtoRate: 0.15, cancellationRate: 0.05, refundRate: 0.03, confidence: 0.71, sampleSize: 467 },
  "411001": { fraudRate: 0.11, rtoRate: 0.18, cancellationRate: 0.06, refundRate: 0.04, confidence: 0.69, sampleSize: 389 },
  "452001": { fraudRate: 0.16, rtoRate: 0.26, cancellationRate: 0.11, refundRate: 0.08, confidence: 0.60, sampleSize: 223 },
};

const DEFAULT_MOCK = {
  fraudRate: 0.12,
  rtoRate: 0.20,
  cancellationRate: 0.08,
  refundRate: 0.05,
  confidence: 0.60,
  sampleSize: 150
};

export async function getShiprocketData(pincode) {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 80 + Math.random() * 120));

  const base = SHIPROCKET_MOCK[pincode] || DEFAULT_MOCK;

  // Add small random noise for realism
  const noise = () => (Math.random() - 0.5) * 0.02;

  return {
    source: 'shiprocket',
    pincode,
    isMock: true,
    data: {
      fraudRate: Math.max(0, Math.min(1, base.fraudRate + noise())),
      rtoRate: Math.max(0, Math.min(1, base.rtoRate + noise())),
      cancellationRate: Math.max(0, Math.min(1, base.cancellationRate + noise())),
      refundRate: Math.max(0, Math.min(1, base.refundRate + noise())),
      confidence: base.confidence,
      sampleSize: base.sampleSize,
      lastUpdated: new Date().toISOString(),
    }
  };
}
