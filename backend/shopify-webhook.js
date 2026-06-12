import crypto from 'crypto';
import { consensusEngine } from './consensus-engine.js';
import { dataLoader } from './data-loader.js';
import { triggerIVRCall } from './ivrController.js';
import { sendWhatsAppAlert } from './whatsapp.js';
import { addToReviewQueue } from './manual-review.js';

// In-memory Shopify order tracking
const shopifyOrders = new Map();

// Verify Shopify webhook signature
export function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!secret) return true; // Skip verification in dev mode
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader || ''));
}

// Main webhook handler — orders/create
export async function handleOrderCreated(orderPayload) {
  const {
    id,
    order_number,
    total_price,
    shipping_address,
    billing_address,
    customer,
    line_items,
    created_at,
  } = orderPayload;

  const orderId = `SHPFY_${order_number || id}`;
  const pincode = shipping_address?.zip?.replace(/\s/g, '') || null;
  const customerName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    : shipping_address?.name || 'Unknown';
  const customerPhone = customer?.phone || shipping_address?.phone || null;
  const amount = parseFloat(total_price || 0);

  const orderRecord = {
    orderId,
    shopifyId: id,
    orderNumber: order_number,
    pincode,
    customerName,
    customerPhone,
    amount,
    currency: orderPayload.currency || 'INR',
    lineItems: (line_items || []).map(i => ({ title: i.title, quantity: i.quantity, price: i.price })),
    shippingAddress: shipping_address,
    createdAt: created_at || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    status: 'received', // received | analyzing | approved | held | cancelled
    fraudCheck: null,
    escalationResult: null,
  };

  shopifyOrders.set(orderId, orderRecord);
  console.log(`[Shopify] Order received: ${orderId} | PIN: ${pincode} | ₹${amount}`);

  if (!pincode) {
    orderRecord.status = 'approved'; // No PIN = can't check, let through
    orderRecord.fraudCheck = { skipped: true, reason: 'No pincode in shipping address' };
    return { orderId, action: 'approved', reason: 'no_pincode' };
  }

  // Run fraud check
  orderRecord.status = 'analyzing';

  let assessment;
  try {
    if (!dataLoader.mockDatabase) dataLoader.loadMockData();
    const metrics = dataLoader.getPincodeMetrics(pincode);
    if (!metrics) {
      // Unknown PIN — treat as medium risk, add to review
      orderRecord.status = 'held';
      orderRecord.fraudCheck = { skipped: true, reason: 'Unknown pincode' };
      addToReviewQueue({ orderId, pincode, riskScore: 0.5, rtoRate: 0.2, riskTier: 'MEDIUM', customerName, customerPhone, amount, source: 'shopify' });
      return { orderId, action: 'held', reason: 'unknown_pincode' };
    }
    assessment = consensusEngine.calculateConsensus(metrics);
    orderRecord.fraudCheck = assessment;
  } catch (err) {
    console.error(`[Shopify] Fraud check failed for ${orderId}:`, err.message);
    orderRecord.status = 'approved';
    orderRecord.fraudCheck = { error: err.message };
    return { orderId, action: 'approved', reason: 'check_failed' };
  }

  const finalRiskScore = assessment.fraudRiskScore || 0;
  const rtoRate = assessment.rtoRiskScore || 0;
  const finalRiskTier = consensusEngine.getRiskTier(finalRiskScore); // 'low'|'medium'|'high'|'critical'
  orderRecord.status = 'held';

  // Escalation logic
  const merchantPhone = process.env.DEMO_MERCHANT_PHONE || customerPhone;

  if ((finalRiskTier === 'high' || finalRiskTier === 'critical') && finalRiskScore > 0.70) {
    // IVR call
    const ivrResult = await triggerIVRCall({
      pincode,
      orderId,
      merchantPhone,
      riskScore: finalRiskScore,
      rtoRate,
    });
    orderRecord.escalationResult = { type: 'ivr', ...ivrResult };

    // Also add to manual review as backup
    addToReviewQueue({
      orderId,
      pincode,
      riskScore: finalRiskScore,
      rtoRate,
      riskTier: finalRiskTier,
      customerName,
      customerPhone,
      amount,
      source: 'shopify',
    });

  } else if (finalRiskTier === 'medium' || ((finalRiskTier === 'high' || finalRiskTier === 'critical') && finalRiskScore <= 0.70)) {
    // WhatsApp alert
    if (merchantPhone) {
      const waResult = await sendWhatsAppAlert({
        to: merchantPhone,
        orderId,
        pincode,
        riskScore: finalRiskScore,
        rtoRate,
        riskTier: finalRiskTier,
      });
      orderRecord.escalationResult = { type: 'whatsapp', ...waResult };
    }

    addToReviewQueue({
      orderId,
      pincode,
      riskScore: finalRiskScore,
      rtoRate,
      riskTier: finalRiskTier,
      customerName,
      customerPhone,
      amount,
      source: 'shopify',
    });

  } else {
    // LOW risk — approve automatically
    orderRecord.status = 'approved';
    orderRecord.escalationResult = { type: 'auto_approved' };
  }

  console.log(`[Shopify] ${orderId} → ${orderRecord.status} | Risk: ${finalRiskTier} (${(finalRiskScore * 100).toFixed(1)}%)`);

  return {
    orderId,
    action: orderRecord.status,
    riskTier: finalRiskTier,
    riskScore: finalRiskScore,
    escalation: orderRecord.escalationResult?.type,
  };
}

export function getShopifyOrders(limit = 50) {
  return Array.from(shopifyOrders.values())
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
    .slice(0, limit);
}

export function getShopifyOrder(orderId) {
  return shopifyOrders.get(orderId) || null;
}

export function updateOrderStatus(orderId, status) {
  const order = shopifyOrders.get(orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    return order;
  }
  return null;
}

// Seed demo Shopify orders
export function seedShopifyDemo() {
  const demos = [
    {
      id: 5001,
      order_number: '1001',
      total_price: '4500.00',
      currency: 'INR',
      shipping_address: { zip: '800001', name: 'Rahul Sharma', phone: '+919876543210', city: 'Patna', province: 'Bihar' },
      customer: { first_name: 'Rahul', last_name: 'Sharma', phone: '+919876543210' },
      line_items: [{ title: 'Premium Sneakers', quantity: 1, price: '4500.00' }],
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 5002,
      order_number: '1002',
      total_price: '1800.00',
      currency: 'INR',
      shipping_address: { zip: '560001', name: 'Meera Nair', phone: '+919988776655', city: 'Bengaluru', province: 'Karnataka' },
      customer: { first_name: 'Meera', last_name: 'Nair', phone: '+919988776655' },
      line_items: [{ title: 'Wireless Earbuds', quantity: 1, price: '1800.00' }],
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 5003,
      order_number: '1003',
      total_price: '3200.00',
      currency: 'INR',
      shipping_address: { zip: '226001', name: 'Vikash Yadav', phone: '+918765432109', city: 'Lucknow', province: 'Uttar Pradesh' },
      customer: { first_name: 'Vikash', last_name: 'Yadav', phone: '+918765432109' },
      line_items: [{ title: 'Smart Watch', quantity: 1, price: '3200.00' }],
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  // Process async but don't await in seed
  demos.forEach(order => {
    handleOrderCreated(order).catch(e => console.error('[Shopify] Demo seed error:', e.message));
  });

  console.log('[Shopify] Demo orders seeded');
}
