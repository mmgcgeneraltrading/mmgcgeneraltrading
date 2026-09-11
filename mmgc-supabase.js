(()=>{
  if(window.MMGCPlatform)return;

  const SUPABASE_URL='https://avgudubydtofgoaaukby.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_AgqMGdhjjLXKJDEFcRLvpQ_hPSlqYBk';
  const SESSION_KEY='mmgc_supabase_session_v1';
  const PROJECT_BUCKET='job-applications';

  const jsonHeaders=()=>({apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'});
  const clean=(value)=>String(value??'').trim();
  const sessionNow=()=>Math.floor(Date.now()/1000);
  const encodePath=(path)=>String(path).split('/').map(encodeURIComponent).join('/');
  const safeFileName=(name)=>String(name||'document').normalize('NFKD').replace(/[^\w.\-()]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,120)||'document';

  function normalizeLesothoPhone(value){
    let digits=clean(value).replace(/\D/g,'');
    if(digits.startsWith('266'))digits=digits.slice(3);
    if(digits.startsWith('0')&&digits.length>8)digits=digits.slice(1);
    if(!/^\d{8}$/.test(digits))throw new Error('Enter an 8-digit Lesotho phone number.');
    return `+266${digits}`;
  }
  function phonePinPassword(phone,pin){
    const normalized=normalizeLesothoPhone(phone);
    const cleanPin=clean(pin);
    if(!/^\d{4,6}$/.test(cleanPin))throw new Error('PIN must be 4 to 6 digits.');
    return `Mmgc#${normalized.replace(/\D/g,'')}!${cleanPin}`;
  }
  const internalPhoneEmail=(phone)=>`${normalizeLesothoPhone(phone).replace(/\D/g,'')}@phone.mmgc.local`;
  const isInternalPhoneEmail=(email)=>/@phone\.mmgc\.local$/i.test(clean(email));

  const readStoredSession=()=>{try{const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');return session&&session.access_token?session:null}catch{return null}};
  const storeSession=(payload)=>{
    const source=payload?.session||payload;
    if(!source?.access_token)return null;
    const session={access_token:source.access_token,refresh_token:source.refresh_token||source.refreshToken||readStoredSession()?.refresh_token||'',token_type:source.token_type||'bearer',expires_at:Number(source.expires_at)||sessionNow()+Number(source.expires_in||3600),user:source.user||payload?.user||readStoredSession()?.user||null};
    localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    return session;
  };
  const clearSession=()=>localStorage.removeItem(SESSION_KEY);

  async function request(url,options={}){
    const response=await fetch(url,options);
    const text=await response.text();
    let data=null;
    if(text){try{data=JSON.parse(text)}catch{data=text}}
    if(!response.ok){const message=data?.msg||data?.message||data?.error_description||data?.error||`Request failed (${response.status})`;const error=new Error(message);error.status=response.status;error.data=data;throw error}
    return data;
  }
  async function refreshSession(session){
    if(!session?.refresh_token)return null;
    try{const data=await request(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:jsonHeaders(),body:JSON.stringify({refresh_token:session.refresh_token})});return storeSession(data)}catch{clearSession();return null}
  }
  async function getSession(){
    let session=readStoredSession();
    if(!session)return null;
    if(session.expires_at&&session.expires_at<sessionNow()+90)session=await refreshSession(session);
    if(session?.access_token&&!session.user){try{session.user=await getUser(session);localStorage.setItem(SESSION_KEY,JSON.stringify(session))}catch{}}
    return session;
  }
  async function authHeaders(){const session=await getSession();if(!session?.access_token)throw new Error('Please sign in first.');return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'}}
  function initAuthFromUrl(){
    const hash=new URLSearchParams((location.hash||'').replace(/^#/,'')),query=new URLSearchParams(location.search||'');
    const source=hash.get('access_token')?hash:query.get('access_token')?query:null;
    if(source){const session=storeSession({access_token:source.get('access_token'),refresh_token:source.get('refresh_token'),token_type:source.get('token_type')||'bearer',expires_in:Number(source.get('expires_in')||3600)});if(session){const cleanUrl=location.pathname+(query.get('id')?`?id=${encodeURIComponent(query.get('id'))}`:'');history.replaceState(null,document.title,cleanUrl)}}
    const error=hash.get('error_description')||query.get('error_description');return error?decodeURIComponent(error):'';
  }
  async function getUser(existingSession){const session=existingSession||await getSession();if(!session?.access_token)return null;return await request(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}})}

  async function signUpPhonePin({phone,pin,fullName,accountKind='individual',companyType=null,companyName=''}){
    const normalized=normalizeLesothoPhone(phone);
    await request(`${SUPABASE_URL}/functions/v1/phone-pin-signup`,{method:'POST',headers:jsonHeaders(),body:JSON.stringify({phone:normalized,pin:clean(pin),full_name:clean(fullName),account_kind:accountKind==='company'?'company':'individual',company_type:companyType||null,company_name:clean(companyName)})});
    return await signInPhonePin({phone:normalized,pin});
  }
  async function signInPhonePin({phone,pin}){
    const email=internalPhoneEmail(phone),password=phonePinPassword(phone,pin);
    const data=await request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:jsonHeaders(),body:JSON.stringify({email,password})});
    const session=storeSession(data);return {...data,session};
  }
  async function signInEmail({email,password}){
    const data=await request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:jsonHeaders(),body:JSON.stringify({email:clean(email),password:String(password||'')})});
    const session=storeSession(data);return {...data,session};
  }
  async function signOut(){const session=readStoredSession();if(session?.access_token){try{await request(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}})}catch{}}clearSession()}

  async function restSelect(table,query=''){const headers=await authHeaders();delete headers['Content-Type'];return await request(`${SUPABASE_URL}/rest/v1/${table}${query}`,{headers})}
  async function publicSelect(table,query=''){return await request(`${SUPABASE_URL}/rest/v1/${table}${query}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}})}
  async function insertRow(table,body){return await request(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:{...(await authHeaders()),Prefer:'return=representation'},body:JSON.stringify(body)})}
  async function patchRows(table,query,body){return await request(`${SUPABASE_URL}/rest/v1/${table}${query}`,{method:'PATCH',headers:{...(await authHeaders()),Prefer:'return=representation'},body:JSON.stringify(body)})}
  async function rpc(fn,body={}){return await request(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:await authHeaders(),body:JSON.stringify(body)})}

  async function upsertProfile(values={}){
    const session=await getSession(),user=session?.user||await getUser(session);if(!user?.id)throw new Error('Please sign in first.');
    const accountKind=values.accountKind==='company'?'company':'individual';
    const body={id:user.id,email:user.email,full_name:clean(values.fullName),phone:clean(values.phone),location:clean(values.location),profile_type:values.profileType||(accountKind==='company'?'customer':'applicant'),account_kind:accountKind,company_type:accountKind==='company'?(values.companyType||null):null,company_name:accountKind==='company'?(clean(values.companyName)||null):null};
    const rows=await request(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,{method:'POST',headers:{...(await authHeaders()),Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});return rows?.[0]||rows;
  }
  async function getProfile(){const session=await getSession(),user=session?.user||await getUser(session);if(!user?.id)return null;const rows=await restSelect('profiles',`?select=*&id=eq.${encodeURIComponent(user.id)}`);return rows?.[0]||null}

  async function uploadApplicationFile(file,applicationId,type='other'){
    const session=await getSession(),user=session?.user||await getUser(session);if(!user?.id)throw new Error('Please sign in first.');if(!file)throw new Error('No file selected.');
    const ext=(file.name.split('.').pop()||'').toLowerCase();if(file.type!=='application/pdf'&&ext!=='pdf')throw new Error(`${file.name} must be a PDF.`);if(file.size>15728640)throw new Error(`${file.name} is larger than 15MB.`);
    const stamp=`${Date.now()}-${Math.random().toString(16).slice(2)}`,path=`${user.id}/${applicationId}/${stamp}-${safeFileName(file.name)}`;
    await request(`${SUPABASE_URL}/storage/v1/object/${PROJECT_BUCKET}/${encodePath(path)}`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/pdf','x-upsert':'false'},body:file});
    const rows=await insertRow('application_documents',{application_id:applicationId,user_id:user.id,document_type:type,file_path:path,file_name:file.name,file_mime:'application/pdf',file_size:file.size});return rows?.[0]||rows;
  }
  async function downloadApplicationFile(path,fileName='document'){const session=await getSession();if(!session?.access_token)throw new Error('Please sign in first.');const response=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${PROJECT_BUCKET}/${encodePath(path)}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});if(!response.ok)throw new Error('Document could not be downloaded.');const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  async function createApplication(body){const session=await getSession(),user=session?.user||await getUser(session);if(!user?.id)throw new Error('Please sign in first.');const rows=await insertRow('job_applications',{...body,user_id:user.id});return rows?.[0]||rows}
  async function saveGeneratedDocument(applicationId,type,title,content,mode='website_draft',printRequested=false){const session=await getSession(),user=session?.user||await getUser(session);if(!user?.id)throw new Error('Please sign in first.');const rows=await insertRow('generated_application_documents',{application_id:applicationId,user_id:user.id,document_type:type,title,content,generation_mode:mode,print_requested:Boolean(printRequested)});return rows?.[0]||rows}
  async function listApplications(){const apps=await restSelect('job_applications','?select=*&order=created_at.desc');const ids=(apps||[]).map(x=>x.id).filter(Boolean);if(!ids.length)return [];const idList=ids.join(',');const [documents,generated,messages]=await Promise.all([restSelect('application_documents',`?select=*&application_id=in.(${idList})&order=uploaded_at.desc`).catch(()=>[]),restSelect('generated_application_documents',`?select=*&application_id=in.(${idList})&order=created_at.desc`).catch(()=>[]),restSelect('application_messages',`?select=*&application_id=in.(${idList})&order=created_at.asc`).catch(()=>[])]);return apps.map(app=>({...app,documents:(documents||[]).filter(x=>x.application_id===app.id),generated_documents:(generated||[]).filter(x=>x.application_id===app.id),messages:(messages||[]).filter(x=>x.application_id===app.id)}))}
  async function updateApplication(id,body){const rows=await patchRows('job_applications',`?id=eq.${encodeURIComponent(id)}`,body);return rows?.[0]||rows}
  async function currentStaffRole(){try{const value=await rpc('current_mmgc_staff_role',{});return typeof value==='string'?value:value?.current_mmgc_staff_role||value?.role||null}catch{return null}}

  window.MMGCPlatform={config:{url:SUPABASE_URL,bucket:PROJECT_BUCKET,publishableKey:SUPABASE_PUBLISHABLE_KEY},initAuthFromUrl,getSession,getUser,signUpPhonePin,signInPhonePin,signInEmail,signOut,upsertProfile,getProfile,publicSelect,createApplication,uploadApplicationFile,downloadApplicationFile,saveGeneratedDocument,listApplications,updateApplication,currentStaffRole,normalizeLesothoPhone,internalPhoneEmail,isInternalPhoneEmail};
})();
