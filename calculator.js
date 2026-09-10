document.addEventListener('DOMContentLoaded', () => {
  const tenders = Array.isArray(window.MMGC_TENDERS) ? window.MMGC_TENDERS : [];
  const select = document.getElementById('calculator-tender');
  const currency = document.getElementById('currency');
  const items = document.getElementById('line-items');
  const addBtn = document.getElementById('add-line');
  const pdfInput = document.getElementById('tender-pdf');
  const pdfProgress = document.getElementById('pdf-progress');
  const pdfProgressFill = document.getElementById('pdf-progress-fill');
  const pdfStatus = document.getElementById('pdf-status');
  const pdfDetail = document.getElementById('pdf-detail');
  const pdfResult = document.getElementById('pdf-result');
  const clearPdfBtn = document.getElementById('clear-pdf');
  const money = value => `${currency.value}${Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const num = id => Number(document.getElementById(id)?.value || 0);
  let lineId = 0;
  let uploadedTenderContext = '';
  let uploadedFileName = '';

  tenders.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = `${t.issuer} — ${t.title}`;
    select.appendChild(o);
  });
  const requested = new URLSearchParams(location.search).get('tender');
  if (requested && tenders.some(t => t.id === requested)) select.value = requested;

  const addLine = (desc = '', qty = 1, unit = 0, extra = {}) => {
    const row = document.createElement('div');
    row.className = 'calc-line';
    row.dataset.line = String(++lineId);
    if (extra.source) row.dataset.source = extra.source;
    const safe = String(desc).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    row.innerHTML = `<label>Description<input class="line-desc" type="text" value="${safe}" placeholder="Item / activity"></label><label>Qty<input class="line-qty" type="number" min="0" step="0.01" value="${Number(qty)||0}"></label><label>Unit cost<input class="line-unit" type="number" min="0" step="0.01" value="${Number(unit)||0}"></label><div class="line-total"><small>Total</small><b>${money((Number(qty)||0)*(Number(unit)||0))}</b></div><button class="remove-line" type="button" aria-label="Remove line">×</button>`;
    if (extra.note || extra.source || extra.url) {
      const note = document.createElement('div');
      note.className = 'document-price-note';
      const parts = [];
      if (extra.page) parts.push(`PDF page ${extra.page}`);
      if (extra.source) parts.push(`Source: ${extra.source}`);
      if (extra.confidence) parts.push(`${extra.confidence} confidence`);
      if (extra.note) parts.push(extra.note);
      note.textContent = parts.join(' · ');
      if (extra.url) {
        const a = document.createElement('a');
        a.href = extra.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = ' Open price source';
        note.appendChild(a);
      }
      row.appendChild(note);
    }
    items.appendChild(row);
    recalc();
  };

  addLine('Primary item / activity', 1, 0);
  addLine('Accessories / supporting items', 1, 0);

  const selectedTender = () => tenders.find(t => t.id === select.value);
  const extractQty = text => {
    const m = String(text || '').match(/(?:quantity|qty)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
    return m ? Number(m[1]) : 1;
  };
  const extractMoney = text => {
    const m = String(text || '').replace(/,/g,'').match(/(?:M|R|LSL|ZAR)\s*(\d+(?:\.\d+)?)/i);
    return m ? Number(m[1]) : null;
  };
  const extractPercent = text => {
    const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? Number(m[1]) : null;
  };
  const recommendedDefaults = t => {
    const cats = (t?.categories || []).map(x => String(x).toLowerCase());
    if (cats.includes('construction') || cats.includes('works')) return {overheads:10, contingency:7.5, markup:15};
    if (cats.includes('cleaning')) return {overheads:12, contingency:5, markup:15};
    if (cats.includes('services') || cats.includes('consulting')) return {overheads:10, contingency:5, markup:18};
    return {overheads:7.5, contingency:5, markup:15};
  };
  const applyGeneralDefaults = () => {
    document.getElementById('overheads').value = 7.5;
    document.getElementById('contingency').value = 5;
    document.getElementById('markup').value = 15;
    document.getElementById('vat').value = 15;
    recalc();
    updateSmartBar();
  };
  const applyTenderDefaults = (force = false) => {
    const t = selectedTender();
    if (!t) return;
    const d = recommendedDefaults(t);
    [['overheads',d.overheads],['contingency',d.contingency],['markup',d.markup],['vat',15]].forEach(([id,value]) => {
      const el = document.getElementById(id);
      if (el && (force || Number(el.value || 0) === 0 || id === 'vat')) el.value = value;
    });
    const fee = extractMoney(t.documentFee?.label);
    if (fee !== null && t.documentFee?.state !== 'unknown') document.getElementById('doc-fee').value = fee;
    else if (force) document.getElementById('doc-fee').value = 0;
    const sec = extractPercent(t.bidSecurity?.label);
    document.getElementById('security-rate').value = sec !== null ? sec : 0;
    recalc();
  };
  const loadTenderLines = (force = false) => {
    const t = selectedTender();
    if (!t) return;
    const defaults = ['Primary item / activity','Accessories / supporting items'];
    const isDefault = items.children.length <= 2 && Array.from(items.querySelectorAll('.line-desc')).every((x,i) => defaults[i] === x.value);
    if ((force || isDefault) && (t.lots || []).length) {
      items.innerHTML = '';
      lineId = 0;
      (t.lots || []).forEach(l => addLine(l.title, extractQty(`${l.title} ${l.text || l.description || ''}`), 0));
      addLine('Additional / supporting item', 1, 0);
    }
    applyTenderDefaults(force);
    updateSmartBar();
  };

  function getLines() {
    return Array.from(document.querySelectorAll('.calc-line')).map(row => ({
      description: row.querySelector('.line-desc')?.value.trim() || 'Unnamed item',
      qty: Number(row.querySelector('.line-qty')?.value || 0),
      unit: Number(row.querySelector('.line-unit')?.value || 0)
    }));
  }
  function calculate() {
    const lines = getLines();
    const subtotal = lines.reduce((s,x) => s + x.qty * x.unit, 0);
    const doc = num('doc-fee'), transport = num('transport'), other = num('other-costs');
    const direct = subtotal + doc + transport + other;
    const overhead = direct * (num('overheads') / 100);
    const contingency = (direct + overhead) * (num('contingency') / 100);
    const beforeMarkup = direct + overhead + contingency;
    const markup = beforeMarkup * (num('markup') / 100);
    const exvat = beforeMarkup + markup;
    const vat = exvat * (num('vat') / 100);
    const total = exvat + vat;
    const security = total * (num('security-rate') / 100);
    return {lines,subtotal,doc,transport,other,overhead,contingency,beforeMarkup,markup,exvat,vat,total,security};
  }
  function recalc() {
    const c = calculate();
    document.querySelectorAll('.calc-line').forEach((row,i) => {
      const x = c.lines[i];
      if (x) row.querySelector('.line-total b').textContent = money(x.qty * x.unit);
    });
    const values = {'sum-items':c.subtotal,'sum-doc':c.doc,'sum-transport':c.transport,'sum-other':c.other,'sum-overheads':c.overhead,'sum-contingency':c.contingency,'sum-cost':c.beforeMarkup,'sum-markup':c.markup,'sum-exvat':c.exvat,'sum-vat':c.vat,'sum-total':c.total,'sum-security':c.security};
    Object.entries(values).forEach(([id,v]) => { const el = document.getElementById(id); if (el) el.textContent = money(v); });
  }

  const tenderContext = () => {
    const t = selectedTender();
    const base = t ? [`Tender: ${t.title}`,`Issuer: ${t.issuer}`,`Reference: ${t.ref || 'not recorded'}`,`Deadline: ${t.deadlineLabel || 'verify'}`,`Official source: ${t.official || 'not provided'}`,`Summary: ${t.summary || ''}`,`Document fee: ${t.documentFee?.label || 'verify'}`,`Bid security: ${t.bidSecurity?.label || 'verify'}`,`Site visit: ${t.siteVisit?.label || 'verify'}`,`Lots/items: ${(t.lots || []).map((l,i) => `${i+1}. ${l.title}: ${l.text || l.description || ''}`).join(' | ') || 'not recorded'}`].join('\n') : 'General procurement / tender costing with no directory tender selected.';
    return uploadedTenderContext ? `${base}\n\nUPLOADED TENDER EXTRACT:\n${uploadedTenderContext}` : base;
  };
  const researchPrompt = () => {
    const c = calculate();
    const lines = c.lines.filter(x => x.description && !/^Additional \/ supporting item$/i.test(x.description)).map((x,i) => `${i+1}. ${x.description} — quantity ${x.qty}`).join('\n');
    return `Research current procurement costs for MMGC General Trading. Focus first on suppliers in Bloemfontein, Free State, then reputable South African suppliers that can deliver to Bloemfontein/Lesotho.\n\n${tenderContext()}\n\nItems to research:\n${lines}\n\nUse CURRENT live web evidence. Match exact specifications and model numbers. Prefer manufacturer pages, authorised distributors and established retailers. State supplier, price, VAT status, stock/availability where visible and delivery assumptions. Never invent a price. If a reliable price is unavailable, state supplier quotation required.`;
  };
  const autofillPrompt = () => {
    const c = calculate();
    const lines = c.lines.map((x,i) => `${i+1}. ${x.description} | quantity ${x.qty}`).join('\n');
    return `Auto-fill current market unit costs for this MMGC tender calculator. Prioritize Bloemfontein, Free State suppliers; then established South African suppliers suitable for collection/delivery to Bloemfontein and onward transport to Lesotho.\n\n${tenderContext()}\n\nCalculator lines:\n${lines}\n\nMatch line indices exactly. Only provide a numeric unit cost when supported by credible current evidence. If an item is generic or insufficiently specified, return null rather than guessing. Maloti and Rand are treated at par for this planning calculator.`;
  };
  const reviewPrompt = () => {
    const c = calculate();
    const lineText = c.lines.map((x,i) => `${i+1}. ${x.description}: Qty ${x.qty} × ${currency.value}${x.unit.toFixed(2)} = ${currency.value}${(x.qty*x.unit).toFixed(2)}`).join('\n');
    return `Review this MMGC tender cost estimate as a procurement and commercial analyst.\n\n${tenderContext()}\n\nCurrent calculator:\n${lineText}\nTender document fee: ${money(c.doc)}\nTransport/delivery: ${money(c.transport)}\nOther direct costs: ${money(c.other)}\nOverheads: ${num('overheads')}% = ${money(c.overhead)}\nContingency: ${num('contingency')}% = ${money(c.contingency)}\nCost before markup: ${money(c.beforeMarkup)}\nMarkup/profit: ${num('markup')}% = ${money(c.markup)}\nTender price excl. VAT: ${money(c.exvat)}\nVAT: ${num('vat')}% = ${money(c.vat)}\nTender price incl. VAT: ${money(c.total)}\nBid security estimate: ${num('security-rate')}% = ${money(c.security)}\n\nCheck arithmetic, missing costs, VAT treatment, logistics, overheads, contingency, markup and commercial risk. Distinguish facts from estimates. Never invent prices.`;
  };

  const endpointCandidates = () => {
    const saved = localStorage.getItem('mmgcAiEndpoint');
    const list = [];
    if (saved) list.push(saved.replace(/\/$/,'') + '/api/tender-ai');
    if (location.hostname.endsWith('vercel.app')) list.push('/api/tender-ai');
    if (location.hostname.endsWith('github.io')) list.push('https://mmgcgeneraltrading-github-io.vercel.app/api/tender-ai');
    if (!list.length) list.push('/api/tender-ai');
    return [...new Set(list)];
  };
  async function openChatGPT(prompt) {
    try { await navigator.clipboard.writeText(prompt); } catch {}
    window.open(`https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`, '_blank', 'noopener');
  }
  async function postAI(mode, prompt, extra = {}) {
    let lastError = 'Live AI service is not reachable.';
    for (const endpoint of endpointCandidates()) {
      try {
        const response = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,prompt,...extra})});
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { lastError = data.error || `AI service returned ${response.status}`; continue; }
        return data;
      } catch (err) { lastError = err?.message || lastError; }
    }
    throw new Error(lastError);
  }
  async function callLiveAI(mode, prompt) {
    const result = document.getElementById('ai-live-result');
    const status = document.getElementById('ai-live-status');
    const buttons = document.querySelectorAll('.ai-cost-actions button');
    if (status) { status.textContent = 'MMGC AI is checking the tender and current market data…'; status.className = 'ai-live-status working'; }
    if (result) { result.hidden = false; result.textContent = 'Working…'; }
    buttons.forEach(b => b.disabled = true);
    try {
      const data = await postAI(mode, prompt);
      if (result) { result.textContent = data.text || 'No analysis was returned.'; result.hidden = false; }
      if (status) { status.textContent = `Live MMGC AI result · ${data.model || 'OpenAI'}`; status.className = 'ai-live-status ready'; }
    } catch (err) {
      if (result) { result.textContent = 'The embedded AI service could not complete this request. Opening the same request in ChatGPT.'; result.hidden = false; }
      if (status) { status.textContent = err.message; status.className = 'ai-live-status fallback'; }
      await openChatGPT(prompt);
    } finally { buttons.forEach(b => b.disabled = false); }
  }
  async function autoFillPrices() {
    const status = document.getElementById('ai-live-status');
    const result = document.getElementById('ai-live-result');
    const btn = document.getElementById('ai-autofill-prices');
    if (btn) btn.disabled = true;
    if (status) { status.textContent = 'Searching Bloemfontein and South African suppliers…'; status.className = 'ai-live-status working'; }
    try {
      const data = await postAI('autofill', autofillPrompt());
      const fill = data.autofill;
      if (!fill?.items) throw new Error('No safe price matches were returned.');
      const rows = Array.from(document.querySelectorAll('.calc-line'));
      let filled = 0;
      fill.items.forEach(x => {
        const idx = Number(x.index) - 1;
        const cost = Number(x.unit_cost);
        if (rows[idx] && Number.isFinite(cost) && cost > 0) {
          rows[idx].querySelector('.line-unit').value = cost;
          rows[idx].dataset.source = x.source || '';
          filled++;
        }
      });
      if (Number.isFinite(Number(fill.transport)) && Number(fill.transport) >= 0) document.getElementById('transport').value = Number(fill.transport);
      if (Number.isFinite(Number(fill.other_costs)) && Number(fill.other_costs) >= 0) document.getElementById('other-costs').value = Number(fill.other_costs);
      recalc();
      const detail = fill.items.map(x => `${x.index}. ${x.description}: ${x.unit_cost == null ? 'quotation required' : `${x.currency || 'M'}${Number(x.unit_cost).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} · ${x.source || 'source not named'} · ${x.confidence || 'verify'} confidence${x.note ? ` · ${x.note}` : ''}`).join('\n');
      if (result) { result.hidden = false; result.textContent = `Auto-filled ${filled} line item${filled === 1 ? '' : 's'}. Verify before bidding.\n\n${detail}${fill.note ? `\n\n${fill.note}` : ''}`; }
      if (status) { status.textContent = `${filled} current market price${filled === 1 ? '' : 's'} added`; status.className = 'ai-live-status ready'; }
    } catch (err) {
      if (status) { status.textContent = err.message; status.className = 'ai-live-status fallback'; }
      if (result) { result.hidden = false; result.textContent = 'No prices were inserted automatically. Use Research Current Prices for a detailed sourcing review.'; }
    } finally { if (btn) btn.disabled = false; }
  }

  function setPdfProgress(percent, title, detail = '') {
    if (!pdfProgress) return;
    pdfProgress.hidden = false;
    pdfProgressFill.style.width = `${Math.max(4, Math.min(100, percent))}%`;
    pdfStatus.textContent = title;
    pdfDetail.textContent = detail;
  }
  function chooseRelevantPages(pages) {
    const keywords = /(bill of quantities|boq|schedule of prices|price schedule|pricing schedule|quantity|qty\b|unit rate|unit price|description of item|schedule of requirements|technical specification|lot\s+\d|item\s+no)/i;
    const selected = [];
    const seen = new Set();
    const push = p => { if (!seen.has(p.page)) { selected.push(p); seen.add(p.page); } };
    pages.slice(0,5).forEach(push);
    pages.filter(p => keywords.test(p.text)).forEach(push);
    if (selected.length < 12) pages.slice(5,20).forEach(push);
    let out = '';
    for (const p of selected.sort((a,b) => a.page - b.page)) {
      const block = `\n\n--- PDF PAGE ${p.page} ---\n${p.text}`;
      if ((out + block).length > 90000) break;
      out += block;
    }
    return {text:out.trim(), selectedPages:selected.length};
  }
  async function extractPdf(file) {
    if (!window.pdfjsLib) throw new Error('PDF reader did not load. Refresh the page and try again.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({data:buffer}).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      setPdfProgress(8 + Math.round((i / pdf.numPages) * 42), 'Reading tender PDF…', `Page ${i} of ${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(x => x.str).join(' ').replace(/\s+/g,' ').trim();
      pages.push({page:i,text});
    }
    return {pages, totalPages:pdf.numPages, ...chooseRelevantPages(pages)};
  }
  function applyDocumentAutofill(fill) {
    if (!Array.isArray(fill?.items) || !fill.items.length) throw new Error('No BOQ/listed items were identified in the PDF.');
    items.innerHTML = '';
    lineId = 0;
    fill.items.forEach(x => addLine(x.description || `Item ${x.index || ''}`, Number(x.quantity) || 1, Number(x.unit_cost) || 0, {
      source:x.source, url:x.source_url, confidence:x.confidence, note:x.note, page:x.page
    }));
    if (fill.document_fee != null && Number.isFinite(Number(fill.document_fee))) document.getElementById('doc-fee').value = Number(fill.document_fee);
    if (fill.transport != null && Number.isFinite(Number(fill.transport))) document.getElementById('transport').value = Number(fill.transport);
    if (fill.other_costs != null && Number.isFinite(Number(fill.other_costs))) document.getElementById('other-costs').value = Number(fill.other_costs);
    if (fill.bid_security_percent != null && Number.isFinite(Number(fill.bid_security_percent))) document.getElementById('security-rate').value = Number(fill.bid_security_percent);
    const defaults = fill.category === 'construction' ? {overheads:10,contingency:7.5,markup:15} : fill.category === 'services' ? {overheads:10,contingency:5,markup:18} : {overheads:7.5,contingency:5,markup:15};
    document.getElementById('overheads').value = defaults.overheads;
    document.getElementById('contingency').value = defaults.contingency;
    document.getElementById('markup').value = defaults.markup;
    document.getElementById('vat').value = 15;
    recalc();
    return fill.items.filter(x => Number(x.unit_cost) > 0).length;
  }
  async function processTenderPdf(file) {
    uploadedFileName = file.name;
    pdfResult.hidden = true;
    clearPdfBtn.hidden = false;
    setPdfProgress(5, 'Opening tender document…', `${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`);
    try {
      const extracted = await extractPdf(file);
      if (!extracted.text || extracted.text.length < 80) throw new Error('Very little readable text was found. This may be a scanned PDF; OCR support will be added separately.');
      uploadedTenderContext = extracted.text;
      setPdfProgress(58, 'BOQ text found. Analysing tender…', `${extracted.selectedPages} relevant pages selected from ${extracted.totalPages}`);
      const prompt = `Read the following tender-document text extracted from ${file.name}. Identify the actual BOQ, pricing schedule, schedule of requirements, or listed supply/work/service items. Preserve exact descriptions, quantities and units where visible. Then research current unit prices with FIRST priority on Bloemfontein, Free State suppliers. If no good Bloemfontein price is available, use reputable South African suppliers that can serve Bloemfontein/Lesotho. Do not invent prices.\n\n${extracted.text}`;
      setPdfProgress(68, 'Finding current prices…', 'Searching Bloemfontein and South African suppliers');
      const data = await postAI('document_autofill', prompt, {file_name:file.name});
      if (!data.document_autofill) throw new Error('The AI could not structure the tender items safely.');
      setPdfProgress(92, 'Applying BOQ and prices…', 'Building calculator rows');
      const fill = data.document_autofill;
      const priced = applyDocumentAutofill(fill);
      setPdfProgress(100, 'Tender ready for review', `${fill.items.length} item${fill.items.length===1?'':'s'} found · ${priced} price${priced===1?'':'s'} matched`);
      pdfResult.hidden = false;
      pdfResult.className = 'pdf-result pdf-success';
      const title = fill.tender_title || file.name;
      const issuer = fill.issuer ? ` · ${fill.issuer}` : '';
      pdfResult.innerHTML = `<strong>${title}</strong><p>${fill.items.length} BOQ/listed item${fill.items.length===1?'':'s'} loaded${issuer}. ${priced} current price${priced===1?'':'s'} matched. Items without reliable market evidence remain at M0.00 for supplier quotation.</p><div class="pdf-tags"><span>BOQ extracted</span><span>Bloemfontein pricing searched</span><span>Calculator auto-filled</span></div>`;
      if (fill.tender_title) {
        const smartTitle = document.getElementById('smart-title');
        const smartDetail = document.getElementById('smart-detail');
        if (smartTitle) smartTitle.textContent = `${fill.tender_title} loaded from PDF`;
        if (smartDetail) smartDetail.textContent = `${fill.items.length} items found · ${priced} priced from current market evidence · Verify all specifications before bid submission.`;
      }
    } catch (err) {
      setPdfProgress(100, 'Could not complete PDF analysis', err.message);
      pdfResult.hidden = false;
      pdfResult.className = 'pdf-result pdf-error';
      pdfResult.innerHTML = `<strong>Document not auto-filled</strong><p>${String(err.message || 'Unknown error')}</p>`;
    }
  }

  const calcLayout = document.querySelector('.calculator-layout');
  const calcTop = document.querySelector('.calculator-top');
  if (calcTop && !document.getElementById('calc-smartbar')) {
    const bar = document.createElement('div');
    bar.id = 'calc-smartbar';
    bar.className = 'calc-smartbar';
    bar.innerHTML = `<div><strong><span class="calculator-pulse"></span><span id="smart-title">Smart tender setup ready</span></strong><span id="smart-detail">Choose a listed tender or upload the official PDF to extract the BOQ and prices.</span></div><div class="calc-smart-actions"><button class="smart-primary" id="smart-fill" type="button">Auto-fill Tender Setup</button><button class="smart-secondary" id="smart-reset" type="button">Reset</button></div>`;
    calcTop.insertAdjacentElement('afterend',bar);
    document.getElementById('smart-fill').addEventListener('click', () => { if (selectedTender()) loadTenderLines(true); else applyGeneralDefaults(); });
    document.getElementById('smart-reset').addEventListener('click', () => {
      items.innerHTML = ''; lineId = 0; addLine('Primary item / activity',1,0); addLine('Accessories / supporting items',1,0);
      ['doc-fee','transport','other-costs','overheads','contingency','markup','security-rate'].forEach(id => document.getElementById(id).value = 0);
      document.getElementById('vat').value = 15; recalc(); updateSmartBar();
    });
  }
  if (calcLayout && !document.getElementById('ai-cost-panel')) {
    const panel = document.createElement('section');
    panel.id = 'ai-cost-panel';
    panel.className = 'ai-cost-panel';
    panel.innerHTML = `<span class="ai-badge">LIVE MMGC AI COSTING</span><h3>Current-price research built into your calculator.</h3><p>Select a tender or upload its PDF. MMGC AI can research current Bloemfontein/South African prices and review the completed estimate.</p><div class="ai-cost-actions"><button id="ai-autofill-prices" class="ai-autofill" type="button">✨ AI Auto-fill Prices</button><button id="ai-research-prices" class="ai-research" type="button">Research Current Prices</button><button id="ai-review-estimate" class="ai-review" type="button">Review My Estimate</button></div><div id="ai-live-status" class="ai-live-status">Ready when you are.</div><pre id="ai-live-result" class="ai-live-result" hidden></pre><div class="ai-result-actions"><button id="copy-ai-result" type="button">Copy Result</button><button id="open-in-chatgpt" type="button">Continue in ChatGPT</button></div><p class="ai-cost-note">Auto-fill inserts prices only where credible current evidence is found. Unclear items stay blank for supplier quotation. Always verify the official BOQ and final tender total.</p>`;
    calcLayout.parentElement.insertBefore(panel,calcLayout);
    document.getElementById('ai-autofill-prices')?.addEventListener('click',autoFillPrices);
    document.getElementById('ai-research-prices')?.addEventListener('click',() => callLiveAI('research',researchPrompt()));
    document.getElementById('ai-review-estimate')?.addEventListener('click',() => callLiveAI('review',reviewPrompt()));
    document.getElementById('copy-ai-result')?.addEventListener('click',async e => { const text = document.getElementById('ai-live-result')?.textContent || ''; if (!text) return; try { await navigator.clipboard.writeText(text); e.currentTarget.textContent = 'Copied ✓'; setTimeout(() => e.currentTarget.textContent = 'Copy Result',1000); } catch {} });
    document.getElementById('open-in-chatgpt')?.addEventListener('click',() => openChatGPT(reviewPrompt()));
  }

  function updateSmartBar() {
    const t = selectedTender();
    const title = document.getElementById('smart-title');
    const detail = document.getElementById('smart-detail');
    if (!title || !detail) return;
    if (uploadedFileName) return;
    if (t) {
      title.textContent = `${t.title} loaded`;
      detail.textContent = `Known tender data prefilled where available · Deadline ${t.deadlineLabel || 'verify'} · Upload the official PDF for BOQ-level extraction and Bloemfontein price matching.`;
    } else {
      title.textContent = 'Smart tender setup ready';
      detail.textContent = 'Choose a listed tender or upload the official PDF to extract the BOQ and prices.';
    }
  }
  function updateAIPanel() {
    const panel = document.getElementById('ai-cost-panel');
    const t = selectedTender();
    const p = panel?.querySelector('p');
    if (p) p.textContent = uploadedFileName ? `Uploaded document: “${uploadedFileName}”. AI can re-check the extracted BOQ and current prices.` : t ? `Selected tender: “${t.title}”. AI price matching will use its tender snapshot plus your current quantities.` : 'Select a tender or upload the official PDF. AI will use the current line items and commercial allowances.';
    updateSmartBar();
  }

  select.addEventListener('input', () => { uploadedFileName=''; uploadedTenderContext=''; loadTenderLines(true); recalc(); updateAIPanel(); });
  select.addEventListener('change', () => { uploadedFileName=''; uploadedTenderContext=''; loadTenderLines(true); recalc(); updateAIPanel(); });
  if (requested) loadTenderLines(true); else applyGeneralDefaults();
  document.addEventListener('input', e => { if (e.target.closest('.calculator-section')) recalc(); });
  currency.addEventListener('change',recalc);
  addBtn.addEventListener('click',() => addLine('',1,0));
  items.addEventListener('click',e => { const b = e.target.closest('.remove-line'); if (!b) return; b.closest('.calc-line')?.remove(); recalc(); });
  pdfInput?.addEventListener('change', () => { const file = pdfInput.files?.[0]; if (file) processTenderPdf(file); });
  clearPdfBtn?.addEventListener('click', () => {
    pdfInput.value=''; uploadedTenderContext=''; uploadedFileName=''; pdfProgress.hidden=true; pdfResult.hidden=true; clearPdfBtn.hidden=true; updateAIPanel();
  });
  document.getElementById('print-costing')?.addEventListener('click',() => window.print());
  document.getElementById('download-costing')?.addEventListener('click',() => {
    const t = selectedTender(); const c = calculate();
    const rows = [['MMGC Tender Cost Calculator'],['Tender',uploadedFileName || t?.title || 'General costing'],['Issuer',t?.issuer || ''],[],['Description','Quantity','Unit Cost','Line Total']];
    c.lines.forEach(x => rows.push([x.description,x.qty,x.unit,x.qty*x.unit]));
    rows.push([],['Document fee',num('doc-fee')],['Transport / delivery',num('transport')],['Other direct costs',num('other-costs')],['Overheads %',num('overheads')],['Contingency %',num('contingency')],['Markup / profit %',num('markup')],['VAT %',num('vat')],['Bid security %',num('security-rate')],[],['Tender price incl. VAT',c.total],['CAUTION','Verify all BOQ quantities, specifications, supplier prices, arithmetic and final tender total before submission.']);
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`MMGC-Tender-Costing-${t?.id || 'uploaded'}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  recalc(); updateAIPanel();
});