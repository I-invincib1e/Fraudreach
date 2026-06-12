/**
 * Delivery Fraud Agent — Express Server
 * Days 1-4: Consensus API + IVR + WhatsApp + Manual Review + Shopify
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import { consensusEngine } from './consensus-engine.js';
import { dataLoader } from './data-loader.js';
import { triggerIVRCall, generateTwiML, handleDTMF, updateCallStatus, getCallLog, getCallByOrderId } from './ivrController.js';
import { sendWhatsAppAlert, handleIncomingReply, getMessageLog } from './whatsapp.js';
import { addToReviewQueue, resolveReview, getQueue, getReview, getQueueStats, seedDemoData } from './manual-review.js';
import { verifyShopifyWebhook, handleOrderCreated, getShopifyOrders, getShopifyOrder, updateOrderStatus, seedShopifyDemo } from './shopify-webhook.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(bodyParser.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(bodyParser.urlencoded({ extended: true }));

// ===== INIT =====
dataLoader.loadMockData();

// Seed demo data for hackathon
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    seedDemoData();
    seedShopifyDemo();
  }, 1000);
}

// ===== HEALTH =====
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pincodesLoaded: Object.keys(dataLoader.mockDatabase || {}).length,
    services: {
      consensusEngine: 'active',
      ivrController: process.env.TWILIO_ACCOUNT_SID ? 'live' : 'mock',
      whatsapp: process.env.TWILIO_ACCOUNT_SID ? 'live' : 'mock',
      shopify: 'active',
    }
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ===== PINCODE: METRICS =====
app.get('/api/pincode/:pinCode/metrics', (req, res) => {
  try {
    const { pinCode } = req.params;
    const metrics = dataLoader.getPincodeMetrics(pinCode);
    if (!metrics) return res.status(404).json({ error: `PIN ${pinCode} not found`, pinCode });
    const raw = dataLoader.mockDatabase[pinCode];
    res.json({ pinCode, region: raw.region, city: raw.city, state: raw.state, tier: raw.tier, metrics });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== PINCODE: CONSENSUS =====
app.get('/api/pincode/:pinCode/consensus', (req, res) => {
  try {
    const { pinCode } = req.params;
    const metrics = dataLoader.getPincodeMetrics(pinCode);
    if (!metrics) return res.status(404).json({ error: `PIN ${pinCode} not found`, pinCode });
    const consensus = consensusEngine.calculateConsensus(metrics);
    const riskTier = consensusEngine.getRiskTier(consensus.fraudRiskScore);
    const raw = dataLoader.mockDatabase[pinCode];

    // Build top-level keyed sources map for frontend compatibility
    const sourcesMap = {};
    if (consensus.sources && Array.isArray(consensus.sources)) {
      consensus.sources.forEach(s => { sourcesMap[s.partner] = s; });
    } else {
      // Fallback: expose raw metrics as sources
      ['delhivery', 'ekart', 'shiprocket'].forEach(p => {
        if (metrics[p]) sourcesMap[p] = { ...metrics[p], partner: p };
      });
    }

    res.json({
      pinCode,
      pincode: pinCode, // alias for frontend compatibility
      region: raw?.region, city: raw?.city, state: raw?.state,
      sources: sourcesMap, // top-level keyed sources
      consensus: { ...consensus, riskTier },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pincode/:pinCode/consensus', (req, res) => {
  try {
    const { pinCode } = req.params;
    const { delhivery, ekart, shiprocket } = req.body;
    if (!delhivery || !ekart || !shiprocket) {
      return res.status(400).json({ error: 'Body must include delhivery, ekart, shiprocket' });
    }
    const consensus = consensusEngine.calculateConsensus({ delhivery, ekart, shiprocket });
    res.json({ pinCode, consensus: { ...consensus, riskTier: consensusEngine.getRiskTier(consensus.fraudRiskScore) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== PINCODE: LIST =====
app.get('/api/pincodes/all', (req, res) => {
  try {
    if (!dataLoader.mockDatabase) dataLoader.loadMockData();
    const all = Object.entries(dataLoader.mockDatabase);
    const pincodes = all.map(([pincode, raw]) => {
      const metrics = { delhivery: raw.delhivery, ekart: raw.ekart, shiprocket: raw.shiprocket };
      const consensus = consensusEngine.calculateConsensus(metrics);
      return {
        pincode,
        city: raw.city,
        state: raw.state,
        region: raw.region,
        tier: raw.tier,
        consensus,
        fraudRiskScore: consensus.fraudRiskScore,
        riskTier: consensusEngine.getRiskTier(consensus.fraudRiskScore),
      };
    });
    pincodes.sort((a, b) => b.fraudRiskScore - a.fraudRiskScore);
    res.json(pincodes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pincodes/high-risk', (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.55;
    // Dynamic: compute consensus for all and filter
    if (!dataLoader.mockDatabase) dataLoader.loadMockData();
    const all = Object.entries(dataLoader.mockDatabase);
    const highRisk = [];

    for (const [pincode, raw] of all) {
      const metrics = { delhivery: raw.delhivery, ekart: raw.ekart, shiprocket: raw.shiprocket };
      const consensus = consensusEngine.calculateConsensus(metrics);
      const riskTier = consensusEngine.getRiskTier(consensus.fraudRiskScore);
      if (consensus.fraudRiskScore >= threshold) {
        highRisk.push({
          pincode,
          city: raw.city, state: raw.state, region: raw.region,
          fraudRiskScore: consensus.fraudRiskScore,
          rtoRiskScore: consensus.rtoRiskScore,
          riskTier,
          recommendation: consensus.recommendation,
          ivrTrigger: consensus.ivrTrigger,
        });
      }
    }

    highRisk.sort((a, b) => b.fraudRiskScore - a.fraudRiskScore);
    res.json({ total: highRisk.length, threshold, pincodes: highRisk });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pincodes/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query param "q" required' });
    const results = dataLoader.searchPincodes(q);
    res.json({ query: q, total: results.length, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/metadata', (req, res) => {
  try { res.json(dataLoader.getMetadata()); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== ORDER VERIFY (Core flow) =====
app.post('/api/order/verify', async (req, res) => {
  try {
    const { orderId, pinCode, customerPhone, customerName, amount } = req.body;
    if (!pinCode) return res.status(400).json({ error: 'pinCode required' });

    const metrics = dataLoader.getPincodeMetrics(pinCode);
    if (!metrics) return res.status(404).json({ error: `PIN ${pinCode} not found` });

    const consensus = consensusEngine.calculateConsensus(metrics);
    const riskTier = consensusEngine.getRiskTier(consensus.fraudRiskScore);

    let escalation = null;
    const merchantPhone = process.env.DEMO_MERCHANT_PHONE || customerPhone;

    if (consensus.ivrTrigger && merchantPhone) {
      const ivrResult = await triggerIVRCall({
        pincode: pinCode, orderId, merchantPhone,
        riskScore: consensus.fraudRiskScore, rtoRate: consensus.rtoRiskScore,
      });
      escalation = { type: 'ivr', ...ivrResult };
      addToReviewQueue({ orderId, pincode: pinCode, riskScore: consensus.fraudRiskScore, rtoRate: consensus.rtoRiskScore, riskTier, customerName, customerPhone, amount, source: 'api' });
    } else if (consensus.whatsappAlert && merchantPhone) {
      const waResult = await sendWhatsAppAlert({
        to: merchantPhone, orderId, pincode: pinCode,
        riskScore: consensus.fraudRiskScore, rtoRate: consensus.rtoRiskScore, riskTier,
      });
      escalation = { type: 'whatsapp', ...waResult };
      addToReviewQueue({ orderId, pincode: pinCode, riskScore: consensus.fraudRiskScore, rtoRate: consensus.rtoRiskScore, riskTier, customerName, customerPhone, amount, source: 'api' });
    } else if (consensus.manualReview) {
      addToReviewQueue({ orderId, pincode: pinCode, riskScore: consensus.fraudRiskScore, rtoRate: consensus.rtoRiskScore, riskTier, customerName, customerPhone, amount, source: 'api' });
      escalation = { type: 'manual_review' };
    }

    res.json({
      orderId, pinCode, fraudRiskScore: consensus.fraudRiskScore,
      rtoRiskScore: consensus.rtoRiskScore, riskTier,
      recommendation: consensus.recommendation,
      sourceAgreement: consensus.sourceAgreement,
      escalation,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== IVR ROUTES =====

// TwiML response (called by Twilio when merchant picks up)
app.post('/api/ivr/twiml', (req, res) => {
  const { orderId, pincode, riskScore, rtoRate } = req.query;
  const twiml = generateTwiML(orderId, pincode, parseFloat(riskScore), parseFloat(rtoRate));
  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

app.get('/api/ivr/twiml', (req, res) => {
  const { orderId, pincode, riskScore, rtoRate } = req.query;
  const twiml = generateTwiML(orderId, pincode, parseFloat(riskScore || 0), parseFloat(rtoRate || 0));
  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

// DTMF callback
app.post('/api/ivr/dtmf', (req, res) => {
  const { orderId } = req.query;
  const digit = req.body.Digits;
  const { twiml, action } = handleDTMF(orderId, digit);

  // Update manual review queue if applicable
  if (action === 'manual_review') {
    addToReviewQueue({ orderId, pincode: 'unknown', riskScore: 0, rtoRate: 0, riskTier: 'unknown', source: 'ivr_no_input' });
  }

  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

// Call status updates from Twilio
app.post('/api/ivr/status', (req, res) => {
  const { CallSid, CallStatus } = req.body;
  if (CallSid && CallStatus) updateCallStatus(CallSid, CallStatus);
  res.sendStatus(200);
});

// Get call log
app.get('/api/ivr/calls', (req, res) => {
  res.json({ calls: getCallLog() });
});

// Manually trigger IVR (for demo/testing)
app.post('/api/ivr/trigger', async (req, res) => {
  try {
    const { orderId, pincode, merchantPhone, riskScore, rtoRate } = req.body;
    if (!orderId || !pincode || !merchantPhone) {
      return res.status(400).json({ error: 'orderId, pincode, merchantPhone required' });
    }
    const result = await triggerIVRCall({ pincode, orderId, merchantPhone, riskScore: riskScore || 0.8, rtoRate: rtoRate || 0.3 });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== WHATSAPP ROUTES =====

// Send WhatsApp alert (manual trigger / demo)
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, orderId, pincode, riskScore, rtoRate, riskTier } = req.body;
    if (!to || !orderId) return res.status(400).json({ error: 'to, orderId required' });
    const result = await sendWhatsAppAlert({ to, orderId, pincode, riskScore, rtoRate, riskTier: riskTier || 'medium' });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Incoming WhatsApp reply webhook (Twilio sends here)
app.post('/api/whatsapp/webhook', (req, res) => {
  const { From, Body, MessageSid } = req.body;
  const result = handleIncomingReply(From, Body, MessageSid);

  // Update manual review queue if merchant responded
  if (result.orderId && result.action !== 'unknown') {
    const queue = getQueue('pending');
    const entry = queue.find(e => e.orderId === result.orderId);
    if (entry) {
      resolveReview(entry.reviewId, { action: result.action === 'approved' ? 'approved' : result.action === 'cancelled' ? 'cancelled' : 'escalated', resolvedBy: 'whatsapp_reply' });
    }
  }

  // Twilio expects TwiML response for WhatsApp webhooks (even if empty)
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

// Get WhatsApp message log
app.get('/api/whatsapp/messages', (req, res) => {
  res.json({ messages: getMessageLog() });
});

// ===== MANUAL REVIEW ROUTES =====

app.get('/api/manual-review', (req, res) => {
  const filter = req.query.status || 'pending';
  res.json({
    stats: getQueueStats(),
    queue: getQueue(filter),
    filter,
  });
});

app.get('/api/manual-review/stats', (req, res) => {
  res.json(getQueueStats());
});

app.get('/api/manual-review/:reviewId', (req, res) => {
  const review = getReview(req.params.reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json(review);
});

app.post('/api/manual-review/:reviewId/resolve', (req, res) => {
  try {
    const { action, resolvedBy, notes } = req.body;
    const result = resolveReview(req.params.reviewId, { action, resolvedBy, notes });
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add to review manually
app.post('/api/manual-review/add', (req, res) => {
  try {
    const entry = addToReviewQueue(req.body);
    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SHOPIFY ROUTES =====

// Shopify orders/create webhook
app.post('/api/shopify/webhooks/orders/created', async (req, res) => {
  // Verify HMAC signature
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (secret && !verifyShopifyWebhook(req.rawBody, hmac, secret)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  res.status(200).json({ received: true }); // Acknowledge immediately

  // Process async
  handleOrderCreated(req.body).catch(err => {
    console.error('[Shopify] Webhook processing error:', err.message);
  });
});

// Get all Shopify orders (for dashboard)
app.get('/api/shopify/orders', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ orders: getShopifyOrders(limit), total: getShopifyOrders(limit).length });
});

app.get('/api/shopify/orders/:orderId', (req, res) => {
  const order = getShopifyOrder(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.patch('/api/shopify/orders/:orderId/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['received', 'analyzing', 'approved', 'held', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: `Status must be: ${validStatuses.join(', ')}` });
  const order = updateOrderStatus(req.params.orderId, status);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Simulate a Shopify order (for demo)
app.post('/api/shopify/simulate-order', async (req, res) => {
  try {
    const { pincode, amount, customerName, customerPhone } = req.body;
    const mockOrder = {
      id: Date.now(),
      order_number: Math.floor(Math.random() * 9000) + 1000,
      total_price: String(amount || 2500),
      currency: 'INR',
      shipping_address: {
        zip: pincode || '400001',
        name: customerName || 'Demo Customer',
        phone: customerPhone || '+919999999999',
        city: 'Demo City',
        province: 'Demo State',
      },
      customer: {
        first_name: (customerName || 'Demo').split(' ')[0],
        last_name: (customerName || 'Demo Customer').split(' ').slice(1).join(' ') || 'Customer',
        phone: customerPhone || '+919999999999',
      },
      line_items: [{ title: 'Demo Product', quantity: 1, price: String(amount || 2500) }],
      created_at: new Date().toISOString(),
    };

    const result = await handleOrderCreated(mockOrder);
    res.json({ simulated: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== BATCH =====
app.post('/api/batch/consensus', (req, res) => {
  try {
    const { pinCodes } = req.body;
    if (!Array.isArray(pinCodes)) return res.status(400).json({ error: 'pinCodes must be array' });
    const results = {};
    for (const pin of pinCodes) {
      const metrics = dataLoader.getPincodeMetrics(pin);
      if (metrics) {
        const c = consensusEngine.calculateConsensus(metrics);
        results[pin] = { ...c, riskTier: consensusEngine.getRiskTier(c.fraudRiskScore) };
      } else {
        results[pin] = { error: 'PIN not found' };
      }
    }
    res.json({ total: pinCodes.length, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== DASHBOARD SUMMARY (for frontend) =====
app.get('/api/dashboard/summary', (req, res) => {
  try {
    if (!dataLoader.mockDatabase) dataLoader.loadMockData();
    const allPins = Object.entries(dataLoader.mockDatabase);
    let highRiskCount = 0, mediumRiskCount = 0, lowRiskCount = 0, criticalCount = 0;

    for (const [, raw] of allPins) {
      const metrics = { delhivery: raw.delhivery, ekart: raw.ekart, shiprocket: raw.shiprocket };
      const c = consensusEngine.calculateConsensus(metrics);
      const tier = consensusEngine.getRiskTier(c.fraudRiskScore);
      if (tier === 'critical') criticalCount++;
      else if (tier === 'high') highRiskCount++;
      else if (tier === 'medium') mediumRiskCount++;
      else lowRiskCount++;
    }

    const reviewStats = getQueueStats();
    const shopifyOrders = getShopifyOrders(100);
    const ivrCalls = getCallLog();
    const waMessages = getMessageLog();

    res.json({
      pincodes: {
        total: allPins.length,
        critical: criticalCount,
        high: highRiskCount,
        medium: mediumRiskCount,
        low: lowRiskCount,
      },
      manualReview: reviewStats,
      shopify: {
        total: shopifyOrders.length,
        held: shopifyOrders.filter(o => o.status === 'held').length,
        approved: shopifyOrders.filter(o => o.status === 'approved').length,
        cancelled: shopifyOrders.filter(o => o.status === 'cancelled').length,
      },
      ivr: {
        total: ivrCalls.length,
        live: ivrCalls.filter(c => c.status === 'in-progress').length,
        mock: ivrCalls.filter(c => c.isMock).length,
      },
      whatsapp: {
        total: waMessages.length,
        pending: waMessages.filter(m => !m.replies?.length).length,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SERVE FRONTEND =====
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  const indexFile = path.join(frontendDist, 'index.html');
  import('fs').then(fs => {
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.send(`<!DOCTYPE html><html><body style="background:#0f1419;color:#e6edf3;font-family:monospace;padding:2rem">
        <h1>🚚 Delivery Fraud Agent API</h1>
        <p>Backend running. Frontend build not found.</p>
        <p><a href="/health" style="color:#58a6ff">/health</a> &nbsp;
        <a href="/api/pincodes/high-risk" style="color:#58a6ff">/api/pincodes/high-risk</a> &nbsp;
        <a href="/api/dashboard/summary" style="color:#58a6ff">/api/dashboard/summary</a></p>
      </body></html>`);
    }
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV !== 'production' ? err.message : undefined });
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚚 Delivery Fraud Agent  —  Days 1-4 Complete              ║
╠══════════════════════════════════════════════════════════════╣
║  API:  http://localhost:${PORT}                                ║
║  IVR:  ${process.env.TWILIO_ACCOUNT_SID ? 'LIVE (Twilio)' : 'MOCK MODE'}                               ║
╚══════════════════════════════════════════════════════════════╝

  Core:      GET  /api/pincode/:pin/consensus
  High Risk: GET  /api/pincodes/high-risk
  Summary:   GET  /api/dashboard/summary
  Order:     POST /api/order/verify
  IVR:       POST /api/ivr/trigger
  WhatsApp:  POST /api/whatsapp/send
  Review:    GET  /api/manual-review
  Shopify:   POST /api/shopify/simulate-order
`);
});

export default app;
