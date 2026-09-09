document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const alerts = document.getElementById('procurement-alerts');
  const cards = Array.from(document.querySelectorAll('.tender-card'));
  const activeAlerts = [];

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
        const hours = Math.max(1, Math.ceil(msLeft / (60 * 60 * 1000)));
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
        const hours = Math.max(1, Math.ceil(msToVisit / (60 * 60 * 1000)));
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

  const remaining = document.querySelectorAll('.tender-card').length;
  const empty = document.getElementById('no-open-tenders');
  if (empty && remaining === 0) empty.hidden = false;
});
