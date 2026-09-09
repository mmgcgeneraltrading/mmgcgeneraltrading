document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const alerts = document.getElementById('procurement-alerts');
  const cards = Array.from(document.querySelectorAll('.tender-card'));
  const activeAlerts = [];
  const search = document.getElementById('tender-search');
  const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
  const countEl = document.getElementById('open-count');
  const empty = document.getElementById('no-open-tenders');
  const navToggle = document.getElementById('nav-toggle');
  let activeFilter = 'all';

  cards.forEach((card) => {
    const closeRaw = card.dataset.close;
    const siteRaw = card.dataset.siteVisit;
    const title = card.querySelector('h3')?.textContent?.trim() || 'Tender opportunity';

    if (closeRaw) {
      const close = new Date(closeRaw);
      const msLeft = close.getTime() - now.getTime();
      if (msLeft < 0) {
        card.remove();
        return;
      }
      if (msLeft <= twoDaysMs) {
        const hours = Math.max(1, Math.ceil(msLeft / 3600000));
        activeAlerts.push({
          kind: 'SUBMISSION DUE SOON',
          title,
          detail: hours <= 24 ? `Submission closes in about ${hours} hour${hours === 1 ? '' : 's'}.` : 'Submission closes within 2 days.',
          href: `tender-details.html?id=${encodeURIComponent(card.dataset.tenderId || '')}`
        });
      }
    }

    if (siteRaw) {
      const visit = new Date(siteRaw);
      const msToVisit = visit.getTime() - now.getTime();
      if (msToVisit >= 0 && msToVisit <= twoDaysMs) {
        const hours = Math.max(1, Math.ceil(msToVisit / 3600000));
        activeAlerts.push({
          kind: 'SITE VISIT DUE SOON',
          title,
          detail: hours <= 24 ? `Site visit is in about ${hours} hour${hours === 1 ? '' : 's'}.` : 'Compulsory site visit is within 2 days.',
          href: `tender-details.html?id=${encodeURIComponent(card.dataset.tenderId || '')}`
        });
      }
    }
  });

  if (alerts && activeAlerts.length) {
    alerts.innerHTML = `<div class="wrap alerts-wrap">${activeAlerts.map(a => `
      <a class="deadline-alert" href="${a.href}">
        <span class="alert-badge">${a.kind}</span>
        <strong>${a.title}</strong>
        <span>${a.detail}</span>
        <b>View summary →</b>
      </a>`).join('')}</div>`;
  }

  const liveCards = () => Array.from(document.querySelectorAll('.tender-card'));

  const applyFilters = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    liveCards().forEach(card => {
      const type = (card.dataset.type || '').toLowerCase();
      const haystack = `${card.textContent} ${card.dataset.issuer || ''} ${type}`.toLowerCase();
      const matchesFilter = activeFilter === 'all' || type.includes(activeFilter);
      const matchesSearch = !q || haystack.includes(q);
      const show = matchesFilter && matchesSearch;
      card.classList.toggle('filtered-out', !show);
      if (show) visible += 1;
    });
    if (countEl) countEl.textContent = visible;
    if (empty) empty.hidden = visible !== 0;
  };

  search?.addEventListener('input', applyFilters);
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      filterButtons.forEach(b => b.classList.toggle('active', b === button));
      applyFilters();
    });
  });

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (navToggle) navToggle.checked = false;
    });
  });

  applyFilters();
});