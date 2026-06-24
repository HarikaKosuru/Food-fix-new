import express from "express";
import { Type } from "@google/genai";
import {
  ai,
  POLICY_DOCUMENT,
  SUPPORT_PROMPT_TEMPLATE,
  IMAGE_COMPLAINT_PROMPT_TEMPLATE,
  formatHistory,
  parseImageResponse
} from "./api/_shared";

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
