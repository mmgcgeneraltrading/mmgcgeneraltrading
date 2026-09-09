document.addEventListener('DOMContentLoaded', () => {
  const tenders = Array.isArray(window.MMGC_TENDERS) ? window.MMGC_TENDERS : [];
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const t = tenders.find(x => x.id === id) || null;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || ''; };
  const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  if (!t) {
    setText('detail-issuer','MMGC Procurement Desk');
    setText('detail-title','Tender summary not found');
    setText('detail-summary','Return to the Tender Desk to select an available opportunity.');
    const official = document.getElementById('official-button'); if (official) official.href = 'tenders.html';
    return;
  }

  const deadlineDate = t.deadline ? new Date(t.deadline) : null;
  const msLeft = deadlineDate ? deadlineDate.getTime() - Date.now() : null;
  const daysRemaining = () => {
    if (msLeft === null) return 'VERIFY DATE';
    if (msLeft < 0) return 'CLOSED';
    const hours = Math.ceil(msLeft / 3600000);
    if (hours <= 24) return hours <= 1 ? '< 1 HOUR' : `${hours} HOURS`;
    const days = Math.ceil(msLeft / 86400000);
    return `${days} DAY${days === 1 ? '' : 'S'}`;
  };
  setText('detail-issuer', t.issuer);
  setText('detail-title', t.title);
  setText('detail-summary', t.summary);
  setText('detail-deadline', t.deadlineLabel || 'Confirm with issuer');
  setText('days-remaining', daysRemaining());
  setText('detail-site-visit', `Site visit: ${t.siteVisit?.label || 'Check official document'}`);
  setText('detail-simple', t.simple);

  const badges = document.getElementById('detail-badges');
  if (badges) badges.innerHTML = [`${t.type || 'current'}`,...(t.categories||[]),t.ref ? `Ref: ${t.ref}` : ''].filter(Boolean).map(x => `<span>${escapeHtml(String(x).toUpperCase())}</span>`).join('');

  const snapshot = document.getElementById('snapshot-grid');
  if (snapshot) {
    const rows = [
      ['Closing date',t.deadlineLabel || 'Confirm with issuer','calendar'],
      ['Tender document',t.documentFee?.label || 'Check official notice',t.documentFee?.state || 'unknown'],
      ['Bid security',t.bidSecurity?.label || 'Check bidding document',t.bidSecurity?.state || 'unknown'],
      ['Site visit',t.siteVisit?.label || 'Check bidding document',t.siteVisit?.state || 'unknown'],
      ['Pre-bid meeting',t.preBid?.label || 'Check bidding document',t.preBid?.state || 'unknown'],
      ['Reference',t.ref || 'Not recorded by MMGC','ref']
    ];
    snapshot.innerHTML = rows.map(([label,value,state]) => `<div class="snapshot-panel ${escapeHtml(state)}"><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join('');
  }

  const lots = document.getElementById('detail-lots');
  if (lots) lots.innerHTML = (t.lots || []).map((x,i) => `<div class="lot-card"><span>LOT / ITEM ${String(i+1).padStart(2,'0')}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.text)}</p></div>`).join('');
  const checklist = document.getElementById('detail-checklist');
  if (checklist) checklist.innerHTML = (t.checklist || []).map(x => `<li><span>✓</span>${escapeHtml(x)}</li>`).join('');

  const official = document.getElementById('official-button'); if (official) official.href = t.official;
  const costUrl = `tender-calculator.html?tender=${encodeURIComponent(t.id)}`;
  const cost = document.getElementById('cost-button'); if (cost) cost.href = costUrl;
  const mobileCost = document.getElementById('mobile-cost'); if (mobileCost) mobileCost.href = costUrl;
  const checklistBtn = document.getElementById('download-checklist'); if (checklistBtn) checklistBtn.href = `checklists.html?type=${encodeURIComponent(t.type)}&tender=${encodeURIComponent(t.id)}`;
  const issuerLink = document.getElementById('issuer-link'); if (issuerLink) issuerLink.href = `issuer.html?issuer=${encodeURIComponent(t.issuerKey)}`;
  const categoryLink = document.getElementById('category-link'); if (categoryLink) categoryLink.href = `category.html?category=${encodeURIComponent((t.categories||[])[0] || t.type)}`;

  const summaryUrl = `${location.origin}${location.pathname.replace(/tender-details\.html.*/, '')}tender-details.html?id=${encodeURIComponent(t.id)}`;
  const shareText = encodeURIComponent(`${t.title}\n${t.issuer}\nDeadline: ${t.deadlineLabel || 'Confirm with issuer'}\nMMGC Tender Snapshot: ${summaryUrl}`);
  const share = document.getElementById('share-button'); if (share) share.href = `https://wa.me/?text=${shareText}`;
  const supportText = encodeURIComponent(`Hello MMGC, I need bid support for ${t.title}.`);
  const support = document.getElementById('support-button'); if (support) support.href = `https://wa.me/26658311808?text=${supportText}`;
  const mobileHelp = document.getElementById('mobile-help'); if (mobileHelp) mobileHelp.href = `https://wa.me/26658311808?text=${supportText}`;

  const calendar = document.getElementById('calendar-button');
  calendar?.addEventListener('click', () => {
    if (!deadlineDate) { alert('MMGC has not recorded a confirmed closing date for this tender. Please verify the official notice first.'); return; }
    const end = new Date(deadlineDate.getTime()+30*60000);
    const fmt = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MMGC General Trading//Procurement Desk//EN','BEGIN:VEVENT',`UID:${t.id}-${Date.now()}@mmgcgeneraltrading`,`DTSTAMP:${fmt(new Date())}`,`DTSTART:${fmt(deadlineDate)}`,`DTEND:${fmt(end)}`,`SUMMARY:Tender Deadline - ${t.title}`,`DESCRIPTION:${t.issuer} | Verify final submission requirements with the issuing authority.`,`URL:${t.official}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
    const blob = new Blob([ics],{type:'text/calendar;charset=utf-8'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=`${t.id}-deadline.ics`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  });
});