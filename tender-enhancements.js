(()=>{const s=document.createElement('script');s.src='site-integration.js';s.defer=true;document.head.appendChild(s);})();
document.addEventListener('DOMContentLoaded',()=>{
  const tenders=Array.isArray(window.MMGC_TENDERS)?window.MMGC_TENDERS:[];
  const now=new Date();
  const twoDays=2*86400000;

  const toolsBar=document.querySelector('.desk-tools-bar');
  if(toolsBar){
    const links=Array.from(toolsBar.querySelectorAll('a')).map(a=>({href:a.getAttribute('href'),icon:a.querySelector('b')?.textContent||'•',title:a.querySelector('span')?.childNodes?.[0]?.textContent?.trim()||a.textContent.trim(),small:a.querySelector('small')?.textContent||''}));
    if(!links.some(x=>x.href==='alerts.html'))links.push({href:'alerts.html',icon:'!',title:'Tender Alerts',small:'Deadlines & new tenders'});
    toolsBar.innerHTML=`<div class="wrap"><details class="tender-tools-menu"><summary><span class="tools-summary-main"><span class="tools-summary-icon">☰</span><span class="tools-summary-text"><b>Tender Desk Tools</b><span>Checklists · Costing · Issuers · Categories · Suppliers · Alerts · Archive</span></span></span><span class="tools-chevron">⌄</span></summary><div class="tools-dropdown-grid">${links.map(x=>`<a href="${x.href}"><b>${x.icon}</b><span>${x.title}<small>${x.small}</small></span></a>`).join('')}</div></details></div>`;
  }

  const urgent=tenders.filter(t=>{
    if(!t.deadline)return false;
    const ms=new Date(t.deadline)-now;
    return ms>=0&&ms<=twoDays;
  });
  const siteUrgent=tenders.filter(t=>{
    const raw=t.siteVisit?.date;
    if(!raw)return false;
    const ms=new Date(raw)-now;
    return ms>=0&&ms<=twoDays;
  });
  if((urgent.length||siteUrgent.length)&&!sessionStorage.getItem('mmgcUrgentTenderPopupSeen')){
    const formatTime=t=>{
      const ms=new Date(t.deadline)-now;
      const hrs=Math.max(1,Math.ceil(ms/3600000));
      return hrs<=24?`${hrs}h left`:`${Math.ceil(hrs/24)}d left`;
    };
    const items=[...urgent.map(t=>({kind:'Submission',time:formatTime(t),title:t.title,issuer:t.issuer,href:`tender-details.html?id=${encodeURIComponent(t.id)}`})),...siteUrgent.map(t=>({kind:'Site Visit',time:'≤2 days',title:t.title,issuer:t.issuer,href:`tender-details.html?id=${encodeURIComponent(t.id)}`}))];
    const popup=document.createElement('div');
    popup.className='urgent-popup';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-modal','true');
    popup.setAttribute('aria-label','Urgent tender deadlines');
    popup.innerHTML=`<div class="urgent-popup-card"><div class="urgent-popup-head"><button class="urgent-popup-close" type="button" aria-label="Close">×</button><span>MMGC DEADLINE ALERT</span><h2>Submission due soon</h2><p>${urgent.length?'One or more listed tenders close within the next two days. Review them now.':'A compulsory site visit is approaching.'}</p></div><div class="urgent-popup-body">${items.map(x=>`<div class="urgent-popup-item"><div class="urgent-popup-time">${x.time}</div><div><b>${x.title}</b><small>${x.kind} · ${x.issuer}</small></div><a href="${x.href}">Open snapshot →</a></div>`).join('')}<div class="urgent-popup-actions"><a class="btn primary" href="tenders.html#opportunities">Review Tenders</a><a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/26658311808?text=${encodeURIComponent('Hello MMGC, I need urgent help with a tender that is due soon.')}" >Get Urgent MMGC Help</a></div></div></div>`;
    document.body.appendChild(popup);
    const close=()=>{popup.classList.remove('show');sessionStorage.setItem('mmgcUrgentTenderPopupSeen','1');setTimeout(()=>popup.remove(),200);};
    popup.querySelector('.urgent-popup-close')?.addEventListener('click',close);
    popup.addEventListener('click',e=>{if(e.target===popup)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&popup.isConnected)close();});
    setTimeout(()=>popup.classList.add('show'),450);
  }

  const prefs=(()=>{try{return JSON.parse(localStorage.getItem('mmgcTenderAlertPrefs')||'null');}catch{return null;}})();
  if(prefs && 'Notification' in window && Notification.permission==='granted'){
    const currentIds=tenders.filter(t=>!t.deadline||new Date(t.deadline)>=now).map(t=>t.id);
    let known=[];try{known=JSON.parse(localStorage.getItem('mmgcKnownTenderIds')||'[]');}catch{known=[];}
    const newlyListed=currentIds.filter(id=>!known.includes(id));
    if(newlyListed.length){
      const first=tenders.find(t=>t.id===newlyListed[0]);
      new Notification(`MMGC: ${newlyListed.length} new tender${newlyListed.length===1?'':'s'} listed`,{body:first?`${first.title} — ${first.issuer}`:'Open the MMGC Tender Desk to review them.',icon:'assets/mmgc-logo.png'});
    } else if(urgent.length){
      const t=urgent[0];
      const dayKey=`mmgcUrgentNotice-${t.id}-${now.toISOString().slice(0,10)}`;
      if(!localStorage.getItem(dayKey)){
        new Notification('MMGC: Submission due soon',{body:`${t.title} — ${t.deadlineLabel||'closing soon'}`,icon:'assets/mmgc-logo.png'});
        localStorage.setItem(dayKey,'1');
      }
    }
    localStorage.setItem('mmgcKnownTenderIds',JSON.stringify(currentIds));
  }

  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
});