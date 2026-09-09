document.addEventListener('DOMContentLoaded', () => {
  const addStylesheet = (href) => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  };
  addStylesheet('mobile.css');
  addStylesheet('home-upgrades.css');

  const form = document.getElementById('quote-form');
  const emailButton = document.getElementById('email-quote');
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.querySelector('.main-nav');

  const pageMap = {
    '#about':'about.html',
    '#tender':'tender-support.html',
    '#services':'services.html',
    '#portfolio':'portfolio.html',
    '#industries':'industries.html',
    '#why':'why-mmgc.html'
  };
  if (nav) {
    nav.querySelectorAll('a').forEach(a => {
      if (pageMap[a.getAttribute('href')]) a.href = pageMap[a.getAttribute('href')];
    });
    if (!nav.querySelector('a[href="tenders.html"]')) {
      const tenderPageLink = document.createElement('a');
      tenderPageLink.href = 'tenders.html';
      tenderPageLink.textContent = 'Public Tenders';
      const quoteLink = nav.querySelector('.pill');
      nav.insertBefore(tenderPageLink, quoteLink || null);
    }
  }

  const sectionLinks = {
    about:['about.html','Explore About MMGC'],
    tender:['tender-support.html','Explore Tender Support'],
    services:['services.html','View All Services'],
    portfolio:['portfolio.html','View Portfolio Page'],
    industries:['industries.html','Explore Industries'],
    why:['why-mmgc.html','Why Choose MMGC']
  };
  Object.entries(sectionLinks).forEach(([id,[href,label]]) => {
    const section = document.getElementById(id);
    if (!section || section.querySelector(`a[href="${href}"]`)) return;
    const target = section.querySelector('h2')?.parentElement || section.querySelector('.wrap') || section;
    const a = document.createElement('a');
    a.href = href;
    a.className = 'full-page-link';
    a.textContent = `${label} →`;
    target.appendChild(a);
  });

  const header = document.querySelector('header');
  if (header && !document.querySelector('.home-tender-ribbon')) {
    const ribbon = document.createElement('div');
    ribbon.className = 'home-tender-ribbon';
    ribbon.innerHTML = '<div class="wrap"><strong>Looking for opportunities in Lesotho?</strong><a href="tenders.html">Browse current public tenders, RFQs & threshold procurement →</a></div>';
    header.insertAdjacentElement('afterend', ribbon);
  }

  if (!sessionStorage.getItem('mmgcTenderAnnouncementSeen')) {
    const popup = document.createElement('div');
    popup.className = 'tender-announcement';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-modal','true');
    popup.setAttribute('aria-labelledby','tender-announcement-title');
    popup.innerHTML = `
      <div class="tender-announcement-card">
        <div class="tender-announcement-top">
          <button class="tender-announcement-close" type="button" aria-label="Close">×</button>
          <span class="tender-announcement-badge">MMGC PROCUREMENT DESK</span>
          <h2 id="tender-announcement-title">Public tenders are now available on MMGC.</h2>
          <p>Browse Lesotho tender opportunities, RFQs and threshold procurement with simple MMGC summaries, deadline information, costing tools and bid-support links.</p>
        </div>
        <div class="tender-announcement-body">
          <div class="tender-announcement-features">
            <div><b>Available Tenders</b><span>Current public opportunities</span></div>
            <div><b>Tender Snapshots</b><span>Important requirements at a glance</span></div>
            <div><b>Costing Support</b><span>Tools for pricing and sourcing</span></div>
          </div>
          <div class="tender-announcement-actions">
            <a class="btn primary" href="tenders.html">View Public Tenders</a>
            <a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/26658311808?text=Hello%20MMGC%2C%20I%20need%20help%20with%20a%20tender.">Get Tender Help</a>
            <button class="btn secondary tender-announcement-later" type="button">Continue to Website</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(popup);
    const closePopup = () => {
      popup.classList.remove('show');
      sessionStorage.setItem('mmgcTenderAnnouncementSeen','1');
      setTimeout(() => popup.remove(), 250);
    };
    popup.querySelector('.tender-announcement-close')?.addEventListener('click', closePopup);
    popup.querySelector('.tender-announcement-later')?.addEventListener('click', closePopup);
    popup.addEventListener('click', e => { if (e.target === popup) closePopup(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && popup.isConnected) closePopup(); }, {once:true});
    setTimeout(() => popup.classList.add('show'), 450);
  }

  if (form) {
    const getData = () => {
      const data = new FormData(form);
      return {
        name: (data.get('name') || '').trim(),
        company: (data.get('company') || '').trim(),
        phone: (data.get('phone') || '').trim(),
        email: (data.get('email') || '').trim(),
        service: (data.get('service') || '').trim(),
        message: (data.get('message') || '').trim(),
        deadline: (data.get('deadline') || '').trim(),
        location: (data.get('location') || '').trim()
      };
    };
    const valid = () => form.reportValidity();
    const buildMessage = (d) => [
      'Hello MMGC General Trading,','',
      'I would like to request a quotation / assistance.','',
      `Name: ${d.name}`,
      `Company / Organisation: ${d.company || 'Not provided'}`,
      `Phone / WhatsApp: ${d.phone}`,
      `Email: ${d.email || 'Not provided'}`,
      `Service required: ${d.service}`,
      `Deadline: ${d.deadline || 'Not specified'}`,
      `Location: ${d.location || 'Not specified'}`,'','Requirement:',d.message
    ].join('\n');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!valid()) return;
      window.open(`https://wa.me/26658311808?text=${encodeURIComponent(buildMessage(getData()))}`, '_blank', 'noopener');
    });
    if (emailButton) emailButton.addEventListener('click', () => {
      if (!valid()) return;
      const d = getData();
      window.location.href = `mailto:mmgcgeneraltrading@gmail.com?subject=${encodeURIComponent(`Quotation Request - ${d.service}`)}&body=${encodeURIComponent(buildMessage(d))}`;
    });
  }

  document.querySelectorAll('.main-nav a').forEach(link => link.addEventListener('click', () => { if (navToggle) navToggle.checked = false; }));
});