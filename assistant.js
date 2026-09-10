(()=>{
  const WA='26658311808';
  const qs=s=>document.querySelector(s);
  const safeSensitive=/\b(passport|national id|identity card|id number|bank account|banking details|pin|password|tax certificate|tax clearance|signature|credit card|debit card|cvv|otp|api key|secret key)\b/i;
  const pageMap={'index.html':'Home','opportunities.html':'Opportunities','tenders.html':'Tenders & RFQs','jobs.html':'Jobs & Consultancies','job.html':'Job Details','tender-details.html':'Tender Snapshot','tender-calculator.html':'Tender Cost Calculator','products.html':'Products','stationery.html':'Stationery','standard-services.html':'Service Prices','suppliers.html':'Supplier Marketplace','checklists.html':'Tender Checklists','issuer.html':'Issuer','issuers.html':'Issuers','category.html':'Category','categories.html':'Categories','past-tenders.html':'Past Tenders'};
  const dataScripts=[['procurement-data.js','MMGC_TENDERS'],['jobs-data.js','MMGC_JOBS'],['jobs-social-data.js','MMGC_SOCIAL_JOBS'],['product-data.js','MMGC_PRODUCTS']];
  let panel,messages,input,sendBtn,badge,conversation=[],busy=false;

  const pageName=()=>{const p=location.pathname.split('/').pop()||'index.html';return pageMap[p]||document.title.split('|')[0].trim()||'MMGC Website';};
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const waUrl=text=>`https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  const loadScript=(src,key)=>new Promise(resolve=>{if(window[key])return resolve();const existing=document.querySelector(`script[src="${src}"]`);if(existing){let n=0;const t=setInterval(()=>{if(window[key]||n++>25){clearInterval(t);resolve();}},120);return;}const s=document.createElement('script');s.src=src;s.defer=true;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);});
  const loadAllData=()=>Promise.all(dataScripts.map(([src,key])=>loadScript(src,key)));
  const getTender=id=>(window.MMGC_TENDERS||[]).find(x=>x.id===id);
  const getCurrentTender=()=>{const p=new URLSearchParams(location.search),id=p.get('id')||p.get('tender');if(id){const t=getTender(id);if(t){localStorage.setItem('mmgcLastTender',id);return t;}}const remembered=localStorage.getItem('mmgcLastTender');return remembered?getTender(remembered):null;};
  const urgentCount=()=>{const now=Date.now(),limit=2*86400000;return (window.MMGC_TENDERS||[]).filter(t=>t.deadline&&new Date(t.deadline).getTime()>=now&&new Date(t.deadline).getTime()-now<=limit).length;};

  function pageContext(){
    const main=document.querySelector('main')||document.body;
    const text=(main.innerText||'').replace(/\s+/g,' ').trim();
    return text.slice(0,5500);
  }
  function tokens(text){return [...new Set(String(text||'').toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g)||[])].filter(x=>!['what','when','where','which','with','this','that','from','have','about','please','there','their','your','does','need','want','show','tell','give'].includes(x));}
  function relevance(obj,words){const hay=JSON.stringify(obj).toLowerCase();return words.reduce((s,w)=>s+(hay.includes(w)?1:0),0);}
  function compactTender(t){return {id:t.id,title:t.title,issuer:t.issuer,ref:t.ref,deadline:t.deadlineLabel,summary:t.summary,type:t.type,categories:t.categories,documentFee:t.documentFee,bidSecurity:t.bidSecurity,siteVisit:t.siteVisit,preBid:t.preBid,eligibility:t.eligibility,requiredDocs:t.requiredDocs,delivery:t.delivery,costingStatus:t.costingStatus,lots:t.lots,addenda:t.addenda,official:t.official,sourceNote:t.sourceNote,verification:t.verification};}
  function compactJob(j){return {id:j.id,title:j.title,employer:j.employer||j.organisation||j.company,location:j.location,deadline:j.deadlineLabel||j.deadline,type:j.type,summary:j.summary,source:j.official||j.source||j.sourceUrl,verification:j.verification};}
  function compactProduct(p){return {id:p.id,name:p.name,category:p.category,description:p.description,unit:p.unit,tags:p.tags,price:p.price};}
  function websiteContext(question){
    const words=tokens(question);const current=getCurrentTender();const parts=[];
    if(current)parts.push('CURRENT/REMEMBERED TENDER:\n'+JSON.stringify(compactTender(current)));
    const tenders=(window.MMGC_TENDERS||[]).filter(t=>!t.deadline||new Date(t.deadline).getTime()>=Date.now()).map(t=>[relevance(t,words),t]).sort((a,b)=>b[0]-a[0]).slice(0,words.length?8:4).map(x=>compactTender(x[1]));
    if(tenders.length)parts.push('RELEVANT OPEN TENDERS:\n'+JSON.stringify(tenders));
    const jobs=[...(window.MMGC_JOBS||[]),...(window.MMGC_SOCIAL_JOBS||[])].map(j=>[relevance(j,words),j]).sort((a,b)=>b[0]-a[0]).slice(0,words.length?7:3).map(x=>compactJob(x[1]));
    if(jobs.length)parts.push('RELEVANT JOBS:\n'+JSON.stringify(jobs));
    const products=(window.MMGC_PRODUCTS||[]).map(p=>[relevance(p,words),p]).sort((a,b)=>b[0]-a[0]).slice(0,words.length?10:5).map(x=>compactProduct(x[1]));
    if(products.length)parts.push('RELEVANT PRODUCTS:\n'+JSON.stringify(products));
    parts.push('WEBSITE ROUTES: Home=index.html; Opportunities=opportunities.html; Tenders=tenders.html; Tender Costing=tender-calculator.html; Jobs=jobs.html; Products=products.html; Stationery=stationery.html; Service Prices=standard-services.html; Suppliers=suppliers.html; Checklists=checklists.html.');
    return parts.join('\n\n').slice(0,13500);
  }
  function endpoint(){if(location.hostname.endsWith('vercel.app'))return'/api/site-assistant';return'https://mmgcgeneraltrading-github-io.vercel.app/api/site-assistant';}
  function addMsg(text,type='bot'){
    const d=document.createElement('div');d.className=type==='user'?'user-msg':'bot-msg';
    d.textContent=text;messages.appendChild(d);messages.scrollTop=messages.scrollHeight;return d;
  }
  function typing(on){
    const old=messages.querySelector('.bot-typing');if(old)old.remove();
    if(on){const d=document.createElement('div');d.className='bot-msg bot-typing';d.innerHTML='<span></span><span></span><span></span>';messages.appendChild(d);messages.scrollTop=messages.scrollHeight;}
  }
  function renderActions(actions=[]){
    if(!actions.length)return;const wrap=document.createElement('div');wrap.className='bot-actions';
    actions.slice(0,3).forEach(a=>{if(!a?.label||!a?.url)return;const link=document.createElement('a');link.textContent=a.label;link.href=a.url;if(/^https?:/i.test(a.url)){link.target='_blank';link.rel='noopener';}wrap.appendChild(link);});
    if(wrap.children.length){messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight;}
  }
  function quickButtons(){
    const quick=[['Available Tenders','Show me open tenders'],['Site Visits','Which tenders still need site visits?'],['Cost a Tender','Help me cost a tender'],['Jobs','Show current jobs'],['Products','What products does MMGC supply?'],['Service Prices','What are your service prices?']];
    const wrap=document.createElement('div');wrap.className='bot-quick';quick.forEach(([label,q])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>ask(q);wrap.appendChild(b);});messages.appendChild(wrap);
  }
  function enquirySummary(){const t=getCurrentTender();const notes=conversation.filter(x=>x.role==='user').slice(-5).map(x=>`• ${x.text}`).join('\n');return ['Hello MMGC General Trading,','',`Website chat enquiry from ${pageName()}.`,t?`Tender: ${t.title}`:'',t?.ref?`Reference: ${t.ref}`:'',notes?`Request:\n${notes}`:'','Please assist with the next step.'].filter(Boolean).join('\n');}
  function fallback(question){
    const q=question.toLowerCase(),t=getCurrentTender();
    if(/site visit|pre.?bid/.test(q)&&t)return {answer:`For ${t.title}, the recorded site-visit status is “${t.siteVisit?.label||'verify in the official document'}” and the pre-bid status is “${t.preBid?.label||'verify in the official document'}”.`,actions:[{label:'Open Tender Snapshot',url:`tender-details.html?id=${encodeURIComponent(t.id)}`}]};
    if(/cost|boq|price/.test(q))return {answer:'Open the MMGC Tender Cost Calculator. You can select a listed tender or upload the official tender PDF so the Document Intelligence Engine can extract the BOQ and research current prices.',actions:[{label:'Open Cost Calculator',url:'tender-calculator.html'}]};
    if(/job|vacanc|career/.test(q))return {answer:'Current vacancies and consultancies are listed in the Jobs & Consultancies section.',actions:[{label:'Open Jobs',url:'jobs.html'}]};
    if(/tender|rfq/.test(q))return {answer:'Current tenders and RFQs are available in the Tender Desk with deadlines, visit status, bid security, document fees and source links.',actions:[{label:'Open Tenders',url:'tenders.html'}]};
    return {answer:'I can help with MMGC tenders, jobs, tender costing, site visits, products, supplier sourcing, service prices and quotation requests.',actions:[{label:'All Opportunities',url:'opportunities.html'},{label:'WhatsApp MMGC',url:waUrl(enquirySummary())}]};
  }
  async function ask(text){
    text=String(text||'').trim();if(!text||busy)return;
    input.value='';conversation.push({role:'user',text});addMsg(text,'user');
    if(safeSensitive.test(text)){
      const ans='Please do not paste passwords, OTPs, banking/card details, national IDs, signatures or secret credentials into this public website chat. For ordinary public tender documents and specifications, you can use the Tender Document Intelligence upload tool.';
      conversation.push({role:'assistant',text:ans});addMsg(ans);renderActions([{label:'Open Tender Intelligence',url:'tender-calculator.html'},{label:'WhatsApp MMGC',url:waUrl(enquirySummary())}]);return;
    }
    busy=true;sendBtn.disabled=true;typing(true);
    try{
      const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,page:pageName(),pageUrl:location.href,pageContext:pageContext(),websiteContext:websiteContext(text),history:conversation.slice(-9)})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Assistant error ${response.status}`);
      typing(false);const answer=data.answer||'I could not prepare an answer. Please try again.';conversation.push({role:'assistant',text:answer});addMsg(answer);renderActions(data.actions||[]);
    }catch(err){typing(false);const f=fallback(text);conversation.push({role:'assistant',text:f.answer});addMsg(f.answer);renderActions(f.actions);}
    finally{busy=false;sendBtn.disabled=false;input.focus();}
  }
  function init(){
    if(qs('.mmgc-assistant-launcher'))return;document.body.classList.add('mmgc-floating-whatsapp-adjust');
    const launcher=document.createElement('button');launcher.className='mmgc-assistant-launcher';launcher.type='button';launcher.setAttribute('aria-label','Open MMGC AI Assistant');launcher.innerHTML='<span class="bot-icon">✦</span><span class="bot-label">Ask MMGC<small>Live AI assistant</small></span><span class="mmgc-bot-badge"></span>';document.body.appendChild(launcher);badge=launcher.querySelector('.mmgc-bot-badge');
    const urgent=urgentCount();if(urgent){badge.textContent=urgent;badge.classList.add('show');badge.title=`${urgent} tender${urgent===1?'':'s'} closing within two days`;}
    panel=document.createElement('section');panel.className='mmgc-assistant-panel';panel.setAttribute('aria-label','MMGC AI Assistant');panel.innerHTML=`<div class="mmgc-assistant-head"><img src="assets/mmgc-logo.png" alt="MMGC"><div><b>MMGC AI Assistant</b><small>Knows this website · Tenders · Jobs · Products · Services</small></div><button class="mmgc-assistant-close" type="button" aria-label="Close">×</button></div><div class="mmgc-assistant-status"><span class="assistant-live-dot"></span> Live website-aware assistant</div><div class="mmgc-assistant-messages"></div><div class="mmgc-assistant-footer"><a class="bot-whatsapp" target="_blank" rel="noopener">Continue on WhatsApp</a><button class="bot-clear-chat" type="button">Clear chat</button></div><div class="mmgc-assistant-input"><textarea rows="1" maxlength="1400" placeholder="Ask anything about MMGC, tenders, jobs, prices, site visits..."></textarea><button type="button">Send</button></div>`;document.body.appendChild(panel);
    messages=panel.querySelector('.mmgc-assistant-messages');input=panel.querySelector('textarea');sendBtn=panel.querySelector('.mmgc-assistant-input button');
    const current=getCurrentTender();addMsg(`Hello. I’m the MMGC AI Assistant. I can answer questions using the current MMGC website data${current?`, including the tender you were viewing: ${current.title}`:''}. Ask me naturally — for example, “which tenders still need a site visit?”, “what is the bid security?”, “show jobs closing soon”, or “how much is scanning?”`);quickButtons();
    launcher.onclick=()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))setTimeout(()=>input.focus(),100);};panel.querySelector('.mmgc-assistant-close').onclick=()=>panel.classList.remove('open');
    sendBtn.onclick=()=>ask(input.value);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(input.value);}});
    panel.querySelector('.bot-whatsapp').onclick=e=>{e.currentTarget.href=waUrl(enquirySummary());};panel.querySelector('.bot-clear-chat').onclick=()=>{conversation=[];messages.innerHTML='';addMsg('Chat cleared. What would you like to know about MMGC?');quickButtons();};
    document.addEventListener('click',e=>{const a=e.target.closest('a[href*="tender-details.html?id="]');if(!a)return;try{const u=new URL(a.href,location.href),id=u.searchParams.get('id');if(id)localStorage.setItem('mmgcLastTender',id);}catch{}});
  }
  loadAllData().finally(()=>{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();});
})();
