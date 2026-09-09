document.addEventListener('DOMContentLoaded', () => {
  const tenders = {
    'finance-epayment': {
      issuer: 'Ministry of Finance & Development Planning / CAFI',
      title: 'Lesotho Government e-Payment Gateway',
      summary: 'Software development and implementation services for a Government e-Payment Gateway.',
      deadline: '10 September 2026',
      site: 'Site visit / pre-bid: confirm in the official bidding document.',
      badges: ['Major Tender', 'ICT / Software', 'Services', 'Ref: CAFI-WB-NC01'],
      simple: 'The procuring entity is seeking a capable technology provider to design, develop and implement an electronic government payment gateway. Bidders should study the full technical, implementation, security, integration and commercial requirements before pricing.',
      lots: [{title:'Main Requirement', text:'Software development, implementation and associated services for the Government e-Payment Gateway. Confirm milestones, integrations, hosting, support and deliverables in the official document.'}],
      checklist: ['Confirm bidder eligibility and required experience.','Check technical architecture, integrations and security requirements.','Confirm implementation timeline and support obligations.','Check whether bid security, forms or mandatory certifications apply.','Verify all addenda before submission.'],
      official: 'https://finance.gov.ls/tenders'
    },
    'roadfund-promotional': {
      issuer: 'Road Fund Lesotho',
      title: 'Supply & Delivery of 2027 Promotional Materials',
      summary: 'Supply and delivery of promotional materials for Road Fund Lesotho.',
      deadline: '11 September 2026',
      site: 'Site visit: not indicated on the MMGC listing; confirm with Road Fund.',
      badges: ['Supply Tender', 'Goods', 'Promotional Materials', 'Addendum Published'],
      simple: 'Road Fund is buying promotional items. The winning bidder must supply products that match the required descriptions, quantities, branding and delivery conditions. An addendum is listed by the issuer and should be checked before finalising the bid.',
      lots: [{title:'Promotional Materials', text:'The exact products, quantities, branding specifications and delivery requirements must be taken from the current bidding document and addendum.'}],
      checklist: ['Download the latest tender document and Addendum 1.','Check exact branding, dimensions, materials and quantities.','Price printing/branding, samples, packaging and delivery.','Confirm required tax and business documents.','Proof totals and delivery lead times before submission.'],
      official: 'https://www.roadfund.org.ls/tenders/'
    },
    'lhda-water': {
      issuer: 'Lesotho Highlands Development Authority (LHDA)',
      title: 'RFQ for Water Samples',
      summary: 'A current LHDA request for quotation relating to water samples.',
      deadline: '15 September 2026 · 12:00',
      site: 'Site visit / meeting: confirm in the official RFQ.',
      badges: ['RFQ', 'LHDA', 'Current Opportunity'],
      simple: 'This is an LHDA quotation opportunity. The detailed scope, sample requirements, quantities, technical standards and delivery/service location should be taken directly from the RFQ before pricing.',
      lots: [{title:'RFQ Requirement', text:'Review the official RFQ for the full water-sample scope, quantities, standards, service/delivery requirements and required documentation.'}],
      checklist: ['Confirm the full scope in the RFQ.','Check closing time and submission method.','Confirm mandatory technical or laboratory requirements.','Check delivery/service location and turnaround time.','Use the latest LHDA clarification or addendum if issued.'],
      official: 'https://lhda.org.ls/procurement/currentTenders'
    },
    'lhda-computers': {
      issuer: 'Lesotho Highlands Development Authority (LHDA)',
      title: 'RFQ for Purchasing of Computers',
      summary: 'Supply and delivery of HP EliteBook 6 G-series laptops in two lots with required accessories.',
      deadline: '17 September 2026 · 12:00',
      site: 'No site visit highlighted in the MMGC summary; verify the RFQ before submission.',
      badges: ['RFQ', 'ICT Equipment', '2 Lots', 'Goods'],
      simple: 'LHDA is requesting HP business laptops. Bidders can study each lot separately, but the complete package should include the required laptop configuration, Windows 11 Pro, accessories and warranty. Exact model compliance should be checked carefully before quoting.',
      lots: [
        {title:'Lot 1 — 14-inch HP EliteBook 6 G-series', text:'Quantity 22. Core 7 class processor as specified, 32GB RAM, 1TB SSD, Windows 11 Pro, webcam, Wi-Fi 6E, Bluetooth, HDMI, USB connectivity, backpack, optical USB mouse, RJ-45 Ethernet adapter and power equipment.'},
        {title:'Lot 2 — 16-inch HP EliteBook 6 G-series', text:'Quantity 10. Same core requirements, with a 16-inch LED display and the specified accessories.'}
      ],
      checklist: ['Confirm the exact HP EliteBook model and processor speed requirement.','Check availability of 32GB RAM / 1TB SSD configuration.','Include one backpack, mouse and Ethernet adapter per laptop.','Confirm warranty duration and whether reseller certification is required.','Price delivery, VAT and lead time clearly.','Proof the final quotation totals before submission.'],
      official: 'https://lhda.org.ls/procurement/currentTenders'
    },
    'finance-telematics': {
      issuer: 'Ministry of Finance & Development Planning',
      title: 'Telematics Tender',
      summary: 'Technology/services procurement listed by the Ministry of Finance.',
      deadline: '22 September 2026',
      site: 'Pre-bid / site requirements: confirm in the official bidding document.',
      badges: ['Major Tender', 'Technology', 'Services'],
      simple: 'This is a formal technology/services procurement. Before pricing, bidders should obtain and study the full scope, technical requirements, contract period, implementation obligations and required bidder qualifications.',
      lots: [{title:'Telematics Requirement', text:'Use the official bidding document for the complete system/service scope, quantities, locations, implementation requirements and contract conditions.'}],
      checklist: ['Obtain the complete bidding document.','Check mandatory experience and technical requirements.','Confirm whether bid security applies.','Check meeting/site-visit requirements and dates.','Review all commercial forms and submission instructions.'],
      official: 'https://finance.gov.ls/tenders'
    },
    'gov-production-equipment': {
      issuer: 'Government of Lesotho',
      title: 'LTV Supply & Delivery of Production Equipment',
      summary: 'Public supply tender for production and broadcast equipment.',
      deadline: 'Confirm in the official tender document',
      site: 'Site visit / pre-bid: confirm in the official document.',
      badges: ['Current Notice', 'Broadcast / ICT', 'Goods'],
      simple: 'The tender calls for production/broadcast equipment. Product costing should only be done after checking the exact make/model requirements, technical specifications, quantities, accessories, warranty and delivery conditions in the official document.',
      lots: [{title:'Production Equipment', text:'Refer to the official Government of Lesotho tender document for the complete item list, quantities and technical specifications.'}],
      checklist: ['Download the official bidding document.','Identify every item, quantity and mandatory specification.','Check whether equivalents are allowed.','Include warranty, accessories, freight and delivery.','Confirm closing date, bid security and mandatory forms.'],
      official: 'https://www.gov.ls/documents/tenders/'
    },
    'gov-vision-mixer': {
      issuer: 'Government of Lesotho', title:'Production Studio Vision Mixer and Accessories', summary:'Supply of a production studio vision mixer and accessories.', deadline:'Confirm with issuer', site:'Confirm with issuer.', badges:['Goods','Broadcast Equipment'], simple:'A specialist broadcast-equipment supply opportunity. Exact technical specifications and compatibility requirements must be checked before sourcing or pricing.', lots:[{title:'Vision Mixer & Accessories',text:'Use the official tender document for equipment specifications, quantities and required accessories.'}], checklist:['Check exact specifications.','Confirm compatible accessories.','Check warranty and delivery requirements.','Confirm submission date and forms.'], official:'https://www.gov.ls/documents/tenders/'
    },
    'gov-cleaning': {
      issuer:'Government of Lesotho', title:'Provision of Cleaning Services', summary:'Public procurement for cleaning services.', deadline:'Confirm with issuer', site:'Confirm whether a compulsory site visit applies.', badges:['Services','Cleaning'], simple:'A cleaning-services contract. Costing should be based on the actual buildings/areas, staffing requirements, frequency, materials, equipment and contract duration in the bidding document.', lots:[{title:'Cleaning Services',text:'Study the official scope for sites, areas, staffing, frequency and consumables.'}], checklist:['Confirm site-visit requirement.','Calculate staffing and supervision.','Include equipment and consumables.','Check contract duration and working hours.','Proof BOQ/pricing schedule totals.'], official:'https://www.gov.ls/documents/tenders/'
    },
    'rsl-current': {
      issuer:'Revenue Services Lesotho (RSL)', title:'Current RSL Procurement Opportunity', summary:'Current public procurement opportunity listed by RSL.', deadline:'15 September 2026', site:'Confirm in the RSL notice.', badges:['Public Procurement','RSL'], simple:'Open the RSL notice to identify the exact procurement category, mandatory documents, specifications and submission instructions.', lots:[{title:'Current Opportunity',text:'Refer to the RSL notice for the exact requirement and quantities.'}], checklist:['Read the full notice.','Confirm mandatory documents.','Check deadline and delivery requirements.','Verify any addenda.'], official:'https://www.rsl.org.ls/opportunities-jobs-tenders'
    },
    'lec-prequalification': {
      issuer:'Lesotho Electricity Company (LEC)', title:'Advert for Pre-Qualification', summary:'Public pre-qualification notice listed by LEC.', deadline:'Confirm with LEC', site:'Confirm with LEC.', badges:['Pre-Qualification','LEC'], simple:'This is a pre-qualification process rather than a normal price-only RFQ. Applicants should focus on eligibility, experience, capacity, registrations and the requested evidence.', lots:[{title:'Pre-Qualification',text:'Check the LEC notice for categories and the evidence required for each category.'}], checklist:['Choose the correct category.','Prepare experience evidence.','Confirm licences and registrations.','Check financial/capacity requirements.','Submit before the stated deadline.'], official:'https://lec.co.ls/tenders/'
    }
  };

  const id = new URLSearchParams(window.location.search).get('id');
  const t = tenders[id] || {
    issuer:'MMGC Procurement Desk', title:'Tender Summary', summary:'This tender summary is not yet available.', deadline:'Confirm with issuer', site:'Check the official notice.', badges:['Summary Pending'], simple:'MMGC has not yet published a detailed summary for this opportunity. Return to the Tender Desk or contact MMGC for assistance.', lots:[{title:'Summary pending',text:'Please use the official source or contact MMGC.'}], checklist:['Verify the official tender document before acting.'], official:'tenders.html'
  };

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText('detail-issuer', t.issuer);
  setText('detail-title', t.title);
  setText('detail-summary', t.summary);
  setText('detail-deadline', t.deadline);
  setText('detail-site-visit', t.site);
  setText('detail-simple', t.simple);

  const badges = document.getElementById('detail-badges');
  if (badges) badges.innerHTML = t.badges.map(x => `<span>${x}</span>`).join('');

  const lots = document.getElementById('detail-lots');
  if (lots) lots.innerHTML = t.lots.map(x => `<div class="lot-card"><h3>${x.title}</h3><p>${x.text}</p></div>`).join('');

  const checklist = document.getElementById('detail-checklist');
  if (checklist) checklist.innerHTML = t.checklist.map(x => `<li>${x}</li>`).join('');

  const official = document.getElementById('official-button');
  if (official) official.href = t.official;

  const tenderName = encodeURIComponent(t.title);
  const cost = document.getElementById('cost-button');
  if (cost) cost.href = `https://wa.me/26658311808?text=Hello%20MMGC%2C%20please%20help%20me%20estimate%20costs%20for%20${tenderName}.`;
  const support = document.getElementById('support-button');
  if (support) support.href = `https://wa.me/26658311808?text=Hello%20MMGC%2C%20I%20need%20bid%20support%20for%20${tenderName}.`;
});