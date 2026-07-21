//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

// LLM layer: ordered provider chain, all OpenAI-compatible.
// Walk down the chain on any failure (rate limit, timeout, bad JSON).
// If every provider fails, throw LLM_UNAVAILABLE - callers fall back to
// deterministic rendering so the product never white-screens.

const TIMEOUT_MS = 25000;

function providers() {
  const list = [];
  if (process.env.GROQ_API_KEY) {
    list.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    list.push({
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    });
  }
  return list;
}

// Models often wrap JSON in ```json fences or add preamble. Extract the
// outermost object rather than trusting the raw string.
export function extractJSON(text) {
  if (!text) throw new Error('empty response');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('no JSON object found');
  return JSON.parse(text.slice(start, end + 1));
}

async function callProvider(p, system, user) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(p.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p.key}`,
      },
      body: JSON.stringify({
        model: p.model,
        temperature: 0.3,
        max_tokens: 1600,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`${p.name} HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return extractJSON(text);
  } finally {
    clearTimeout(timer);
  }
}

// Returns { data, provider }. Throws Error('LLM_UNAVAILABLE') if the whole
// chain fails - callers must catch and degrade gracefully.
export async function chatJSON(system, user) {
  const chain = providers();
  let lastErr = null;
  for (const p of chain) {
    try {
      const data = await callProvider(p, system, user);
      return { data, provider: p.name };
    } catch (err) {
      lastErr = err;
      console.error(`[llm] ${p.name} failed:`, err.message);
    }
  }
  const e = new Error('LLM_UNAVAILABLE');
  e.cause = lastErr;
  throw e;
}
