import { GoogleGenAI } from "@google/genai";
import { type FileEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeImage(file: File): Promise<FileEntry['aiMetadata']> {
  if (!file.type.startsWith('image/')) return undefined;

  try {
    const base64Data = await fileToBase64(file);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Analyze this image for a file organizer app. Provide a brief description, a list of relevant keywords, and any text visible in the image. Return as JSON with keys: description (string), keywords (array of strings), extractedText (string)."
            },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      description: result.description || '',
      keywords: result.keywords || [],
      extractedText: result.extractedText || ''
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      description: '',
      keywords: [],
      extractedText: ''
    };
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
}
