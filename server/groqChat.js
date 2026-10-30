/**
 * Groq Chat Completions request builder and proxy logic.
 * Shared by the Vercel function (api/groq.js) and the Vite dev server.
 *
 * Docs: https://console.groq.com/docs/api-reference
 * Models: https://console.groq.com/docs/models
 * Deprecations: https://console.groq.com/docs/deprecations
 */

export const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Production model that replaced llama-3.3-70b-versatile for non-enterprise accounts. */
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

const REASONING_MODEL_PREFIXES = ['openai/gpt-oss', 'qwen/'];

export function collectGroqApiKeys(env = {}) {
  const keys = [];
  const push = (value) => {
    const key = typeof value === 'string' ? value.trim() : '';
    if (key && !keys.includes(key)) keys.push(key);
  };

  push(env.GROQ_API_KEY);
  for (let i = 1; i <= 5; i += 1) {
    push(env[`GROQ_API_KEY_${i}`]);
  }
  return keys;
}

export function resolveGroqModel(env = {}) {
  const configured = typeof env.GROQ_MODEL === 'string' ? env.GROQ_MODEL.trim() : '';
  return configured || DEFAULT_GROQ_MODEL;
}

export function buildChatCompletionBody({ messages, temperature, maxTokens, model }) {
  const maxCompletionTokens = Number.isFinite(maxTokens) && maxTokens > 0 ? Math.floor(maxTokens) : 4096;
  const body = {
    model,
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.4,
    max_completion_tokens: maxCompletionTokens,
    response_format: { type: 'json_object' },
  };

  // GPT-OSS and Qwen reason before answering, and those tokens count toward
  // max_completion_tokens. Low effort leaves room for the JSON payload.
  // GPT-OSS does not accept reasoning_format (it 400s). Use include_reasoning.
  if (REASONING_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix))) {
    body.reasoning_effort = 'low';
    body.include_reasoning = false;
  }

  return body;
}

function groqErrorDetail(errorData) {
  const nested = errorData?.error;
  if (typeof nested === 'string') return nested;
  if (nested && typeof nested.message === 'string') return nested.message;
  if (typeof errorData?.message === 'string') return errorData.message;
  return '';
}

export function groqErrorMessage(status, errorData = {}) {
  const detail = groqErrorDetail(errorData);
  const code = typeof errorData?.error?.code === 'string' ? errorData.error.code : '';

  if (
    status === 401 ||
    status === 403 ||
    code === 'invalid_api_key' ||
    /invalid api key/i.test(detail)
  ) {
    return 'The Groq API key is missing or invalid. Add GROQ_API_KEY or GROQ_API_KEY_1 in the server environment (Vercel → Settings → Environment Variables) and redeploy.';
  }

  if (status === 429) {
    return 'Groq rate limit reached. Wait a minute and try again. Adding GROQ_API_KEY_2 through GROQ_API_KEY_5 raises the limit.';
  }

  if (
    status === 404 ||
    /does not exist/i.test(detail) ||
    /decommissioned/i.test(detail) ||
    /model .* (not found|unavailable)/i.test(detail) ||
    /you do not have access/i.test(detail)
  ) {
    const extra = detail ? ` ${detail}` : '';
    return `The configured Groq model is unavailable. Set GROQ_MODEL to a current model such as ${DEFAULT_GROQ_MODEL}.${extra}`;
  }

  if (detail) {
    return `Groq could not complete the analysis (${status}). ${detail}`;
  }

  return `Groq could not complete the analysis (${status}). Please try again.`;
}

function extractAssistantContent(data) {
  const message = data?.choices?.[0]?.message;
  if (!message) return '';
  if (typeof message.content === 'string') return message.content.trim();
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        if (part && typeof part.content === 'string') return part.content;
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function normalizeBody(body) {
  if (body == null) return {};
  if (typeof body === 'string') {
    if (!body.trim()) return {};
    return JSON.parse(body);
  }
  return body;
}

export async function handleGroqChat({ method, body, env = {}, fetchImpl = fetch }) {
  if (method === 'OPTIONS') {
    return { status: 200, json: {} };
  }

  if (method !== 'POST') {
    return {
      status: 405,
      json: { error: 'method_not_allowed', message: 'Method not allowed. Send a POST request.' },
    };
  }

  let payload;
  try {
    payload = normalizeBody(body);
  } catch {
    return {
      status: 400,
      json: { error: 'invalid_json', message: 'Request body must be JSON.' },
    };
  }

  const messages = payload?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      status: 400,
      json: { error: 'invalid_request', message: 'Invalid request: messages array required.' },
    };
  }

  const apiKeys = collectGroqApiKeys(env);
  if (apiKeys.length === 0) {
    return {
      status: 500,
      json: {
        error: 'missing_api_key',
        message: 'Server configuration error: no Groq API key is set. Add GROQ_API_KEY or GROQ_API_KEY_1.',
      },
    };
  }

  const requestedIndex = Number.isInteger(payload.api_key_index) ? payload.api_key_index : 0;
  const selectedKeyIndex = ((requestedIndex % apiKeys.length) + apiKeys.length) % apiKeys.length;
  const apiKey = apiKeys[selectedKeyIndex];
  const model = resolveGroqModel(env);

  const requestedMax = Number.isFinite(payload.max_completion_tokens)
    ? payload.max_completion_tokens
    : payload.max_tokens;
  const maxTokens = Number.isFinite(requestedMax) ? requestedMax : 4096;
  const temperature = typeof payload.temperature === 'number' ? payload.temperature : 0.4;
  const requestBody = buildChatCompletionBody({ messages, temperature, maxTokens, model });

  let groqResponse;
  try {
    groqResponse = await fetchImpl(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error('Groq request failed:', error?.message || error);
    return {
      status: 502,
      json: {
        error: 'upstream_unreachable',
        message: 'Could not reach the Groq API. Check the network and try again.',
      },
    };
  }

  if (groqResponse.status === 429) {
    const retryAfter = groqResponse.headers?.get?.('retry-after') || groqResponse.headers?.get?.('Retry-After') || null;
    await groqResponse.json?.().catch(() => ({}));
    return {
      status: 429,
      json: {
        error: 'rate_limit',
        message: groqErrorMessage(429, {}),
        retry_after: retryAfter,
      },
    };
  }

  if (!groqResponse.ok) {
    const errorData = await groqResponse.json().catch(() => ({}));
    const message = groqErrorMessage(groqResponse.status, errorData);
    console.error(`Groq API error ${groqResponse.status}: ${groqErrorDetail(errorData) || message}`);
    return {
      status: groqResponse.status,
      json: { error: 'groq_api_error', message },
    };
  }

  let data;
  try {
    data = await groqResponse.json();
  } catch {
    return {
      status: 502,
      json: {
        error: 'bad_upstream',
        message: 'Groq returned an unreadable response. Please try again.',
      },
    };
  }

  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'length') {
    return {
      status: 502,
      json: {
        error: 'truncated',
        message: 'The analysis was cut off before it finished. Please try again.',
      },
    };
  }

  const content = extractAssistantContent(data);
  if (!content || !choice?.message) {
    return {
      status: 502,
      json: {
        error: 'empty_response',
        message: 'Groq returned an empty analysis. Please try again.',
      },
    };
  }

  choice.message.content = content;
  return { status: 200, json: data };
}
