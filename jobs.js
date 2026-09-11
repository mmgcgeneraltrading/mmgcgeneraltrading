(()=>{const s=document.createElement('script');s.src='site-integration.js';s.defer=true;document.head.appendChild(s);})();
document.addEventListener('DOMContentLoaded',()=>{
  const list=document.getElementById('job-list');
  const search=document.getElementById('job-search');
  const filters=document.getElementById('job-filters');
  const count=document.getElementById('job-count');
  const now=new Date();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const daysLeft=d=>Math.ceil((new Date(d)-now)/86400000);
  const combined=[...(Array.isArray(window.MMGC_JOBS)?window.MMGC_JOBS:[]),...(Array.isArray(window.MMGC_SOCIAL_JOBS)?window.MMGC_SOCIAL_JOBS:[])];
  const allJobs=[...new Map(combined.map(x=>[x.id,x])).values()];
  const active=allJobs.filter(x=>x.deadline&&new Date(x.deadline)>=now).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  let type='all';
  const verifyText=x=>x.verification==='double'?'Double verified':x.verification==='official'?'Official source verified':'Cross-checked';
  const verifyClass=x=>x.verification==='double'?'double':x.verification==='official'?'official':'cross';
  const schemaItems=active.filter(x=>x.type==='job').map(x=>({'@type':'JobPosting',title:x.title,description:x.summary,datePosted:(x.posted||'').slice(0,10),validThrough:x.deadline,hiringOrganization:{'@type':'Organization',name:x.employer},jobLocation:{'@type':'Place',address:{'@type':'PostalAddress',addressLocality:x.location,addressCountry:'LS'}},url:x.official}));
  if(schemaItems.length){const ld=document.createElement('script');ld.type='application/ld+json';ld.textContent=JSON.stringify({'@context':'https://schema.org','@graph':schemaItems});document.head.appendChild(ld);}

  function render(){
    const q=(search?.value||'').trim().toLowerCase();
    const rows=active.filter(x=>(type==='all'||x.type===type)&&(!q||[x.title,x.employer,x.location,x.summary,x.arrangement,x.primarySourceName,x.secondarySourceName,x.discoveredVia].join(' ').toLowerCase().includes(q)));
    if(count) count.textContent=rows.length;
    list.innerHTML=rows.map(x=>{
      const dl=new Date(x.deadline),left=daysLeft(x.deadline),closing=left<=0?'Closes today':left===1?'Closes tomorrow':`Closes in ${left} days`,detail=`job.html?id=${encodeURIComponent(x.id)}`;
      const sources=[x.primarySourceName,x.secondarySourceName].filter(Boolean).join(' + ');
      const second=x.secondary?`<a class="source-secondary" href="${esc(x.secondary)}" target="_blank" rel="noopener">2nd Source</a>`:'';
      const discovery=x.discoveredVia?`<span class="discovery-source">Discovered via ${esc(x.discoveredVia)}</span>`:'';
      const note=x.verificationNote?`<div class="verification-note-inline"><b>MMGC verification note:</b> ${esc(x.verificationNote)}</div>`:'';
      return `<article class="job-card ${left<=2?'urgent-job':''}" id="${esc(x.type)}-${esc(x.id)}"><div><div class="job-card-flags"><span class="label">${x.type==='consultancy'?'Consultancy':'Job vacancy'}</span><span class="verification-badge ${verifyClass(x)}">✓ ${verifyText(x)}</span>${discovery}</div><h3><a href="${detail}">${esc(x.title)}</a></h3><div class="job-meta"><span><b>${esc(x.employer)}</b></span><span>${esc(x.location)}</span><span>${esc(x.arrangement)}</span></div><p>${esc(x.summary)}</p><div class="verification-row"><b>Checked:</b> ${esc(sources||'Official/reputable source')} · 10 Sep 2026</div>${note}<div class="job-meta"><span class="deadline">${closing} · ${esc(x.deadlineLabel||dl.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}))}</span></div></div><div class="job-actions"><a class="primary" href="${detail}">View Details</a><a class="apply-now" href="job-apply.html?id=${encodeURIComponent(x.id)}">Apply on site</a><a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(x.title)}&dates=${dl.toISOString().replace(/[-:]/g,'').replace('.000','')}/${dl.toISOString().replace(/[-:]/g,'').replace('.000','')}&details=${encodeURIComponent('Deadline for '+x.title+' - verify on source: '+x.official)}" target="_blank" rel="noopener">Calendar</a><a href="https://wa.me/?text=${encodeURIComponent(x.title+' — '+x.employer+' — deadline '+(x.deadlineLabel||dl.toLocaleString('en-GB'))+' — '+location.origin+'/'+detail)}" target="_blank" rel="noopener">Share</a><a href="${esc(x.official)}" target="_blank" rel="noopener">${esc(x.officialLabel||'Primary Source')}</a>${second}</div></article>`;
    }).join('')||'<div class="no-jobs"><b>No current opportunity matches this search.</b><span>Try another employer, job title, location or switch the filter.</span></div>';
  }
  search?.addEventListener('input',render);
  filters?.addEventListener('click',e=>{const b=e.target.closest('button[data-type]');if(!b)return;type=b.dataset.type;filters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render();});
  render();
});
