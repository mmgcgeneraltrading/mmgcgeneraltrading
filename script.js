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
  addStylesheet('quote-form-upgrade.css');

  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = 'manifest.webmanifest';
    document.head.appendChild(manifest);
  }

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
    if (!nav.querySelector('a[href="opportunities.html"]')) {
      const opportunitiesLink = document.createElement('a');
      opportunitiesLink.href = 'opportunities.html';
      opportunitiesLink.textContent = 'Opportunities';
      const quoteLink = nav.querySelector('.pill');
      nav.insertBefore(opportunitiesLink, quoteLink || null);
    }
    if (!nav.querySelector('a[href="products.html"]')) {
      const productsLink = document.createElement('a');
      productsLink.href = 'products.html';
      productsLink.textContent = 'Products';
      const quoteLink = nav.querySelector('.pill');
      nav.insertBefore(productsLink, quoteLink || null);
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
    ribbon.innerHTML = '<div class="wrap"><strong>Looking for opportunities in Lesotho?</strong><a href="opportunities.html">Browse tenders, RFQs, jobs, consultancies & supplier opportunities →</a><a href="products.html">Shop / request products →</a></div>';
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
          <span class="tender-announcement-badge">MMGC OPPORTUNITIES</span>
          <h2 id="tender-announcement-title">Discover public opportunities on MMGC.</h2>
          <p>Browse Lesotho tenders, RFQs, jobs, consultancies and supplier opportunities, with direct links back to official sources.</p>
        </div>
        <div class="tender-announcement-body">
          <div class="tender-announcement-features">
            <div><b>Tenders & RFQs</b><span>Current procurement opportunities</span></div>
            <div><b>Jobs & Consultancies</b><span>Individual opportunities</span></div>
            <div><b>MMGC Support</b><span>Costing, sourcing and documents</span></div>
          </div>
          <div class="tender-announcement-actions">
            <a class="btn primary" href="opportunities.html">View Opportunities</a>
            <a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/26658311808?text=Hello%20MMGC%2C%20I%20need%20help%20with%20an%20opportunity.">Get MMGC Help</a>
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

  if (form && !form.querySelector('.quote-form-intro')) {
    const originalFields = Array.from(form.children);
    const intro = document.createElement('div');
    intro.className = 'quote-form-intro';
    intro.innerHTML = '<span>MMGC QUICK ENQUIRY</span><h3>Tell us exactly what you need.</h3><p>Three short sections help us prepare a useful response without unnecessary back-and-forth.</p><div class="quote-form-progress"><span></span><span></span><span></span></div>';
    const fieldsWrap = document.createElement('div');
    fieldsWrap.className = 'quote-form-fields';
    form.append(intro, fieldsWrap);
    originalFields.forEach(el => fieldsWrap.appendChild(el));

    const children = Array.from(fieldsWrap.children);
    const addStepBefore = (target, number, label) => {
      if (!target) return;
      const step = document.createElement('div');
      step.className = 'quote-step';
      step.innerHTML = `<b>${number}</b><span>${label}</span>`;
      fieldsWrap.insertBefore(step, target);
    };
    addStepBefore(children[0], '01', 'Your contact details');
    const serviceLabel = Array.from(fieldsWrap.querySelectorAll(':scope > label')).find(l => l.querySelector('select[name="service"]'));
    addStepBefore(serviceLabel, '02', 'What you need from MMGC');
    const deadlineRow = Array.from(fieldsWrap.querySelectorAll(':scope > .form-row')).find(r => r.querySelector('input[name="deadline"]'));
    addStepBefore(deadlineRow, '03', 'Timing & delivery');

    form.querySelectorAll('label').forEach(label => {
      const input = label.querySelector('input,select,textarea');
      if (!input) return;
      const raw = Array.from(label.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!raw) return;
      const required = input.required;
      const text = raw.textContent.trim();
      raw.textContent = '';
      const title = document.createElement('span');
      title.innerHTML = `${text} ${required ? '<span class="required-mark">*</span>' : '<span class="optional-mark">(optional)</span>'}`;
      label.insertBefore(title, label.firstChild);
    });

    const messageLabel = form.querySelector('textarea[name="message"]')?.closest('label');
    if (messageLabel) {
      const help = document.createElement('span');
      help.className = 'field-help';
      help.textContent = 'Include item names, quantities, model/specification, tender reference or scope of work where possible.';
      messageLabel.insertBefore(help, messageLabel.querySelector('textarea'));
    }
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