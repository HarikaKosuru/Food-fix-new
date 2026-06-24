import { Type } from "@google/genai";
import { getGeminiClient, POLICY_DOCUMENT, SUPPORT_PROMPT_TEMPLATE, formatHistory } from './_shared';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(451).json({ error: 'Method not allowed' });
  }

  try {
    const { customer_query, history } = req.body;
    const historyStr = formatHistory(history);

    const promptText = SUPPORT_PROMPT_TEMPLATE
        .replace("{history}", historyStr)
        .replace("{policy_document}", POLICY_DOCUMENT)
        .replace("{user_input}", customer_query);

    const response = await getGeminiClient().models.generateContent({
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
    return res.status(200).json(data);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      customer_reply: "Let me connect you to a support agent who can help with this.",
      image_needed: false,
      is_escalated: true,
      error: err.message
    });
  }
}
