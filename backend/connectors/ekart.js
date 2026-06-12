/**
 * Ekart (Flipkart Logistics) API Connector
 * PIN code serviceability + RTO metrics
 * Real API: https://ekartlogistics.com/ws/getpincodeserviceability
 */

export class EkartConnector {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.EKART_API_KEY;
    this.baseUrl = 'https://ekartlogistics.com';
    this.ready = !!this.apiKey;

    if (!this.ready) {
      console.warn('⚠️  Ekart API key not set. Using mock fallback.');
    }
  }

  /**
   * Check PIN code serviceability
   * POST /ws/getpincodeserviceability
   * Body: { pinCode: "110001" }
   */
  async getPincodeServiceability(pincode) {
    if (!this.ready) return this._mockServiceability(pincode);

    try {
      const res = await fetch(`${this.baseUrl}/ws/getpincodeserviceability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        },
        body: JSON.stringify({ pinCode: pincode }),
      });

      if (!res.ok) throw new Error(`Ekart API error: ${res.status}`);
      const data = await res.json();
      return this._normalizeServiceability(data, pincode);
    } catch (err) {
      console.error(`Ekart serviceability error for ${pincode}:`, err.message);
      return this._mockServiceability(pincode);
    }
  }

  /**
   * Get PIN code metrics (serviceability + regional fraud patterns)
   * Ekart doesn't expose fraud metrics directly → enrich mock with real serviceability
   */
  async getPincodeMetrics(pincode) {
    if (!this.ready) return this._mockMetrics(pincode);

    try {
      const serviceability = await this.getPincodeServiceability(pincode);
      const metrics = this._mockMetrics(pincode);

      metrics._serviceable = serviceability.serviceable;
      metrics._codAvailable = serviceability.codAvailable;
      metrics._source = 'ekart_real_enriched';

      // COD not available = higher fraud risk area (Ekart blocks COD in risky zones)
      if (!serviceability.codAvailable) {
        metrics.fraudRate = Math.min(metrics.fraudRate * 1.5, 0.45);
        metrics.rtoRate = Math.min(metrics.rtoRate * 1.3, 0.85);
        metrics.confidence = Math.max(metrics.confidence - 0.10, 0.50);
      }

      // Not serviceable = maximum risk
      if (!serviceability.serviceable) {
        metrics.fraudRate = 0.40;
        metrics.rtoRate = 0.95;
        metrics.confidence = 0.45;
      }

      return metrics;
    } catch (err) {
      console.error(`Ekart getPincodeMetrics error for ${pincode}:`, err.message);
      return this._mockMetrics(pincode);
    }
  }

  // ─── Normalization ──────────────────────────────────────────────────────────

  _normalizeServiceability(data, pincode) {
    return {
      pincode,
      serviceable: data.result === 'Y' || data.serviceable === true,
      codAvailable: data.codAvailable === true || data.cod === 'Y',
      prepaidAvailable: data.prepaidAvailable !== false,
      expectedDeliveryDays: data.edd || data.expectedDeliveryDays || 3,
      _raw: data,
    };
  }

  // ─── Mock fallback ──────────────────────────────────────────────────────────

  _mockServiceability(pincode) {
    const prefix = pincode.substring(0, 3);
    // Ekart blocks COD in high-risk zones
    const codBlocked = ['450', '751', '700', '144'];
    return {
      pincode,
      serviceable: true,
      codAvailable: !codBlocked.includes(prefix),
      prepaidAvailable: true,
      expectedDeliveryDays: this._estimateDeliveryDays(prefix),
      _source: 'mock',
    };
  }

  _mockMetrics(pincode) {
    const prefix = pincode.substring(0, 3);
    const patterns = {
      '110': { fraudRate: 0.082, rtoRate: 0.40, cancellationRate: 0.13, refundRate: 0.05, avgDeliveryDays: 2.2, confidence: 0.92 },
      '400': { fraudRate: 0.138, rtoRate: 0.56, cancellationRate: 0.20, refundRate: 0.08, avgDeliveryDays: 2.9, confidence: 0.90 },
      '560': { fraudRate: 0.065, rtoRate: 0.35, cancellationRate: 0.10, refundRate: 0.04, avgDeliveryDays: 2.0, confidence: 0.88 },
      '500': { fraudRate: 0.105, rtoRate: 0.48, cancellationRate: 0.16, refundRate: 0.06, avgDeliveryDays: 2.7, confidence: 0.85 },
      '600': { fraudRate: 0.075, rtoRate: 0.39, cancellationRate: 0.12, refundRate: 0.04, avgDeliveryDays: 2.4, confidence: 0.84 },
      '700': { fraudRate: 0.128, rtoRate: 0.54, cancellationRate: 0.19, refundRate: 0.07, avgDeliveryDays: 3.1, confidence: 0.78 },
      '411': { fraudRate: 0.095, rtoRate: 0.44, cancellationRate: 0.15, refundRate: 0.05, avgDeliveryDays: 2.6, confidence: 0.84 },
      '380': { fraudRate: 0.082, rtoRate: 0.38, cancellationRate: 0.12, refundRate: 0.04, avgDeliveryDays: 2.3, confidence: 0.82 },
      '450': { fraudRate: 0.142, rtoRate: 0.58, cancellationRate: 0.20, refundRate: 0.08, avgDeliveryDays: 3.9, confidence: 0.68 },
      '751': { fraudRate: 0.165, rtoRate: 0.64, cancellationRate: 0.23, refundRate: 0.09, avgDeliveryDays: 4.1, confidence: 0.65 },
      '302': { fraudRate: 0.108, rtoRate: 0.46, cancellationRate: 0.16, refundRate: 0.06, avgDeliveryDays: 2.8, confidence: 0.78 },
      '144': { fraudRate: 0.132, rtoRate: 0.54, cancellationRate: 0.19, refundRate: 0.07, avgDeliveryDays: 3.2, confidence: 0.73 },
      '201': { fraudRate: 0.090, rtoRate: 0.42, cancellationRate: 0.14, refundRate: 0.05, avgDeliveryDays: 2.3, confidence: 0.88 },
      '180': { fraudRate: 0.072, rtoRate: 0.35, cancellationRate: 0.11, refundRate: 0.04, avgDeliveryDays: 2.1, confidence: 0.80 },
    };

    const base = patterns[prefix] || {
      fraudRate: 0.13, rtoRate: 0.48, cancellationRate: 0.17,
      refundRate: 0.07, avgDeliveryDays: 3.8, confidence: 0.60,
    };

    return { ...base, _source: 'mock' };
  }

  _estimateDeliveryDays(prefix) {
    const metro = ['110', '400', '560', '500', '600', '700', '201'];
    const tier1 = ['411', '380', '302', '180', '144'];
    if (metro.includes(prefix)) return 2;
    if (tier1.includes(prefix)) return 3;
    return 4;
  }
}

export const ekartConnector = new EkartConnector();
