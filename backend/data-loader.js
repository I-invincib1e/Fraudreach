/**
 * Data Loader
 * Load PIN code metrics from mock or real sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataLoader {
  constructor() {
    this.mockDataPath = path.join(__dirname, '../data/pincode-metrics-mock.json');
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.lastRefresh = null;
  }

  /**
   * Load all mock PIN code data
   */
  loadMockData() {
    try {
      const data = fs.readFileSync(this.mockDataPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.mockDatabase = parsed.pinCodes;
      this.lastRefresh = Date.now();
      console.log(`✅ Loaded ${Object.keys(parsed.pinCodes).length} PIN codes from mock data`);
      return parsed;
    } catch (err) {
      console.error('❌ Failed to load mock data:', err.message);
      throw err;
    }
  }

  /**
   * Get metrics for a single PIN code
   * Format: { delhivery: {...}, ekart: {...}, shiprocket: {...} }
   */
  getPincodeMetrics(pincode) {
    if (!this.mockDatabase) {
      this.loadMockData();
    }

    const pincodeData = this.mockDatabase[pincode];
    if (!pincodeData) {
      return null;
    }

    // Return metrics in format expected by consensus engine
    return {
      delhivery: pincodeData.delhivery,
      ekart: pincodeData.ekart,
      shiprocket: pincodeData.shiprocket,
    };
  }

  /**
   * Get all PIN codes by risk tier
   */
  getPincodesByRiskTier(tier) {
    if (!this.mockDatabase) {
      this.loadMockData();
    }

    const tierMap = {
      low: 'lowRisk',
      medium: 'mediumRisk',
      high: 'highRisk',
      critical: 'veryHighRisk',
    };

    // For now, return from mock metadata
    // TODO: compute dynamically from consensus
    return [];
  }

  /**
   * Get high-risk PIN codes (for dashboard display)
   */
  getHighRiskPincodes(threshold = 0.65) {
    if (!this.mockDatabase) {
      this.loadMockData();
    }

    const highRisk = [];
    for (const [pincode, data] of Object.entries(this.mockDatabase)) {
      // Use consensus expectation from mock data
      if (data.consensus && data.consensus.expectedFraudRisk >= threshold) {
        highRisk.push({
          pincode,
          region: data.region,
          city: data.city,
          state: data.state,
          tier: data.tier,
          expectedFraudRisk: data.consensus.expectedFraudRisk,
          expectedRtoRisk: data.consensus.expectedRtoRisk,
          recommendation: data.consensus.recommendation,
        });
      }
    }

    return highRisk.sort((a, b) => b.expectedFraudRisk - a.expectedFraudRisk);
  }

  /**
   * Get all PIN codes (for map display)
   */
  getAllPincodes() {
    if (!this.mockDatabase) {
      this.loadMockData();
    }

    const pincodes = [];
    for (const [pincode, data] of Object.entries(this.mockDatabase)) {
      pincodes.push({
        pincode,
        region: data.region,
        city: data.city,
        state: data.state,
        tier: data.tier,
        expectedFraudRisk: data.consensus?.expectedFraudRisk || 0,
        expectedRtoRisk: data.consensus?.expectedRtoRisk || 0,
        riskTier: this._calculateRiskTier(data.consensus?.expectedFraudRisk || 0),
      });
    }

    return pincodes;
  }

  /**
   * Get metadata about mock data
   */
  getMetadata() {
    if (!this.mockDatabase) {
      this.loadMockData();
    }

    const raw = JSON.parse(fs.readFileSync(this.mockDataPath, 'utf-8'));
    return raw.metadata || {};
  }

  /**
   * Search PIN codes by region/city
   */
  searchPincodes(query) {
    if (!this.mockDatabase) {
      this.loadMockData();
    }

    const q = query.toLowerCase();
    const results = [];

    for (const [pincode, data] of Object.entries(this.mockDatabase)) {
      if (
        pincode.includes(q) ||
        data.region.toLowerCase().includes(q) ||
        data.city.toLowerCase().includes(q) ||
        data.state.toLowerCase().includes(q)
      ) {
        results.push({
          pincode,
          region: data.region,
          city: data.city,
          state: data.state,
          tier: data.tier,
        });
      }
    }

    return results;
  }

  /**
   * Helper: calculate risk tier from fraud risk
   */
  _calculateRiskTier(fraudRisk) {
    if (fraudRisk < 0.4) return 'low';
    if (fraudRisk < 0.65) return 'medium';
    if (fraudRisk < 0.85) return 'high';
    return 'critical';
  }

  /**
   * Real data connector placeholder
   * To be implemented when seller APIs are confirmed
   */
  async fetchRealDataFromDelhivery(pincode) {
    // TODO: Implement real API calls
    // GET https://api.delhivery.com/v1/metrics/pincode/{pincode}
    console.warn('Real Delhivery API not implemented yet');
    return null;
  }

  async fetchRealDataFromEkart(pincode) {
    // TODO: Implement real API calls
    console.warn('Real Ekart API not implemented yet');
    return null;
  }

  async fetchRealDataFromShiprocket(pincode) {
    // TODO: Implement real API calls
    console.warn('Real Shiprocket API not implemented yet');
    return null;
  }
}

export const dataLoader = new DataLoader();
