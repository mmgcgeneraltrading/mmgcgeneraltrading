(()=>{const s=document.createElement('script');s.src='site-integration.js';s.defer=true;document.head.appendChild(s);})();
document.addEventListener('DOMContentLoaded',()=>{
  const tenders=Array.isArray(window.MMGC_TENDERS)?window.MMGC_TENDERS:[];
  const now=Date.now();
  const container=document.getElementById('past-cards');
  const search=document.getElementById('past-search');
  const count=document.getElementById('past-count');
  const empty=document.getElementById('no-past-tenders');
  const navToggle=document.getElementById('nav-toggle');
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const expired=tenders.filter(t=>t.deadline&&new Date(t.deadline).getTime()<now).sort((a,b)=>new Date(b.deadline)-new Date(a.deadline));
  const card=t=>`<article class="tender-card archive-card" data-search="${esc([t.title,t.issuer,t.ref,t.summary,...(t.categories||[])].join(' ').toLowerCase())}"><div class="card-top"><span class="status closed">CLOSED</span><span class="deadline">Closed ${esc(t.deadlineLabel||'')}</span></div><p class="issuer"><a href="issuer.html?issuer=${encodeURIComponent(t.issuerKey||'')}">${esc(t.issuer)}</a></p><h3>${esc(t.title)}</h3><p>${esc(t.summary||'')}</p><div class="meta">${t.ref?`<span>Ref: ${esc(t.ref)}</span>`:''}${(t.categories||[]).slice(0,3).map(c=>`<a href="category.html?category=${encodeURIComponent(c)}">${esc(c.toUpperCase())}</a>`).join('')}</div><div class="card-actions"><a class="summary-link" href="tender-details.html?id=${encodeURIComponent(t.id)}">View Archived Snapshot</a><a class="cost-link" href="tender-calculator.html?tender=${encodeURIComponent(t.id)}">Historical Costing</a></div></article>`;
  if(container)container.innerHTML=expired.map(card).join('');
  const refresh=()=>{const q=(search?.value||'').trim().toLowerCase();let visible=0;Array.from(container?.querySelectorAll('.archive-card')||[]).forEach(c=>{const show=!q||(c.dataset.search||'').includes(q);c.style.display=show?'':'none';if(show)visible++;});if(count)count.textContent=visible;if(empty)empty.hidden=visible!==0;};
  search?.addEventListener('input',refresh);
  document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{if(navToggle)navToggle.checked=false;}));
  refresh();
});