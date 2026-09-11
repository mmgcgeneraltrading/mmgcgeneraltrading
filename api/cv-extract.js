const ALLOWED_ORIGINS = new Set([
  'https://mmgcgeneraltrading.github.io',
  'https://www.mmgcgeneraltrading.github.io'
]);

const buckets = new Map();
const MAX_FILES = 4;
const MAX_TOTAL_CHARS = 7000000;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

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
  const max = 6;
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
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function stringField(value, max = 6000) {
  if (Array.isArray(value)) return value.map((item) => stringField(item, 1000)).filter(Boolean).join('\n').slice(0, max);
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function normalizeProfile(parsed) {
  const profile = parsed && typeof parsed === 'object' ? parsed.profile || {} : {};
  return {
    full_name: stringField(profile.full_name, 200),
    email: stringField(profile.email, 200),
    phone: stringField(profile.phone, 120),
    location: stringField(profile.location, 250),
    highest_qualification: stringField(profile.highest_qualification, 500),
    career_summary: stringField(profile.career_summary, 1500),
    education_summary: stringField(profile.education_summary, 2500),
    experience_summary: stringField(profile.experience_summary, 3500),
    skills: stringField(profile.skills, 2000),
    job_fit_summary: stringField(profile.job_fit_summary, 1000),
    current_cv_text: stringField(profile.current_cv_text, 9000),
    referees: stringField(profile.referees, 1500)
  };
}

function normalizedWarnings(value) {
  return Array.isArray(value) ? value.map((item) => stringField(item, 300)).filter(Boolean).slice(0, 8) : [];
}

function requestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return parseJson(req.body) || {};
  return {};
}

function cleanFiles(input) {
  const files = Array.isArray(input) ? input.slice(0, MAX_FILES) : [];
  if (!files.length) throw new Error('Upload at least one CV file for extraction.');
  let total = 0;
  return files.map((file, index) => {
    const filename = stringField(file?.filename || `cv-${index + 1}`, 180);
    const mime = stringField(file?.mime_type, 80).toLowerCase();
    const dataUrl = stringField(file?.data_url, MAX_TOTAL_CHARS);
    if (!ALLOWED_MIME.has(mime)) throw new Error('Only PDF, JPG, PNG and WebP CV files can be read automatically.');
    const expectedPrefix = `data:${mime};base64,`;
    if (!dataUrl.startsWith(expectedPrefix)) throw new Error('The uploaded CV file was not encoded correctly.');
    total += dataUrl.length;
    if (total > MAX_TOTAL_CHARS) throw new Error('The uploaded CV is too large for instant extraction.');
    return { filename, mime, dataUrl };
  });
}

function contentForFile(file) {
  if (file.mime === 'application/pdf') {
    return {
      type: 'input_file',
      filename: file.filename,
      file_data: file.dataUrl,
      detail: 'auto'
    };
  }
  return {
    type: 'input_image',
    image_url: file.dataUrl,
    detail: 'high'
  };
}

function jobContext(job) {
  const value = job && typeof job === 'object' ? job : {};
  return {
    title: stringField(value.title, 300),
    employer: stringField(value.employer, 300),
    advert_summary: stringField(value.advert_summary, 3000),
    requirements: Array.isArray(value.requirements) ? value.requirements.slice(0, 8).map((item) => stringField(item, 600)).filter(Boolean) : []
  };
}

export default async function handler(req, res) {
  allowCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const apiKey = process.env.OPENAI_API_KEY;
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'MMGC CV Extractor',
      configured: Boolean(apiKey),
      model: 'gpt-5.6-terra',
      accepted: ['pdf', 'jpg', 'png', 'webp']
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  if (!apiKey) return res.status(503).json({ error: 'CV extraction is not activated yet. OPENAI_API_KEY is missing on the server.' });
  if (limited(req)) return res.status(429).json({ error: 'Too many CV extraction requests. Please wait a moment and try again.' });

  let files;
  let job;
  try {
    const body = requestBody(req);
    files = cleanFiles(body.files);
    job = jobContext(body.job);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid CV upload.' });
  }

  const instructions = `You extract structured CV/resume details for MMGC General Trading's job application website in Lesotho.

Return ONLY valid JSON with this exact shape:
{"profile":{"full_name":"","email":"","phone":"","location":"","highest_qualification":"","career_summary":"","education_summary":"","experience_summary":"","skills":"","job_fit_summary":"","current_cv_text":"","referees":""},"confidence":"high|medium|low","missing":["short missing field"],"warnings":["short warning"]}

Rules:
- Use only facts visible in the uploaded CV file(s). Do not invent qualifications, employers, dates, duties, references, phone numbers or email addresses.
- If text is unclear, leave the field blank and add a warning.
- Keep summaries practical and editable for a printed CV and application letter.
- Put education, experience, skills and referees as clean plain text with one item per line where possible.
- current_cv_text should be a concise cleaned transcription of useful CV content, not commentary.
- If job context is supplied, job_fit_summary should explain how the CV matches that specific role using only the CV facts and advert requirements.
- Do not extract or return national ID numbers, bank details, signatures, passwords or OTPs.`;

  const inputText = [
    'Extract the applicant data from the attached CV file(s).',
    job.title ? `Target job: ${job.title}` : '',
    job.employer ? `Employer: ${job.employer}` : '',
    job.advert_summary ? `Advert summary: ${job.advert_summary}` : '',
    job.requirements.length ? `Requirements: ${job.requirements.join('; ')}` : ''
  ].filter(Boolean).join('\n');

  const payload = {
    model: 'gpt-5.6-terra',
    reasoning: { effort: 'medium' },
    instructions,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: inputText },
        ...files.map(contentForFile)
      ]
    }],
    max_output_tokens: 3500,
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
      return res.status(response.status).json({ error: data?.error?.message || 'OpenAI CV extraction failed.' });
    }
    const parsed = parseJson(extractText(data));
    if (!parsed?.profile) return res.status(502).json({ error: 'The CV was read, but the extracted fields could not be structured safely.' });
    return res.status(200).json({
      profile: normalizeProfile(parsed),
      confidence: stringField(parsed.confidence, 80) || 'medium',
      missing: normalizedWarnings(parsed.missing),
      warnings: normalizedWarnings(parsed.warnings),
      model: data.model || payload.model
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'MMGC CV extractor could not complete the request.' });
  }
}
