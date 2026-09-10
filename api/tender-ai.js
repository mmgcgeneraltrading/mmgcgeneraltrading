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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

function parseAutofill(text) {
  try {
    const cleaned = String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  allowCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const apiKey = process.env.OPENAI_API_KEY;

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'MMGC AI Tender Costing',
      configured: Boolean(apiKey),
      modes: ['research', 'review', 'autofill'],
      model: 'gpt-5.6-terra'
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  if (!apiKey) return res.status(503).json({ error: 'MMGC AI is not activated yet. OPENAI_API_KEY is missing on the server.' });

  const requestedMode = String(req.body?.mode || 'research');
  const mode = ['research', 'review', 'autofill'].includes(requestedMode) ? requestedMode : 'research';
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'No costing request was provided.' });
  if (prompt.length > 12000) return res.status(413).json({ error: 'The request is too long. Reduce the tender data or line items.' });

  let instructions;
  if (mode === 'autofill') {
    instructions = 'You are MMGC Procurement Costing Assistant for Lesotho. Research current market prices for every requested line using live web evidence. Prefer official manufacturers, authorised distributors, established South African/Lesotho suppliers and exact model/spec matches. Never invent a price. If no reliable price exists, set unit_cost to null. Return ONLY valid JSON with this shape: {"items":[{"index":1,"description":"...","unit_cost":123.45,"currency":"M","source":"supplier name","source_url":"https://...","confidence":"high|medium|low","note":"short note"}],"transport":null,"other_costs":null,"note":"short overall note"}. Use landed cost into Lesotho only when there is enough evidence; otherwise use the credible supplier unit price and explain freight in note. Do not add markdown.';
  } else if (mode === 'research') {
    instructions = 'You are MMGC Procurement Costing Assistant for Lesotho. Research current prices carefully. Prefer official manufacturers, authorised distributors and established suppliers. Match exact model/specification and quantities. Distinguish verified prices from estimates. State VAT and freight assumptions. Never invent a price. Include source links in the answer. Remind the bidder to proof the official BOQ and final tender total.';
  } else {
    instructions = 'You are MMGC Tender Commercial Review Assistant. Check arithmetic, commercial assumptions, omissions, VAT treatment, logistics, overheads, contingency, markup and bid-security assumptions. Use web search only when current market verification is useful. Distinguish facts from estimates. Never invent prices. The bidder remains responsible for proofing the official BOQ and final tender total.';
  }

  const payload = {
    model: 'gpt-5.6-terra',
    reasoning: { effort: 'medium' },
    instructions,
    input: prompt,
    max_output_tokens: mode === 'autofill' ? 2500 : 4500,
    store: false
  };
  if (mode === 'research' || mode === 'autofill') {
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
    if (mode === 'autofill') {
      const autofill = parseAutofill(text);
      if (!autofill) return res.status(502).json({ error: 'MMGC AI found pricing information but could not safely structure it for auto-fill.', text });
      return res.status(200).json({ autofill, text, response_id: data.id, model: data.model || payload.model });
    }
    return res.status(200).json({ text: text || 'No text response was returned.', response_id: data.id, model: data.model || payload.model });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'MMGC AI could not complete the request. Please try again.' });
  }
}