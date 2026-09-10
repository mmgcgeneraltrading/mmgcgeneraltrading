const ALLOWED_ORIGINS = new Set([
  'https://mmgcgeneraltrading.github.io',
  'https://www.mmgcgeneraltrading.github.io'
]);

function allowCors(req,res){
  const origin=req.headers.origin||'';
  let host='';
  try{host=new URL(origin||'https://invalid.local').hostname;}catch{}
  if(ALLOWED_ORIGINS.has(origin)||/\.vercel\.app$/.test(host))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}

function extractText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  const parts=[];
  for(const item of data?.output||[]){
    if(item?.type!=='message')continue;
    for(const c of item?.content||[])if(c?.type==='output_text'&&c?.text)parts.push(c.text);
  }
  return parts.join('\n').trim();
}

function parseJson(text){
  try{
    const cleaned=String(text||'').replace(/^```(?:json)?/i,'').replace(/```$/i,'').trim();
    const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
    if(start<0||end<=start)return null;
    return JSON.parse(cleaned.slice(start,end+1));
  }catch{return null;}
}

async function callOpenAI(apiKey,payload){
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data?.error?.message||`OpenAI request failed (${response.status})`);
  return data;
}

const ANALYSIS_INSTRUCTIONS=`You are the MMGC Tender Document Intelligence Engine for procurement work in Lesotho. Read the supplied tender material exactly as written and extract only information supported by the document. Do not invent missing facts. Return ONLY valid JSON with this exact top-level shape:
{
  "document":{"title":"","issuer":"","reference":"","procurement_type":"","currency":"M","page_count":null,"confidence":"high|medium|low"},
  "deadline":{"value":"","label":"","confidence":"high|medium|low","evidence":""},
  "site_visit":{"state":"required|optional|none|unknown|passed","date":"","venue":"","label":"","confidence":"high|medium|low","evidence":""},
  "pre_bid":{"state":"required|optional|none|unknown|passed","date":"","venue":"","label":"","confidence":"high|medium|low","evidence":""},
  "document_fee":{"amount":null,"currency":"M","label":"","confidence":"high|medium|low","evidence":""},
  "bid_security":{"state":"required|declaration|none|unknown","amount":null,"percent":null,"currency":"M","label":"","confidence":"high|medium|low","evidence":""},
  "submission":{"method":"","address":"","copies":"","label":"","confidence":"high|medium|low","evidence":""},
  "eligibility":[],
  "mandatory_documents":[],
  "lots":[{"lot":"","title":"","description":""}],
  "boq":[{"index":1,"item_no":"","description":"","specification":"","unit":"","quantity":null,"page":null,"lot":"","confidence":"high|medium|low","source_text":""}],
  "commercial":{"vat_percent":null,"delivery_period":"","warranty":"","payment_terms":""},
  "risks":[{"severity":"high|medium|low","title":"","detail":""}],
  "missing_to_verify":[],
  "summary":""
}
Rules: preserve item descriptions/specifications closely; separate quantity from unit; do not mistake page numbers, clause numbers, rates or totals for quantities. For BOQs/pricing schedules, include every identifiable priceable line item you can support. Exclude headings, subtotals, totals and blank allowance rows unless they are genuinely priceable. Cite page numbers when page markers are supplied. A site visit or pre-bid state is 'passed' only when the supplied date is clearly earlier than 10 September 2026. If there is no clear evidence either way use 'unknown', not 'none'.`;

const PRICE_INSTRUCTIONS=`You are the MMGC Procurement Market Pricing Engine. Research CURRENT market unit costs for the supplied BOQ items. Priority geography: (1) Bloemfontein, Free State; (2) established South African suppliers; (3) Lesotho suppliers when publicly priced. Match exact specifications/models first. Never invent a price. If exact or sufficiently compatible current evidence cannot be found, return unit_cost null. Return ONLY valid JSON:
{"items":[{"index":1,"description":"","unit_cost":null,"currency":"M","supplier":"","location":"","source_url":"","vat_status":"included|excluded|unknown","stock":"","confidence":"high|medium|low","match":"exact|compatible|weak|quotation_required","note":""}],"transport":null,"other_costs":null,"sourcing_summary":"","unpriced_count":0}
Treat Maloti and South African Rand at par for planning. Do not add MMGC markup/profit. Do not convert retail pack price into unit price unless pack size is clear. For labour/works/services where a public unit price is not credible, use null and recommend supplier/subcontractor quotation.`;

