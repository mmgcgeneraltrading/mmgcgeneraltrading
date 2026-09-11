(()=>{
  if(window.MMGC_PWA_LOADED)return;window.MMGC_PWA_LOADED=true;
  const DRAFT_KEY='mmgcTenderCalculatorDraftV1';
  const $=s=>document.querySelector(s);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function toast(){let t=$('.mmgc-update-toast');if(t)return t;t=document.createElement('div');t.className='mmgc-update-toast';t.hidden=true;t.innerHTML='<div class="pwa-update-copy"><b>MMGC update available</b><small>A newer version of the app is ready. Refresh to use the latest features.</small></div><button class="mmgc-update-refresh" type="button">Refresh now</button><button class="mmgc-update-later" type="button">Later</button>';document.body.appendChild(t);return t;}
  function networkPill(){let p=$('.mmgc-network-pill');if(p)return p;p=document.createElement('div');p.className='mmgc-network-pill';p.textContent='Offline mode';document.body.appendChild(p);return p;}
  function setNetwork(){const p=networkPill();p.classList.toggle('show',!navigator.onLine);}
  async function registerSW(){
    if(!('serviceWorker'in navigator))return;
    try{
      const reg=await navigator.serviceWorker.register('sw.js');
      const t=toast();let refreshing=false;
      const showUpdate=worker=>{if(!worker||!navigator.serviceWorker.controller)return;t.hidden=false;t.querySelector('.mmgc-update-refresh').onclick=()=>{refreshing=true;worker.postMessage({type:'SKIP_WAITING'});};t.querySelector('.mmgc-update-later').onclick=()=>{t.hidden=true;};};
      if(reg.waiting)showUpdate(reg.waiting);
      reg.addEventListener('updatefound',()=>{const nw=reg.installing;if(!nw)return;nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller)showUpdate(nw);});});
      navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)location.reload();});
      setTimeout(()=>reg.update().catch(()=>{}),2500);
    }catch{}
  }
  function collectDraft(){
    if(!location.pathname.endsWith('/tender-calculator.html')&&!location.pathname.endsWith('tender-calculator.html'))return null;
    const lineEls=[...document.querySelectorAll('.calc-line')];
    if(!lineEls.length)return null;
    return {
      savedAt:new Date().toISOString(),
      tender:$('#calculator-tender')?.value||'',currency:$('#currency')?.value||'M',
      lines:lineEls.map(r=>({description:r.querySelector('.line-desc')?.value||'',qty:Number(r.querySelector('.line-qty')?.value||0),unit:Number(r.querySelector('.line-unit')?.value||0)})),
      allowances:['doc-fee','transport','other-costs','overheads','contingency','markup','vat','security-rate'].reduce((o,id)=>{o[id]=document.getElementById(id)?.value??'';return o;},{})
    };
  }
  function saveDraft(){const d=collectDraft();if(!d)return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(d));}catch{}}
  function flashRestored(){let n=$('.mmgc-app-restored');if(!n){n=document.createElement('div');n.className='mmgc-app-restored';n.textContent='Previous tender costing restored';document.body.appendChild(n);}n.classList.add('show');setTimeout(()=>n.classList.remove('show'),2200);}
  async function restoreDraft(){
    if(!location.pathname.endsWith('/tender-calculator.html')&&!location.pathname.endsWith('tender-calculator.html'))return;
    if(new URLSearchParams(location.search).has('tender'))return;
    let d;try{d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');}catch{return;}if(!d?.lines?.length)return;
    for(let i=0;i<25&&!$('#add-line');i++)await sleep(120);if(!$('#add-line'))return;
    const items=$('#line-items');if(!items)return;items.innerHTML='';
    d.lines.forEach(line=>{document.getElementById('add-line').click();const row=items.lastElementChild;if(!row)return;const desc=row.querySelector('.line-desc'),qty=row.querySelector('.line-qty'),unit=row.querySelector('.line-unit');if(desc)desc.value=line.description||'';if(qty)qty.value=Number(line.qty||0);if(unit)unit.value=Number(line.unit||0);});
    if($('#calculator-tender')&&d.tender)$('#calculator-tender').value=d.tender;if($('#currency')&&d.currency)$('#currency').value=d.currency;
    Object.entries(d.allowances||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});
    const trigger=items.querySelector('.line-unit')||items.querySelector('.line-qty');if(trigger)trigger.dispatchEvent(new Event('input',{bubbles:true}));flashRestored();
  }
  function bindDraft(){
    if(!location.pathname.includes('tender-calculator.html'))return;let timer;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(saveDraft,300);};
    document.addEventListener('input',e=>{if(e.target.closest('.calculator-section'))schedule();});
    document.addEventListener('change',e=>{if(e.target.closest('.calculator-section'))schedule();});
    window.addEventListener('beforeunload',saveDraft);
  }
  function rememberRoute(){try{const p=location.pathname.split('/').pop()||'index.html';if(!['offline.html','404.html'].includes(p))localStorage.setItem('mmgcLastRoute',location.pathname+location.search+location.hash);}catch{}}
  function init(){setNetwork();addEventListener('online',setNetwork);addEventListener('offline',setNetwork);rememberRoute();registerSW();bindDraft();restoreDraft();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();