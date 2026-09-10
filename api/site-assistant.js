const ALLOWED_ORIGINS = new Set([
  'https://mmgcgeneraltrading.github.io',
  'https://www.mmgcgeneraltrading.github.io'
]);

const buckets = new Map();
function allowCors(req,res){
  const origin=req.headers.origin||'';
  try{
    const host=new URL(origin||'https://invalid.local').hostname;
    if(ALLOWED_ORIGINS.has(origin)||/\.vercel\.app$/.test(host)) res.setHeader('Access-Control-Allow-Origin',origin);
  }catch{}
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}
function extractText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim()) return data.output_text.trim();
  const parts=[];
  for(const item of data?.output||[]){
    if(item?.type!=='message') continue;
    for(const c of item?.content||[]) if(c?.type==='output_text'&&c?.text) parts.push(c.text);
  }
  return parts.join('\n\n').trim();
}
function limited(req){
  const ip=String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'anon').split(',')[0].trim();
  const now=Date.now(), windowMs=60000, max=12;
  const current=buckets.get(ip)||{start:now,count:0};
  if(now-current.start>windowMs){current.start=now;current.count=0;}
  current.count++; buckets.set(ip,current);
  return current.count>max;
}
function safeJson(text){
  try{
    const cleaned=String(text||'').replace(/^```(?:json)?/i,'').replace(/```$/i,'').trim();
    const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');
    if(a<0||b<=a)return null;
    const parsed=JSON.parse(cleaned.slice(a,b+1));
    if(typeof parsed.answer!=='string') return null;
    if(!Array.isArray(parsed.actions)) parsed.actions=[];
    return parsed;
  }catch{return null;}
}

export default async function handler(req,res){
  allowCors(req,res);
  if(req.method==='OPTIONS') return res.status(204).end();
  const apiKey=process.env.OPENAI_API_KEY;
  if(req.method==='GET') return res.status(200).json({status:'ok',service:'MMGC Website Assistant',configured:Boolean(apiKey),model:'gpt-5.6-terra'});
  if(req.method!=='POST') return res.status(405).json({error:'POST required.'});
  if(!apiKey) return res.status(503).json({error:'MMGC Assistant is not configured.'});
  if(limited(req)) return res.status(429).json({error:'Too many assistant requests. Please wait a moment and try again.'});

  const message=String(req.body?.message||'').trim();
  const page=String(req.body?.page||'').slice(0,200);
  const pageUrl=String(req.body?.pageUrl||'').slice(0,500);
  const pageContext=String(req.body?.pageContext||'').slice(0,6000);
  const websiteContext=String(req.body?.websiteContext||'').slice(0,14000);
  const history=Array.isArray(req.body?.history)?req.body.history.slice(-10):[];
  if(!message) return res.status(400).json({error:'Ask a question first.'});
  if(message.length>1400) return res.status(413).json({error:'Please shorten the question.'});

  const instructions=`You are the live MMGC General Trading website assistant for customers and procurement users in Lesotho. Answer naturally like a capable human chat assistant, not a menu bot. Use the supplied WEBSITE DATA and CURRENT PAGE CONTEXT as the primary source of truth for MMGC pages, tender listings, job listings, products, service prices and contact details. If the user asks about a tender or opportunity in the supplied data, answer specific fields such as deadline, site visit, pre-bid meeting, bid security, document fee, lots, source link, eligibility and costing status when present. If information is unknown, say it needs verification; never invent a tender requirement or price. For current external facts or supplier-price questions, web search may be used, but distinguish live web findings from MMGC's own website data. Keep answers concise but complete.

MMGC customer-facing facts: MMGC General Trading is based in Maseru, Lesotho and provides procurement/sourcing, tender support, business documentation, IT support, printing/copying, cleaning and general supplies. Contact +266 2233 1570 / +266 5831 1808, mmgcgeneraltrading@gmail.com. Published standard service prices currently include B&W printing M2.50/page, colour printing from M7.50/page, scanning M4/page, typing from M15/page, A4 lamination M20, comb binding from M35, business letters from M100, CV formatting from M250, application/cover letter from M100, CV+application package from M300, Tender/RFQ Study from M250, Compliance Checklist from M300, BOQ/Pricing Assistance from M500, Small RFQ Preparation from M500, Formal Tender Preparation from M1,500, Company Profile from M750, Supplier Registration from M300. Complex, urgent, site-visit or after-hours work can require quotation.

Never ask users to paste passwords, OTPs, bank/card details, signatures, national IDs or confidential credentials into the public chat. It is okay to discuss public tender documents and ordinary procurement specifications. Do not claim a submission, payment, booking or application has been made unless the website actually performed that action.

Return ONLY valid JSON in this form: {"answer":"plain conversational answer","actions":[{"label":"short label","url":"relative-or-https-url"}]}. Provide 0-3 useful actions. Prefer existing MMGC relative links when useful: tenders.html, tender-calculator.html, jobs.html, opportunities.html, products.html, stationery.html, standard-services.html, suppliers.html, checklists.html, index.html#quote. If a current tender id is known, use tender-details.html?id=ID or tender-calculator.html?tender=ID. For contact, use https://wa.me/26658311808. Do not include markdown code fences.`;

  const historyText=history.map(x=>`${x.role==='assistant'?'Assistant':'User'}: ${String(x.text||'').slice(0,1000)}`).join('\n');
  const input=`CURRENT PAGE: ${page}\nURL: ${pageUrl}\n\nCURRENT PAGE CONTEXT:\n${pageContext||'Not supplied'}\n\nRELEVANT WEBSITE DATA:\n${websiteContext||'Not supplied'}\n\nRECENT CHAT:\n${historyText||'None'}\n\nUSER QUESTION:\n${message}`;
  const payload={
    model:'gpt-5.6-terra',
    reasoning:{effort:'low'},
    instructions,
    input,
    max_output_tokens:1100,
    store:false,
    tools:[{type:'web_search_preview',search_context_size:'low',user_location:{type:'approximate',country:'LS'}}],
    tool_choice:'auto'
  };
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok) return res.status(response.status).json({error:data?.error?.message||'Assistant request failed.'});
    const text=extractText(data),parsed=safeJson(text);
    if(!parsed) return res.status(200).json({answer:text||'I could not prepare an answer. Please try again.',actions:[],model:data.model||payload.model});
    parsed.actions=parsed.actions.slice(0,3).filter(a=>a&&typeof a.label==='string'&&typeof a.url==='string');
    return res.status(200).json({...parsed,model:data.model||payload.model});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'MMGC Assistant could not complete the request. Please try again.'});
  }
}
