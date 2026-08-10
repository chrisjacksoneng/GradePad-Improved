// Allowed Groq models. Requests for anything else fall back to the small model
// the app uses, so this proxy can never be pointed at an arbitrary model.
const ALLOWED_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
]);
const MAX_TOKENS = 2048;
const MAX_MESSAGES = 12;

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

  // Block cross-origin browser callers outright (an unknown Origin that does
  // not match this host).
  if (origin && !sameOrigin) {
    return { statusCode: 403, headers: cors, body: 'Forbidden origin' };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: cors, body: 'GROQ_API_KEY not configured' };
  }

  // Validate and clamp the request so the proxy cannot be used as a free,
  // unbounded LLM backend on the owner's key.
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: cors, body: 'Invalid JSON body' };
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > MAX_MESSAGES) {
    return { statusCode: 400, headers: cors, body: 'Invalid messages' };
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
