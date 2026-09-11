(()=>{
  const WA='26658311808';
  const qs=(selector)=>document.querySelector(selector);
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=(value)=>String(value??'').trim();
  const combinedJobs=()=>[...(Array.isArray(window.MMGC_JOBS)?window.MMGC_JOBS:[]),...(Array.isArray(window.MMGC_SOCIAL_JOBS)?window.MMGC_SOCIAL_JOBS:[])];
  const selectedJob=()=>{
    const id=new URLSearchParams(location.search).get('id');
    return id?combinedJobs().find((job)=>job.id===id):null;
  };
  const setStatus=(el,message,type='')=>{
    if(!el)return;
    el.textContent=message;
    el.hidden=!message;
    el.className=`application-alert ${type}`.trim();
  };
  const setValue=(id,value)=>{
    const el=qs(id);
    if(el&&value!=null)el.value=value;
  };
  const toLocalDateTime=(value)=>{
    if(!value)return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  };
  const dateForDb=(value)=>{
    if(!value)return null;
    const date=new Date(value);
    return Number.isNaN(date.getTime())?null:date.toISOString();
  };
  const detectMethod=(job)=>{
    const text=`${job?.application||''} ${job?.summary||''}`.toLowerCase();
    if(/hand[\s-]?deliver|deliver.*hand|hard cop|physical submission|submit.*office/.test(text))return 'hand_delivered';
    if(/email|@/.test(text))return 'email';
    if(/apply through|online|portal|workday|careers|icims|quantum/.test(text))return 'online';
    return 'not_specified';
  };
  const methodLabel=(value)=>({online:'Online application',email:'Email application',hand_delivered:'Hand delivered',not_specified:'Check advert'})[value]||'Check advert';
  function populateJob(job){
    if(!job)return;
    qs('#summary-title').textContent=job.title;
    qs('#summary-text').textContent=job.summary||'Review the official source before submitting.';
    qs('#summary-meta').innerHTML=[
      job.employer,
      job.location,
      job.deadlineLabel||job.deadline,
      methodLabel(detectMethod(job))
    ].filter(Boolean).map((item)=>`<span>${esc(item)}</span>`).join('');
    setValue('#job-title-field',job.title);
    setValue('#employer-field',job.employer);
    setValue('#source-url-field',job.official||'');
    setValue('#deadline-field',toLocalDateTime(job.deadline));
    qs('#application-method').value=detectMethod(job);
    setValue('#public-notes-field',[job.application,job.requirements?.length?`Requirements: ${job.requirements.join('; ')}`:''].filter(Boolean).join('\n\n'));
    if(detectMethod(job)==='hand_delivered'){
      qs('#hand-delivery-required').checked=true;
      qs('#shop-collection-required').checked=true;
      qs('#wants-printing').checked=true;
    }
  }
  async function refreshAuth(){
    const current=qs('#auth-current'),form=qs('#auth-form'),status=qs('#auth-status');
    const session=await window.MMGCPlatform.getSession();
    if(session?.user){
      form.hidden=true;
      current.hidden=false;
      current.innerHTML=`<strong>Signed in as ${esc(session.user.email||'applicant')}</strong><span>Your application files and drafts can now be saved privately.</span><button class="application-secondary" type="button" id="sign-out">Sign out</button>`;
      setStatus(status,'','');
      setValue('#applicant-email-field',session.user.email||'');
      const profile=await window.MMGCPlatform.getProfile().catch(()=>null);
      if(profile){
        setValue('#applicant-name-field',profile.full_name||'');
        setValue('#phone-field',profile.phone||'');
        setValue('#location-field',profile.location||'');
        setValue('#auth-name',profile.full_name||'');
        setValue('#auth-phone',profile.phone||'');
      }
    }else{
      form.hidden=false;
      current.hidden=true;
    }
  }
  function authValues(){
    return {
      fullName:clean(qs('#auth-name')?.value),
      phone:clean(qs('#auth-phone')?.value),
      email:clean(qs('#auth-email')?.value),
      password:qs('#auth-password')?.value||''
    };
  }
  function collectDraftData(){
    const job=selectedJob();
    return {
      job_title:clean(qs('#job-title-field')?.value)||job?.title||'the advertised role',
      employer:clean(qs('#employer-field')?.value)||job?.employer||'the employer',
      application_method:qs('#application-method')?.value||detectMethod(job),
      applicant_name:clean(qs('#applicant-name-field')?.value)||clean(qs('#auth-name')?.value)||'Applicant Name',
      phone:clean(qs('#phone-field')?.value)||clean(qs('#auth-phone')?.value),
      email:clean(qs('#applicant-email-field')?.value)||clean(qs('#auth-email')?.value),
      location:clean(qs('#location-field')?.value),
      qualification:clean(qs('#qualification-field')?.value),
      career_summary:clean(qs('#career-summary-field')?.value),
      education:clean(qs('#education-field')?.value),
      experience:clean(qs('#experience-field')?.value),
      skills:clean(qs('#skills-field')?.value),
      fit:clean(qs('#fit-field')?.value),
      current_cv:clean(qs('#current-cv-field')?.value),
      referees:clean(qs('#referees-field')?.value),
      requirements:job?.requirements||[],
      advert_summary:clean(qs('#public-notes-field')?.value)||job?.summary||''
    };
  }
  const EXTRACT_MAX_FILES=4;
  const EXTRACT_MAX_BODY_CHARS=4200000;
  const extractionMime=(file)=>{
    const type=String(file.type||'').toLowerCase();
    const name=String(file.name||'').toLowerCase();
    if(type==='application/pdf'||name.endsWith('.pdf'))return 'application/pdf';
    if(type==='image/jpeg'||name.endsWith('.jpg')||name.endsWith('.jpeg'))return 'image/jpeg';
    if(type==='image/png'||name.endsWith('.png'))return 'image/png';
    if(type==='image/webp'||name.endsWith('.webp'))return 'image/webp';
    return type;
  };
  const fileToDataUrl=(file,mime)=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const raw=String(reader.result||'');
      resolve(mime?raw.replace(/^data:[^;]+;/,`data:${mime};`):raw);
    };
    reader.onerror=()=>reject(new Error('Could not read the selected CV file.'));
    reader.readAsDataURL(file);
  });
  const loadImage=(file)=>new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('This CV image could not be opened for extraction.'));};
    img.src=url;
  });
  async function compressedImageDataUrl(file){
    const img=await loadImage(file);
    const maxSide=1900;
    const largest=Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height,1);
    const scale=Math.min(1,maxSide/largest);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
    canvas.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve)=>canvas.toBlob(resolve,'image/jpeg',0.86));
    if(!blob)throw new Error('Could not prepare the CV image for extraction.');
    return fileToDataUrl(new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'}),'image/jpeg');
  }
  async function prepareCvExtractionFiles(files){
    const selected=[...files].slice(0,EXTRACT_MAX_FILES);
    let totalChars=0;
    const prepared=[];
    for(const file of selected){
      const mime=extractionMime(file);
      if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(mime)){
        throw new Error('For automatic CV reading, please use PDF, JPG, PNG or WebP. HEIC files can still be uploaded for MMGC staff review.');
      }
      let dataUrl;
      if(mime.startsWith('image/'))dataUrl=await compressedImageDataUrl(file);
      else dataUrl=await fileToDataUrl(file,mime);
      totalChars+=dataUrl.length;
      if(totalChars>EXTRACT_MAX_BODY_CHARS){
        throw new Error('The CV file is too large for instant extraction. Use a smaller PDF/photo, or upload it and MMGC staff will review it manually.');
      }
      prepared.push({
        filename:file.name || 'cv-upload',
        mime_type:mime,
        data_url:dataUrl
      });
    }
    return prepared;
  }
  function cvExtractionEndpoint(){
    return location.hostname.endsWith('vercel.app')?'/api/cv-extract':'https://mmgcgeneraltrading-github-io.vercel.app/api/cv-extract';
  }
  const textValue=(value)=>{
    if(Array.isArray(value))return value.map((item)=>clean(item)).filter(Boolean).join('\n');
    return clean(value);
  };
  function normalizeExtracted(result){
    const profile=result?.profile||result?.extracted?.profile||{};
    return {
      full_name:textValue(profile.full_name),
      email:textValue(profile.email),
      phone:textValue(profile.phone),
      location:textValue(profile.location),
      highest_qualification:textValue(profile.highest_qualification),
      career_summary:textValue(profile.career_summary),
      education_summary:textValue(profile.education_summary),
      experience_summary:textValue(profile.experience_summary),
      skills:textValue(profile.skills),
      job_fit_summary:textValue(profile.job_fit_summary),
      current_cv_text:textValue(profile.current_cv_text),
      referees:textValue(profile.referees),
      confidence:textValue(result?.confidence||profile.confidence),
      warnings:Array.isArray(result?.warnings)?result.warnings.map(textValue).filter(Boolean):[],
      missing:Array.isArray(result?.missing)?result.missing.map(textValue).filter(Boolean):[]
    };
  }
  function fillExtractedCv(profile){
    const pairs=[
      ['#applicant-name-field',profile.full_name],
      ['#phone-field',profile.phone],
      ['#applicant-email-field',profile.email],
      ['#location-field',profile.location],
      ['#qualification-field',profile.highest_qualification],
      ['#career-summary-field',profile.career_summary],
      ['#education-field',profile.education_summary],
      ['#experience-field',profile.experience_summary],
      ['#skills-field',profile.skills],
      ['#fit-field',profile.job_fit_summary],
      ['#current-cv-field',profile.current_cv_text],
      ['#referees-field',profile.referees]
    ];
    pairs.forEach(([selector,value])=>{if(clean(value))setValue(selector,value);});
    if(profile.full_name&&!clean(qs('#auth-name')?.value))setValue('#auth-name',profile.full_name);
    if(profile.phone&&!clean(qs('#auth-phone')?.value))setValue('#auth-phone',profile.phone);
    if(profile.email&&!clean(qs('#auth-email')?.value))setValue('#auth-email',profile.email);
  }
  function renderCvExtractPreview(profile){
    const preview=qs('#cv-extract-preview');
    if(!preview)return;
    const items=[
      ['Name',profile.full_name],
      ['Phone',profile.phone],
      ['Email',profile.email],
      ['Location',profile.location],
      ['Qualification',profile.highest_qualification],
      ['Skills',profile.skills],
      ['Experience',profile.experience_summary],
      ['Education',profile.education_summary]
    ].filter(([,value])=>clean(value));
    const detail=items.length?`<div class="cv-extract-grid">${items.map(([label,value])=>`<div class="cv-extract-item"><b>${esc(label)}</b><span>${esc(value)}</span></div>`).join('')}</div>`:'<p class="cv-extract-note">The CV was read, but very little structured information could be extracted. You can still type the missing details below.</p>';
    const notes=[
      profile.confidence?`<strong>Confidence:</strong> ${esc(profile.confidence)}`:'',
      profile.missing?.length?`<strong>Missing:</strong> ${esc(profile.missing.join(', '))}`:'',
      profile.warnings?.length?`<strong>Check:</strong> ${esc(profile.warnings.join(', '))}`:''
    ].filter(Boolean).join('<br>');
    preview.innerHTML=`<h3>CV details found</h3>${detail}${notes?`<p class="cv-extract-note">${notes}</p>`:''}`;
    preview.hidden=false;
  }
  async function extractCvAndFill(){
    const status=qs('#cv-extract-status'),button=qs('#extract-cv-fill');
    const files=[...(qs('#cv-files')?.files||[])];
    if(!files.length){
      setStatus(status,'Choose a CV file first, then extract it.','error');
      return;
    }
    button.disabled=true;
    setStatus(status,files.length>EXTRACT_MAX_FILES?`Reading the first ${EXTRACT_MAX_FILES} CV files. All selected files will still be saved when you submit.`:'Reading CV and preparing autofill…','');
    try{
      const prepared=await prepareCvExtractionFiles(files);
      const draftData=collectDraftData();
      const response=await fetch(cvExtractionEndpoint(),{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          files:prepared,
          job:{
            title:draftData.job_title,
            employer:draftData.employer,
            advert_summary:draftData.advert_summary,
            requirements:draftData.requirements
          }
        })
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'The CV could not be extracted right now.');
      const profile=normalizeExtracted(result);
      fillExtractedCv(profile);
      renderCvExtractPreview(profile);
      setStatus(status,'CV extracted and the form has been filled. Please review names, dates and contact details before submitting.','success');
    }catch(error){
      setStatus(status,error.message||'The CV could not be extracted. You can still upload it for MMGC staff review.','error');
    }finally{
      button.disabled=false;
    }
  }
  const listLines=(text)=>clean(text).split(/\n|;|,/).map((item)=>clean(item)).filter(Boolean).slice(0,10);
  function localDraft(data){
    const skills=listLines(data.skills);
    const requirementText=(data.requirements||[]).slice(0,4).join('; ');
    const cv=[
      data.applicant_name.toUpperCase(),
      [data.phone,data.email,data.location].filter(Boolean).join(' | '),
      '',
      'CAREER PROFILE',
      data.career_summary||`Motivated applicant applying for ${data.job_title} at ${data.employer}.`,
      '',
      'TARGET ROLE',
      `${data.job_title} — ${data.employer}`,
      '',
      'KEY SKILLS',
      ...(skills.length?skills.map((skill)=>`• ${skill}`):['• Communication and willingness to learn','• Ability to follow instructions and meet deadlines','• Teamwork and professional conduct']),
      '',
      'EDUCATION AND TRAINING',
      data.education||data.qualification||'Add education, certificates and relevant training.',
      '',
      'WORK EXPERIENCE',
      data.experience||'Add previous employers, duties, achievements and dates.',
      '',
      'JOB MATCH',
      data.fit||`This CV should highlight experience and skills that match ${data.job_title}.${requirementText?` Advert requirements to address: ${requirementText}`:''}`,
      '',
      'REFEREES',
      data.referees||'Available on request.'
    ].join('\n');
    const letter=[
      new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}),
      '',
      'The Hiring Manager',
      data.employer,
      '',
      `RE: APPLICATION FOR ${data.job_title.toUpperCase()}`,
      '',
      `I wish to apply for the position of ${data.job_title} at ${data.employer}. I am interested in this opportunity because my background, skills and attitude match the requirements of the advertised role.`,
      '',
      data.career_summary||data.experience?`My background includes ${data.career_summary||data.experience}.`:'I am a committed applicant who is ready to learn, work professionally and contribute positively to the organisation.',
      '',
      data.fit?`I believe I am suitable for this role because ${data.fit}.`:requirementText?`I have reviewed the advert requirements and my application should address the following areas: ${requirementText}.`:'I am confident that my skills, experience and willingness to work hard would make me a suitable candidate.',
      '',
      'I have attached my CV and supporting documents for your consideration. I would appreciate the opportunity to be considered for this position.',
      '',
      'Yours faithfully,',
      data.applicant_name,
      data.phone?`Tel: ${data.phone}`:'',
      data.email?`Email: ${data.email}`:''
    ].filter((line)=>line!==null).join('\n');
    return {cv,letter,mode:'website_draft'};
  }
  function aiEndpoint(){
    return location.hostname.endsWith('vercel.app')?'/api/job-application-ai':'https://mmgcgeneraltrading-github-io.vercel.app/api/job-application-ai';
  }
  async function createDrafts(){
    const status=qs('#draft-status'),output=qs('#draft-output');
    const data=collectDraftData();
    if(!data.career_summary&&!data.experience&&!data.skills&&!data.current_cv){
      setStatus(status,'Add at least your career summary, experience, skills or pasted CV text first.','error');
      return;
    }
    setStatus(status,'Preparing CV and application-letter drafts…','');
    qs('#generate-drafts').disabled=true;
    let drafts;
    try{
      const response=await fetch(aiEndpoint(),{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'draft',application:data})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.cv||!result.letter)throw new Error(result.error||'AI service unavailable');
      drafts={cv:result.cv,letter:result.letter,mode:'ai_assisted'};
      setStatus(status,'AI-assisted drafts are ready. Review and edit them before submission.','success');
    }catch{
      drafts=localDraft(data);
      setStatus(status,'Drafts are ready using the built-in website template. MMGC staff can improve them after reviewing uploaded files.','success');
    }finally{
      qs('#generate-drafts').disabled=false;
    }
    qs('#cv-draft').value=drafts.cv;
    qs('#letter-draft').value=drafts.letter;
    output.hidden=false;
    output.dataset.mode=drafts.mode;
  }
  function guessDocType(file,preferred){
    if(preferred)return preferred;
    const name=file.name.toLowerCase();
    if(name.includes('cv')||name.includes('resume'))return 'cv';
    if(name.includes('cert'))return 'certificate';
    if(name.includes('id'))return 'id_copy';
    if(name.includes('letter'))return 'application_letter';
    if(name.includes('post')||name.includes('advert'))return 'job_post';
    if(file.type.startsWith('image/'))return 'photo';
    return 'other';
  }
  function collectFiles(){
    const cv=[...(qs('#cv-files')?.files||[])].map((file)=>({file,type:'cv'}));
    const supporting=[...(qs('#supporting-files')?.files||[])].map((file)=>({file,type:guessDocType(file)}));
    return [...cv,...supporting];
  }
  function serviceLevel(){
    if(qs('#wants-printing')?.checked&&!qs('#wants-new-cv')?.checked&&!qs('#wants-cv-tailoring')?.checked&&!qs('#wants-letter')?.checked)return 'print_only';
    if(qs('#wants-new-cv')?.checked||qs('#wants-cv-tailoring')?.checked||qs('#wants-letter')?.checked||qs('#wants-printing')?.checked)return 'mmgc_assisted';
    return 'self_service';
  }
  async function submitApplication(event){
    event.preventDefault();
    const status=qs('#submit-status'),button=qs('#submit-application');
    if(!qs('#privacy-consent')?.checked){
      setStatus(status,'Please accept the privacy consent before submitting.','error');
      return;
    }
    const session=await window.MMGCPlatform.getSession();
    if(!session?.user){
      setStatus(status,'Please create an account or sign in first, then submit again.','error');
      qs('#auth-card')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const data=collectDraftData();
    if(!data.job_title||!data.applicant_name||!data.phone){
      setStatus(status,'Job title, applicant name and phone number are required.','error');
      return;
    }
    button.disabled=true;
    setStatus(status,'Saving application request…','');
    try{
      await window.MMGCPlatform.upsertProfile({
        fullName:data.applicant_name,
        phone:data.phone,
        location:data.location,
        profileType:'applicant'
      });
      const application=await window.MMGCPlatform.createApplication({
        job_post_external_id:selectedJob()?.id||null,
        job_title:data.job_title,
        employer:data.employer,
        source_url:clean(qs('#source-url-field')?.value),
        deadline:dateForDb(qs('#deadline-field')?.value),
        application_method:data.application_method,
        applicant_name:data.applicant_name,
        applicant_email:data.email,
        phone:data.phone,
        location:data.location,
        highest_qualification:data.qualification,
        career_summary:data.career_summary,
        education_summary:data.education,
        experience_summary:data.experience,
        skills:data.skills,
        current_cv_text:data.current_cv,
        why_right_fit:data.fit,
        referees:data.referees,
        wants_new_cv:qs('#wants-new-cv')?.checked||false,
        wants_cv_tailoring:qs('#wants-cv-tailoring')?.checked||false,
        wants_application_letter:qs('#wants-letter')?.checked||false,
        wants_printing:qs('#wants-printing')?.checked||false,
        hand_delivery_required:qs('#hand-delivery-required')?.checked||data.application_method==='hand_delivered',
        shop_collection_required:qs('#shop-collection-required')?.checked||false,
        service_level:serviceLevel(),
        collection_status:(qs('#shop-collection-required')?.checked||data.application_method==='hand_delivered')?'pending':'not_required',
        public_notes:clean(qs('#public-notes-field')?.value),
        privacy_consent:true
      });
      const files=collectFiles();
      for(let i=0;i<files.length;i++){
        setStatus(status,`Uploading document ${i+1} of ${files.length}…`,'');
        await window.MMGCPlatform.uploadApplicationFile(files[i].file,application.id,files[i].type);
      }
      const cvDraft=clean(qs('#cv-draft')?.value);
      const letterDraft=clean(qs('#letter-draft')?.value);
      const mode=qs('#draft-output')?.dataset.mode||'website_draft';
      if(cvDraft){
        await window.MMGCPlatform.saveGeneratedDocument(application.id,'cv',`${application.reference_no} CV draft`,cvDraft,mode,qs('#wants-printing')?.checked||false);
      }
      if(letterDraft){
        await window.MMGCPlatform.saveGeneratedDocument(application.id,'application_letter',`${application.reference_no} application letter`,letterDraft,mode,qs('#wants-printing')?.checked||false);
      }
      const collection=application.shop_collection_required||application.hand_delivery_required?' MMGC will prepare the file and mark it ready when hard copies can be collected from the shop.':' You can track progress from your applications dashboard.';
      const message=`Hello MMGC, my job application support reference is ${application.reference_no}. Job: ${data.job_title}${data.employer?` at ${data.employer}`:''}. Please assist with the next step.`;
      qs('#success-ref').textContent=application.reference_no;
      qs('#success-message').textContent=`Your application support request has been saved.${collection}`;
      qs('#success-whatsapp').href=`https://wa.me/${WA}?text=${encodeURIComponent(message)}`;
      qs('#success-panel').hidden=false;
      setStatus(status,'Application support request saved successfully.','success');
      qs('#success-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){
      setStatus(status,error.message||'The application could not be submitted. Please try again.','error');
    }finally{
      button.disabled=false;
    }
  }
  function bindAuth(){
    qs('#auth-card')?.addEventListener('click',async(event)=>{
      const button=event.target.closest('[data-auth-action],#sign-out');
      if(!button)return;
      const status=qs('#auth-status');
      button.disabled=true;
      try{
        if(button.id==='sign-out'){
          await window.MMGCPlatform.signOut();
          await refreshAuth();
          setStatus(status,'Signed out.','success');
          return;
        }
        const values=authValues();
        if(!values.email||!values.password)throw new Error('Email and password are required.');
        if(button.dataset.authAction==='signup'){
          if(!values.fullName||!values.phone)throw new Error('Full name and phone number are required to create an account.');
          const result=await window.MMGCPlatform.signUp(values);
          if(result?.session){
            await refreshAuth();
            setStatus(status,'Account created and signed in. You can submit the application.','success');
          }else{
            setStatus(status,'Account created. Please check your email for the verification link, then sign in.','success');
          }
        }else{
          await window.MMGCPlatform.signIn(values);
          await refreshAuth();
          setStatus(status,'Signed in. You can submit the application.','success');
        }
      }catch(error){
        setStatus(status,error.message||'Authentication failed.','error');
      }finally{
        button.disabled=false;
      }
    });
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    const authError=window.MMGCPlatform.initAuthFromUrl();
    if(authError)setStatus(qs('#auth-status'),authError,'error');
    const job=selectedJob();
    populateJob(job);
    bindAuth();
    await refreshAuth();
    qs('#extract-cv-fill')?.addEventListener('click',extractCvAndFill);
    qs('#generate-drafts')?.addEventListener('click',createDrafts);
    qs('#application-form')?.addEventListener('submit',submitApplication);
    qs('#application-method')?.addEventListener('change',()=>{
      const hand=qs('#application-method')?.value==='hand_delivered';
      if(hand){
        qs('#hand-delivery-required').checked=true;
        qs('#shop-collection-required').checked=true;
        qs('#wants-printing').checked=true;
      }
    });
  });
})();
