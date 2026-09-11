const ALLOWED_ORIGINS = new Set([
  'https://mmgcgeneraltrading.github.io',
  'https://www.mmgcgeneraltrading.github.io'
]);

const buckets = new Map();

function allowCors(req, res) {
  const origin = req.headers.origin || '';
  try {
    const host = new URL(origin || 'https://invalid.local').hostname;
    if (ALLOWED_ORIGINS.has(origin) || /\.vercel\.app$/.test(host)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } catch {}
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'anon').split(',')[0].trim();
  const now = Date.now();
  const windowMs = 60000;
  const max = 8;
  const current = buckets.get(ip) || { start: now, count: 0 };
  if (now - current.start > windowMs) {
    current.start = now;
    current.count = 0;
  }
  current.count += 1;
  buckets.set(ip, current);
  return current.count > max;
}

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) parts.push(content.text);
    }
  }
  return parts.join('\n\n').trim();
}

function parseJson(text) {
  try {
    const cleaned = String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof parsed.cv !== 'string' || typeof parsed.letter !== 'string') return null;
    if (!Array.isArray(parsed.notes)) parsed.notes = [];
    return parsed;
  } catch {
    return null;
  }
}

function trimmedApplication(input) {
  const app = input && typeof input === 'object' ? input : {};
  const keep = [
    'job_title',
    'employer',
    'application_method',
    'applicant_name',
    'phone',
    'email',
    'location',
    'qualification',
    'career_summary',
    'education',
    'experience',
    'skills',
    'fit',
    'current_cv',
    'referees',
    'advert_summary'
  ];
  const output = {};
  for (const key of keep) output[key] = String(app[key] || '').slice(0, key === 'current_cv' ? 12000 : 3000);
  output.requirements = Array.isArray(app.requirements) ? app.requirements.slice(0, 8).map((x) => String(x).slice(0, 1000)) : [];
  return output;
}

export default async function handler(req, res) {
  allowCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const apiKey = process.env.OPENAI_API_KEY;

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'MMGC Job Application AI',
      configured: Boolean(apiKey),
      model: 'gpt-5.6-terra'
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  if (!apiKey) return res.status(503).json({ error: 'MMGC Job Application AI is not configured yet.' });
  if (limited(req)) return res.status(429).json({ error: 'Too many drafting requests. Please wait a moment and try again.' });

  const application = trimmedApplication(req.body?.application);
  if (!application.job_title || !application.applicant_name) {
    return res.status(400).json({ error: 'Applicant name and job title are required.' });
  }

  const instructions = `You are MMGC General Trading's job-application preparation assistant in Lesotho. Create a clean, professional CV draft and application letter for an applicant applying for a vacancy or consultancy.

Rules:
- Use only facts supplied by the applicant and the advert summary. Do not invent qualifications, employers, certificates, duties, dates or achievements.
- If an important detail is missing, write a short placeholder such as "[Add dates]" or "[Add certificate name]" instead of inventing it.
- Make the CV relevant to the job by prioritising matching skills, experience and requirements.
- Keep the CV practical for printing in a small business support shop.
- The letter must be polite, direct and suitable for Lesotho employers.
- Do not include national ID numbers, bank details, signatures or passwords.
- Return only valid JSON with this exact shape:
{"cv":"plain text CV draft","letter":"plain text application letter","notes":["short improvement note"]}`;

  const payload = {
    model: 'gpt-5.6-terra',
    reasoning: { effort: 'medium' },
    instructions,
    input: JSON.stringify(application),
    max_output_tokens: 4500,
    store: false
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'OpenAI request failed.' });
    }
    const parsed = parseJson(extractText(data));
    if (!parsed) return res.status(502).json({ error: 'The AI could not structure the CV and letter safely.' });
    return res.status(200).json({ ...parsed, model: data.model || payload.model });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'MMGC Job Application AI could not complete the request.' });
  }
}
