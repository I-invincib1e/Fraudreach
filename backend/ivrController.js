import twilio from 'twilio';
import { getRiskAssessment } from './riskEngine.js';

// Lazy-initialize Twilio client — only created when real keys are present
function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const VoiceResponse = twilio.twiml.VoiceResponse;

// In-memory call log
const callLog = new Map();

export async function triggerIVRCall({ pincode, orderId, merchantPhone, riskScore, rtoRate }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[IVR] Twilio credentials missing — returning mock IVR response');
    const mockCallSid = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    callLog.set(mockCallSid, {
      callSid: mockCallSid,
      orderId,
      pincode,
      riskScore,
      rtoRate,
      merchantPhone,
      status: 'mock-initiated',
      isMock: true,
      initiatedAt: new Date().toISOString(),
    });
    return { success: true, callSid: mockCallSid, isMock: true };
  }

  const webhookBase = process.env.WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const twimlUrl = `${webhookBase}/api/ivr/twiml?orderId=${encodeURIComponent(orderId)}&pincode=${encodeURIComponent(pincode)}&riskScore=${riskScore}&rtoRate=${rtoRate}`;

  try {
    const client = getTwilioClient();
    const call = await client.calls.create({
      to: merchantPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: twimlUrl,
      statusCallback: `${webhookBase}/api/ivr/status`,
      statusCallbackMethod: 'POST',
      timeout: 30,
    });

    callLog.set(call.sid, {
      callSid: call.sid,
      orderId,
      pincode,
      riskScore,
      rtoRate,
      merchantPhone,
      status: call.status,
      isMock: false,
      initiatedAt: new Date().toISOString(),
    });

    console.log(`[IVR] Call initiated: ${call.sid} → ${merchantPhone}`);
    return { success: true, callSid: call.sid, isMock: false };
  } catch (err) {
    console.error('[IVR] Twilio call failed:', err.message);
    return { success: false, error: err.message };
  }
}

// TwiML generator — what the merchant hears
export function generateTwiML(orderId, pincode, riskScore, rtoRate) {
  const twiml = new VoiceResponse();
  const riskPct = Math.round(riskScore * 100);
  const rtoPct = Math.round(rtoRate * 100);

  twiml.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    `Hello, this is an automated alert from your delivery fraud monitoring system.`
  );

  twiml.pause({ length: 1 });

  twiml.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    `Order ${orderId.split('').join(' ')} is flagged for delivery to PIN code ${pincode.split('').join(' ')}.`
  );

  twiml.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    `Fraud risk is ${riskPct} percent. Return to origin rate is ${rtoPct} percent.`
  );

  twiml.pause({ length: 1 });

  const gather = twiml.gather({
    numDigits: 1,
    action: `/api/ivr/dtmf?orderId=${encodeURIComponent(orderId)}`,
    method: 'POST',
    timeout: 10,
  });

  gather.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    `Press 1 to approve and fulfill this order. Press 2 to hold for manual review. Press 3 to cancel this order.`
  );

  // No input fallback
  twiml.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    `No input received. Order has been placed on hold for manual review. Goodbye.`
  );

  twiml.hangup();

  return twiml.toString();
}

// Handle DTMF input from merchant
export function handleDTMF(orderId, digit) {
  const actions = {
    '1': { action: 'approved', message: 'Order approved and queued for fulfillment.' },
    '2': { action: 'manual_review', message: 'Order placed in manual review queue.' },
    '3': { action: 'cancelled', message: 'Order cancelled due to fraud risk.' },
  };

  const result = actions[digit] || { action: 'manual_review', message: 'Invalid input. Order placed in manual review.' };

  // Update call log with merchant decision
  for (const [sid, log] of callLog.entries()) {
    if (log.orderId === orderId) {
      log.merchantDecision = result.action;
      log.decisionAt = new Date().toISOString();
      log.dtmfDigit = digit;
      break;
    }
  }

  console.log(`[IVR] DTMF for order ${orderId}: digit=${digit} → ${result.action}`);

  const twiml = new VoiceResponse();
  twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, result.message + ' Goodbye.');
  twiml.hangup();

  return { twiml: twiml.toString(), action: result.action };
}

// Update call status from Twilio webhook
export function updateCallStatus(callSid, status) {
  if (callLog.has(callSid)) {
    const log = callLog.get(callSid);
    log.status = status;
    log.updatedAt = new Date().toISOString();
    console.log(`[IVR] Call ${callSid} status → ${status}`);
  }
}

export function getCallLog() {
  return Array.from(callLog.values()).sort((a, b) =>
    new Date(b.initiatedAt) - new Date(a.initiatedAt)
  );
}

export function getCallByOrderId(orderId) {
  for (const log of callLog.values()) {
    if (log.orderId === orderId) return log;
  }
  return null;
}
