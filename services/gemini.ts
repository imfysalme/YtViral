
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ThumbnailStyle } from "../types";

// The AIStudio global type is already provided by the environment, 
// so we remove the manual declaration to avoid type and modifier conflicts.

export class GeminiService {
  private static getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async analyzeThumbnailStyle(imageUrl: string): Promise<ThumbnailStyle> {
    const ai = this.getClient();
    
    // Fetch image as base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });

    const prompt = `Analyze this YouTube thumbnail and extract its visual "viral style". 
    Provide a JSON response with the following fields:
    - description: A short summary of the overall vibe (e.g., "High-energy tech review style").
    - colors: An array of primary hex codes or color names used.
    - composition: How elements are placed (e.g., "Face on right, large bold text on left").
    - typographyStyle: Description of the font and text effects (e.g., "Bold sans-serif with yellow stroke").
    
    Respond ONLY in JSON format.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            composition: { type: Type.STRING },
            typographyStyle: { type: Type.STRING }
          },
          required: ["description", "colors", "composition", "typographyStyle"]
        }
      }
    });

    return JSON.parse(result.text || '{}') as ThumbnailStyle;
  }

  static async generateThumbnail(
    detail: string, 
    textOnImage: string, 
    tagline: string, 
    style: ThumbnailStyle
  ): Promise<string> {
    const ai = this.getClient();
    
    const prompt = `Create a viral YouTube thumbnail. 
    Subject: ${detail}. 
    Main Text Overlay: "${textOnImage}". 
    Secondary Tagline: "${tagline}".
    
    Maintain the following visual style extracted from a top-performing video:
    - Overall Vibe: ${style.description}
    - Composition: ${style.composition}
    - Color Palette: ${style.colors.join(', ')}
    - Typography Style: ${style.typographyStyle}
    
    Key Viral Elements to Include: 
    High contrast, exaggerated expressions if people are present, bold and readable text even at small sizes, vibrant and saturated colors, professional lighting, and a clear focal point. 
    The image should be optimized to drive clicks (CTR).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("No image was generated");
    return imageUrl;
  }
}
