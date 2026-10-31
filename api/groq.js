/**
 * Vercel Serverless Function for the Groq API proxy.
 * Path: /api/groq
 *
 * Keeps the API key on the server and speaks Groq's current
 * Chat Completions API (POST /openai/v1/chat/completions).
 */

import { handleGroqChat } from '../server/groqChat.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await handleGroqChat({
      method: req.method,
      body: req.body,
      env: process.env,
    });
    return res.status(result.status).json(result.json);
  } catch (error) {
    console.error('Serverless function error:', error?.message || error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'The analysis service hit an unexpected error. Please try again.',
    });
  }
}