export default async function handler(req,res){
  allowCors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  const apiKey=process.env.OPENAI_API_KEY;
  if(req.method==='GET')return res.status(200).json({status:'ok',service:'MMGC Tender Document Intelligence Engine',configured:Boolean(apiKey),model:'gpt-5.6-terra',modes:['analyze_text','analyze_pdf','price']});
  if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
  if(!apiKey)return res.status(503).json({error:'MMGC AI is not configured on the server.'});

  const mode=String(req.body?.mode||'analyze_text');
  if(!['analyze_text','analyze_pdf','price'].includes(mode))return res.status(400).json({error:'Unsupported intelligence mode.'});

  try{
    let payload;
    if(mode==='price'){
      const intelligence=req.body?.intelligence;
      if(!intelligence||!Array.isArray(intelligence.boq)||!intelligence.boq.length)return res.status(400).json({error:'No BOQ items supplied for pricing.'});
      const compact={document:intelligence.document,commercial:intelligence.commercial,boq:intelligence.boq.slice(0,120).map(x=>({index:x.index,item_no:x.item_no,description:x.description,specification:x.specification,unit:x.unit,quantity:x.quantity,lot:x.lot}))};
      payload={model:'gpt-5.6-terra',reasoning:{effort:'medium'},instructions:PRICE_INSTRUCTIONS,input:`Price this tender BOQ:\n${JSON.stringify(compact)}`,tools:[{type:'web_search_preview',search_context_size:'medium',user_location:{type:'approximate',country:'ZA',city:'Bloemfontein',region:'Free State'}}],tool_choice:'auto',max_output_tokens:7000,store:false};
    }else if(mode==='analyze_pdf'){
      const fileData=String(req.body?.file_data||'');
      const filename=String(req.body?.filename||'tender.pdf').slice(0,180);
      if(!fileData||fileData.length>4_200_000)return res.status(413).json({error:'Scanned PDF fallback supports files up to about 3 MB. Use a text-readable PDF or a smaller scan.'});
      payload={model:'gpt-5.6-terra',reasoning:{effort:'medium'},instructions:ANALYSIS_INSTRUCTIONS,input:[{role:'user',content:[{type:'input_text',text:'Analyse this tender PDF and extract procurement intelligence and every identifiable BOQ/pricing item.'},{type:'input_file',filename,file_data:fileData}]}],max_output_tokens:10000,store:false};
    }else{
      const text=String(req.body?.text||'');
      const filename=String(req.body?.filename||'tender.pdf').slice(0,180);
      const pageCount=Number(req.body?.page_count||0)||null;
      if(!text.trim())return res.status(400).json({error:'No readable tender text supplied.'});
      if(text.length>120000)return res.status(413).json({error:'Tender extract is too large. Reduce selected pages.'});
      payload={model:'gpt-5.6-terra',reasoning:{effort:'medium'},instructions:ANALYSIS_INSTRUCTIONS,input:`Filename: ${filename}\nPDF pages: ${pageCount||'unknown'}\n\nTENDER PAGE EXTRACTS:\n${text}`,max_output_tokens:10000,store:false};
    }

    const data=await callOpenAI(apiKey,payload);
    const text=extractText(data);
    const parsed=parseJson(text);
    if(!parsed)return res.status(502).json({error:'The AI read the tender but could not structure the result safely.',raw:text.slice(0,3000)});
    if(mode==='price')return res.status(200).json({pricing:parsed,model:data.model||payload.model,response_id:data.id});
    return res.status(200).json({intelligence:parsed,model:data.model||payload.model,response_id:data.id});
  }catch(error){
    console.error('Tender intelligence error',error);
    return res.status(500).json({error:error?.message||'Tender intelligence analysis failed.'});
  }
}
