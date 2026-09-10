document.addEventListener('DOMContentLoaded',()=>{
  const jobs=Array.isArray(window.MMGC_JOBS)?window.MMGC_JOBS:[];
  const id=new URLSearchParams(location.search).get('id');
  const job=jobs.find(x=>x.id===id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  if(!job){
    document.getElementById('job-title').textContent='Opportunity not found';
    document.getElementById('job-summary').textContent='This listing is unavailable or the link is incomplete. Return to MMGC Jobs & Consultancies to browse current opportunities.';
    document.getElementById('job-requirements').innerHTML='<li><a href="jobs.html">Browse current jobs and consultancies</a></li>';
    document.querySelector('.job-detail-side').hidden=true;
    return;
  }
  const dl=new Date(job.deadline),now=new Date(),closed=dl<now;
  const format=dl.toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short'});
  document.title=`${job.title} | MMGC Opportunities`;
  document.querySelector('meta[name="description"]')?.setAttribute('content',`${job.title} — ${job.employer}. ${job.summary}`.slice(0,160));
  let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=`https://mmgcgeneraltrading.github.io/job.html?id=${encodeURIComponent(job.id)}`;
  document.querySelector('meta[property="og:title"]')?.setAttribute('content',`${job.title} | MMGC Opportunities`);
  const ogurl=document.querySelector('meta[property="og:url"]')||(()=>{const m=document.createElement('meta');m.setAttribute('property','og:url');document.head.appendChild(m);return m;})();ogurl.content=canonical.href;
  document.getElementById('job-kind').textContent=`MMGC OPPORTUNITIES · ${job.type==='consultancy'?'CONSULTANCY':'JOB'}`;
  document.getElementById('job-title').textContent=job.title;
  document.getElementById('job-summary').textContent=job.summary;
  document.getElementById('job-meta').innerHTML=[job.employer,job.location,job.arrangement,`Deadline: ${format}`].map(x=>`<span>${esc(x)}</span>`).join('');
  document.getElementById('job-employer').textContent=job.employer;
  document.getElementById('job-requirements').innerHTML=(job.requirements||['See official source for complete requirements.']).map(x=>`<li>${esc(x)}</li>`).join('');
  document.getElementById('job-application').textContent=job.application||'See the official source for application instructions.';
  const official=document.getElementById('job-official');official.href=job.official;
  const calendar=document.getElementById('job-calendar');
  const date=dl.toISOString().replace(/[-:]/g,'').replace('.000','');calendar.href=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(job.title)}&dates=${date}/${date}&details=${encodeURIComponent('Verify and apply via official source: '+job.official)}`;
  document.getElementById('job-share').href=`https://wa.me/?text=${encodeURIComponent(`${job.title} — ${job.employer} — deadline ${format} — ${canonical.href}`)}`;
  if(closed){document.getElementById('job-closed').innerHTML='<div class="closed-banner">This opportunity has passed its listed closing date. Check the official source before taking any action.</div>';}
  if(job.type==='job'){
    const schema={'@context':'https://schema.org','@type':'JobPosting',title:job.title,description:job.summary,datePosted:(job.posted||'').slice(0,10),validThrough:job.deadline,hiringOrganization:{'@type':'Organization',name:job.employer},jobLocation:{'@type':'Place',address:{'@type':'PostalAddress',addressLocality:job.location,addressCountry:'LS'}},url:job.official};
    const ld=document.createElement('script');ld.type='application/ld+json';ld.textContent=JSON.stringify(schema);document.head.appendChild(ld);
  }
});