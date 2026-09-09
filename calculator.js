document.addEventListener('DOMContentLoaded', () => {
  const tenders = Array.isArray(window.MMGC_TENDERS) ? window.MMGC_TENDERS : [];
  const select = document.getElementById('calculator-tender');
  const currency = document.getElementById('currency');
  const items = document.getElementById('line-items');
  const addBtn = document.getElementById('add-line');
  const fields = ['doc-fee','transport','other-costs','overheads','contingency','markup','vat','security-rate'];
  const money = value => `${currency.value}${Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const num = id => Number(document.getElementById(id)?.value || 0);
  let lineId = 0;

  tenders.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=`${t.issuer} — ${t.title}`; select.appendChild(o); });
  const requested = new URLSearchParams(location.search).get('tender');
  if (requested && tenders.some(t=>t.id===requested)) select.value=requested;

  const addLine = (desc='',qty=1,unit=0) => {
    const row=document.createElement('div'); row.className='calc-line'; row.dataset.line=String(++lineId);
    row.innerHTML=`<label>Description<input class="line-desc" type="text" value="${desc.replace(/"/g,'&quot;')}" placeholder="Item / activity"></label><label>Qty<input class="line-qty" type="number" min="0" step="0.01" value="${qty}"></label><label>Unit cost<input class="line-unit" type="number" min="0" step="0.01" value="${unit}"></label><div class="line-total"><small>Total</small><b>${money(qty*unit)}</b></div><button class="remove-line" type="button" aria-label="Remove line">×</button>`;
    items.appendChild(row); recalc();
  };
  addLine('Primary item / activity',1,0);
  addLine('Accessories / supporting items',1,0);

  const selectedTender = () => tenders.find(t=>t.id===select.value);
  select.addEventListener('change', () => {
    const t=selectedTender();
    if (!t) return;
    if (items.children.length <= 2 && (t.lots||[]).length) {
      items.innerHTML=''; lineId=0; (t.lots||[]).forEach(l=>addLine(l.title,1,0));
    }
  });

  function recalc(){
    let subtotal=0;
    document.querySelectorAll('.calc-line').forEach(row=>{
      const q=Number(row.querySelector('.line-qty')?.value||0); const u=Number(row.querySelector('.line-unit')?.value||0); const total=q*u; subtotal+=total; row.querySelector('.line-total b').textContent=money(total);
    });
    const doc=num('doc-fee'), transport=num('transport'), other=num('other-costs');
    const direct=subtotal+doc+transport+other;
    const overhead=direct*(num('overheads')/100);
    const contingency=(direct+overhead)*(num('contingency')/100);
    const beforeMarkup=direct+overhead+contingency;
    const markup=beforeMarkup*(num('markup')/100);
    const exvat=beforeMarkup+markup;
    const vat=exvat*(num('vat')/100);
    const total=exvat+vat;
    const security=total*(num('security-rate')/100);
    const values={
      'sum-items':subtotal,'sum-doc':doc,'sum-transport':transport,'sum-other':other,'sum-overheads':overhead,'sum-contingency':contingency,'sum-cost':beforeMarkup,'sum-markup':markup,'sum-exvat':exvat,'sum-vat':vat,'sum-total':total,'sum-security':security
    };
    Object.entries(values).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=money(v);});
  }

  document.addEventListener('input', e => { if (e.target.closest('.calculator-section')) recalc(); });
  currency.addEventListener('change', recalc);
  addBtn.addEventListener('click',()=>addLine('',1,0));
  items.addEventListener('click',e=>{const b=e.target.closest('.remove-line');if(!b)return;b.closest('.calc-line')?.remove();recalc();});

  document.getElementById('print-costing')?.addEventListener('click',()=>window.print());
  document.getElementById('download-costing')?.addEventListener('click',()=>{
    const t=selectedTender();
    const rows=[['MMGC Tender Cost Calculator'],['Tender',t?.title||'General costing'],['Issuer',t?.issuer||''],[],['Description','Quantity','Unit Cost','Line Total']];
    document.querySelectorAll('.calc-line').forEach(row=>{const d=row.querySelector('.line-desc').value;const q=Number(row.querySelector('.line-qty').value||0);const u=Number(row.querySelector('.line-unit').value||0);rows.push([d,q,u,q*u]);});
    rows.push([],['Document fee',num('doc-fee')],['Transport / delivery',num('transport')],['Other direct costs',num('other-costs')],['Overheads %',num('overheads')],['Contingency %',num('contingency')],['Markup / profit %',num('markup')],['VAT %',num('vat')],['Bid security %',num('security-rate')],[],['CAUTION','Client/bidder must independently proof final BOQ quantities, arithmetic and tender total before submission.']);
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`MMGC-Tender-Costing-${t?.id||'general'}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  });
  recalc();
});