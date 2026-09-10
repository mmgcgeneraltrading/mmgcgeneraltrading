(()=>{const s=document.createElement('script');s.src='site-integration.js';s.defer=true;document.head.appendChild(s);})();
document.addEventListener('DOMContentLoaded',()=>{
  const tenders=Array.isArray(window.MMGC_TENDERS)?window.MMGC_TENDERS:[];
  const issuers=window.MMGC_ISSUERS||{};
  const mode=document.body.dataset.directory||'';
  const now=Date.now();
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const open=tenders.filter(t=>!t.deadline||new Date(t.deadline).getTime()>=now);
  const simpleCard=t=>`<article class="directory-tender-card"><p class="issuer">${esc(t.issuer)}</p><h3>${esc(t.title)}</h3><p>${esc(t.summary)}</p><div class="meta"><span>${esc(t.deadlineLabel||'Confirm deadline')}</span>${(t.categories||[]).slice(0,3).map(c=>`<span>${esc(c)}</span>`).join('')}</div><div class="card-actions"><a class="summary-link" href="tender-details.html?id=${encodeURIComponent(t.id)}">Tender Snapshot</a><a class="cost-link" href="tender-calculator.html?tender=${encodeURIComponent(t.id)}">Costing</a></div></article>`;
  if(mode==='issuers'){
    const grid=document.getElementById('directory-grid');
    grid.innerHTML=Object.entries(issuers).map(([key,i])=>{
      const count=open.filter(t=>t.issuerKey===key).length;
      return `<a class="directory-card" href="issuer.html?issuer=${encodeURIComponent(key)}"><span>${count} current</span><h2>${esc(i.short||i.name)}</h2><p>${esc(i.name)}</p><b>View issuer opportunities →</b></a>`;
    }).join('');
  }
  if(mode==='categories'){
    const grid=document.getElementById('directory-grid');
    const cats=[['goods','Goods','Products, equipment, supplies and consumables'],['services','Services','Professional, operational and contracted services'],['works','Works','Construction, civil works and technical works'],['ict','ICT','Computers, software, networks and technology'],['printing','Printing & Promotional','Printing, branding and promotional materials'],['cleaning','Cleaning','Cleaning, facilities and hygiene services']];
    grid.innerHTML=cats.map(([key,title,desc])=>{const count=open.filter(t=>(t.categories||[]).includes(key)).length;return `<a class="directory-card" href="category.html?category=${key}"><span>${count} current</span><h2>${title}</h2><p>${desc}</p><b>Browse category →</b></a>`}).join('');
  }
  if(mode==='issuer'){
    const key=new URLSearchParams(location.search).get('issuer');
    const issuer=issuers[key];
    document.getElementById('directory-title').textContent=issuer?.name||'Procurement Issuer';
    document.getElementById('directory-intro').textContent=issuer?'Current MMGC-listed opportunities from this authority. Always verify the latest notice and addenda on the official procurement page.':'Issuer not found.';
    const official=document.getElementById('directory-official'); if(official){official.href=issuer?.url||'issuers.html';official.textContent=issuer?'Visit Official Procurement Page':'Back to Issuers';}
    const rows=open.filter(t=>t.issuerKey===key); document.getElementById('directory-results').innerHTML=rows.length?rows.map(simpleCard).join(''):'<p class="no-open-tenders">No current MMGC-listed opportunities for this issuer.</p>';
  }
  if(mode==='category'){
    const key=(new URLSearchParams(location.search).get('category')||'').toLowerCase();
    document.getElementById('directory-title').textContent=`${key?key.charAt(0).toUpperCase()+key.slice(1):'Procurement'} Tenders`;
    document.getElementById('directory-intro').textContent='Current MMGC-listed opportunities in this procurement category.';
    const rows=open.filter(t=>(t.categories||[]).includes(key)||t.type===key); document.getElementById('directory-results').innerHTML=rows.length?rows.map(simpleCard).join(''):'<p class="no-open-tenders">No current MMGC-listed opportunities in this category.</p>';
  }
});