const CACHE='mmgc-platform-v13';
const CORE=['/','/index.html','/offline.html','/opportunities.html','/tenders.html','/jobs.html','/job.html','/job-apply.html','/applications.html','/products.html','/stationery.html','/standard-services.html','/suppliers.html','/tender-calculator.html','/checklists.html','/styles.css','/mobile.css','/opportunities.css','/application-system.css','/products.css','/assistant.css','/pwa.css','/ai-bridge.css','/calculator-modern.css','/calculator-upload.css','/tender-intelligence.css','/site-integration.js','/pwa.js','/mmgc-supabase.js','/jobs-data.js','/jobs-social-data.js','/jobs.js','/job.js','/job-apply.js','/applications.js','/calculator.js','/tender-intelligence.js','/procurement-data.js','/source-links.js','/manifest.webmanifest','/assets/mmgc-logo.png','/assets/mmgc-app-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{if(response&&response.status===200){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(async()=>await caches.match(event.request)||await caches.match('/offline.html')));return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.status===200){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;})));
});
