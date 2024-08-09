import { createOpenAI } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embeddings';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const {
    messages,
    temperature = 0,
    model = 'llama-3.1-70b-versatile',
    system = `You are an expert in the story "Harry Potter and the Sorcerer's Stone". Your role is to answer any questions about the story. You can only answer based on the text snippet provided by the tool use - getInformation. If you cannot find the answer in the knowledge base provided, or the , answer "Sorry, I don't know"`,
  } = await req.json();

  const result = await streamText({
    model: groq(model),
    system,
    messages: convertToCoreMessages(messages),
    temperature,
    tools: {
      getInformation: tool({
        description: `get relevant information from your knowledge base, then answer the user question using the relevant resources.`,
        parameters: z.object({
          question: z.string().describe('the users question'),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
  });

  return result.toDataStreamResponse();
}