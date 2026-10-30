import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GROQ_MODEL,
  GROQ_CHAT_COMPLETIONS_URL,
  buildChatCompletionBody,
  handleGroqChat,
} from './groqChat.js';

const MESSAGES = [{ role: 'user', content: 'Return JSON only.' }];

function jsonResponse({ status = 200, body = {}, headers = {} }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
        return match ? match[1] : null;
      },
    },
    json: async () => body,
  };
}

test('default request uses the current Groq chat model and completion shape', async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return jsonResponse({
      body: {
        choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '{"ok":true}' } }],
      },
    });
  };

  const result = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES, temperature: 0.4, max_tokens: 2500, api_key_index: 0 },
    env: { GROQ_API_KEY: 'test-key' },
    fetchImpl,
  });

  assert.equal(result.status, 200);
  assert.equal(result.json.choices[0].message.content, '{"ok":true}');
  assert.equal(captured.url, GROQ_CHAT_COMPLETIONS_URL);

  const sent = JSON.parse(captured.options.body);
  assert.equal(sent.model, DEFAULT_GROQ_MODEL);
  assert.equal(sent.model, 'openai/gpt-oss-120b');
  assert.equal(sent.max_completion_tokens, 2500);
  assert.equal(Object.hasOwn(sent, 'max_tokens'), false);
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.include_reasoning, false);
  assert.deepEqual(sent.response_format, { type: 'json_object' });
  assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
  assert.equal(JSON.stringify(result.json).includes('test-key'), false);
});

test('GROQ_MODEL overrides the default model', async () => {
  let captured;
  const fetchImpl = async (_url, options) => {
    captured = options;
    return jsonResponse({
      body: { choices: [{ finish_reason: 'stop', message: { content: '{"ok":1}' } }] },
    });
  };

  await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES, max_tokens: 1000 },
    env: { GROQ_API_KEY_1: 'numbered-key', GROQ_MODEL: ' qwen/qwen3.8-27b ' },
    fetchImpl,
  });

  const sent = JSON.parse(captured.body);
  assert.equal(sent.model, 'qwen/qwen3.8-27b');
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(captured.headers.Authorization, 'Bearer numbered-key');
});

test('non-reasoning model overrides omit reasoning fields', () => {
  const body = buildChatCompletionBody({
    messages: MESSAGES,
    temperature: 0.2,
    maxTokens: 800,
    model: 'custom-chat-model',
  });

  assert.equal(body.model, 'custom-chat-model');
  assert.equal(body.max_completion_tokens, 800);
  assert.equal(Object.hasOwn(body, 'reasoning_effort'), false);
  assert.equal(Object.hasOwn(body, 'max_tokens'), false);
  assert.deepEqual(body.response_format, { type: 'json_object' });
});

test('rotates across GROQ_API_KEY and numbered keys without duplicating', async () => {
  const seen = [];
  const fetchImpl = async (_url, options) => {
    seen.push(options.headers.Authorization);
    return jsonResponse({
      body: { choices: [{ finish_reason: 'stop', message: { content: '{"ok":1}' } }] },
    });
  };

  const env = {
    GROQ_API_KEY: 'primary',
    GROQ_API_KEY_1: 'primary',
    GROQ_API_KEY_2: 'second',
  };

  await handleGroqChat({ method: 'POST', body: { messages: MESSAGES, api_key_index: 0 }, env, fetchImpl });
  await handleGroqChat({ method: 'POST', body: { messages: MESSAGES, api_key_index: 1 }, env, fetchImpl });

  assert.deepEqual(seen, ['Bearer primary', 'Bearer second']);
});

test('missing key returns a configuration message and does not call Groq', async () => {
  let called = false;
  const result = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES },
    env: {},
    fetchImpl: async () => {
      called = true;
      return jsonResponse({});
    },
  });

  assert.equal(called, false);
  assert.equal(result.status, 500);
  assert.match(result.json.message, /GROQ_API_KEY/);
});

test('invalid key and rate limit responses are user-facing', async () => {
  const invalid = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES },
    env: { GROQ_API_KEY: 'bad' },
    fetchImpl: async () => jsonResponse({
      status: 401,
      body: { error: { message: 'Invalid API Key', type: 'invalid_request_error', code: 'invalid_api_key' } },
    }),
  });
  assert.equal(invalid.status, 401);
  assert.match(invalid.json.message, /missing or invalid/i);
  assert.equal(invalid.json.message.includes('bad'), false);

  const limited = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES },
    env: { GROQ_API_KEY: 'key' },
    fetchImpl: async () => jsonResponse({ status: 429, headers: { 'Retry-After': '3' } }),
  });
  assert.equal(limited.status, 429);
  assert.match(limited.json.message, /rate limit/i);
  assert.equal(limited.json.retry_after, '3');
});

test('retired model errors name the replacement', async () => {
  const result = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES },
    env: { GROQ_API_KEY: 'key', GROQ_MODEL: 'llama-3.3-70b-versatile' },
    fetchImpl: async () => jsonResponse({
      status: 404,
      body: { error: { message: 'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it' } },
    }),
  });

  assert.equal(result.status, 404);
  assert.match(result.json.message, /openai\/gpt-oss-120b/);
  assert.match(result.json.message, /does not exist/);
});

test('normalizes array message content and rejects truncated or empty completions', async () => {
  const normalized = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES },
    env: { GROQ_API_KEY: 'key' },
    fetchImpl: async () => jsonResponse({
      body: {
        choices: [{
          finish_reason: 'stop',
          message: { content: [{ type: 'output_text', text: '{"personalities":[]}' }] },
        }],
      },
    }),
  });
  assert.equal(normalized.status, 200);
  assert.equal(normalized.json.choices[0].message.content, '{"personalities":[]}');

  const truncated = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES },
    env: { GROQ_API_KEY: 'key' },
    fetchImpl: async () => jsonResponse({
      body: { choices: [{ finish_reason: 'length', message: { content: '{"personalities":' } }] },
    }),
  });
  assert.equal(truncated.status, 502);
  assert.match(truncated.json.message, /cut off/i);

  const empty = await handleGroqChat({
    method: 'POST',
    body: { messages: MESSAGES },
    env: { GROQ_API_KEY: 'key' },
    fetchImpl: async () => jsonResponse({
      body: { choices: [{ finish_reason: 'stop', message: { content: '   ' } }] },
    }),
  });
  assert.equal(empty.status, 502);
  assert.match(empty.json.message, /empty analysis/i);
});

test('rejects bad methods and missing messages', async () => {
  const method = await handleGroqChat({ method: 'GET', body: {}, env: { GROQ_API_KEY: 'key' }, fetchImpl: async () => jsonResponse({}) });
  assert.equal(method.status, 405);
  assert.match(method.json.message, /POST/);

  const missing = await handleGroqChat({ method: 'POST', body: {}, env: { GROQ_API_KEY: 'key' }, fetchImpl: async () => jsonResponse({}) });
  assert.equal(missing.status, 400);
  assert.match(missing.json.message, /messages array required/);
});
