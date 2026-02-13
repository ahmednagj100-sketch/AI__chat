import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { DEFAULT_MODEL, INITIAL_SYSTEM_INSTRUCTION } from "../constants";

// Ensure API key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: DEFAULT_MODEL,
    config: {
      systemInstruction: INITIAL_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for faster standard chat
    },
  });
};

/**
 * Sends a message to the chat session and yields chunks of text as they stream in.
 */
export async function* sendMessageStream(
  chat: Chat,
  message: string
): AsyncGenerator<string, void, unknown> {
  try {
    const result = await chat.sendMessageStream({ message });
    
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error) {
    console.error("Error in stream:", error);
    throw error;
  }
}