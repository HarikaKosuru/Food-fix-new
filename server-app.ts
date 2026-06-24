import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

const POLICY_DOCUMENT = `
FoodFix Customer Support Policy

1. Refund Policy
Customers may be eligible for a refund if:
- The order is cancelled by the restaurant.
- The order is not delivered.
- The delivered food is spoiled, unsafe, or not edible.
- A major item is missing from the order.
- The wrong item is delivered.

Refunds are not guaranteed automatically. Final refund approval may require review by the FoodFix support team.

2. Refund Timeline
Once approved, refunds usually take 3 to 7 business days to reflect in the customer's original payment method.
Wallet refunds may reflect faster.

3. Delay Compensation Policy
If an order is delayed, the customer may be eligible for an apology coupon depending on the delay duration and order value.
A delayed order does not always mean automatic refund.
If the customer wants exact live order status, the issue should be escalated to a human agent.

4. Cancellation Policy
Customers can cancel an order before the restaurant starts preparing it.
Once preparation has started, cancellation may not be allowed.
If the order is extremely delayed, FoodFix support may review the case.

5. Coupon Policy
Only one coupon can be applied per order unless clearly mentioned in the offer.
Coupons may fail if the order does not meet minimum order value, restaurant eligibility, location eligibility, or payment method conditions.

6. Missing or Wrong Item Policy
If an item is missing or the wrong item is delivered, the customer should report it through support.
FoodFix may ask for order details or an image.
Refund or replacement depends on verification.

7. Food Quality Policy
If food is spoiled, unsafe, spilled, leaked, or packaging is damaged, the customer should upload a clear image.
FoodFix support will review the complaint.
The customer may be eligible for refund, coupon, or replacement depending on the case.

8. Human Escalation Policy
Escalate to a human agent if:
- The customer asks for a human.
- The issue needs payment verification.
- The issue needs live order tracking.
- The issue is unclear.
- The customer is very angry.
- The AI is not sure about the answer.
`;

const SUPPORT_PROMPT_TEMPLATE = `
You are FoodFix's customer support assistant.

Your job:
Answer only those customer questions that can be safely answered from the FoodFix policy document.

Use these inputs:
Chat history:
{history}

FoodFix policy document:
{policy_document}

Customer's latest message:
{user_input}

Rules:
1. If the answer is clearly available in the policy document, answer politely and briefly.
2. Do not approve refunds directly.
3. Do not promise exact refund approval, exact delivery time, or exact payment status.
4. For anything needing order ID, payment verification, live delivery tracking, restaurant confirmation, or human judgment, escalate to a human.
5. For any issue outside the policy document, escalate to a human.
6. For food quality complaints, explain the next step from policy if relevant, but do not deeply handle image analysis here.
7. Keep the tone warm, simple, and like a support agent.
8. Do not show internal reasoning.
9. Do not mention the policy document to the customer unless needed.
10. If escalating, say: "Let me connect you to a support agent who can help with this."

Return only the customer-facing reply.
`;

const IMAGE_COMPLAINT_PROMPT_TEMPLATE = `
You are FoodFix's food quality support assistant.

Your job:
Look at the uploaded food image and help the human support agent decide the next step.

Use these inputs:

Chat history:
{history}

FoodFix policy document:
{policy_document}

Customer's latest message:
{user_input}

Important rules:
1. You are not the final refund approver.
2. Do not directly say "refund approved".
3. If the image clearly shows spilled food, damaged packaging, unsafe-looking food, leakage, broken seal, or visibly wrong food condition, recommend refund review.
4. If the image is unclear, say that the case should go to a human agent.
5. If the issue cannot be verified visually, say that a human agent should review it.
6. Be supportive to the customer.
7. Create a short internal summary for the support agent.
8. Keep the customer reply simple and polite.
9. Do not expose technical reasoning.
10. Do not reject the customer's complaint harshly.

Return in this exact format:

Customer Reply:
<message to customer>

Agent Note:
<short internal note for human support agent>

Recommended Action:
<Refund review / Human review / Ask for clearer image>
`;

function formatHistory(history: any[]): string {
  if (!history || !Array.isArray(history)) {
    return "";
  }
  const formatted: string[] = [];
  for (const entry of history) {
    if (typeof entry === 'string') {
      formatted.push(entry);
    } else if (entry && typeof entry === 'object') {
      if (typeof entry.text === 'string' && typeof entry.type === 'string') {
        const sender = entry.type === 'user' ? 'Customer' : 'Agent';
        formatted.push(`${sender}: ${entry.text}`);
      } else {
        if (entry.customer) {
          formatted.push(`Customer: ${entry.customer}`);
        }
        if (entry.agent) {
          if (typeof entry.agent === 'string') {
            formatted.push(`Agent: ${entry.agent}`);
          } else if (typeof entry.agent === 'object') {
            const reply = entry.agent.customer_reply || entry.agent.text;
            if (reply) {
              formatted.push(`Agent: ${reply}`);
            }
          }
        }
      }
    }
  }
  return formatted.slice(-6).join("\n");
}

function parseImageResponse(text: string) {
  const customerReplyRegex = /Customer Reply:\s*([\s\S]*?)(?=Agent Note:|$)/i;
  const agentNoteRegex = /Agent Note:\s*([\s\S]*?)(?=Recommended Action:|$)/i;
  const recommendedActionRegex = /Recommended Action:\s*([\s\S]*)/i;

  const customerReplyMatch = text.match(customerReplyRegex);
  const agentNoteMatch = text.match(agentNoteRegex);
  const recommendedActionMatch = text.match(recommendedActionRegex);

  const customer_reply = customerReplyMatch ? customerReplyMatch[1].trim() : text;
  const agent_note = agentNoteMatch ? agentNoteMatch[1].trim() : "Review required.";
  const recommended_action = recommendedActionMatch ? recommendedActionMatch[1].trim() : "Human review";

  return { customer_reply, agent_note, recommended_action };
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  });
});

app.post("/api/text-query", async (req, res) => {
  try {
    const { customer_query, history } = req.body;
    const historyStr = formatHistory(history);

    const promptText = SUPPORT_PROMPT_TEMPLATE
        .replace("{history}", historyStr)
        .replace("{policy_document}", POLICY_DOCUMENT)
        .replace("{user_input}", customer_query);

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    customer_reply: { type: Type.STRING },
                    image_needed: { type: Type.BOOLEAN },
                    is_escalated: { type: Type.BOOLEAN }
                },
                required: ["customer_reply", "image_needed", "is_escalated"]
            }
        }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      customer_reply: "Let me connect you to a support agent who can help with this.",
      image_needed: false,
      is_escalated: true,
      error: err.message
    });
  }
});

app.post("/api/image-query", async (req, res) => {
  try {
    const { customer_query, history, image_base64, mime_type } = req.body;
    const historyStr = formatHistory(history);

    const promptText = IMAGE_COMPLAINT_PROMPT_TEMPLATE
        .replace("{history}", historyStr)
        .replace("{policy_document}", POLICY_DOCUMENT)
        .replace("{user_input}", customer_query || "Food quality complaint with uploaded image");

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
            { text: promptText },
            { inlineData: { data: image_base64, mimeType: mime_type } }
        ]
    });

    const parsed = parseImageResponse(response.text || "");
    res.json({
        ...parsed,
        raw: response.text
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      customer_reply: "Let me connect you to a support agent who can analyze this photo and help you.",
      agent_note: "Image processing encountered an error: " + err.message,
      recommended_action: "Human review",
      error: err.message
    });
  }
});

export default app;
