document.addEventListener('DOMContentLoaded',()=>{
  const input=document.getElementById('intelligence-pdf');
  const clearBtn=document.getElementById('intelligence-clear');
  const progress=document.getElementById('intelligence-progress');
  const fill=document.getElementById('intelligence-progress-fill');
  const status=document.getElementById('intelligence-status');
  const detail=document.getElementById('intelligence-detail');
  const result=document.getElementById('intelligence-result');
  const workspace=document.getElementById('pdf-workspace');
  const lineItems=document.getElementById('line-items');
  if(!input||!workspace||!lineItems)return;

  let currentIntelligence=null;
  let currentFile=null;
  let currentPages=[];
  const state={pricing:null};

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const endpoint=()=>location.hostname.endsWith('vercel.app')?'/api/tender-intelligence':'https://mmgcgeneraltrading-github-io.vercel.app/api/tender-intelligence';
  const setProgress=(pct,title,sub='')=>{progress.hidden=false;fill.style.width=`${Math.max(0,Math.min(100,pct))}%`;status.textContent=title;detail.textContent=sub;};
  const dispatchRecalc=()=>{const first=document.querySelector('.line-unit,.line-qty');if(first)first.dispatchEvent(new Event('input',{bubbles:true}));};

  function money(v,c='M'){if(v===null||v===undefined||v==='')return'Not stated';const n=Number(v);return Number.isFinite(n)?`${c}${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:String(v);}
  function badge(state,label){return `<span class="intel-badge ${esc(state||'unknown')}">${esc(label)}</span>`;}
  function confidence(c){return `<span class="intel-confidence ${esc(c||'low')}">${esc((c||'low').toUpperCase())}</span>`;}

  async function post(body){
    const r=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||`Analysis service returned ${r.status}`);
    return data;
  }

  async function readPdf(file){
    if(!window.pdfjsLib)throw new Error('PDF reader did not load. Refresh the page and try again.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buffer=await file.arrayBuffer();
    const pdf=await window.pdfjsLib.getDocument({data:buffer}).promise;
    const pages=[];
    let chars=0;
    for(let p=1;p<=pdf.numPages;p++){
      setProgress(8+Math.round((p/pdf.numPages)*34),`Reading page ${p} of ${pdf.numPages}…`,`${file.name} · extracting text and table content`);
      const page=await pdf.getPage(p);
      const content=await page.getTextContent();
      const text=content.items.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim();
      chars+=text.length;
      pages.push({page:p,text});
    }
    return {pages,pageCount:pdf.numPages,chars,buffer};
  }

  function pageScore(text){
    const s=String(text||'').toLowerCase();
    const terms=[
      ['bill of quantities',18],['boq',18],['price schedule',16],['pricing schedule',16],['schedule of requirements',14],['schedule of prices',14],
      ['quantity',6],['qty',6],['unit price',8],['rate',4],['amount',4],['description',3],['item no',5],
      ['site visit',12],['pre-bid',12],['pre bid',12],['bid security',12],['bid securing',12],['tender security',10],
      ['submission',6],['closing date',8],['deadline',8],['mandatory',5],['eligibility',5],['tax clearance',4],['warranty',3],['delivery',3]
    ];
    return terms.reduce((n,[term,w])=>n+(s.includes(term)?w:0),0);
  }

  function selectRelevantPages(pages){
    const selected=new Map();
    const add=p=>{if(p&&p.text)selected.set(p.page,p)};
    pages.slice(0,7).forEach(add);
    pages.slice(-5).forEach(add);
    pages.map(p=>({...p,score:pageScore(p.text)})).filter(p=>p.score>0).sort((a,b)=>b.score-a.score).slice(0,34).forEach(p=>{
      add(p);add(pages[p.page-2]);add(pages[p.page]);
    });
    return [...selected.values()].sort((a,b)=>a.page-b.page);
  }

  function buildText(pages,maxChars=110000){
    let out='';
    for(const p of pages){const block=`\n\n--- PDF PAGE ${p.page} ---\n${p.text}`;if(out.length+block.length>maxChars)break;out+=block;}
    return out.trim();
  }

  function arrayBufferToDataUrl(buffer){
    const bytes=new Uint8Array(buffer);let binary='';const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return `data:application/pdf;base64,${btoa(binary)}`;
  }

  function renderOverview(i){
    const d=i.document||{},sv=i.site_visit||{},pb=i.pre_bid||{},bs=i.bid_security||{},df=i.document_fee||{},sub=i.submission||{};
    const visitState=sv.state==='required'?'required':sv.state==='passed'?'passed':sv.state==='none'?'none':'unknown';
    const preState=pb.state==='required'?'required':pb.state==='passed'?'passed':pb.state==='none'?'none':'unknown';
    return `<div class="intel-head"><div><span class="intel-kicker">TENDER INTELLIGENCE REPORT</span><h2>${esc(d.title||currentFile?.name||'Uploaded tender')}</h2><p>${esc(d.issuer||'Issuer not confidently identified')} ${d.reference?`· Ref ${esc(d.reference)}`:''}</p></div><div class="intel-score">${confidence(d.confidence||'medium')}<small>document confidence</small></div></div>
    <div class="intel-facts">
      <div><small>Closing / deadline</small><b>${esc(i.deadline?.label||i.deadline?.value||'Verify')}</b>${confidence(i.deadline?.confidence)}</div>
      <div><small>Site visit</small><b>${esc(sv.label||sv.state||'Verify')}</b>${badge(visitState,visitState==='required'?'ACTION REQUIRED':visitState==='passed'?'PASSED':visitState==='none'?'NONE':'VERIFY')}</div>
      <div><small>Pre-bid meeting</small><b>${esc(pb.label||pb.state||'Verify')}</b>${badge(preState,preState==='required'?'ACTION REQUIRED':preState==='passed'?'PASSED':preState==='none'?'NONE':'VERIFY')}</div>
      <div><small>Bid security</small><b>${esc(bs.label||bs.state||'Verify')}</b>${confidence(bs.confidence)}</div>
      <div><small>Document fee</small><b>${df.amount!=null?money(df.amount,df.currency||'M'):esc(df.label||'Not stated')}</b>${confidence(df.confidence)}</div>
      <div><small>Submission</small><b>${esc(sub.label||sub.method||'Verify instructions')}</b>${confidence(sub.confidence)}</div>
    </div>`;
  }

  function renderLists(i){
    const list=(title,arr)=>`<div class="intel-list"><h3>${title}</h3>${arr?.length?`<ul>${arr.map(x=>`<li>${esc(typeof x==='string'?x:(x.title||x.detail||JSON.stringify(x)))}</li>`).join('')}</ul>`:'<p>Nothing confidently extracted.</p>'}</div>`;
    const risks=(i.risks||[]).map(r=>`<div class="intel-risk ${esc(r.severity||'medium')}"><b>${esc(r.title||'Risk')}</b><span>${esc(r.detail||'')}</span></div>`).join('');
    return `<div class="intel-grid">${list('Eligibility',(i.eligibility||[]).slice(0,12))}${list('Mandatory documents',(i.mandatory_documents||[]).slice(0,15))}${list('Still to verify',(i.missing_to_verify||[]).slice(0,12))}<div class="intel-list"><h3>Commercial terms</h3><ul><li>VAT: ${i.commercial?.vat_percent??'verify'}${i.commercial?.vat_percent!=null?'%':''}</li><li>Delivery: ${esc(i.commercial?.delivery_period||'verify')}</li><li>Warranty: ${esc(i.commercial?.warranty||'verify')}</li></ul></div></div>${risks?`<div class="intel-risks"><h3>Risk flags</h3>${risks}</div>`:''}`;
  }

  function renderBoq(i){
    const boq=i.boq||[];
    const rows=boq.slice(0,160).map(x=>`<tr><td>${esc(x.item_no||x.index||'')}</td><td><b>${esc(x.description||'')}</b>${x.specification?`<small>${esc(x.specification)}</small>`:''}</td><td>${esc(x.unit||'')}</td><td>${x.quantity??''}</td><td>${x.page?`p.${x.page}`:''}</td><td>${confidence(x.confidence)}</td></tr>`).join('');
    return `<section class="intel-boq"><div class="intel-section-title"><div><span>BOQ / PRICEABLE ITEMS</span><h2>${boq.length} line item${boq.length===1?'':'s'} detected</h2></div><div class="intel-actions"><button id="intel-fill-boq" type="button">Fill Calculator</button><button id="intel-price-boq" type="button" class="primary">Find Bloem Prices & Auto-fill</button></div></div>${boq.length?`<div class="intel-table-wrap"><table><thead><tr><th>Item</th><th>Description / specification</th><th>Unit</th><th>Qty</th><th>Page</th><th>Confidence</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="intel-empty">No priceable BOQ lines were confidently detected. Check the document or try a clearer copy.</div>'}</section>`;
  }

  function renderIntelligence(i){
    result.hidden=false;
    result.innerHTML=`${renderOverview(i)}${i.summary?`<div class="intel-summary">${esc(i.summary)}</div>`:''}${renderLists(i)}${renderBoq(i)}<div id="intel-pricing-results"></div>`;
    document.getElementById('intel-fill-boq')?.addEventListener('click',()=>fillCalculator(i.boq||[],null));
    document.getElementById('intel-price-boq')?.addEventListener('click',priceBoq);
  }

  function fillCalculator(boq,pricing){
    if(!boq.length)return;
    const priceMap=new Map((pricing?.items||[]).map(x=>[Number(x.index),x]));
    lineItems.innerHTML='';
    boq.forEach((x,idx)=>{
      const p=priceMap.get(Number(x.index||idx+1));
      const unitCost=Number(p?.unit_cost)||0;
      const row=document.createElement('div');row.className='calc-line';row.dataset.line=`intel-${idx+1}`;
      if(p?.source_url)row.dataset.source=p.source_url;
      const desc=[x.item_no?`${x.item_no} — `:'',x.description||'Tender item',x.specification?` · ${x.specification}`:'',x.unit?` [${x.unit}]`:''].join('');
      row.innerHTML=`<label>Description<input class="line-desc" type="text" value="${esc(desc)}"></label><label>Qty<input class="line-qty" type="number" min="0" step="0.01" value="${Number(x.quantity)||1}"></label><label>Unit cost<input class="line-unit" type="number" min="0" step="0.01" value="${unitCost}"></label><div class="line-total"><small>Total</small><b>M0.00</b></div><button class="remove-line" type="button" aria-label="Remove line">×</button>${p?`<div class="document-price-note">${esc(p.supplier||'Price source')} · ${esc(p.location||'')} · ${esc(p.match||'verify')} · ${esc(p.confidence||'low')} confidence${p.note?` · ${esc(p.note)}`:''}${p.source_url?` <a href="${esc(p.source_url)}" target="_blank" rel="noopener">Open source</a>`:''}</div>`:''}`;
      lineItems.appendChild(row);
    });
    if(pricing?.transport!=null){const el=document.getElementById('transport');if(el)el.value=Number(pricing.transport)||0;}
    if(pricing?.other_costs!=null){const el=document.getElementById('other-costs');if(el)el.value=Number(pricing.other_costs)||0;}
    const df=currentIntelligence?.document_fee?.amount;if(df!=null){const el=document.getElementById('doc-fee');if(el)el.value=Number(df)||0;}
    const sec=currentIntelligence?.bid_security?.percent;if(sec!=null){const el=document.getElementById('security-rate');if(el)el.value=Number(sec)||0;}
    const vat=currentIntelligence?.commercial?.vat_percent;if(vat!=null){const el=document.getElementById('vat');if(el)el.value=Number(vat)||0;}
    dispatchRecalc();
    lineItems.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderPricing(pricing){
    const host=document.getElementById('intel-pricing-results');if(!host)return;
    const priced=(pricing.items||[]).filter(x=>Number(x.unit_cost)>0).length;
    host.innerHTML=`<section class="intel-pricing"><div class="intel-section-title"><div><span>BLOEMFONTEIN / SOUTH AFRICA SOURCING</span><h2>${priced} of ${(pricing.items||[]).length} items priced</h2></div><button id="intel-apply-prices" class="primary" type="button">Apply Prices to Calculator</button></div><p>${esc(pricing.sourcing_summary||'Current market research completed. Verify stock, VAT and delivery before ordering.')}</p><div class="intel-price-grid">${(pricing.items||[]).slice(0,160).map(p=>`<article class="${p.unit_cost?'priced':'unpriced'}"><small>Item ${p.index}</small><b>${esc(p.description||'')}</b><strong>${p.unit_cost?money(p.unit_cost,p.currency||'M'):'Quotation required'}</strong><span>${esc(p.supplier||'No public supplier price')} ${p.location?`· ${esc(p.location)}`:''}</span><em>${esc(p.match||'verify')} · ${esc(p.confidence||'low')} confidence</em>${p.source_url?`<a href="${esc(p.source_url)}" target="_blank" rel="noopener">Open price source →</a>`:''}</article>`).join('')}</div></section>`;
    document.getElementById('intel-apply-prices')?.addEventListener('click',()=>fillCalculator(currentIntelligence.boq||[],pricing));
  }

  async function priceBoq(){
    if(!currentIntelligence?.boq?.length)return;
    const btn=document.getElementById('intel-price-boq');if(btn)btn.disabled=true;
    setProgress(76,'Searching current market prices…','Priority: Bloemfontein, then established South African suppliers. This can take a little while.');
    try{
      const data=await post({mode:'price',intelligence:currentIntelligence});
      state.pricing=data.pricing;renderPricing(data.pricing);fillCalculator(currentIntelligence.boq||[],data.pricing);
      setProgress(100,'Tender intelligence & pricing complete',`${(data.pricing.items||[]).filter(x=>Number(x.unit_cost)>0).length} items received current price evidence · verify before bidding`);
    }catch(e){setProgress(100,'Pricing could not be completed',e.message);}
    finally{if(btn)btn.disabled=false;}
  }

  async function analyse(file){
    currentFile=file;state.pricing=null;currentIntelligence=null;result.hidden=true;clearBtn.hidden=false;
    if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name))throw new Error('Please upload a PDF tender document.');
    if(file.size>25*1024*1024)throw new Error('PDF is too large for browser analysis. Use a file under 25 MB.');
    setProgress(4,'Opening tender document…',`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`);
    const read=await readPdf(file);currentPages=read.pages;
    const coverage=read.chars/Math.max(1,read.pageCount);
    let data;
    if(read.chars<1200||coverage<80){
      if(file.size>3*1024*1024)throw new Error('This appears to be a scanned/image PDF with little selectable text. For scanned fallback, compress the PDF below 3 MB and upload again.');
      setProgress(48,'Scan detected — using visual PDF analysis…','The AI will read the uploaded PDF directly because selectable text is limited.');
      data=await post({mode:'analyze_pdf',filename:file.name,file_data:arrayBufferToDataUrl(read.buffer)});
    }else{
      const relevant=selectRelevantPages(read.pages),text=buildText(relevant);
      setProgress(50,'Finding BOQ, requirements and compulsory actions…',`${relevant.length} high-value pages selected from ${read.pageCount} pages`);
      data=await post({mode:'analyze_text',filename:file.name,page_count:read.pageCount,text});
    }
    currentIntelligence=data.intelligence;
    if(currentIntelligence?.document&&!currentIntelligence.document.page_count)currentIntelligence.document.page_count=read.pageCount;
    setProgress(72,'Tender document understood','BOQ and compliance intelligence extracted. Ready for Bloemfontein price research.');
    renderIntelligence(currentIntelligence);
    if(currentIntelligence?.boq?.length)fillCalculator(currentIntelligence.boq,null);
  }

  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;
    try{await analyse(file);}catch(e){setProgress(100,'Could not analyse this tender',e.message);result.hidden=false;result.innerHTML=`<div class="intel-error"><b>Analysis stopped</b><p>${esc(e.message)}</p></div>`;}
  });

  clearBtn.addEventListener('click',()=>{
    input.value='';currentFile=null;currentPages=[];currentIntelligence=null;state.pricing=null;progress.hidden=true;result.hidden=true;clearBtn.hidden=true;result.innerHTML='';
  });
});
