import test from 'node:test';
import assert from 'node:assert/strict';
import WhatsAppAnalyzer from '../src/utils/Llm.js';

const chatData = {
  participants: ['Alice', 'Bob'],
  messages: [
    { sender: 'Alice', message: 'hello there friend', date: '1/1/24', time: '10:00' },
    { sender: 'Bob', message: 'this is a longer funny message lol', date: '1/1/24', time: '10:01' },
  ],
};

function mockFetch(status, body) {
  return async () => ({
    status,
    ok: status >= 200 && status < 300,
    statusText: 'error',
    json: async () => body,
  });
}

test('API key and rate-limit failures reject with the server message', async () => {
  const analyzer = new WhatsAppAnalyzer(chatData, 'http://llm.test/api/groq');
  const originalFetch = globalThis.fetch;
  analyzer._sleep = async () => {};

  globalThis.fetch = mockFetch(401, {
    error: 'groq_api_error',
    message: 'The Groq API key is missing or invalid. Add GROQ_API_KEY or GROQ_API_KEY_1 in the server environment (Vercel → Settings → Environment Variables) and redeploy.',
  });

  try {
    await assert.rejects(
      () => analyzer.generateReport(),
      (error) => {
        assert.equal(error.isApiError, true);
        assert.match(error.message, /missing or invalid/);
        assert.equal(error.message.includes('{'), false);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a rate limit response is not turned into an empty report', async () => {
  const analyzer = new WhatsAppAnalyzer(chatData, 'http://llm.test/api/groq');
  const originalFetch = globalThis.fetch;
  let calls = 0;
  analyzer._sleep = async () => {};
  globalThis.fetch = async () => {
    calls += 1;
    return {
      status: 429,
      ok: false,
      statusText: 'Too Many Requests',
      json: async () => ({
        error: 'rate_limit',
        message: 'Groq rate limit reached. Wait a minute and try again.',
        retry_after: '1',
      }),
    };
  };

  try {
    await assert.rejects(
      () => analyzer.generateReport(),
      /rate limit/i
    );
    assert.equal(calls, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
