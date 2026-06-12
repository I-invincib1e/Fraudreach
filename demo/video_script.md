# Demo Video Script (90 seconds)
**Project:** Delivery Fraud Agent  
**Hackathon:** FAR AWAY 2026  

---

**[0:00 - 0:10] Introduction & Problem (Visual: Slide 1 - The Problem)**
*Speaker:* "Hi, I'm presenting the Delivery Fraud Agent. In Indian logistics, return-to-origin rates in tier-2 cities can hit 40%, costing millions. Worse, a fraudster blocked on Delhivery can just place a bad order using Ekart. The data is completely siloed."

**[0:10 - 0:25] The Solution (Visual: Landing Page → Dashboard)**
*Speaker:* "Our solution is a real-time AI middleware. When a customer places an order, the agent instantly queries the three largest logistics providers, taking their individual fraud metrics and running them through a weighted consensus engine."

**[0:25 - 0:45] Live Demo: UI & Risk Engine (Visual: PIN Search and High Risk Map)**
*Speaker (navigating the UI):* "Here's our live dashboard. If we search a low-risk PIN like Bengaluru 560001, we get a 14% fraud score. It’s auto-approved. But let's look at Patna 800001. The consensus score spikes to 75%. All three sources agree the return-to-origin risk is critical."

**[0:45 - 1:05] Live Demo: Automations (Visual: Shopify Orders Tab & Twilio IVR simulation)**
*Speaker:* "We don't just display data; we act on it. Watch what happens when a Shopify order hits this high-risk PIN. The agent intercepts the webhook and automatically triggers a Twilio IVR call to the customer, asking them to verify their address via DTMF keypress. If the risk is slightly lower, it sends an interactive WhatsApp alert instead."

**[1:05 - 1:15] Manual Review (Visual: Manual Review Tab)**
*Speaker:* "And if the sources heavily disagree? The AI doesn't guess. It flags the order into a sleek manual review queue for human intervention, preventing false positives."

**[1:15 - 1:30] Outro & Impact (Visual: Slide 5 - Results)**
*Speaker:* "By combining multi-source consensus with automated Twilio interventions, we achieve 92% accuracy and halve the false-positive rate. This is the Delivery Fraud Agent. Thank you for watching!"
