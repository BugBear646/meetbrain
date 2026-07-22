//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

// Jina reader: free, keyless scraping. 8s budget, fail quiet - a dead
// website must never block a brief or a triage verdict.
// Returns { text, reason } so callers can explain WHY there's no company
// context, not just that there isn't. reason is one of:
//   no_url | unreachable | timeout | empty | null (success)
export async function scrape(url) {
  if (!url) return { text: null, reason: 'no_url' };
  try {
    const target = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://r.jina.ai/${target}`, {
      signal: controller.signal,
      headers: { 'X-Return-Format': 'text' },
    });
    clearTimeout(timer);
    if (!res.ok) return { text: null, reason: 'unreachable' };
    const text = (await res.text()).slice(0, 6000);
    if (!text.trim()) return { text: null, reason: 'empty' };
    return { text, reason: null };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'unreachable';
    return { text: null, reason };
  }
}