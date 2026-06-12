/**
 * Consensus Engine
 * Multi-source PIN code fraud risk scoring
 * Weighted by partner reliability + confidence
 */

export class ConsensusEngine {
  constructor(config = {}) {
    // Default partner weights (can adjust based on reliability)
    this.weights = {
      delhivery: config.delhivery || 0.35,
      ekart: config.ekart || 0.35,
      shiprocket: config.shiprocket || 0.30,
    };

    // Risk scoring formula weights
    this.riskWeights = {
      fraudRate: 0.50,
      rtoRate: 0.30,
      cancellationRate: 0.10,
      refundRate: 0.10,
    };

    // Risk thresholds
    this.thresholds = {
      ivrTrigger: 0.70,
      whatsappAlert: 0.55,
      manualReviewAgreement: 0.60,
    };
  }

  /**
   * Calculate weighted fraud risk from 3 sources
   * @param {Object} metrics - { delhivery, ekart, shiprocket } each with fraudRate, rtoRate, etc.
   * @returns {Object} - consensusRisk, sourceBreakdown, recommendation
   */
  calculateConsensus(metrics) {
    const { delhivery, ekart, shiprocket } = metrics;

    // Validate all 3 sources present
    if (!delhivery || !ekart || !shiprocket) {
      throw new Error('All 3 sources (delhivery, ekart, shiprocket) required');
    }

    // Calculate risk score for each partner
    const delhiveryRisk = this._calculateRiskScore(delhivery);
    const ekartRisk = this._calculateRiskScore(ekart);
    const shiprocketRisk = this._calculateRiskScore(shiprocket);

    // Adjust weights by confidence (low confidence = lower weight)
    const delhiveryWeight = this.weights.delhivery * (delhivery.confidence || 0.8);
    const ekartWeight = this.weights.ekart * (ekart.confidence || 0.8);
    const shiprocketWeight = this.weights.shiprocket * (shiprocket.confidence || 0.8);

    // Normalize weights to sum to 1
    const totalWeight = delhiveryWeight + ekartWeight + shiprocketWeight;
    const normalizedDel = delhiveryWeight / totalWeight;
    const normalizedEk = ekartWeight / totalWeight;
    const normalizedSr = shiprocketWeight / totalWeight;

    // Weighted consensus fraud risk
    const consensusFraudRisk =
      delhiveryRisk * normalizedDel +
      ekartRisk * normalizedEk +
      shiprocketRisk * normalizedSr;

    // Source agreement score (how much do they align? 0-1)
    const sourceAgreement = this._calculateSourceAgreement(
      delhiveryRisk,
      ekartRisk,
      shiprocketRisk
    );

    // Determine recommendation based on thresholds
    const recommendation = this._getRecommendation(
      consensusFraudRisk,
      sourceAgreement
    );

    return {
      fraudRiskScore: parseFloat(consensusFraudRisk.toFixed(4)),
      rtoRiskScore: parseFloat(
        (delhivery.rtoRate * normalizedDel +
          ekart.rtoRate * normalizedEk +
          shiprocket.rtoRate * normalizedSr).toFixed(4)
      ),
      sourceAgreement: parseFloat(sourceAgreement.toFixed(4)),
      recommendation,
      sources: [
        {
          partner: 'delhivery',
          fraudRisk: parseFloat(delhiveryRisk.toFixed(4)),
          weight: parseFloat(normalizedDel.toFixed(4)),
          confidence: delhivery.confidence || 0.8,
        },
        {
          partner: 'ekart',
          fraudRisk: parseFloat(ekartRisk.toFixed(4)),
          weight: parseFloat(normalizedEk.toFixed(4)),
          confidence: ekart.confidence || 0.8,
        },
        {
          partner: 'shiprocket',
          fraudRisk: parseFloat(shiprocketRisk.toFixed(4)),
          weight: parseFloat(normalizedSr.toFixed(4)),
          confidence: shiprocket.confidence || 0.8,
        },
      ],
      ivrTrigger: consensusFraudRisk > this.thresholds.ivrTrigger,
      whatsappAlert: consensusFraudRisk > this.thresholds.whatsappAlert,
      manualReview: sourceAgreement < this.thresholds.manualReviewAgreement,
    };
  }

  /**
   * Calculate risk score for a single source
   * Formula: (fraud% × 0.50) + (rto% × 0.30) + (cancel% × 0.10) + (refund% × 0.10) + boosters
   */
  _calculateRiskScore(metrics) {
    const baseScore =
      metrics.fraudRate * this.riskWeights.fraudRate +
      metrics.rtoRate * this.riskWeights.rtoRate +
      metrics.cancellationRate * this.riskWeights.cancellationRate +
      metrics.refundRate * this.riskWeights.refundRate;

    let boosters = 0;

    // Fraud booster
    if (metrics.fraudRate > 0.15) {
      boosters += 0.15;
    }

    // RTO booster (logistics issue related to fraud)
    if (metrics.rtoRate > 0.5) {
      boosters += 0.1;
    }

    // Slow delivery booster
    if (metrics.avgDeliveryDays > 5) {
      boosters += 0.05;
    }

    const finalScore = Math.min(baseScore + boosters, 1.0);
    return finalScore;
  }

  /**
   * Calculate source agreement (0-1)
   * High agreement = all sources say same risk level
   * Low agreement = sources conflict
   */
  _calculateSourceAgreement(risk1, risk2, risk3) {
    const risks = [risk1, risk2, risk3];
    const mean = risks.reduce((a, b) => a + b, 0) / 3;

    // Variance from mean
    const variance =
      risks.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / 3;
    const stdDev = Math.sqrt(variance);

    // Convert std dev to agreement (lower variance = higher agreement)
    // If stdDev = 0, agreement = 1.0
    // If stdDev > 0.3, agreement < 0.5
    const agreement = Math.max(0, 1.0 - stdDev * 2);
    return agreement;
  }

  /**
   * Get recommendation based on fraud risk + source agreement
   */
  _getRecommendation(fraudRisk, sourceAgreement) {
    // Low agreement = always manual review
    if (sourceAgreement < this.thresholds.manualReviewAgreement) {
      return 'manual_review';
    }

    // High fraud risk + good agreement = IVR escalation
    if (fraudRisk > this.thresholds.ivrTrigger) {
      return 'escalate_ivr';
    }

    // Medium fraud risk = WhatsApp alert
    if (fraudRisk > this.thresholds.whatsappAlert) {
      return 'whatsapp_alert';
    }

    // Low risk = auto pass
    return 'pass';
  }

  /**
   * Batch process multiple PIN codes
   */
  processBatch(pincodeMetricsMap) {
    const results = {};
    for (const [pincode, metrics] of Object.entries(pincodeMetricsMap)) {
      try {
        results[pincode] = this.calculateConsensus(metrics);
      } catch (err) {
        results[pincode] = {
          error: err.message,
          fraudRiskScore: null,
        };
      }
    }
    return results;
  }

  /**
   * Get risk tier label
   */
  getRiskTier(fraudRiskScore) {
    if (fraudRiskScore < 0.4) return 'low';
    if (fraudRiskScore < 0.65) return 'medium';
    if (fraudRiskScore < 0.85) return 'high';
    return 'critical';
  }
}

// Export singleton for use across modules
export const consensusEngine = new ConsensusEngine();
