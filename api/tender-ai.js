const ALLOWED_ORIGINS = new Set([
  'https://mmgcgeneraltrading.github.io',
  'https://www.mmgcgeneraltrading.github.io'
]);

function allowCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin) || /\.vercel\.app$/.test(new URL(origin || 'https://invalid.local').hostname)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const c of item?.content || []) {
      if (c?.type === 'output_text' && c?.text) parts.push(c.text);
    }
  }
  return parts.join('\n\n').trim();
}

export default async function handler(req, res) {
  allowCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'MMGC AI is not activated yet. OPENAI_API_KEY is missing on the server.' });

  const mode = req.body?.mode === 'review' ? 'review' : 'research';
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'No costing request was provided.' });
  if (prompt.length > 12000) return res.status(413).json({ error: 'The request is too long. Reduce the tender data or line items.' });

  const instructions = mode === 'research'
    ? 'You are MMGC Procurement Costing Assistant for Lesotho. Research current prices carefully. Prefer official manufacturers, authorised distributors and established suppliers. Match exact model/specification and quantities. Distinguish verified prices from estimates. State VAT and freight assumptions. Never invent a price. Include source links in the answer. Remind the bidder to proof the official BOQ and final tender total.'
    : 'You are MMGC Tender Commercial Review Assistant. Check arithmetic, commercial assumptions, omissions, VAT treatment, logistics, overheads, contingency, markup and bid-security assumptions. Use web search only when current market verification is useful. Distinguish facts from estimates. Never invent prices. The bidder remains responsible for proofing the official BOQ and final tender total.';

  const payload = {
    model: 'gpt-5.6-terra',
    reasoning: { effort: 'medium' },
    instructions,
    input: prompt,
    max_output_tokens: 4500,
    store: false
  };
  if (mode === 'research') {
    payload.tools = [{
      type: 'web_search_preview',
      search_context_size: 'medium',
      user_location: { type: 'approximate', country: 'LS' }
    }];
    payload.tool_choice = 'auto';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', data?.error?.message || data);
      return res.status(response.status).json({ error: data?.error?.message || 'OpenAI request failed.' });
    }
    const text = extractText(data);
    return res.status(200).json({ text: text || 'No text response was returned.', response_id: data.id, model: data.model || payload.model });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'MMGC AI could not complete the request. Please try again.' });
  }
}