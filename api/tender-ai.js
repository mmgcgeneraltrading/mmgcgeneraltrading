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

function parseJsonObject(text) {
  try {
    const cleaned = String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
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
      modes: ['research', 'review', 'autofill', 'document_autofill'],
      model: 'gpt-5.6-terra'
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  if (!apiKey) return res.status(503).json({ error: 'MMGC AI is not activated yet. OPENAI_API_KEY is missing on the server.' });

  const requestedMode = String(req.body?.mode || 'research');
  const allowedModes = ['research', 'review', 'autofill', 'document_autofill'];
  const mode = allowedModes.includes(requestedMode) ? requestedMode : 'research';
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'No costing request was provided.' });
  const maxChars = mode === 'document_autofill' ? 110000 : 20000;
  if (prompt.length > maxChars) return res.status(413).json({ error: `The request is too long. Keep extracted tender text below ${maxChars.toLocaleString()} characters.` });

  let instructions;
  if (mode === 'document_autofill') {
    instructions = `You are MMGC General Trading's tender-document costing assistant for Lesotho. You receive text extracted from an uploaded tender PDF. Your job is to:
1) identify the actual tender title, issuer and tender category;
2) find the BOQ, bill of quantities, price schedule, schedule of requirements, equipment list, goods list or other explicitly listed costable items in the supplied PDF text;
3) preserve the item's real description/specification, quantity, unit and PDF page number whenever shown;
4) research CURRENT supplier pricing using live web search, with first priority on suppliers physically located in Bloemfontein, Free State; second priority on established South African suppliers that can supply Bloemfontein or Lesotho;
5) match exact make/model/specification where stated. Never substitute a materially different specification merely to obtain a price;
6) never invent a price. If credible current pricing cannot be verified, set unit_cost to null and explain that a supplier quotation is required;
7) distinguish item unit cost from freight/delivery. Only provide transport or other_costs when supported by evidence or clearly labelled as an estimate;
8) capture tender document fee and bid-security percentage only when explicitly stated in the supplied document text. Do not infer them.

Return ONLY valid JSON, no markdown, with this exact shape:
{"tender_title":"...","issuer":"...","category":"goods|services|construction|other","document_fee":null,"bid_security_percent":null,"transport":null,"other_costs":null,"items":[{"index":1,"description":"exact BOQ/listed item description","quantity":1,"unit":"Each","page":1,"unit_cost":123.45,"currency":"M","source":"supplier name","source_url":"https://...","location":"Bloemfontein / South Africa / Lesotho","confidence":"high|medium|low","note":"short specification/VAT/freight/availability note"}],"note":"short overall caution or sourcing note"}.

Do not add headings or commentary outside JSON. Omit obvious instructions, headings and tender forms that are not costable BOQ/list items. Preserve separate BOQ rows as separate items unless the tender clearly treats them as one line.`;
  } else if (mode === 'autofill') {
    instructions = `You are MMGC Procurement Costing Assistant for Lesotho. Research CURRENT market prices for every requested calculator line using live web evidence. First search Bloemfontein, Free State suppliers. Then use established South African/Lesotho suppliers if needed. Prefer official manufacturers, authorised distributors and established retailers. Match exact model/specification. Never invent a price. If no reliable price exists, set unit_cost to null. Return ONLY valid JSON with this shape: {"items":[{"index":1,"description":"...","unit_cost":123.45,"currency":"M","source":"supplier name","source_url":"https://...","confidence":"high|medium|low","note":"short note"}],"transport":null,"other_costs":null,"note":"short overall note"}. Maloti and Rand may be treated at par for planning. Do not add markdown.`;
  } else if (mode === 'research') {
    instructions = `You are MMGC Procurement Costing Assistant for Lesotho. Research current prices carefully, prioritising suppliers in Bloemfontein, Free State, then established South African and Lesotho suppliers. Prefer official manufacturers and authorised distributors. Match exact model/specification and quantities. State VAT and freight assumptions. Never invent a price. Include useful source links and identify when a supplier quotation is required. Remind the bidder to proof the official BOQ and final tender total.`;
  } else {
    instructions = `You are MMGC Tender Commercial Review Assistant. Check arithmetic, commercial assumptions, omissions, VAT treatment, logistics, overheads, contingency, markup and bid-security assumptions. Use web search only when current market verification is useful. Distinguish facts from estimates. Never invent prices. The bidder remains responsible for proofing the official BOQ and final tender total.`;
  }

  const payload = {
    model: 'gpt-5.6-terra',
    reasoning: { effort: mode === 'document_autofill' ? 'high' : 'medium' },
    instructions,
    input: prompt,
    max_output_tokens: mode === 'document_autofill' ? 7000 : mode === 'autofill' ? 3500 : 4500,
    store: false
  };

  if (mode === 'research' || mode === 'autofill' || mode === 'document_autofill') {
    payload.tools = [{
      type: 'web_search_preview',
      search_context_size: mode === 'document_autofill' ? 'high' : 'medium',
      user_location: { type: 'approximate', country: 'ZA' }
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
      const autofill = parseJsonObject(text);
      if (!autofill || !Array.isArray(autofill.items)) return res.status(502).json({ error: 'MMGC AI found pricing information but could not safely structure it for auto-fill.', text });
      return res.status(200).json({ autofill, text, response_id:data.id, model:data.model || payload.model });
    }
    if (mode === 'document_autofill') {
      const documentAutofill = parseJsonObject(text);
      if (!documentAutofill || !Array.isArray(documentAutofill.items)) return res.status(502).json({ error: 'MMGC AI analysed the tender but could not safely structure the BOQ/listed items.', text });
      return res.status(200).json({ document_autofill:documentAutofill, text, response_id:data.id, model:data.model || payload.model });
    }
    return res.status(200).json({ text:text || 'No text response was returned.', response_id:data.id, model:data.model || payload.model });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'MMGC AI could not complete the request. Please try again.' });
  }
}