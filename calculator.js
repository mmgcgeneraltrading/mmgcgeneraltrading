document.addEventListener('DOMContentLoaded', () => {
  ['ai-bridge.css','calculator-modern.css'].forEach(href=>{if(!document.querySelector(`link[href="${href}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);}});
  const tenders = Array.isArray(window.MMGC_TENDERS) ? window.MMGC_TENDERS : [];
  const select = document.getElementById('calculator-tender');
  const currency = document.getElementById('currency');
  const items = document.getElementById('line-items');
  const addBtn = document.getElementById('add-line');
  const money = value => `${currency.value}${Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const num = id => Number(document.getElementById(id)?.value || 0);
  let lineId = 0;

  tenders.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=`${t.issuer} — ${t.title}`; select.appendChild(o); });
  const requested = new URLSearchParams(location.search).get('tender');
  if (requested && tenders.some(t=>t.id===requested)) select.value=requested;

  const addLine = (desc='',qty=1,unit=0) => {
    const row=document.createElement('div'); row.className='calc-line'; row.dataset.line=String(++lineId);
    row.innerHTML=`<label>Description<input class="line-desc" type="text" value="${String(desc).replace(/"/g,'&quot;')}" placeholder="Item / activity"></label><label>Qty<input class="line-qty" type="number" min="0" step="0.01" value="${qty}"></label><label>Unit cost<input class="line-unit" type="number" min="0" step="0.01" value="${unit}"></label><div class="line-total"><small>Total</small><b>${money(qty*unit)}</b></div><button class="remove-line" type="button" aria-label="Remove line">×</button>`;
    items.appendChild(row); recalc();
  };
  addLine('Primary item / activity',1,0);
  addLine('Accessories / supporting items',1,0);

  const selectedTender = () => tenders.find(t=>t.id===select.value);
  const extractQty = text => {
    const m=String(text||'').match(/(?:quantity|qty)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
    return m ? Number(m[1]) : 1;
  };
  const extractMoney = text => {
    const cleaned=String(text||'').replace(/,/g,'');
    const m=cleaned.match(/(?:M|R|LSL|ZAR)\s*(\d+(?:\.\d+)?)/i);
    return m ? Number(m[1]) : null;
  };
  const extractPercent = text => {
    const m=String(text||'').match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? Number(m[1]) : null;
  };
  const recommendedDefaults = t => {
    const cats=(t?.categories||[]).map(x=>String(x).toLowerCase());
    if(cats.includes('construction')||cats.includes('works')) return {overheads:10,contingency:7.5,markup:15};
    if(cats.includes('cleaning')) return {overheads:12,contingency:5,markup:15};
    if(cats.includes('services')||cats.includes('consulting')) return {overheads:10,contingency:5,markup:18};
    return {overheads:7.5,contingency:5,markup:15};
  };
  const applyTenderDefaults = (force=false) => {
    const t=selectedTender(); if(!t)return;
    const d=recommendedDefaults(t);
    [['overheads',d.overheads],['contingency',d.contingency],['markup',d.markup],['vat',15]].forEach(([id,value])=>{
      const el=document.getElementById(id); if(el&&(force||Number(el.value||0)===0||id==='vat')) el.value=value;
    });
    const fee=extractMoney(t.documentFee?.label);
    if(fee!==null && t.documentFee?.state!=='unknown') document.getElementById('doc-fee').value=fee;
    else if(force) document.getElementById('doc-fee').value=0;
    const sec=extractPercent(t.bidSecurity?.label);
    document.getElementById('security-rate').value=sec!==null?sec:0;
    recalc();
  };
  const loadTenderLines = (force=false) => {
    const t=selectedTender();
    if (!t) return;
    const defaults=['Primary item / activity','Accessories / supporting items'];
    const isDefault = items.children.length <= 2 && Array.from(items.querySelectorAll('.line-desc')).every((x,i)=>defaults[i]===x.value);
    if ((force || isDefault) && (t.lots||[]).length) {
      items.innerHTML=''; lineId=0;
      (t.lots||[]).forEach(l=>addLine(l.title,extractQty(`${l.title} ${l.text||l.description||''}`),0));
      addLine('Additional / supporting item',1,0);
    }
    applyTenderDefaults(force);
    updateSmartBar();
  };

  function getLines(){
    return Array.from(document.querySelectorAll('.calc-line')).map(row=>({description:row.querySelector('.line-desc')?.value.trim()||'Unnamed item',qty:Number(row.querySelector('.line-qty')?.value||0),unit:Number(row.querySelector('.line-unit')?.value||0)}));
  }
  function calculate(){
    const lines=getLines();
    const subtotal=lines.reduce((s,x)=>s+x.qty*x.unit,0);
    const doc=num('doc-fee'), transport=num('transport'), other=num('other-costs');
    const direct=subtotal+doc+transport+other;
    const overhead=direct*(num('overheads')/100);
    const contingency=(direct+overhead)*(num('contingency')/100);
    const beforeMarkup=direct+overhead+contingency;
    const markup=beforeMarkup*(num('markup')/100);
    const exvat=beforeMarkup+markup;
    const vat=exvat*(num('vat')/100);
    const total=exvat+vat;
    const security=total*(num('security-rate')/100);
    return {lines,subtotal,doc,transport,other,overhead,contingency,beforeMarkup,markup,exvat,vat,total,security};
  }
  function recalc(){
    const c=calculate();
    document.querySelectorAll('.calc-line').forEach((row,i)=>{ const x=c.lines[i]; if(x) row.querySelector('.line-total b').textContent=money(x.qty*x.unit); });
    const values={'sum-items':c.subtotal,'sum-doc':c.doc,'sum-transport':c.transport,'sum-other':c.other,'sum-overheads':c.overhead,'sum-contingency':c.contingency,'sum-cost':c.beforeMarkup,'sum-markup':c.markup,'sum-exvat':c.exvat,'sum-vat':c.vat,'sum-total':c.total,'sum-security':c.security};
    Object.entries(values).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=money(v);});
  }

  const tenderContext = () => {
    const t=selectedTender();
    if(!t) return 'General procurement / tender costing with no specific tender selected.';
    return [`Tender: ${t.title}`,`Issuer: ${t.issuer}`,`Reference: ${t.ref||'not recorded'}`,`Deadline: ${t.deadlineLabel||'verify'}`,`Official source: ${t.official||'not provided'}`,`Summary: ${t.summary||''}`,`Document fee: ${t.documentFee?.label||'verify'}`,`Bid security: ${t.bidSecurity?.label||'verify'}`,`Site visit: ${t.siteVisit?.label||'verify'}`,`Lots/items: ${(t.lots||[]).map((l,i)=>`${i+1}. ${l.title}: ${l.text||l.description||''}`).join(' | ')||'not recorded'}`].join('\n');
  };
  const researchPrompt = () => {
    const c=calculate();
    const lines=c.lines.filter(x=>x.description&&!/^Additional \/ supporting item$/i.test(x.description)).map((x,i)=>`${i+1}. ${x.description} — quantity ${x.qty}`).join('\n');
    return `Research current procurement costs for MMGC General Trading in Lesotho.\n\n${tenderContext()}\n\nItems to research:\n${lines}\n\nUse live web search and CURRENT market evidence. Prioritize manufacturer/official product pages, authorised distributors/resellers, and established national or regional suppliers. Prefer exact specifications and exact model numbers. For South African sourcing, state realistic freight/delivery implications into Lesotho. Never invent a price. If reliable pricing is unavailable, say supplier quotation required. Verify official tender requirements independently before submission.`;
  };
  const autofillPrompt = () => {
    const c=calculate();
    const lines=c.lines.map((x,i)=>`${i+1}. ${x.description} | quantity ${x.qty}`).join('\n');
    return `Auto-fill market unit costs for this MMGC tender calculator.\n\n${tenderContext()}\n\nCalculator lines:\n${lines}\n\nResearch CURRENT prices. Match the line index exactly. Only provide a numeric unit cost when supported by credible current evidence. If a line is generic or insufficiently specified, return null rather than guessing. Currency should preferably be Maloti/Rand because they are at par. Do not invent transport or other costs unless there is credible evidence.`;
  };
  const reviewPrompt = () => {
    const c=calculate();
    const lineText=c.lines.map((x,i)=>`${i+1}. ${x.description}: Qty ${x.qty} × ${currency.value}${x.unit.toFixed(2)} = ${currency.value}${(x.qty*x.unit).toFixed(2)}`).join('\n');
    return `Review this MMGC tender cost estimate as a procurement and commercial analyst.\n\n${tenderContext()}\n\nCurrent calculator:\n${lineText}\nTender document fee: ${money(c.doc)}\nTransport/delivery: ${money(c.transport)}\nOther direct costs: ${money(c.other)}\nOverheads: ${num('overheads')}% = ${money(c.overhead)}\nContingency: ${num('contingency')}% = ${money(c.contingency)}\nCost before markup: ${money(c.beforeMarkup)}\nMarkup/profit: ${num('markup')}% = ${money(c.markup)}\nTender price excl. VAT: ${money(c.exvat)}\nVAT: ${num('vat')}% = ${money(c.vat)}\nTender price incl. VAT: ${money(c.total)}\nBid security estimate: ${num('security-rate')}% = ${money(c.security)}\n\nCheck arithmetic, missing costs, VAT treatment, logistics, overheads, contingency, markup and commercial risk. Distinguish verified facts from estimates and never invent prices.`;
  };

  const endpointCandidates=()=>{
    const saved=localStorage.getItem('mmgcAiEndpoint');
    const list=[];
    if(saved) list.push(saved.replace(/\/$/,'')+'/api/tender-ai');
    if(location.hostname.endsWith('vercel.app')) list.push('/api/tender-ai');
    if(location.hostname.endsWith('github.io')) list.push('https://mmgcgeneraltrading-github-io.vercel.app/api/tender-ai');
    if(!list.length) list.push('/api/tender-ai');
    return [...new Set(list)];
  };
  async function openChatGPT(prompt){try{await navigator.clipboard.writeText(prompt);}catch{} window.open(`https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`,'_blank','noopener');}
  async function postAI(mode,prompt){
    let lastError='Live AI service is not reachable.';
    for(const endpoint of endpointCandidates()){
      try{
        const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,prompt})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok){lastError=data.error||`AI service returned ${response.status}`;continue;}
        return data;
      }catch(err){lastError=err?.message||lastError;}
    }
    throw new Error(lastError);
  }
  async function callLiveAI(mode,prompt){
    const result=document.getElementById('ai-live-result'); const status=document.getElementById('ai-live-status');
    const buttons=document.querySelectorAll('.ai-cost-actions button');
    if(status){status.textContent='MMGC AI is checking the tender and current market data…';status.className='ai-live-status working';}
    if(result){result.hidden=false;result.textContent='Working…';} buttons.forEach(b=>b.disabled=true);
    try{
      const data=await postAI(mode,prompt);
      if(result){result.textContent=data.text||'No analysis was returned.';result.hidden=false;}
      if(status){status.textContent=`Live MMGC AI result · ${data.model||'OpenAI'}`;status.className='ai-live-status ready';}
    }catch(err){
      if(result){result.textContent='The embedded AI service could not complete this request. Opening the same request in ChatGPT.';result.hidden=false;}
      if(status){status.textContent=err.message;status.className='ai-live-status fallback';}
      await openChatGPT(prompt);
    }finally{buttons.forEach(b=>b.disabled=false);}
  }
  async function autoFillPrices(){
    const status=document.getElementById('ai-live-status'); const result=document.getElementById('ai-live-result'); const btn=document.getElementById('ai-autofill-prices');
    if(btn)btn.disabled=true; if(status){status.textContent='Researching current prices and matching them to your line items…';status.className='ai-live-status working';}
    try{
      const data=await postAI('autofill',autofillPrompt()); const fill=data.autofill; if(!fill?.items)throw new Error('No safe price matches were returned.');
      const rows=Array.from(document.querySelectorAll('.calc-line')); let filled=0;
      fill.items.forEach(x=>{const idx=Number(x.index)-1;const cost=Number(x.unit_cost);if(rows[idx]&&Number.isFinite(cost)&&cost>0){rows[idx].querySelector('.line-unit').value=cost;rows[idx].dataset.source=x.source||'';filled++;}});
      if(Number.isFinite(Number(fill.transport))&&Number(fill.transport)>=0) document.getElementById('transport').value=Number(fill.transport);
      if(Number.isFinite(Number(fill.other_costs))&&Number(fill.other_costs)>=0) document.getElementById('other-costs').value=Number(fill.other_costs);
      recalc();
      const detail=fill.items.map(x=>`${x.index}. ${x.description}: ${x.unit_cost==null?'quotation required':`${x.currency||'M'}${Number(x.unit_cost).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} · ${x.source||'source not named'} · ${x.confidence||'verify'} confidence${x.note?` · ${x.note}`:''}`).join('\n');
      if(result){result.hidden=false;result.textContent=`Auto-filled ${filled} line item${filled===1?'':'s'}. Verify before bidding.\n\n${detail}${fill.note?`\n\n${fill.note}`:''}`;}
      if(status){status.textContent=`${filled} current market price${filled===1?'':'s'} added to the calculator`;status.className='ai-live-status ready';}
    }catch(err){if(status){status.textContent=err.message;status.className='ai-live-status fallback';}if(result){result.hidden=false;result.textContent='No prices were inserted automatically. Use Research Current Prices for a detailed sourcing review.';}}
    finally{if(btn)btn.disabled=false;}
  }

  const calcLayout=document.querySelector('.calculator-layout');
  const calcTop=document.querySelector('.calculator-top');
  if(calcTop&&!document.getElementById('calc-smartbar')){
    const bar=document.createElement('div');bar.id='calc-smartbar';bar.className='calc-smartbar';
    bar.innerHTML=`<div><strong><span class="calculator-pulse"></span><span id="smart-title">Smart tender setup ready</span></strong><span id="smart-detail">Select a tender and MMGC will prefill known quantities, fees and recommended commercial percentages.</span></div><div class="calc-smart-actions"><button class="smart-primary" id="smart-fill" type="button">Auto-fill Tender Setup</button><button class="smart-secondary" id="smart-reset" type="button">Reset</button></div>`;
    calcTop.insertAdjacentElement('afterend',bar);
    document.getElementById('smart-fill').addEventListener('click',()=>{if(selectedTender())loadTenderLines(true);else applyGeneralDefaults();});
    document.getElementById('smart-reset').addEventListener('click',()=>{items.innerHTML='';lineId=0;addLine('Primary item / activity',1,0);addLine('Accessories / supporting items',1,0);['doc-fee','transport','other-costs','overheads','contingency','markup','security-rate'].forEach(id=>document.getElementById(id).value=0);document.getElementById('vat').value=15;recalc();updateSmartBar();});
  }
  if(calcLayout && !document.getElementById('ai-cost-panel')){
    const panel=document.createElement('section'); panel.id='ai-cost-panel';panel.className='ai-cost-panel';
    panel.innerHTML=`<span class="ai-badge">LIVE MMGC AI COSTING</span><h3>Current-price research built into your calculator.</h3><p>Select a tender, confirm quantities, then let MMGC AI research current supplier pricing or review the completed estimate.</p><div class="ai-cost-actions"><button id="ai-autofill-prices" class="ai-autofill" type="button">✨ AI Auto-fill Prices</button><button id="ai-research-prices" class="ai-research" type="button">Research Current Prices</button><button id="ai-review-estimate" class="ai-review" type="button">Review My Estimate</button></div><div id="ai-live-status" class="ai-live-status">Ready when you are.</div><pre id="ai-live-result" class="ai-live-result" hidden></pre><div class="ai-result-actions"><button id="copy-ai-result" type="button">Copy Result</button><button id="open-in-chatgpt" type="button">Continue in ChatGPT</button></div><p class="ai-cost-note">Auto-fill only inserts prices when MMGC AI finds credible current evidence. Generic or unclear items stay blank for supplier quotation. Always verify the official BOQ and final tender total.</p>`;
    calcLayout.parentElement.insertBefore(panel,calcLayout);
    document.getElementById('ai-autofill-prices')?.addEventListener('click',autoFillPrices);
    document.getElementById('ai-research-prices')?.addEventListener('click',()=>callLiveAI('research',researchPrompt()));
    document.getElementById('ai-review-estimate')?.addEventListener('click',()=>callLiveAI('review',reviewPrompt()));
    document.getElementById('copy-ai-result')?.addEventListener('click',async e=>{const text=document.getElementById('ai-live-result')?.textContent||'';if(!text)return;try{await navigator.clipboard.writeText(text);e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent='Copy Result',1000);}catch{}});
    document.getElementById('open-in-chatgpt')?.addEventListener('click',()=>openChatGPT(reviewPrompt()));
  }
  function applyGeneralDefaults(){document.getElementById('overheads').value=7.5;document.getElementById('contingency').value=5;document.getElementById('markup').value=15;document.getElementById('vat').value=15;recalc();updateSmartBar();}
  function updateSmartBar(){
    const t=selectedTender(); const title=document.getElementById('smart-title'); const detail=document.getElementById('smart-detail'); if(!title||!detail)return;
    if(t){title.textContent=`${t.title} loaded`;detail.textContent=`Known tender data prefilled where available · Deadline ${t.deadlineLabel||'verify'} · Unknown costs remain blank for safe verification.`;}
    else{title.textContent='Smart tender setup ready';detail.textContent='Select a tender and MMGC will prefill known quantities, fees and recommended commercial percentages.';}
  }
  function updateAIPanel(){const panel=document.getElementById('ai-cost-panel');const t=selectedTender();const p=panel?.querySelector('p');if(p)p.textContent=t?`Selected tender: “${t.title}”. AI price matching will use its tender snapshot plus your current quantities.`:'Select a tender or use general costing. AI will use the current line items and commercial allowances.';updateSmartBar();}

  select.addEventListener('change', () => { loadTenderLines(true); recalc(); updateAIPanel(); });
  if(requested) loadTenderLines(true); else applyGeneralDefaults();
  document.addEventListener('input', e => { if (e.target.closest('.calculator-section')) recalc(); });
  currency.addEventListener('change', recalc);
  addBtn.addEventListener('click',()=>addLine('',1,0));
  items.addEventListener('click',e=>{const b=e.target.closest('.remove-line');if(!b)return;b.closest('.calc-line')?.remove();recalc();});
  document.getElementById('print-costing')?.addEventListener('click',()=>window.print());
  document.getElementById('download-costing')?.addEventListener('click',()=>{
    const t=selectedTender(); const c=calculate();
    const rows=[['MMGC Tender Cost Calculator'],['Tender',t?.title||'General costing'],['Issuer',t?.issuer||''],[],['Description','Quantity','Unit Cost','Line Total']];
    c.lines.forEach(x=>rows.push([x.description,x.qty,x.unit,x.qty*x.unit]));
    rows.push([],['Document fee',num('doc-fee')],['Transport / delivery',num('transport')],['Other direct costs',num('other-costs')],['Overheads %',num('overheads')],['Contingency %',num('contingency')],['Markup / profit %',num('markup')],['VAT %',num('vat')],['Bid security %',num('security-rate')],[],['Tender price incl. VAT',c.total],['CAUTION','Client/bidder must independently proof final BOQ quantities, arithmetic and tender total before submission.']);
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`MMGC-Tender-Costing-${t?.id||'general'}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  });
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  recalc();updateAIPanel();
});