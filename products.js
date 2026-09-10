(()=>{const s=document.createElement('script');s.src='site-integration.js';s.defer=true;document.head.appendChild(s);})();
document.addEventListener('DOMContentLoaded',()=>{
  const products=Array.isArray(window.MMGC_PRODUCTS)?window.MMGC_PRODUCTS:[];
  const categories=Array.isArray(window.MMGC_PRODUCT_CATEGORIES)?window.MMGC_PRODUCT_CATEGORIES:[];
  const grid=document.getElementById('product-grid');
  const filters=document.getElementById('category-filters');
  const search=document.getElementById('product-search');
  const empty=document.getElementById('no-products');
  const basketItems=document.getElementById('basket-items');
  const basketEmpty=document.getElementById('basket-empty');
  const basketCount=document.getElementById('basket-count');
  const headerCount=document.getElementById('header-basket-count');
  const mobileCount=document.getElementById('mobile-basket-count');
  const navToggle=document.getElementById('nav-toggle');
  const esc=(v='')=>String(v).replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
  let active='all';
  let basket=[];
  try{basket=JSON.parse(localStorage.getItem('mmgcEnquiryBasket')||'[]');if(!Array.isArray(basket))basket=[];}catch{basket=[];}
  const save=()=>localStorage.setItem('mmgcEnquiryBasket',JSON.stringify(basket));
  const getProduct=id=>products.find(p=>p.id===id)||basket.find(x=>x.id===id)?.custom||null;
  const qtyFor=(card,id)=>Math.max(1,parseInt(card?.querySelector(`[data-qty="${id}"]`)?.value||1,10));
  const singleMessage=(p,qty)=>encodeURIComponent(['Hello MMGC General Trading,','','Please provide a price / quotation for:',`Product: ${p.name}`,`Quantity: ${qty}`,`Unit: ${p.unit}`,'','Please confirm exact specification, brand/model where applicable, availability, VAT and delivery.'].join('\n'));
  function renderFilters(){if(!filters)return;filters.innerHTML=categories.map(([key,label])=>`<button type="button" class="catalog-filter ${key===active?'active':''}" data-category="${esc(key)}">${esc(label)}</button>`).join('');}
  function categoryLabel(key){return (categories.find(c=>c[0]===key)||['',key])[1];}
  function icon(key){return ({stationery:'✎',cartridges:'INK','computer-accessories':'USB','printers-office':'PRN',cleaning:'CLN',electrical:'⚡',furniture:'OFF',ppe:'PPE','general-supplies':'GEN'}[key]||'GEN');}
  function renderProducts(){if(!grid)return;const q=(search?.value||'').trim().toLowerCase();const rows=products.filter(p=>(active==='all'||p.category===active)&&(!q||[p.name,p.description,p.category,...(p.tags||[])].join(' ').toLowerCase().includes(q)));grid.innerHTML=rows.map(p=>`<article class="product-card" data-product="${esc(p.id)}"><div class="product-card-top"><span class="product-category">${esc(categoryLabel(p.category))}</span><span class="product-icon">${esc(icon(p.category))}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><label class="product-qty">Quantity <input type="number" min="1" step="1" value="1" data-qty="${esc(p.id)}"></label><div class="product-actions"><a class="request-price" target="_blank" rel="noopener" href="https://wa.me/26658311808?text=${singleMessage(p,1)}" data-direct="${esc(p.id)}">Request Price</a><button type="button" class="add-enquiry" data-add="${esc(p.id)}">Add to Enquiry</button><a class="wa-order" target="_blank" rel="noopener" href="https://wa.me/26658311808?text=${singleMessage(p,1)}" data-direct="${esc(p.id)}">WhatsApp Order</a></div></article>`).join('');if(empty)empty.hidden=rows.length!==0;}
  function renderBasket(){const clean=basket.filter(x=>getProduct(x.id));if(clean.length!==basket.length){basket=clean;save();}const totalQty=basket.reduce((s,x)=>s+(Number(x.qty)||0),0);if(basketCount)basketCount.textContent=`${basket.length} item${basket.length===1?'':'s'} · Qty ${totalQty}`;if(headerCount)headerCount.textContent=basket.length;if(mobileCount)mobileCount.textContent=basket.length;if(basketEmpty)basketEmpty.hidden=basket.length>0;if(!basketItems)return;basketItems.innerHTML=basket.map(x=>{const p=getProduct(x.id);const price=p?.price?` · ${p.price}`:'';return `<div class="basket-row"><div><b>${esc(p?.name||'Item')}</b><small>Unit: ${esc(p?.unit||'unit')}${esc(price)}</small></div><label>Qty<input type="number" min="1" step="1" value="${Number(x.qty)||1}" data-basket-qty="${esc(x.id)}"></label><button type="button" aria-label="Remove item" data-remove="${esc(x.id)}">×</button></div>`;}).join('');}
  function add(id,qty){const n=Math.max(1,parseInt(qty||1,10));const existing=basket.find(x=>x.id===id);if(existing)existing.qty+=n;else basket.push({id,qty:n});save();renderBasket();const panel=document.getElementById('basket');panel?.classList.add('basket-flash');setTimeout(()=>panel?.classList.remove('basket-flash'),600);}
  function combinedMessage(){const name=document.getElementById('basket-name')?.value.trim()||'Not provided';const company=document.getElementById('basket-company')?.value.trim()||'Not provided';const phone=document.getElementById('basket-phone')?.value.trim()||'Not provided';const locationValue=document.getElementById('basket-location')?.value.trim()||'Not provided';const note=document.getElementById('basket-note')?.value.trim()||'None';const lines=basket.map((x,i)=>{const p=getProduct(x.id);return `${i+1}. ${p?.name||'Item'} — Qty ${x.qty} (${p?.unit||'unit'})${p?.price?' — listed '+p.price:''}`;});return ['Hello MMGC General Trading,','','I would like a combined quotation for the following items:',...lines,'',`Name: ${name}`,`Company / Organisation: ${company}`,`Phone / WhatsApp: ${phone}`,`Delivery location: ${locationValue}`,`Additional requirement: ${note}`,'','Please confirm specification, availability, VAT, delivery and commercial terms.'].join('\n');}
  function ensureBasket(){if(!basket.length){alert('Your enquiry basket is empty. Add at least one product first.');return false;}return true;}
  filters?.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;active=b.dataset.category||'all';renderFilters();renderProducts();});
  search?.addEventListener('input',renderProducts);
  grid?.addEventListener('input',e=>{if(!e.target.matches('[data-qty]'))return;const id=e.target.dataset.qty;const p=getProduct(id);const card=e.target.closest('.product-card');const qty=Math.max(1,parseInt(e.target.value||1,10));card?.querySelectorAll('[data-direct]').forEach(a=>a.href=`https://wa.me/26658311808?text=${singleMessage(p,qty)}`);});
  grid?.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const card=b.closest('.product-card');add(b.dataset.add,qtyFor(card,b.dataset.add));b.textContent='Added ✓';setTimeout(()=>b.textContent='Add to Enquiry',900);});
  basketItems?.addEventListener('change',e=>{if(!e.target.matches('[data-basket-qty]'))return;const row=basket.find(x=>x.id===e.target.dataset.basketQty);if(row){row.qty=Math.max(1,parseInt(e.target.value||1,10));save();renderBasket();}});
  basketItems?.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;basket=basket.filter(x=>x.id!==b.dataset.remove);save();renderBasket();});
  document.getElementById('clear-basket')?.addEventListener('click',()=>{if(!basket.length)return;if(confirm('Clear all items from the enquiry basket?')){basket=[];save();renderBasket();}});
  document.getElementById('send-basket-wa')?.addEventListener('click',()=>{if(!ensureBasket())return;window.open(`https://wa.me/26658311808?text=${encodeURIComponent(combinedMessage())}`,'_blank','noopener');});
  document.getElementById('send-basket-email')?.addEventListener('click',()=>{if(!ensureBasket())return;location.href=`mailto:mmgcgeneraltrading@gmail.com?subject=${encodeURIComponent('MMGC Product Quotation Request')}&body=${encodeURIComponent(combinedMessage())}`;});
  document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{if(navToggle)navToggle.checked=false;}));
  renderFilters();renderProducts();renderBasket();
});