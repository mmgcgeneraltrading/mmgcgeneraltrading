document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('supplier-form');
  form?.addEventListener('submit',e=>{
    e.preventDefault();
    if(!form.reportValidity()) return;
    const d=new FormData(form);
    const msg=[
      'Hello MMGC General Trading,',
      '',
      'I would like to submit our company to the MMGC Supplier Marketplace / supplier network.',
      '',
      `Company: ${d.get('company')||''}`,
      `Contact person: ${d.get('contact')||''}`,
      `Phone / WhatsApp: ${d.get('phone')||''}`,
      `Email: ${d.get('email')||'Not provided'}`,
      `Category: ${d.get('category')||''}`,
      `Location: ${d.get('location')||'Not provided'}`,
      `Authorised reseller / distributor: ${d.get('authorised')||'Not specified'}`,
      '',
      'Products / brands / services:',
      `${d.get('capability')||''}`
    ].join('\n');
    window.open(`https://wa.me/26658311808?text=${encodeURIComponent(msg)}`,'_blank','noopener');
  });
});