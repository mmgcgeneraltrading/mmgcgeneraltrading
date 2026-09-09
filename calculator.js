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
    return Array.from(document.querySelectorAll('.calc-line')).map(row=>({
      description:row.querySelector('.line-desc')?.value.trim()||'Unnamed item',
      qty:Number(row.querySelector('.line-qty')?.value||0),
      unit:Number(row.querySelector('.line-unit')?.value||0)
    }));
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
    const values={
      'sum-items':c.subtotal,'sum-doc':c.doc,'sum-transport':c.transport,'sum-other':c.other,'sum-overheads':c.overhead,'sum-contingency':c.contingency,'sum-cost':c.beforeMarkup,'sum-markup':c.markup,'sum-exvat':c.exvat,'sum-vat':c.vat,'sum-total':c.total,'sum-security':c.security
    };
    Object.entries(values).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=money(v);});
  }

  const copyPrompt = async prompt => {
    try{await navigator.clipboard.writeText(prompt);return true;}catch{return false;}
  };
  const openChatGPT = async prompt => {
    const copied=await copyPrompt(prompt);
    const status=document.getElementById('ai-copy-status');
    if(status){status.textContent=copied?'Costing prompt copied. ChatGPT is opening with the same request. If it does not prefill automatically, paste the copied prompt.':'ChatGPT is opening. If the prompt is not prefilled, copy the request from this calculator manually.';status.classList.add('show');}
    const url=`https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`;
    window.open(url,'_blank','noopener');
  };
  const tenderContext = () => {
    const t=selectedTender();
    if(!t) return 'General procurement / tender costing with no specific tender selected.';
    return [
      `Tender: ${t.title}`,
      `Issuer: ${t.issuer}`,
      `Reference: ${t.ref||'not recorded'}`,
      `Deadline: ${t.deadlineLabel||'verify'}`,
      `Official source: ${t.official||'not provided'}`,
      `Summary: ${t.summary||''}`,
      `Document fee: ${t.documentFee?.label||'verify'}`,
      `Bid security: ${t.bidSecurity?.label||'verify'}`,
      `Site visit: ${t.siteVisit?.label||'verify'}`,
      `Lots/items: ${(t.lots||[]).map((l,i)=>`${i+1}. ${l.title}: ${l.text||l.description||''}`).join(' | ')||'not recorded'}`
    ].join('\n');
  };
  const researchPrompt = () => {
    const c=calculate();
    const lines=c.lines.map((x,i)=>`${i+1}. ${x.description} — quantity ${x.qty}`).join('\n');
    return `You are assisting with procurement costing for MMGC General Trading in Lesotho. Use live web search and CURRENT market evidence.\n\n${tenderContext()}\n\nItems currently in the MMGC calculator:\n${lines}\n\nResearch the likely acquisition cost of these items/services. Prioritize the highest-quality credible sources in this order: manufacturer or official product page, authorised distributor/reseller, established national or regional supplier/retailer. Prefer exact product/model numbers and exact technical compliance. Avoid low-confidence marketplace listings when stronger sources exist. For South African sourcing, consider realistic delivery/freight into Lesotho where relevant.\n\nFor every priced line return: exact specification matched, quantity, supplier/source, source link, source date/currentness, currency, unit price, whether VAT is included/excluded, delivery/freight assumption, warranty/authorisation evidence if relevant, estimated landed unit cost, estimated total cost, and confidence level. Do not invent a price. If a reliable price cannot be verified, say so and identify what quotation should be requested.\n\nAlso identify any tender-document fee, bid security, compulsory site visit or pre-bid requirement that must be verified before pricing. If the official bidding document is not accessible or the specification is incomplete, clearly state that the bidder should upload/provide the document before final costing.\n\nImportant: the bidder is responsible for independently proofing the final BOQ quantities, arithmetic and tendered total before submission.`;
  };
  const reviewPrompt = () => {
    const c=calculate();
    const lineText=c.lines.map((x,i)=>`${i+1}. ${x.description}: Qty ${x.qty} × ${currency.value}${x.unit.toFixed(2)} = ${currency.value}${(x.qty*x.unit).toFixed(2)}`).join('\n');
    return `Review this MMGC tender cost estimate as a procurement and commercial analyst.\n\n${tenderContext()}\n\nCurrent calculator:\n${lineText}\nTender document fee: ${money(c.doc)}\nTransport/delivery: ${money(c.transport)}\nOther direct costs: ${money(c.other)}\nOverheads: ${num('overheads')}% = ${money(c.overhead)}\nContingency: ${num('contingency')}% = ${money(c.contingency)}\nCost before markup: ${money(c.beforeMarkup)}\nMarkup/profit: ${num('markup')}% = ${money(c.markup)}\nTender price excl. VAT: ${money(c.exvat)}\nVAT: ${num('vat')}% = ${money(c.vat)}\nTender price incl. VAT: ${money(c.total)}\nBid security estimate: ${num('security-rate')}% = ${money(c.security)}\n\nCheck the arithmetic, identify missing cost categories, challenge unrealistic assumptions, and explain the commercial risks. Where current market verification would materially improve the estimate, search the web and prioritize manufacturers, authorised distributors and established suppliers. Do not invent prices. Clearly separate verified facts from estimates. The bidder must independently proof the official BOQ and final tender total.`;
  };

  const calcLayout=document.querySelector('.calculator-layout');
  if(calcLayout && !document.getElementById('ai-cost-panel')){
    const panel=document.createElement('section');
    panel.id='ai-cost-panel';panel.className='ai-cost-panel';
    panel.innerHTML=`<span class="ai-badge">CHATGPT-ASSISTED COSTING</span><h3>Research prices or review this estimate with ChatGPT.</h3><p>Send the selected tender and calculator lines into ChatGPT for source-backed market research or commercial review.</p><div class="ai-cost-actions"><button id="ai-research-prices" class="ai-research" type="button">Research Current Prices with ChatGPT</button><button id="ai-review-estimate" class="ai-review" type="button">Review My Estimate with ChatGPT</button></div><div id="ai-copy-status" class="ai-copy-status"></div><p class="ai-cost-note">ChatGPT opens in a separate tab. Product prices and tender requirements must still be verified against the official bidding document and supplier quotations.</p>`;
    calcLayout.parentElement.insertBefore(panel,calcLayout);
    document.getElementById('ai-research-prices')?.addEventListener('click',()=>openChatGPT(researchPrompt()));
    document.getElementById('ai-review-estimate')?.addEventListener('click',()=>openChatGPT(reviewPrompt()));
  }
  function updateAIPanel(){
    const panel=document.getElementById('ai-cost-panel');
    const t=selectedTender();
    if(panel) panel.querySelector('p').textContent=t?`ChatGPT will receive the MMGC snapshot for “${t.title}” plus the current calculator lines for research/review.`:'Select a tender or use general costing, then send the current calculator lines to ChatGPT for research/review.';
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
  recalc();updateAIPanel();
});