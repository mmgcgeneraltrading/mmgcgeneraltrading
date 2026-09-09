document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('quote-form');
  const emailButton = document.getElementById('email-quote');
  const navToggle = document.getElementById('nav-toggle');

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

  const valid = () => {
    if (!form.reportValidity()) return false;
    return true;
  };

  const buildMessage = (d) => [
    'Hello MMGC General Trading,',
    '',
    'I would like to request a quotation / assistance.',
    '',
    `Name: ${d.name}`,
    `Company / Organisation: ${d.company || 'Not provided'}`,
    `Phone / WhatsApp: ${d.phone}`,
    `Email: ${d.email || 'Not provided'}`,
    `Service required: ${d.service}`,
    `Deadline: ${d.deadline || 'Not specified'}`,
    `Location: ${d.location || 'Not specified'}`,
    '',
    'Requirement:',
    d.message
  ].join('\n');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!valid()) return;
    const message = buildMessage(getData());
    window.open(`https://wa.me/26658311808?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });

  emailButton.addEventListener('click', () => {
    if (!valid()) return;
    const d = getData();
    const subject = `Quotation Request - ${d.service}`;
    const body = buildMessage(d);
    window.location.href = `mailto:mmgcgeneraltrading@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  document.querySelectorAll('.main-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      if (navToggle) navToggle.checked = false;
    });
  });
});
