export async function handler(event) {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'GROQ_API_KEY not configured' };
    }

    const body = event.body || '{}';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: text,
    };
  } catch (e) {
    return { statusCode: 500, body: 'Proxy error: ' + e.message };
  }
}


