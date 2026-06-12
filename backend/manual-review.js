// In-memory manual review queue
// Stores orders flagged for human decision

const queue = new Map();
let idCounter = 1;

export function addToReviewQueue({ orderId, pincode, riskScore, rtoRate, riskTier, customerName, customerPhone, amount, source }) {
  const reviewId = `REV_${String(idCounter++).padStart(4, '0')}`;

  const entry = {
    reviewId,
    orderId,
    pincode,
    riskScore,
    rtoRate,
    riskTier,
    customerName: customerName || 'Unknown',
    customerPhone: customerPhone || null,
    amount: amount || null,
    source: source || 'api', // 'api' | 'ivr_no_input' | 'whatsapp' | 'shopify'
    status: 'pending', // pending | approved | cancelled | escalated
    addedAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    notes: null,
    history: [
      { event: 'added', timestamp: new Date().toISOString(), source }
    ],
  };

  queue.set(reviewId, entry);
  console.log(`[ManualReview] Added ${reviewId} for order ${orderId} (${riskTier} risk)`);
  return entry;
}

export function resolveReview(reviewId, { action, resolvedBy, notes }) {
  const entry = queue.get(reviewId);
  if (!entry) return { success: false, error: 'Review not found' };
  if (entry.status !== 'pending') return { success: false, error: `Already resolved as: ${entry.status}` };

  const validActions = ['approved', 'cancelled', 'escalated'];
  if (!validActions.includes(action)) {
    return { success: false, error: `Invalid action. Use: ${validActions.join(', ')}` };
  }

  entry.status = action;
  entry.resolvedAt = new Date().toISOString();
  entry.resolvedBy = resolvedBy || 'agent';
  entry.notes = notes || null;
  entry.history.push({
    event: action,
    timestamp: entry.resolvedAt,
    by: entry.resolvedBy,
    notes: entry.notes,
  });

  console.log(`[ManualReview] ${reviewId} → ${action} by ${entry.resolvedBy}`);
  return { success: true, entry };
}

export function getQueue(filter = 'pending') {
  const all = Array.from(queue.values());
  const filtered = filter === 'all' ? all : all.filter(e => e.status === filter);
  return filtered.sort((a, b) => {
    // Sort: higher risk first, then newest
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    return new Date(b.addedAt) - new Date(a.addedAt);
  });
}

export function getReview(reviewId) {
  return queue.get(reviewId) || null;
}

export function getQueueStats() {
  const all = Array.from(queue.values());
  return {
    total: all.length,
    pending: all.filter(e => e.status === 'pending').length,
    approved: all.filter(e => e.status === 'approved').length,
    cancelled: all.filter(e => e.status === 'cancelled').length,
    escalated: all.filter(e => e.status === 'escalated').length,
    avgRiskScore: all.length
      ? (all.reduce((sum, e) => sum + e.riskScore, 0) / all.length).toFixed(3)
      : 0,
  };
}

// Seed with demo data for hackathon demo
export function seedDemoData() {
  const demos = [
    { orderId: 'ORD_DEMO_001', pincode: '800001', riskScore: 0.82, rtoRate: 0.35, riskTier: 'HIGH', customerName: 'Rahul Sharma', amount: 4500, source: 'shopify' },
    { orderId: 'ORD_DEMO_002', pincode: '226001', riskScore: 0.71, rtoRate: 0.30, riskTier: 'HIGH', customerName: 'Priya Singh', amount: 2800, source: 'ivr_no_input' },
    { orderId: 'ORD_DEMO_003', pincode: '302001', riskScore: 0.58, rtoRate: 0.25, riskTier: 'MEDIUM', customerName: 'Amit Patel', amount: 1200, source: 'whatsapp' },
  ];

  demos.forEach(d => addToReviewQueue(d));
  console.log('[ManualReview] Demo data seeded');
}
