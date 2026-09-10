const CACHE='mmgc-platform-v8';
const CORE=['/','/index.html','/opportunities.html','/tenders.html','/jobs.html','/job.html','/products.html','/stationery.html','/standard-services.html','/suppliers.html','/tender-calculator.html','/checklists.html','/styles.css','/mobile.css','/opportunities.css','/products.css','/assistant.css','/ai-bridge.css','/calculator-modern.css','/calculator-upload.css','/tender-intelligence.css','/site-integration.js','/jobs-data.js','/jobs-social-data.js','/jobs.js','/job.js','/calculator.js','/tender-intelligence.js','/procurement-data.js','/source-links.js','/assets/mmgc-logo.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response&&response.status===200){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('/index.html'))));
});