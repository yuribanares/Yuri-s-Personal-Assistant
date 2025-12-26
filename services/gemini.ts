import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const SYSTEM_INSTRUCTION = "You are a helpful, concise voice assistant. You are an expert in Python programming. Keep your spoken responses relatively short and conversational, but you can provide detailed Python code blocks in the chat interface when asked.";

export const generateGeminiResponse = async (
  history: Message[],
  userPrompt: string
): Promise<string> => {
  try {
    // API Key must be obtained from process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We will use the chat model to maintain context easily
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      })),
    });

    const result = await chat.sendMessage({ message: userPrompt });
    return result.text || "I'm sorry, I didn't catch that.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Error: ${error.message || "Something went wrong."}`;
  }
};
