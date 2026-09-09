document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('supplier-form');
  form?.addEventListener('submit',e=>{
    e.preventDefault();
    if(!form.reportValidity()) return;
    const d=new FormData(form);
    const msg=[
      'Hello MMGC General Trading,','',
      'I would like to submit our company to the MMGC Supplier Marketplace / supplier network.','',
      `Company: ${d.get('company')||''}`,
      `Contact person: ${d.get('contact')||''}`,
      `Phone / WhatsApp: ${d.get('phone')||''}`,
      `Email: ${d.get('email')||'Not provided'}`,
      `Country / base: ${d.get('country')||'Not provided'}`,
      `City / location: ${d.get('location')||'Not provided'}`,
      `Main category: ${d.get('category')||''}`,
      `Authorised reseller / distributor: ${d.get('authorised')||'Not specified'}`,
      `Typical lead time: ${d.get('leadtime')||'Not provided'}`,
      `Can deliver into Lesotho: ${d.get('lesotho_delivery')||'Not specified'}`,
      `Website / company page: ${d.get('website')||'Not provided'}`,'',
      'Products / brands / services:',`${d.get('capability')||''}`,'',
      'Commercial notes:',`${d.get('commercial')||'None'}`
    ].join('\n');
    window.open(`https://wa.me/26658311808?text=${encodeURIComponent(msg)}`,'_blank','noopener');
  });
});