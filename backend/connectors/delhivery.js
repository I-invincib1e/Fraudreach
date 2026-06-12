/**
 * Delhivery API Connector
 * Fetches PIN code serviceability + performance metrics
 * Real API: https://track.delhivery.com
 */

export class DelhiveryConnector {
  constructor(apiToken) {
    this.apiToken = apiToken || process.env.DELHIVERY_API_TOKEN;
    this.baseUrl = 'https://track.delhivery.com';
    this.ready = !!this.apiToken;

    if (!this.ready) {
      console.warn('⚠️  Delhivery API token not set. Using mock fallback.');
    }
  }

  /**
   * Check if a PIN code is serviceable + get zone/metadata
   * GET /c/api/pin-codes/json/?filter_codes=<pincode>
   */
  async getPincodeInfo(pincode) {
    if (!this.ready) return this._mockPincodeInfo(pincode);

    try {
      const res = await fetch(
        `${this.baseUrl}/c/api/pin-codes/json/?filter_codes=${pincode}`,
        {
          headers: {
            Authorization: `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) throw new Error(`Delhivery API error: ${res.status}`);
      const data = await res.json();
      return this._normalizePincodeInfo(data, pincode);
    } catch (err) {
      console.error(`Delhivery getPincodeInfo error for ${pincode}:`, err.message);
      return this._mockPincodeInfo(pincode);
    }
  }

  /**
   * Get package tracking to infer area-level RTO/fraud patterns
   * We aggregate tracking events for a PIN code zone
   * GET /api/v1/packages/json/?ref_nos=...
   * NOTE: Real PIN-level fraud metrics require enterprise plan
   * Fallback: use mock enriched with real serviceability data
   */
  async getPincodeMetrics(pincode) {
    if (!this.ready) return this._mockMetrics(pincode);

    try {
      // Step 1: Get serviceability info
      const info = await this.getPincodeInfo(pincode);

      // Step 2: Delhivery doesn't expose PIN-level fraud metrics via standard API
      // Enterprise customers get this via Delhivery Analytics API
      // For now: return mock metrics enriched with real serviceability flag
      const metrics = this._mockMetrics(pincode);
      metrics._serviceable = info.serviceable;
      metrics._zone = info.zone;
      metrics._source = info.serviceable ? 'delhivery_real_enriched' : 'mock';

      // If PIN is not serviceable → max risk
      if (!info.serviceable) {
        metrics.fraudRate = 0.35;
        metrics.rtoRate = 0.90;
        metrics.cancellationRate = 0.45;
        metrics.confidence = 0.50;
      }

      return metrics;
    } catch (err) {
      console.error(`Delhivery getPincodeMetrics error for ${pincode}:`, err.message);
      return this._mockMetrics(pincode);
    }
  }

  // ─── Normalization ──────────────────────────────────────────────────────────

  _normalizePincodeInfo(data, pincode) {
    const pins = data?.delivery_codes || [];
    const pin = pins.find((p) => p.postal_code?.pin === pincode) || pins[0];

    if (!pin) {
      return { serviceable: false, zone: 'unknown', pincode };
    }

    return {
      pincode,
      serviceable: true,
      city: pin.postal_code?.city || '',
      state_code: pin.postal_code?.state_code || '',
      district: pin.district || '',
      zone: pin.postal_code?.zone || 'B',
      pre_paid: pin.pre_paid === 'Y',
      cash: pin.cod === 'Y',
      pickup: pin.pickup === 'Y',
      _raw: pin,
    };
  }

  // ─── Mock fallback (realistic regional patterns) ────────────────────────────

  _mockPincodeInfo(pincode) {
    const prefix = pincode.substring(0, 3);
    const zones = {
      '110': { city: 'Delhi', state_code: 'DL', zone: 'A' },
      '400': { city: 'Mumbai', state_code: 'MH', zone: 'A' },
      '560': { city: 'Bangalore', state_code: 'KA', zone: 'B' },
      '500': { city: 'Hyderabad', state_code: 'TS', zone: 'B' },
      '600': { city: 'Chennai', state_code: 'TN', zone: 'B' },
      '700': { city: 'Kolkata', state_code: 'WB', zone: 'B' },
      '411': { city: 'Pune', state_code: 'MH', zone: 'B' },
      '380': { city: 'Ahmedabad', state_code: 'GJ', zone: 'C' },
      '302': { city: 'Jaipur', state_code: 'RJ', zone: 'C' },
      '450': { city: 'Jabalpur', state_code: 'MP', zone: 'D' },
      '751': { city: 'Bhubaneswar', state_code: 'OD', zone: 'D' },
      '144': { city: 'Ludhiana', state_code: 'PB', zone: 'C' },
      '201': { city: 'Noida', state_code: 'UP', zone: 'A' },
      '180': { city: 'Chandigarh', state_code: 'CH', zone: 'B' },
    };

    const zone = zones[prefix] || { city: 'Unknown', state_code: 'XX', zone: 'E' };
    return { pincode, serviceable: true, ...zone, _source: 'mock' };
  }

  _mockMetrics(pincode) {
    // Map PIN prefix → realistic fraud/RTO patterns
    const prefix = pincode.substring(0, 3);
    const patterns = {
      '110': { fraudRate: 0.075, rtoRate: 0.38, cancellationRate: 0.12, refundRate: 0.04, avgDeliveryDays: 2.1, confidence: 0.95 },
      '400': { fraudRate: 0.125, rtoRate: 0.52, cancellationRate: 0.18, refundRate: 0.07, avgDeliveryDays: 2.8, confidence: 0.92 },
      '560': { fraudRate: 0.058, rtoRate: 0.32, cancellationRate: 0.09, refundRate: 0.03, avgDeliveryDays: 1.9, confidence: 0.90 },
      '500': { fraudRate: 0.092, rtoRate: 0.44, cancellationRate: 0.14, refundRate: 0.05, avgDeliveryDays: 2.5, confidence: 0.87 },
      '600': { fraudRate: 0.068, rtoRate: 0.36, cancellationRate: 0.11, refundRate: 0.04, avgDeliveryDays: 2.3, confidence: 0.85 },
      '700': { fraudRate: 0.105, rtoRate: 0.48, cancellationRate: 0.16, refundRate: 0.06, avgDeliveryDays: 2.9, confidence: 0.80 },
      '411': { fraudRate: 0.085, rtoRate: 0.40, cancellationRate: 0.13, refundRate: 0.05, avgDeliveryDays: 2.4, confidence: 0.85 },
      '380': { fraudRate: 0.072, rtoRate: 0.35, cancellationRate: 0.11, refundRate: 0.04, avgDeliveryDays: 2.2, confidence: 0.82 },
      '450': { fraudRate: 0.158, rtoRate: 0.62, cancellationRate: 0.22, refundRate: 0.09, avgDeliveryDays: 4.1, confidence: 0.68 },
      '751': { fraudRate: 0.148, rtoRate: 0.58, cancellationRate: 0.20, refundRate: 0.08, avgDeliveryDays: 3.8, confidence: 0.65 },
      '302': { fraudRate: 0.095, rtoRate: 0.42, cancellationRate: 0.14, refundRate: 0.05, avgDeliveryDays: 2.6, confidence: 0.78 },
      '144': { fraudRate: 0.118, rtoRate: 0.50, cancellationRate: 0.17, refundRate: 0.06, avgDeliveryDays: 3.0, confidence: 0.73 },
      '201': { fraudRate: 0.082, rtoRate: 0.39, cancellationRate: 0.13, refundRate: 0.04, avgDeliveryDays: 2.2, confidence: 0.88 },
      '180': { fraudRate: 0.065, rtoRate: 0.32, cancellationRate: 0.10, refundRate: 0.03, avgDeliveryDays: 2.0, confidence: 0.83 },
    };

    const base = patterns[prefix] || {
      fraudRate: 0.12, rtoRate: 0.45, cancellationRate: 0.16,
      refundRate: 0.06, avgDeliveryDays: 3.5, confidence: 0.60,
    };

    return { ...base, _source: 'mock' };
  }
}

export const delhiveryConnector = new DelhiveryConnector();
