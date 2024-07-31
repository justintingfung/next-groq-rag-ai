// import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';

import { pipeline } from '@xenova/transformers'

const generateVector = await pipeline('feature-extraction', 'Supabase/gte-small')

// const embeddingModel = openai.embedding('text-embedding-ada-002');

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const embeddingModel = groq.embedding('text-embedding-ada-002');


// Split string into sentences to create chunk
const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .filter(i => i !== '');
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  // console.log('generateEmbeddings::chunks', chunks)
  // const { embeddings } = await embedMany({
  //   model: embeddingModel,
  //   values: chunks,
  // });

  const embeddings = await Promise.all(chunks.map(chunk => generateEmbedding(chunk)));
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  // const { embedding } = await embed({
  //   model: embeddingModel,
  //   value: input,
  // });

  // Generate a vector using Transformers.js
  const output = await generateVector(input, {
    pooling: 'mean',
    normalize: true,
  });

  // Extract the embedding output
  const embedding = Array.from(output.data);
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  console.log('findRelevantContent::userQuery', userQuery)
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded,
  )})`;
  console.log('findRelevantContent::similarity', similarity)
  const similarGuides = await db
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy(t => desc(t.similarity))
    .limit(4);
  console.log('findRelevantContent::similarGuides', similarGuides)
  return similarGuides;
};
