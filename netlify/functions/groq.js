// Allowed Groq models. Requests for anything else fall back to the small model
// the app uses, so this proxy can never be pointed at an arbitrary model.
const ALLOWED_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
]);
const MAX_TOKENS = 2048;
const MAX_MESSAGES = 12;
// Enough for a long syllabus, far short of an unbounded prompt on the owner's
// key. Counted across the whole conversation, not per message.
const MAX_TOTAL_CHARS = 40000;
const MAX_BODY_BYTES = 200000;
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

export async function handler(event) {
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin || '';
  const host = headers.host || headers.Host || '';
  // The app calls this same-origin, so a present Origin must match the host.
  const sameOrigin = !!origin && origin.replace(/^https?:\/\//, '').split('/')[0] === host;

  const cors = sameOrigin
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : {};

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...cors,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  // Require an Origin that matches this host. Browsers always send Origin on a
  // POST, so the app itself is unaffected, while a request with no Origin at
  // all (curl, a script, another server) no longer sails through and spends the
  // owner's Groq credit.
  if (!sameOrigin) {
    return { statusCode: 403, headers: cors, body: 'Forbidden origin' };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: cors, body: 'GROQ_API_KEY not configured' };
  }

  // Validate and clamp the request so the proxy cannot be used as a free,
  // unbounded LLM backend on the owner's key.
  const rawBody = event.body || '{}';
  if (rawBody.length > MAX_BODY_BYTES) {
    return { statusCode: 413, headers: cors, body: 'Request too large' };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, headers: cors, body: 'Invalid JSON body' };
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > MAX_MESSAGES) {
    return { statusCode: 400, headers: cors, body: 'Invalid messages' };
  }

  // The message count alone bounded nothing: twelve megabyte-sized messages
  // were as welcome as twelve short ones.
  let totalChars = 0;
  for (const message of payload.messages) {
    if (!message || typeof message.content !== 'string' || !ALLOWED_ROLES.has(message.role)) {
      return { statusCode: 400, headers: cors, body: 'Invalid messages' };
    }
    totalChars += message.content.length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return { statusCode: 413, headers: cors, body: 'Syllabus text is too long' };
  }

  const model = ALLOWED_MODELS.has(payload.model) ? payload.model : 'llama-3.1-8b-instant';
  const maxTokens = Math.min(Number(payload.max_tokens) || MAX_TOKENS, MAX_TOKENS);
  const temperature = Math.min(Math.max(Number(payload.temperature) || 0.1, 0), 2);

  const safeBody = JSON.stringify({ model, messages: payload.messages, max_tokens: maxTokens, temperature });

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: safeBody,
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: 'Upstream request failed' };
  }
}
