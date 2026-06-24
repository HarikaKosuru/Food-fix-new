import { ai, POLICY_DOCUMENT, IMAGE_COMPLAINT_PROMPT_TEMPLATE, formatHistory, parseImageResponse } from './_shared';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(451).json({ error: 'Method not allowed' });
  }

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
    return res.status(200).json({
        ...parsed,
        raw: response.text
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      customer_reply: "Let me connect you to a support agent who can analyze this photo and help you.",
      agent_note: "Image processing encountered an error: " + err.message,
      recommended_action: "Human review",
      error: err.message
    });
  }
}
