document.addEventListener('DOMContentLoaded',()=>{
  const tenders=Array.isArray(window.MMGC_TENDERS)?window.MMGC_TENDERS:[];
  const esc=(v='')=>String(v).replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
  const collectLinks=t=>{
    const raw=[
      ['document',t.documentUrl||t.documentURL],
      ['document',t.downloadUrl||t.downloadURL],
      ['advert',t.advertUrl||t.advertURL],
      ['advert',t.noticeUrl||t.noticeURL],
      ['official',t.official]
    ].filter(([,url])=>url);
    const seen=new Set();
    return raw.filter(([,url])=>{const key=String(url).trim();if(!key||seen.has(key))return false;seen.add(key);return true;}).map(([kind,url])=>({kind,url:String(url).trim()}));
  };
  const labelFor=link=>{
    const u=link.url.toLowerCase();
    const file=/\.(pdf|docx?|xlsx?|zip|7z)(?:[?#]|$)/i.test(u);
    if(link.kind==='document'||file)return '⬇ Download Tender Document';
    if(link.kind==='advert')return '📄 Open / Download Advert';
    return '↗ Official Source / Documents';
  };

  document.querySelectorAll('.tender-card[data-id]').forEach(card=>{
    const t=tenders.find(x=>x.id===card.dataset.id);if(!t)return;
    const links=collectLinks(t);if(!links.length)return;
    const actions=card.querySelector('.primary-actions')||card.querySelector('.card-actions');if(!actions)return;
    links.slice(0,2).forEach((link,i)=>{
      if(actions.querySelector(`[data-source-link="${i}"]`))return;
      const a=document.createElement('a');
      a.href=link.url;a.target='_blank';a.rel='noopener';a.dataset.sourceLink=String(i);
      a.className=i===0?'summary-link source-download':'cost-link source-download-alt';
      a.textContent=labelFor(link);actions.appendChild(a);
    });
  });

  const params=new URLSearchParams(location.search),id=params.get('id');
  if(id){
    const t=tenders.find(x=>x.id===id);if(!t)return;
    const links=collectLinks(t);if(!links.length)return;
    const official=document.getElementById('official-button');
    if(official){official.href=links[0].url;official.textContent=labelFor(links[0]);}
    const card=official?.closest('.detail-action-card');
    if(card&&links.length>1&&!card.querySelector('.extra-source-links')){
      const wrap=document.createElement('div');wrap.className='stack-actions extra-source-links';
      links.slice(1,3).forEach(link=>{const a=document.createElement('a');a.href=link.url;a.target='_blank';a.rel='noopener';a.className='btn secondary';a.textContent=labelFor(link);wrap.appendChild(a);});
      card.appendChild(wrap);
    }
  }
});