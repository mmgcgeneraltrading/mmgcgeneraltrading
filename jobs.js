(()=>{const s=document.createElement('script');s.src='site-integration.js';s.defer=true;document.head.appendChild(s);})();
document.addEventListener('DOMContentLoaded',()=>{
  const list=document.getElementById('job-list');
  const search=document.getElementById('job-search');
  const filters=document.getElementById('job-filters');
  const count=document.getElementById('job-count');
  const now=new Date();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const daysLeft=d=>Math.ceil((new Date(d)-now)/86400000);
  const active=(window.MMGC_JOBS||[]).filter(x=>new Date(x.deadline)>=now);
  let type='all';
  const schemaItems=active.filter(x=>x.type==='job').map(x=>({'@type':'JobPosting',title:x.title,description:x.summary,datePosted:(x.posted||'').slice(0,10),validThrough:x.deadline,hiringOrganization:{'@type':'Organization',name:x.employer},jobLocation:{'@type':'Place',address:{'@type':'PostalAddress',addressLocality:x.location,addressCountry:'LS'}},url:x.official}));
  if(schemaItems.length){const ld=document.createElement('script');ld.type='application/ld+json';ld.textContent=JSON.stringify({'@context':'https://schema.org','@graph':schemaItems});document.head.appendChild(ld);}
  function render(){
    const q=(search?.value||'').trim().toLowerCase();
    const rows=active.filter(x=>(type==='all'||x.type===type)&&(!q||[x.title,x.employer,x.location,x.summary,x.arrangement].join(' ').toLowerCase().includes(q)));
    if(count) count.textContent=rows.length;
    list.innerHTML=rows.map(x=>{
      const dl=new Date(x.deadline);const left=daysLeft(x.deadline);const deadlineLabel=left<=0?'Closes today':left===1?'Closes tomorrow':`Closes in ${left} days`;const detail=`job.html?id=${encodeURIComponent(x.id)}`;
      return `<article class="job-card" id="${esc(x.type)}-${esc(x.id)}"><div><span class="label">${x.type==='consultancy'?'Consultancy':'Job vacancy'}</span><h3><a href="${detail}">${esc(x.title)}</a></h3><div class="job-meta"><span><b>${esc(x.employer)}</b></span><span>${esc(x.location)}</span><span>${esc(x.arrangement)}</span></div><p>${esc(x.summary)}</p><div class="job-meta"><span class="deadline">${deadlineLabel} · ${dl.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</span></div></div><div class="job-actions"><a class="primary" href="${detail}">View Details</a><a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(x.title)}&dates=${dl.toISOString().replace(/[-:]/g,'').replace('.000','')}/${dl.toISOString().replace(/[-:]/g,'').replace('.000','')}&details=${encodeURIComponent('Deadline for '+x.title+' - verify on official source: '+x.official)}" target="_blank" rel="noopener">Calendar</a><a href="https://wa.me/?text=${encodeURIComponent(x.title+' — '+x.employer+' — deadline '+dl.toLocaleString('en-GB')+' — '+location.origin+'/'+detail)}" target="_blank" rel="noopener">Share</a><a href="${esc(x.official)}" target="_blank" rel="noopener">Official Source</a></div></article>`;
    }).join('')||'<p>No current opportunity matches this search or filter.</p>';
  }
  search?.addEventListener('input',render);
  filters?.addEventListener('click',e=>{const b=e.target.closest('button[data-type]');if(!b)return;type=b.dataset.type;filters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render();});
  render();
});