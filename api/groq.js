/**
 * Vercel Serverless Function for Groq API Proxy
 * Path: /api/groq.js
 * 
 * This proxies requests to Groq API to avoid CORS issues
 * and keeps API keys secure on the server side.
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, temperature, max_tokens, api_key_index = 0 } = req.body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }
    
    // Get API keys from environment variables
    const API_KEYS = [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
      process.env.GROQ_API_KEY_4,
      process.env.GROQ_API_KEY_5
    ].filter(Boolean); // Remove undefined/null values
    
    if (API_KEYS.length === 0) {
      console.error('❌ No Groq API keys found in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error: No API keys available' 
      });
    }
    
    // Select API key based on index (rotates through available keys)
    const selectedKeyIndex = api_key_index % API_KEYS.length;
    const apiKey = API_KEYS[selectedKeyIndex];
    
    console.log(`🔑 Using API key #${selectedKeyIndex + 1} of ${API_KEYS.length}`);
    
    // Make request to Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: temperature || 0.4,
        max_tokens: max_tokens || 2500
      })
    });
    
    // Handle rate limiting
    if (groqResponse.status === 429) {
      const retryAfter = groqResponse.headers.get('Retry-After');
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retry_after: retryAfter,
        message: 'Too many requests. Please try again later.'
      });
    }
    
    // Handle other errors
    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      console.error(`Groq API error: ${groqResponse.status}`, errorData);
      return res.status(groqResponse.status).json({
        error: `Groq API error: ${groqResponse.status}`,
        details: errorData
      });
    }
    
    // Return successful response
    const data = await groqResponse.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}