document.addEventListener('DOMContentLoaded', () => {
  const tenders = Array.isArray(window.MMGC_TENDERS) ? window.MMGC_TENDERS : [];
  const now = new Date();
  const dayMs = 86400000;
  const twoDaysMs = 2 * dayMs;
  const container = document.getElementById('tender-cards');
  const alerts = document.getElementById('procurement-alerts');
  const search = document.getElementById('tender-search');
  const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
  const countEl = document.getElementById('open-count');
  const empty = document.getElementById('no-open-tenders');
  const navToggle = document.getElementById('nav-toggle');
  let activeFilter = 'all';

  const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const isExpired = t => t.deadline && new Date(t.deadline).getTime() < now.getTime();
  const remaining = t => t.deadline ? new Date(t.deadline).getTime() - now.getTime() : null;
  const daysLabel = t => {
    const ms = remaining(t);
    if (ms === null) return 'Deadline to verify';
    if (ms < 0) return 'Closed';
    const hours = Math.ceil(ms / 3600000);
    if (hours <= 24) return hours <= 1 ? 'Closes within 1 hour' : `${hours} hours left`;
    const days = Math.ceil(ms / dayMs);
    return `${days} day${days === 1 ? '' : 's'} left`;
  };
  const typeLabel = type => ({rfq:'RFQ',major:'MAJOR TENDER',threshold:'THRESHOLD'}[type] || 'CURRENT NOTICE');
  const visitSupportUrl = t => `https://wa.me/26658311808?text=${encodeURIComponent(`Hello MMGC, I need site-visit attendance/support for: ${t.title} (${t.issuer}). Please confirm whether an authorised representative may attend and what documents are required.`)}`;
  const cardHtml = t => {
    const ms = remaining(t);
    const urgent = ms !== null && ms >= 0 && ms <= twoDaysMs;
    const cats = (t.categories || []).map(c => `<a href="category.html?category=${encodeURIComponent(c)}">${escapeHtml(c.toUpperCase())}</a>`).join('');
    const shareText = encodeURIComponent(`${t.title}\n${t.issuer}\nDeadline: ${t.deadlineLabel || 'Confirm with issuer'}\nMMGC summary: ${location.origin}${location.pathname.replace(/tenders\.html.*/, '')}tender-details.html?id=${encodeURIComponent(t.id)}`);
    const hasPossibleVisit = (t.siteVisit?.state || 'unknown') !== 'none';
    return `<article class="tender-card ${urgent ? 'urgent' : ''}" data-id="${escapeHtml(t.id)}" data-type="${escapeHtml([t.type,...(t.categories||[])].join(' '))}" data-search="${escapeHtml([t.title,t.issuer,t.ref,t.summary,...(t.categories||[])].join(' ').toLowerCase())}">
      <div class="card-top"><span class="status ${urgent ? 'urgent-status' : 'open'}">${typeLabel(t.type)}</span><span class="days-counter">${escapeHtml(daysLabel(t))}</span></div>
      <p class="issuer"><a href="issuer.html?issuer=${encodeURIComponent(t.issuerKey)}">${escapeHtml(t.issuer)}</a></p>
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.summary)}</p>
      <div class="meta">${t.ref ? `<span>Ref: ${escapeHtml(t.ref)}</span>` : ''}${cats}</div>
      <div class="snapshot-mini">
        <div><small>Closing</small><b>${escapeHtml(t.deadlineLabel || 'Confirm with issuer')}</b></div>
        <div><small>Document fee</small><b>${escapeHtml(t.documentFee?.label || 'Check notice')}</b></div>
        <div><small>Bid security</small><b>${escapeHtml(t.bidSecurity?.label || 'Check document')}</b></div>
        <div><small>Site visit</small><b>${escapeHtml(t.siteVisit?.label || 'Check document')}</b></div>
      </div>
      ${hasPossibleVisit ? `<div class="site-visit-offer"><span>MMGC SITE-VISIT SUPPORT</span><p>If this tender has a compulsory or optional site visit, MMGC can assist with attendance where the issuing authority permits an authorised representative.</p><a target="_blank" rel="noopener" href="${visitSupportUrl(t)}">Ask MMGC to attend →</a></div>` : ''}
      <div class="card-actions primary-actions"><a class="summary-link" href="tender-details.html?id=${encodeURIComponent(t.id)}">Open Tender Snapshot</a><a class="cost-link" href="tender-calculator.html?tender=${encodeURIComponent(t.id)}">Cost This Tender</a></div>
      <div class="utility-actions"><a target="_blank" rel="noopener" href="https://wa.me/?text=${shareText}">WhatsApp Share</a>${t.deadline ? `<button type="button" data-action="calendar" data-id="${escapeHtml(t.id)}">Add to Calendar</button>` : ''}<a href="checklists.html?type=${encodeURIComponent(t.type)}">Checklist</a>${hasPossibleVisit ? `<a target="_blank" rel="noopener" href="${visitSupportUrl(t)}">Site Visit Help</a>` : ''}<a target="_blank" rel="noopener" href="${escapeHtml(t.official)}">Official Source</a></div>
    </article>`;
  };

  const openTenders = tenders.filter(t => !isExpired(t));
  if (container) container.innerHTML = openTenders.map(cardHtml).join('');

  const listing = document.querySelector('.tender-listing .wrap');
  if (listing && !document.querySelector('.site-visit-service-banner')) {
    const banner = document.createElement('div');
    banner.className = 'site-visit-service-banner';
    banner.innerHTML = `<div><span>MMGC SITE-VISIT ATTENDANCE</span><h3>Do not miss a compulsory tender site visit.</h3><p>For tenders that include a site visit, MMGC can assist by attending on the client's behalf where the tender rules allow an authorised representative. We can help with attendance evidence, notes and site photographs where permitted.</p></div><a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/26658311808?text=${encodeURIComponent('Hello MMGC, I need help attending a compulsory tender site visit.')}" >Book Site-Visit Support</a>`;
    const filters = listing.querySelector('.filter-scroll');
    if (filters) filters.insertAdjacentElement('afterend', banner); else listing.prepend(banner);
  }

  const activeAlerts = [];
  openTenders.forEach(t => {
    const ms = remaining(t);
    if (ms !== null && ms >= 0 && ms <= twoDaysMs) {
      activeAlerts.push({kind:'SUBMISSION DUE SOON',title:t.title,detail:daysLabel(t),href:`tender-details.html?id=${encodeURIComponent(t.id)}`});
    }
    if (t.siteVisit?.date) {
      const sv = new Date(t.siteVisit.date).getTime() - now.getTime();
      if (sv >= 0 && sv <= twoDaysMs) activeAlerts.push({kind:'COMPULSORY SITE VISIT',title:t.title,detail:'Site visit is within 2 days — MMGC attendance support is available where representation is permitted.',href:visitSupportUrl(t)});
    }
  });
  if (alerts && activeAlerts.length) alerts.innerHTML = `<div class="wrap alerts-wrap">${activeAlerts.map(a=>`<a class="deadline-alert" href="${a.href}" ${a.href.startsWith('http')?'target="_blank" rel="noopener"':''}><span class="alert-badge">${a.kind}</span><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.detail)}</span><b>View →</b></a>`).join('')}</div>`;

  const cards = () => Array.from(document.querySelectorAll('.tender-card'));
  const applyFilters = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards().forEach(card => {
      const type = (card.dataset.type || '').toLowerCase();
      const haystack = card.dataset.search || '';
      const matchesFilter = activeFilter === 'all' || type.includes(activeFilter);
      const matchesSearch = !q || haystack.includes(q);
      const show = matchesFilter && matchesSearch;
      card.classList.toggle('filtered-out', !show);
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible;
    if (empty) empty.hidden = visible !== 0;
  };
  search?.addEventListener('input', applyFilters);
  filterButtons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all';
    filterButtons.forEach(b => b.classList.toggle('active', b === button));
    applyFilters();
  }));

  const toICS = t => {
    const start = new Date(t.deadline);
    const end = new Date(start.getTime() + 30 * 60000);
    const fmt = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MMGC General Trading//Procurement Desk//EN','BEGIN:VEVENT',`UID:${t.id}-${Date.now()}@mmgcgeneraltrading`,`DTSTAMP:${fmt(new Date())}`,`DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,`SUMMARY:Tender Deadline - ${t.title}`,`DESCRIPTION:${t.issuer} | Verify final submission instructions with issuing authority.`,`URL:${t.official}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  };
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="calendar"]');
    if (!btn) return;
    const t = tenders.find(x => x.id === btn.dataset.id);
    if (!t?.deadline) return;
    const blob = new Blob([toICS(t)], {type:'text/calendar;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${t.id}-deadline.ics`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  document.querySelectorAll('.main-nav a').forEach(link => link.addEventListener('click', () => { if (navToggle) navToggle.checked = false; }));
  applyFilters();
});