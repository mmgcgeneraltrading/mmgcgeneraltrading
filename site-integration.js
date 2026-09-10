(()=>{
  if(window.MMGC_SITE_INTEGRATION_LOADED)return;
  window.MMGC_SITE_INTEGRATION_LOADED=true;
  const load=(tag,attrs)=>{const key=attrs.src||attrs.href;if(!key)return;if(document.querySelector(`${tag}[src="${key}"],${tag}[href="${key}"]`))return;const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>el[k]=v);document.head.appendChild(el);};
  const init=()=>{
    const nav=document.querySelector('.main-nav');
    if(nav){
      nav.querySelectorAll('a[href="tenders.html"]').forEach(a=>a.textContent='Tenders & RFQs');
      nav.querySelectorAll('a[href="jobs.html"]').forEach(a=>a.textContent='Jobs & Consultancies');
      let opp=nav.querySelector('a[href="opportunities.html"]');
      if(!opp){opp=document.createElement('a');opp.href='opportunities.html';opp.textContent='Opportunities';const home=nav.querySelector('a[href="index.html"],a[href="#home"]');home?.insertAdjacentElement('afterend',opp);if(!home)nav.prepend(opp);}
      const tender=nav.querySelector('a[href="tenders.html"]');
      if(tender&&tender.previousElementSibling!==opp)opp.insertAdjacentElement('afterend',tender);
      let jobs=nav.querySelector('a[href="jobs.html"]');
      if(!jobs){jobs=document.createElement('a');jobs.href='jobs.html';jobs.textContent='Jobs & Consultancies';tender?.insertAdjacentElement('afterend',jobs);}
      else if(tender&&jobs.previousElementSibling!==tender)tender.insertAdjacentElement('afterend',jobs);
      const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
      nav.querySelectorAll('a[href]').forEach(a=>{const target=(a.getAttribute('href')||'').split('#')[0].toLowerCase();if(target===current)a.setAttribute('aria-current','page');});
    }
    document.querySelectorAll('.main-nav a').forEach(a=>{if(a.dataset.mmgcNavBound)return;a.dataset.mmgcNavBound='1';a.addEventListener('click',()=>{const t=document.getElementById('nav-toggle');if(t)t.checked=false;});});
    document.querySelectorAll('.stationery-card .quote').forEach(a=>{
      a.textContent='Add to Enquiry';a.href='products.html#basket';
      if(a.dataset.mmgcBasketBound)return;a.dataset.mmgcBasketBound='1';
      a.addEventListener('click',e=>{
        e.preventDefault();const card=a.closest('.stationery-card');if(!card)return;
        const name=card.querySelector('h3')?.textContent?.trim()||'Stationery item';
        const unit=(card.querySelector('.sell-price small')?.textContent||card.querySelector('.pack')?.textContent||'unit').replace('/','').trim();
        const price=card.querySelector('.sell-price')?.childNodes?.[0]?.textContent?.trim()||'';
        let basket=[];try{basket=JSON.parse(localStorage.getItem('mmgcEnquiryBasket')||'[]');if(!Array.isArray(basket))basket=[];}catch{basket=[];}
        const id='stationery-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
        const existing=basket.find(x=>x.id===id);if(existing)existing.qty=(Number(existing.qty)||1)+1;else basket.push({id,qty:1,custom:{name,unit:unit||'unit',price,category:'Stationery'}});
        localStorage.setItem('mmgcEnquiryBasket',JSON.stringify(basket));location.href='products.html#basket';
      });
    });
    if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  };
  load('link',{rel:'stylesheet',href:'assistant.css'});
  load('script',{src:'assistant.js',defer:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();