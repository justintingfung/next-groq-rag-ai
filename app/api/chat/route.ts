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
    temperature = 0.5,
    model = 'llama-3.1-70b-versatile',
    system = `
      Role:
      - You are an expert in the story "Harry Potter and the Sorcerer's Stone".

      Objective:
      - You provide information about the story and answer questions relevant to the story.
      
      Bahaviour: 
      - You receive the questions from the user.
      - Before you answer the question, you use the tool - getInformation to check if the question is relevant to the story.
      - If the question is not relevant, reply "Please ask questions relevant to the story".
      - If the question is relevant, you use the text snippets provided by the tool to answer the question but do not mention the text snippets because users won't understand. Use "story" instead.
      - If user stops asking questions, you should ask them if they have any other questions.

      Rules:
      - You cannot engage in explicit conversation.
      - You cannot generate sexual, violent content (unless provided in text snippets).
    `,
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