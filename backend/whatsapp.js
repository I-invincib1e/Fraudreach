import twilio from 'twilio';

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// In-memory message log
const messageLog = [];

export async function sendWhatsAppAlert({ to, orderId, pincode, riskScore, rtoRate, riskTier }) {
  const riskPct = Math.round(riskScore * 100);
  const rtoPct = Math.round(rtoRate * 100);

  const riskEmoji = riskTier === 'HIGH' ? '🔴' : riskTier === 'MEDIUM' ? '🟡' : '🟢';

  const body = `${riskEmoji} *Delivery Fraud Alert*

*Order ID:* ${orderId}
*PIN Code:* ${pincode}
*Risk Level:* ${riskTier} (${riskPct}%)
*RTO Rate:* ${rtoPct}%

Reply with:
*APPROVE* - Fulfill this order
*HOLD* - Manual review
*CANCEL* - Cancel order

_Automated alert by Delivery Fraud Agent_`;

  const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER
    ? (process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
        ? process.env.TWILIO_WHATSAPP_NUMBER
        : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`)
    : 'whatsapp:+14155238886'; // Twilio sandbox default

  const logEntry = {
    id: `WA_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    orderId,
    pincode,
    riskScore,
    riskTier,
    to: toWhatsApp,
    body,
    sentAt: new Date().toISOString(),
    status: null,
    messageSid: null,
    isMock: false,
    replies: [],
  };

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('[WhatsApp] Twilio credentials missing — mock send');
    logEntry.isMock = true;
    logEntry.status = 'mock-sent';
    logEntry.messageSid = `MOCK_${Date.now()}`;
    messageLog.push(logEntry);
    return { success: true, messageSid: logEntry.messageSid, isMock: true };
  }

  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      body,
      from: fromWhatsApp,
      to: toWhatsApp,
    });

    logEntry.messageSid = message.sid;
    logEntry.status = message.status;
    messageLog.push(logEntry);

    console.log(`[WhatsApp] Sent to ${to}: ${message.sid}`);
    return { success: true, messageSid: message.sid, isMock: false };
  } catch (err) {
    console.error('[WhatsApp] Send failed:', err.message);
    logEntry.isMock = true;
    logEntry.status = 'failed';
    logEntry.error = err.message;
    messageLog.push(logEntry);
    return { success: false, error: err.message };
  }
}

// Handle incoming WhatsApp replies
export function handleIncomingReply(from, body, messageSid) {
  const reply = body.trim().toUpperCase();
  const actions = {
    'APPROVE': 'approved',
    'HOLD': 'manual_review',
    'CANCEL': 'cancelled',
    '1': 'approved',
    '2': 'manual_review',
    '3': 'cancelled',
  };

  const action = actions[reply] || 'unknown';

  // Find matching message log by sender
  const matchingMsg = messageLog
    .filter(m => m.to.includes(from.replace('whatsapp:', '')))
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];

  if (matchingMsg) {
    matchingMsg.replies.push({
      body,
      action,
      receivedAt: new Date().toISOString(),
      messageSid,
    });
  }

  console.log(`[WhatsApp] Reply from ${from}: "${body}" → action: ${action}`);
  return { action, orderId: matchingMsg?.orderId || null };
}

export function getMessageLog() {
  return [...messageLog].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}
