document.addEventListener('DOMContentLoaded', () => {
  if(!document.querySelector('link[href="ai-bridge.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='ai-bridge.css';document.head.appendChild(l);}
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
  const loadTenderLines = (force=false) => {
    const t=selectedTender();
    if (!t) return;
    const isDefault = items.children.length <= 2 && Array.from(items.querySelectorAll('.line-desc')).every((x,i)=>['Primary item / activity','Accessories / supporting items'][i]===x.value);
    if ((force || isDefault) && (t.lots||[]).length) {
      items.innerHTML=''; lineId=0;
      (t.lots||[]).forEach(l=>addLine(l.title,1,0));
    }
    const feeText=t.documentFee?.label||'';
    const feeMatch=feeText.replace(/,/g,'').match(/(?:M|R|LSL|ZAR)?\s*(\d+(?:\.\d+)?)/i);
    if(feeMatch && t.documentFee?.state!=='unknown') document.getElementById('doc-fee').value=feeMatch[1];
  };
  select.addEventListener('change', () => { loadTenderLines(); recalc(); updateAIPanel(); });
  if(requested) loadTenderLines(true);

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
    const lines=c.lines.map((x,i)=>`${i+1}. ${x.description} — quantity ${x.qty}`).join('\n');
    return `Research current procurement costs for MMGC General Trading in Lesotho.\n\n${tenderContext()}\n\nItems to research:\n${lines}\n\nUse live web search and CURRENT market evidence. Prioritize the highest-quality credible sources in this order: manufacturer/official product page, authorised distributor/reseller, established national or regional supplier/retailer. Prefer exact model numbers and exact technical compliance. For South African sourcing, include realistic freight/delivery into Lesotho where relevant.\n\nFor every priced line return: exact specification matched, quantity, supplier/source, source link, currency, unit price, VAT status, delivery/freight assumption, warranty/authorisation evidence where relevant, estimated landed unit cost, estimated total cost and confidence. Do not invent a price. If reliable pricing is unavailable, say what supplier quotation must be requested.\n\nAlso identify any tender-document fee, bid security, compulsory site visit or pre-bid requirement that must be verified. The bidder remains responsible for independently proofing final BOQ quantities, arithmetic and tender total.`;
  };
  const reviewPrompt = () => {
    const c=calculate();
    const lineText=c.lines.map((x,i)=>`${i+1}. ${x.description}: Qty ${x.qty} × ${currency.value}${x.unit.toFixed(2)} = ${currency.value}${(x.qty*x.unit).toFixed(2)}`).join('\n');
    return `Review this MMGC tender cost estimate as a procurement and commercial analyst.\n\n${tenderContext()}\n\nCurrent calculator:\n${lineText}\nTender document fee: ${money(c.doc)}\nTransport/delivery: ${money(c.transport)}\nOther direct costs: ${money(c.other)}\nOverheads: ${num('overheads')}% = ${money(c.overhead)}\nContingency: ${num('contingency')}% = ${money(c.contingency)}\nCost before markup: ${money(c.beforeMarkup)}\nMarkup/profit: ${num('markup')}% = ${money(c.markup)}\nTender price excl. VAT: ${money(c.exvat)}\nVAT: ${num('vat')}% = ${money(c.vat)}\nTender price incl. VAT: ${money(c.total)}\nBid security estimate: ${num('security-rate')}% = ${money(c.security)}\n\nCheck arithmetic, missing costs, VAT treatment, logistics, overheads, contingency, markup and commercial risk. Use current market verification where useful and distinguish verified facts from estimates. Never invent prices. The bidder must independently proof the official BOQ and final tender total.`;
  };

  const endpointCandidates=()=>{
    const saved=localStorage.getItem('mmgcAiEndpoint');
    const list=[];
    if(saved) list.push(saved.replace(/\/$/,'')+'/api/tender-ai');
    if(location.hostname.endsWith('vercel.app')) list.push('/api/tender-ai');
    if(location.hostname.endsWith('github.io')){
      list.push('https://mmgcgeneraltrading-github-io.vercel.app/api/tender-ai');
      list.push('https://mmgcgeneraltrading.vercel.app/api/tender-ai');
    }
    if(!list.length) list.push('/api/tender-ai');
    return [...new Set(list)];
  };
  async function openChatGPT(prompt){
    try{await navigator.clipboard.writeText(prompt);}catch{}
    window.open(`https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`,'_blank','noopener');
  }
  async function callLiveAI(mode,prompt){
    const result=document.getElementById('ai-live-result');
    const status=document.getElementById('ai-live-status');
    const researchBtn=document.getElementById('ai-research-prices');
    const reviewBtn=document.getElementById('ai-review-estimate');
    if(status){status.textContent='MMGC AI is checking the tender and current market data…';status.className='ai-live-status working';}
    if(result){result.hidden=false;result.textContent='Working…';}
    [researchBtn,reviewBtn].forEach(b=>{if(b)b.disabled=true;});
    let lastError='Live AI service is not yet reachable.';
    for(const endpoint of endpointCandidates()){
      try{
        const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,prompt})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok){lastError=data.error||`AI service returned ${response.status}`;continue;}
        if(result){result.textContent=data.text||'No analysis was returned.';result.hidden=false;}
        if(status){status.textContent=`Live MMGC AI result · ${data.model||'OpenAI'}`;status.className='ai-live-status ready';}
        [researchBtn,reviewBtn].forEach(b=>{if(b)b.disabled=false;});
        return;
      }catch(err){lastError=err?.message||lastError;}
    }
    if(result){result.textContent='The embedded AI backend is not active on this domain yet. The same tender context can still be sent to ChatGPT in one click.';result.hidden=false;}
    if(status){status.textContent=lastError;status.className='ai-live-status fallback';}
    [researchBtn,reviewBtn].forEach(b=>{if(b)b.disabled=false;});
    await openChatGPT(prompt);
  }

  const calcLayout=document.querySelector('.calculator-layout');
  if(calcLayout && !document.getElementById('ai-cost-panel')){
    const panel=document.createElement('section');
    panel.id='ai-cost-panel';panel.className='ai-cost-panel';
    panel.innerHTML=`<span class="ai-badge">LIVE MMGC AI COSTING</span><h3>Research prices or review this estimate with ChatGPT.</h3><p>Select a tender, check the line items, then ask MMGC AI to research current market prices or review the commercial estimate.</p><div class="ai-cost-actions"><button id="ai-research-prices" class="ai-research" type="button">Research Current Prices</button><button id="ai-review-estimate" class="ai-review" type="button">Review My Estimate</button></div><div id="ai-live-status" class="ai-live-status">Ready when you are.</div><pre id="ai-live-result" class="ai-live-result" hidden></pre><div class="ai-result-actions"><button id="copy-ai-result" type="button">Copy Result</button><button id="open-in-chatgpt" type="button">Continue in ChatGPT</button></div><p class="ai-cost-note">Live embedded analysis uses a Vercel serverless OpenAI endpoint when activated. If that service is unavailable, the same request opens in ChatGPT automatically. Verify all prices and tender requirements before submission.</p>`;
    calcLayout.parentElement.insertBefore(panel,calcLayout);
    document.getElementById('ai-research-prices')?.addEventListener('click',()=>callLiveAI('research',researchPrompt()));
    document.getElementById('ai-review-estimate')?.addEventListener('click',()=>callLiveAI('review',reviewPrompt()));
    document.getElementById('copy-ai-result')?.addEventListener('click',async e=>{const text=document.getElementById('ai-live-result')?.textContent||'';if(!text)return;try{await navigator.clipboard.writeText(text);e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent='Copy Result',1000);}catch{}});
    document.getElementById('open-in-chatgpt')?.addEventListener('click',()=>openChatGPT(reviewPrompt()));
  }
  function updateAIPanel(){
    const panel=document.getElementById('ai-cost-panel');
    const t=selectedTender();
    const p=panel?.querySelector('p');
    if(p) p.textContent=t?`Selected tender: “${t.title}”. MMGC AI will use this Tender Snapshot together with the current calculator lines.`:'Select a tender or use general costing. MMGC AI will use the current line items and commercial allowances.';
  }

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