/**
 * Risk Engine — thin wrapper around the consensus engine
 * Exposes a simple getRiskAssessment(pincode, metrics) helper
 */

import { ConsensusEngine } from './consensus-engine.js';

const engine = new ConsensusEngine();

export function getRiskAssessment(pincode, metrics) {
  try {
    const consensus = engine.calculateConsensus(metrics);
    return {
      pincode,
      ...consensus,
      riskTier: engine.getRiskTier(consensus.fraudRiskScore),
    };
  } catch (err) {
    return {
      pincode,
      fraudRiskScore: 0,
      rtoRiskScore: 0,
      riskTier: 'LOW',
      error: err.message,
    };
  }
}

export { engine as consensusEngine };
