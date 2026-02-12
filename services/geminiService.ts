
import { GoogleGenAI, Type } from "@google/genai";
import { LoveNote } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateLoveNote(photos: string[]): Promise<LoveNote> {
  // We use the first captured photo to "analyze" the vibe
  const firstPhotoBase64 = photos[0].split(',')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: firstPhotoBase64,
            },
          },
          {
            text: "Analyze the vibes of the people in this photo for a Valentine's photobooth. Generate a short, cute, sweet, and poetic message (max 2 sentences). Also assign a symbolic 'Aura Color' name and a fun 'Love Compatibility' score (1-100) if there are multiple people, or a 'Self-Love' score if there is one. Return as JSON.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING },
          auraColor: { type: Type.STRING },
          compatibilityScore: { type: Type.NUMBER },
        },
        required: ["message", "auraColor", "compatibilityScore"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text);
    return result as LoveNote;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      message: "You radiate love and joy!",
      auraColor: "Rose Quartz",
      compatibilityScore: 100
    };
  }
}
