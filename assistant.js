(()=>{
  const DATA_URL='procurement-data.js';
  const WA='26658311808';
  const qs=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const loadCss=()=>{if(!qs('link[href="assistant.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='assistant.css';document.head.appendChild(l);}};
  const loadTenderData=()=>new Promise(resolve=>{
    if(Array.isArray(window.MMGC_TENDERS)) return resolve();
    if(qs(`script[src="${DATA_URL}"]`)){let tries=0;const timer=setInterval(()=>{if(Array.isArray(window.MMGC_TENDERS)||tries++>20){clearInterval(timer);resolve();}},100);return;}
    const s=document.createElement('script');s.src=DATA_URL;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);
  });
  const pageName=()=>{
    const p=location.pathname.split('/').pop()||'index.html';
    return ({'index.html':'Home','tenders.html':'Tender Desk','tender-details.html':'Tender Snapshot','tender-calculator.html':'Tender Cost Calculator','products.html':'Products','suppliers.html':'Supplier Marketplace','checklists.html':'Tender Checklists'}[p]||document.title.split('|')[0].trim());
  };
  const safeSensitive=/\b(passport|national id|identity card|id number|bank account|banking details|pin|password|tax certificate|tax clearance|signature|credit card|debit card|cvv|otp)\b/i;
  const tenderById=id=>(window.MMGC_TENDERS||[]).find(t=>t.id===id);
  const getCurrentTender=()=>{
    const id=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('tender');
    if(id){const t=tenderById(id);if(t){localStorage.setItem('mmgcLastTender',id);return t;}}
    const remembered=localStorage.getItem('mmgcLastTender');
    return remembered?tenderById(remembered):null;
  };
  const urgentCount=()=>{
    const now=Date.now(),limit=2*86400000;
    return (window.MMGC_TENDERS||[]).filter(t=>t.deadline&&new Date(t.deadline).getTime()>=now&&new Date(t.deadline).getTime()-now<=limit).length;
  };
  const quickActions=[
    ['Available Tenders','tenders.html'],['Cost a Tender','tender-calculator.html'],['Site Visit Help','site-visit.html'],['Products','products.html'],['Supplier Registration','suppliers.html'],['Request Quote','index.html#quote'],['Talk to MMGC','whatsapp']
  ];
  const waUrl=text=>`https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  let conversation=[];
  let panel,messages,input,badge;
  function addMsg(text,type='bot',html=false){
    const d=document.createElement('div');d.className=type==='user'?'user-msg':'bot-msg';
    if(html)d.innerHTML=text;else d.textContent=text;
    messages.appendChild(d);messages.scrollTop=messages.scrollHeight;
  }
  function quickButtons(){
    const wrap=document.createElement('div');wrap.className='bot-quick';
    quickActions.forEach(([label,target])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>handleQuick(label,target));wrap.appendChild(b);});
    messages.appendChild(wrap);
  }
  function handover(extra=''){
    const t=getCurrentTender();
    const summary=buildSummary(extra);
    const wrap=document.createElement('div');wrap.className='bot-handover';
    wrap.innerHTML=`<a target="_blank" rel="noopener" href="${waUrl(summary)}">Continue on WhatsApp</a><button type="button">Preview enquiry summary</button>`;
    wrap.querySelector('button').addEventListener('click',()=>addMsg(`<b>Enquiry summary</b><div class="bot-summary">${esc(summary)}</div>`,'bot',true));
    messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight;
  }
  function buildSummary(extra=''){
    const t=getCurrentTender();
    const userNotes=conversation.filter(x=>x.role==='user').slice(-4).map(x=>`• ${x.text}`).join('\n');
    return ['Hello MMGC General Trading,','','Website enquiry from the MMGC Automated Assistant.',`Page: ${pageName()}`,t?`Tender: ${t.title}`:'',t&&t.ref?`Reference: ${t.ref}`:'',t?`Issuer: ${t.issuer}`:'',userNotes?`Visitor request:\n${userNotes}`:'',extra?`Additional note: ${extra}`:'','Please assist with the next step.'].filter(Boolean).join('\n');
  }
  function tenderContextHtml(t){
    if(!t)return '';
    return `<div class="bot-context"><b>Current tender:</b> ${esc(t.title)}${t.ref?` · ${esc(t.ref)}`:''}<br><b>Deadline:</b> ${esc(t.deadlineLabel||'Verify with issuer')}</div>`;
  }
  function handleQuick(label,target){
    if(target==='whatsapp'){handover('I would like to speak with MMGC staff.');return;}
    if(label==='Site Visit Help'){
      const t=getCurrentTender();
      if(t){addMsg(`${tenderContextHtml(t)}MMGC can assist with site-visit attendance where the tender rules allow an authorised representative. I can prepare a clean handover message for this tender.`,'bot',true);handover('I need site-visit attendance/support. Please confirm whether representation is permitted and what documents are required.');}
      else{addMsg('MMGC can assist with site-visit attendance where the procuring authority permits an authorised representative. Open the tender first, or send the tender title to MMGC.');handover('I need site-visit support.');}
      return;
    }
    location.href=target;
  }
  function respond(text){
    const lower=text.toLowerCase();
    const t=getCurrentTender();
    if(safeSensitive.test(text)){
      addMsg('For your privacy, please do not enter IDs, banking details, passwords, tax certificates, signatures, card details or other confidential documents in this public website chat. Use an agreed private MMGC channel for sensitive documents.');handover('I need to share a sensitive document through a private channel.');return;
    }
    if(/cost|price|how much|estimate|boq/.test(lower)){
      if(t){addMsg(`${tenderContextHtml(t)}I remember this tender. Open the MMGC Cost Calculator with it preselected, then add quantities and costs. For market-price research, use the ChatGPT-assisted research option in the calculator.`,'bot',true);const w=document.createElement('div');w.className='bot-handover';w.innerHTML=`<a href="tender-calculator.html?tender=${encodeURIComponent(t.id)}">Cost this tender</a><button type="button">WhatsApp MMGC</button>`;w.querySelector('button').onclick=()=>handover('I need costing assistance for this tender.');messages.appendChild(w);}
      else addMsg('Open a tender first or choose Cost a Tender. I will remember the tender you viewed and use it as context for costing.');return;
    }
    if(/site visit|pre.?bid|visit/.test(lower)){
      if(t){addMsg(`${tenderContextHtml(t)}Recorded site-visit status: <b>${esc(t.siteVisit?.label||'Verify in the official document')}</b>. MMGC can assist with attendance where an authorised representative is permitted.`,'bot',true);handover('Please assist with site-visit requirements/attendance for this tender.');}
      else{addMsg('Open the relevant Tender Snapshot first. I can then use its recorded site-visit status and prepare a handover to MMGC.');}
      return;
    }
    if(/security|bid bond|bid security/.test(lower)){
      if(t)addMsg(`${tenderContextHtml(t)}Recorded bid-security status: <b>${esc(t.bidSecurity?.label||'Verify in the bidding document')}</b>. Always confirm this against the official document and latest addenda.`,'bot',true);else addMsg('Open a Tender Snapshot first and I can show the recorded bid-security status for that tender.');return;
    }
    if(/document fee|tender fee|buy.*document|purchase.*document/.test(lower)){
      if(t)addMsg(`${tenderContextHtml(t)}Recorded tender-document status: <b>${esc(t.documentFee?.label||'Verify with issuer')}</b>. Check the official issuer page before payment.`,'bot',true);else addMsg('Open a Tender Snapshot first and I can show the recorded document-fee status.');return;
    }
    if(/deadline|close|closing|due/.test(lower)){
      if(t)addMsg(`${tenderContextHtml(t)}The recorded closing date is <b>${esc(t.deadlineLabel||'not confirmed')}</b>. Always verify the official notice and any addenda.`,'bot',true);else addMsg('Use Available Tenders to see current closing dates and live urgent-deadline indicators.');return;
    }
    if(/product|stationery|toner|cartridge|paper|printer|order/.test(lower)){addMsg('The MMGC Products catalogue lets you choose items, set quantities, add several items to one enquiry basket and send one combined quotation request.');const d=document.createElement('div');d.className='bot-handover';d.innerHTML='<a href="products.html">Open Products</a><button type="button">Ask MMGC</button>';d.querySelector('button').onclick=()=>handover('I need help sourcing products.');messages.appendChild(d);return;}
    if(/supplier|register|reseller|quote.*item/.test(lower)){addMsg('Suppliers can register their capability, brands, location, delivery coverage and authorised-reseller status on the Supplier Marketplace.');const d=document.createElement('div');d.className='bot-handover';d.innerHTML='<a href="suppliers.html">Supplier Registration</a><button type="button">Talk to MMGC</button>';d.querySelector('button').onclick=()=>handover('I want to register / quote as a supplier.');messages.appendChild(d);return;}
    if(/tender|rfq|opportunit/.test(lower)){addMsg('The Tender Desk lists current Lesotho opportunities with MMGC snapshots, deadlines, fee/security status, site-visit information, costing links and official-source links.');const d=document.createElement('div');d.className='bot-handover';d.innerHTML='<a href="tenders.html">Available Tenders</a><button type="button">Get help</button>';d.querySelector('button').onclick=()=>handover('I need tender support.');messages.appendChild(d);return;}
    if(/quote|quotation|enquiry/.test(lower)){addMsg('I can help structure the enquiry before handing it to MMGC. Tell me what you need, approximate quantity, deadline and delivery location. Do not include sensitive documents here.');handover();return;}
    addMsg(`I can help with MMGC tenders, costing, site visits, products, supplier registration and quotation requests.${t?' I also remember the tender you are viewing.':''}`);quickButtons();
  }
  function send(){
    const text=input.value.trim();if(!text)return;input.value='';conversation.push({role:'user',text});addMsg(text,'user');setTimeout(()=>respond(text),180);
  }
  function init(){
    loadCss();
    document.body.classList.add('mmgc-floating-whatsapp-adjust');
    const current=getCurrentTender();
    const launcher=document.createElement('button');launcher.className='mmgc-assistant-launcher';launcher.type='button';launcher.setAttribute('aria-label','Open MMGC Automated Assistant');launcher.innerHTML='<span class="bot-icon">✦</span><span class="bot-label">Ask MMGC<small>Automated assistant</small></span><span class="mmgc-bot-badge"></span>';
    document.body.appendChild(launcher);badge=launcher.querySelector('.mmgc-bot-badge');const urgent=urgentCount();if(urgent){badge.textContent=urgent;badge.classList.add('show');badge.title=`${urgent} tender${urgent===1?'':'s'} closing within two days`;}
    panel=document.createElement('section');panel.className='mmgc-assistant-panel';panel.setAttribute('aria-label','MMGC Automated Assistant');panel.innerHTML=`<div class="mmgc-assistant-head"><img src="assets/mmgc-logo.png" alt="MMGC"><div><b>MMGC Automated Assistant</b><small>Procurement · Products · Business Support</small></div><button class="mmgc-assistant-close" type="button" aria-label="Close">×</button></div><div class="mmgc-assistant-status">Automated help available anytime · MMGC staff replies on WhatsApp as soon as available.</div><div class="mmgc-assistant-messages"></div><div class="mmgc-assistant-input"><textarea rows="1" maxlength="700" placeholder="Ask about a tender, costing, products or MMGC support..."></textarea><button type="button">Send</button></div>`;
    document.body.appendChild(panel);messages=panel.querySelector('.mmgc-assistant-messages');input=panel.querySelector('textarea');
    addMsg(`Hello. I’m the MMGC Automated Assistant. I can guide you through tenders, costing, site visits, products, supplier registration and quotations.${current?' I remember the tender currently being viewed.':''}`);
    if(current)addMsg(tenderContextHtml(current),'bot',true);
    const warn=document.createElement('div');warn.className='bot-sensitive';warn.textContent='Privacy: do not enter IDs, banking details, passwords, tax certificates, signatures or confidential tender documents in this public chat.';messages.appendChild(warn);quickButtons();
    launcher.onclick=()=>panel.classList.toggle('open');panel.querySelector('.mmgc-assistant-close').onclick=()=>panel.classList.remove('open');panel.querySelector('.mmgc-assistant-input button').onclick=send;input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    document.addEventListener('click',e=>{const a=e.target.closest('a[href*="tender-details.html?id="]');if(!a)return;try{const u=new URL(a.href,location.href);const id=u.searchParams.get('id');if(id)localStorage.setItem('mmgcLastTender',id);}catch{}});
  }
  loadTenderData().finally(()=>{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();});
})();