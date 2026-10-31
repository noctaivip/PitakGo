'use strict';
const URL='https://frtlpwktiyhfmxcdudfi.supabase.co', KEY='sb_publishable_oJeIRrU0KsT9YcdnY96YaQ_XEe1KcKy';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let view=localStorage.getItem('pg_view')||'search';
let gpsWatch=null, gpsCandidate=null, gpsSince=0, gpsPrompted=false;
let driverVehicle=null, session=null, pitaks=[], mode='passenger', timer=null, driverProfile=null, activeFrom='',activeTo='', lastBookingSnapshot=null, reminderShownFor='', reloadSequence=0;
const msg=(t,error=false)=>{$('message').textContent=t;$('message').style.color=error?'#b52d2d':'#167b5a'};
async function api(path,{method='GET',body,auth=true,headers:extraHeaders={}}={}){
 const h={'apikey':KEY,'Content-Type':'application/json',...(extraHeaders||{})};
 if(auth&&session?.access_token)h.Authorization='Bearer '+session.access_token;
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);let r;try{r=await fetch(URL+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal})}catch(e){throw Error(e.name==='AbortError'?'Сервер долго не отвечает. Проверьте интернет и повторите попытку.':'Нет соединения с сервером. Проверьте интернет.')}finally{clearTimeout(timeout)}
 const raw=await r.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}
 if(!r.ok){const code=data?.error_code||data?.code||'';const detail=data?.msg||data?.message||data?.error_description||data?.error||'Ошибка '+r.status;const translated=code==='42501'||(/permission denied for table/i.test(detail))?'Не удалось загрузить данные. Попробуйте позже.':code==='email_not_confirmed'?'Подтвердите электронную почту и войдите.':code==='invalid_credentials'?'Неверный email или пароль. Если аккаунт новый — сначала подтвердите почту.':code==='over_email_send_rate_limit'?'Слишком много писем. Подождите и попробуйте позже.':code==='user_already_exists'?'Этот email уже зарегистрирован. Используйте вход или восстановление пароля.':detail;const err=new Error(translated);err.httpStatus=r.status;err.code=code;throw err}
 return data;
}
async function refreshSession(){const startingSession=session,userId=startingSession?.user?.id,refreshToken=startingSession?.refresh_token;if(!refreshToken)return false;try{const s=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refreshToken},auth:false});if(session?.user?.id!==userId)return false;if(session?.refresh_token!==refreshToken)return true;session=s;localStorage.setItem('pg_online_auth',JSON.stringify(s));return true}catch{if(session?.user?.id===userId&&session?.refresh_token===refreshToken&&session===startingSession){session=null;localStorage.removeItem('pg_online_auth');return false}return session?.user?.id===userId&&session!==startingSession}}
async function call(path,opts){const userId=session?.user?.id;try{return await api(path,opts)}catch(e){if(e.httpStatus===401||/JWT expired|Invalid JWT/i.test(e.message)){if(!session||session.user?.id!==userId)throw e;if(await refreshSession()){if(session?.user?.id!==userId)throw e;return api(path,opts)}}throw e}}
// Search by city or stand name; the full catalog stays behind suggestions.
function pgPlaceOptions(items){const out=new Set();for(const p of items){if(p.city)out.add(p.city);if(p.name)out.add(p.city+' — '+p.name)}return [...out].sort((a,b)=>a.localeCompare(b,'ru')).map(v=>`<option value="${esc(v)}"></option>`).join('')}
function pgPlaceMatch(p,q){q=String(q||'').trim().toLocaleLowerCase('ru');return !q||[p.city,p.name,p.city+' — '+p.name,p.region].some(v=>String(v||'').toLocaleLowerCase('ru').includes(q))}

// Custom inline suggestions replace Android's native datalist popup.
// Results stay in document flow above the keyboard and never overlap app navigation.
// One route picker for both guest and signed-in search.
// The location catalog supplies districts; actual stands come from pitaks.
const pgRouteSelections=new Map();
const pgNorm=v=>String(v||'').toLocaleLowerCase('ru').trim().replace(/ё/g,'е');
function pgMatchSelected(p,selected,raw){
 if(!selected)return pgPlaceMatch(p,raw);
 if(selected.kind==='pitak')return p.id===selected.id;
 if(selected.kind==='city')return pgNorm(p.city)===pgNorm(selected.city);
 if(selected.kind==='region')return pgNorm(p.region)===pgNorm(selected.region)||pgNorm(p.city)===pgNorm(selected.region);
 return pgPlaceMatch(p,raw);
}
function pgSetupAutocomplete(inputId,itemsGetter,onValue,bindTrigger=true){
 const input=$(inputId);if(!input)return;
 input.removeAttribute('list');if(input.tagName!=='BUTTON'){input.readOnly=true;input.setAttribute('autocomplete','off');}
 const ariaLabels={homePitakPick:'Выбрать основной пятак',addKnownPitakPick:'Выбрать дополнительный пятак',activePitakPick:'Выбрать рабочий пятак',fromPick:'Выбрать пятак отправления',toPick:'Выбрать пятак назначения'};
 input.setAttribute('aria-label',ariaLabels[inputId]||(inputId.toLowerCase().includes('from')?'Выбрать место отправления':'Выбрать место назначения'));
 if(input.tagName!=='BUTTON')input.placeholder=inputId.toLowerCase().includes('from')?'Выберите место отправления':'Выберите место назначения';
 if(input.tagName!=='BUTTON')input.classList.add('pg-place-trigger');
 const norm=pgNorm;
 const same=(a,b)=>norm(a)===norm(b);
 const canonical=r=>{const x=norm(r);if(x==='ташкент город'||x==='ташкент (город)')return 'Ташкент';return r};
 const labelPlace=(p)=>String(p.name||'').replace(/\s*\(точка не подтверждена\)/gi,'').trim();
 function openPicker(){
  const old=document.getElementById('pg-location-overlay');if(old)old.remove();
  const overlay=document.createElement('div');overlay.id='pg-location-overlay';overlay.className='pg-location-overlay';
  overlay.innerHTML='<div class="pg-location-sheet" role="dialog" aria-modal="true" aria-label="Выбор места"><div class="pg-location-top"><button type="button" class="pg-location-back" aria-label="Назад">←</button><strong class="pg-location-title">Выберите город или район</strong><button type="button" class="pg-location-close" aria-label="Закрыть">×</button></div><div class="pg-location-search-wrap"><input class="pg-location-search" type="search" placeholder="Поиск города или района" autocomplete="off" inputmode="search"></div><div class="pg-location-path"></div><div class="pg-location-results"></div></div>';
  document.body.append(overlay);document.body.classList.add('pg-picker-open');
  const sheet=overlay.querySelector('.pg-location-sheet'),search=overlay.querySelector('.pg-location-search'),results=overlay.querySelector('.pg-location-results'),path=overlay.querySelector('.pg-location-path'),title=overlay.querySelector('.pg-location-title');
  const data=itemsGetter()||[];
  let stage='places',region='',city='',query='';
  const regions=[...new Set([...locations.map(p=>canonical(p.region)),...data.map(p=>canonical(p.region)),...fallbackRegions.map(canonical)].filter(Boolean))];
  function citiesFor(r){return [...new Set([...locations.filter(p=>same(canonical(p.region),r)).map(p=>p.locality),...data.filter(p=>same(canonical(p.region),r)).map(p=>p.city),...(fallbackCities[r]||[])].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));}
  function setValue(choice,value){pgRouteSelections.set(inputId,choice);input.value=value;onValue(value);close()}
  function close(){overlay.remove();document.body.classList.remove('pg-picker-open')}
  function button(label,sub,action,kind=''){const b=document.createElement('button');b.type='button';b.className='pg-location-row '+kind;b.innerHTML='<span><b>'+esc(label)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span><span aria-hidden="true">›</span>';b.addEventListener('click',action);results.append(b)}
  function chooseCity(c,r){region=r||region;city=c;stage='stands';search.value='';query='';search.blur();render();}
  function render(){
   results.replaceChildren();results.scrollTop=0;
   const q=norm(query);
   path.textContent=stage==='places'?'':stage==='cities'?region:region+'  ›  '+city;
   title.textContent=stage==='places'?'Выберите город или район':stage==='cities'?'Город или район':'Место посадки';
   search.placeholder=stage==='stands'?'Поиск стоянки':stage==='cities'?'Поиск района или города':'Например, Самарканд или Иштихан';
   if(stage==='stands'){
    if(!inputId.endsWith('Pick'))button('Все пятаки · '+city,'Поиск поездок со всех стоянок',()=>setValue({kind:'city',city,region},city),'pg-location-all');
    const stands=data.filter(p=>same(p.city,city)&&(!region||same(canonical(p.region),region))&&(!q||norm(p.name).includes(q)));
    for(const p of stands)button(labelPlace(p),'Пятак · '+city,()=>setValue({kind:'pitak',id:p.id,city,region},city+' — '+labelPlace(p)));
    if(!stands.length){const empty=document.createElement('p');empty.className='pg-location-empty';empty.textContent='Других стоянок пока нет. Можно искать поездки по всему городу.';results.append(empty)}
   }else if(stage==='cities'){
    if(!inputId.endsWith('Pick'))button('Вся '+region,'Искать поездки по всей области',()=>setValue({kind:'region',region},region),'pg-location-all');
    const cities=citiesFor(region).filter(c=>!q||norm(c).includes(q));
    for(const c of cities)button(c,'Город или район',()=>chooseCity(c,region));
   }else{
    // Direct city hits first: one tap immediately opens its stands, without redundant region screens.
    const allCities=[...new Map([...locations.map(p=>({city:p.locality,region:canonical(p.region)})),...data.map(p=>({city:p.city,region:canonical(p.region)}))].filter(p=>p.city).map(p=>[norm(p.city)+'|'+norm(p.region),p])).values()];
    const matches=allCities.filter(p=>q&&norm(p.city).includes(q)).sort((a,b)=>Number(norm(b.city).startsWith(q))-Number(norm(a.city).startsWith(q))||a.city.length-b.city.length).slice(0,45);
    for(const c of matches)button(c.city,c.region,()=>chooseCity(c.city,c.region));
    const regmatches=regions.filter(r=>!q||norm(r).includes(q)).sort((a,b)=>a.localeCompare(b,'ru'));
    for(const r of regmatches)button(r,'Область · выбрать город или район',()=>{region=r;stage='cities';search.value='';query='';search.blur();render()});
    if(!matches.length&&!regmatches.length){const empty=document.createElement('p');empty.className='pg-location-empty';empty.textContent='Ничего не найдено. Попробуйте другое название.';results.append(empty)}
   }
  }
  overlay.querySelector('.pg-location-close').onclick=close;
  overlay.querySelector('.pg-location-back').onclick=()=>{if(stage==='stands'){stage=region?'cities':'places';city=''}else if(stage==='cities'){stage='places';region=''}else{close();return}search.value='';query='';render()};
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  search.addEventListener('input',()=>{query=search.value;render()});
  search.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();search.blur();close()}});
  render();
 }
 if(bindTrigger){
  input.addEventListener('click',openPicker);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPicker()}});
 }
 return openPicker;
}
let pgFromQuery='',pgToQuery='',pgGuestFrom='',pgGuestTo='',pgGuestSearched=false;
function optionList(selected=''){const exists=pitaks.some(p=>p.id===selected);return `<option value="" ${exists?'':'selected'}>Выберите пятак</option>`+pitaks.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.city)} — ${esc(p.name)}</option>`).join('')}
let authScreen='login';
let guestPitaks=[];
let guestCatalogState='loading';
let guestPreviewOpen=false;
let guestCatalogError='';
let guestRegionValue='',guestCityValue='',guestSearchValue='';
const GUEST_CACHE_KEY='pg_public_pitaks_v1';
try{const cache=JSON.parse(localStorage.getItem(GUEST_CACHE_KEY)||'null');if(cache?.items?.length&&Date.now()-cache.at<7*86400000){guestPitaks=cache.items;guestCatalogState='cached'}}catch{}
const guestMessage='Для бронирования или публикации объявления создайте бесплатный аккаунт пассажира или войдите.';
const EYE_OPEN='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A12 12 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.2 3.8M6.1 6.1C3.5 8 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3"/><path d="M10 10a3 3 0 0 0 4 4"/></svg>';
const passField=(id,autocomplete='new-password')=>`<label>Пароль (минимум 6 символов)<span class="pg-pass"><input id="${id}" type="password" autocomplete="${autocomplete}" minlength="6" autocapitalize="off" spellcheck="false"><button type="button" class="pg-eye" data-eye="${id}" aria-label="Показать пароль" aria-pressed="false">${EYE_CLOSED}</button></span></label>`;
function bindEyes(){document.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{const x=$(b.dataset.eye);if(!x)return;const visible=x.type==='password';const pos=x.selectionStart;x.type=visible?'text':'password';b.innerHTML=visible?EYE_OPEN:EYE_CLOSED;b.setAttribute('aria-pressed',String(visible));b.setAttribute('aria-label',visible?'Скрыть пароль':'Показать пароль');x.focus({preventScroll:true});try{x.setSelectionRange(pos,pos)}catch{}})}
// Two independent catalogs: geography is always available, pitaks are confirmed separately.
let locations=[];
async function pgLoadGeography(){try{const data=await api('/rest/v1/location_catalog?select=region,locality&limit=1000',{auth:false});if(Array.isArray(data))locations=data}catch(e){/* Keep search usable with known pitaks if offline. */}}
pgLoadGeography();
const fallbackRegions=['Ташкент','Ташкентская область','Самаркандская область','Бухарская область','Джизакская область','Навоийская область','Кашкадарьинская область','Сурхандарьинская область','Сырдарьинская область','Андижанская область','Наманганская область','Ферганская область','Хорезмская область','Республика Каракалпакстан'];
const fallbackCities={'Ташкент':['Ташкент'],'Самаркандская область':['Самарканд','Иштихан'],'Бухарская область':['Бухара'],'Джизакская область':['Джизак'],'Навоийская область':['Навои'],'Кашкадарьинская область':['Карши'],'Сурхандарьинская область':['Термез'],'Сырдарьинская область':['Гулистан'],'Андижанская область':['Андижан'],'Наманганская область':['Наманган'],'Ферганская область':['Фергана'],'Хорезмская область':['Ургенч'],'Ташкентская область':['Нурафшан'],'Республика Каракалпакстан':['Нукус']};
function regionFor(p){return p.region==='Ташкент город'?'Ташкент':(p.region||'Ташкент')}
function cityFor(p){return p.city||''}
function selectorMarkup(prefix,title,optional=false){return `<div class="pg-location" id="${prefix}Group"><strong>${title}</strong><label>Область / город<select id="${prefix}Region"><option value="">Выберите область или город</option></select></label><label>Город / район<select id="${prefix}City" disabled><option value="">Сначала выберите область</option></select></label><label>Выберите пятак<select id="${prefix}" disabled><option value="">Сначала выберите город / район</option></select></label><p class="muted" id="${prefix}Hint"></p>${optional?'<p class="muted">Второй пятак можно не добавлять.</p>':''}</div>`}
function setupCascades(ps){for(const prefix of ['regHome','regSecond']){const reg=$(prefix+'Region'),city=$(prefix+'City'),pitak=$(prefix),hint=$(prefix+'Hint');if(!reg||!city||!pitak)continue;const optional=prefix==='regSecond';const regions=[...new Set([...fallbackRegions,...locations.map(x=>x.region),...ps.map(regionFor)])].sort((a,b)=>a.localeCompare(b,'ru'));reg.innerHTML='<option value="">'+(optional?'Не добавлять второй пятак':'Выберите область или город')+'</option>'+regions.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');const reset=()=>{pitak.innerHTML='<option value="">Выберите пятак</option>';pitak.disabled=true;if(hint)hint.textContent=''};reg.onchange=()=>{const available=[...new Set([...(locations.filter(x=>x.region===reg.value).map(x=>x.locality)),...(fallbackCities[reg.value]||[]),...ps.filter(p=>regionFor(p)===reg.value).map(cityFor)])].sort((a,b)=>a.localeCompare(b,'ru'));city.innerHTML='<option value="">Выберите город / район</option>'+available.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');city.disabled=!reg.value;reset()};city.onchange=()=>{const filtered=ps.filter(p=>regionFor(p)===reg.value&&cityFor(p)===city.value);pitak.innerHTML='<option value="">'+(filtered.length?'Выберите один из вариантов':'Пятак пока не добавлен')+'</option>'+filtered.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');pitak.disabled=!filtered.length;if(hint)hint.textContent=filtered.length?'Точки без подтверждённых GPS-координат требуют уточнения на месте.':'В этом городе пока нет зарегистрированного питака. Откройте ниже «Моего питака нет в списке» и предложите точку.'};}}
function loginUI(screen='login'){pgRemember();pgAuthVisible=true;authScreen=screen;setNav();stop();reloadSequence++;lastBookingSnapshot=null;
 const signup=screen==='signup', passengerSignup=screen==='passenger';$('root').innerHTML=passengerSignup?`<div class="card"><h2>Регистрация пассажира</h2><p class="muted">Бесплатно · автомобиль не нужен</p><label>Имя<input id="regName" autocomplete="given-name" placeholder="Ваше имя"></label><label>Email<input id="email" type="email" autocomplete="email"></label>${passField('password')}<button id="signupPassenger">Создать аккаунт пассажира</button><button id="switchAuth" class="secondary">Уже есть аккаунт? Войти</button></div>`:signup?`<div class="card"><h2>Регистрация водителя</h2><p class="muted">Бесплатно · без оплаты</p><label>Имя<input id="regName" autocomplete="given-name" placeholder="Имя"></label><label>Email<input id="email" type="email" autocomplete="email"></label>${passField('password')}<label>Модель машины<input id="regModel" placeholder="Chevrolet Cobalt"></label><label>Государственный номер<input id="regPlate" placeholder="01 A 123 AA"></label>${selectorMarkup('regHome','Первый пятак')}${selectorMarkup('regSecond','Второй пятак (необязательно)',true)}<details><summary>Моего питака нет в списке — предложить новый</summary><label>Город<input id="regCity" placeholder="Бухара"></label><label>Название питака<input id="regPitak" placeholder="Пятак у рынка"></label><label>Как найти<input id="regDetails" placeholder="Ориентир или адрес"></label><p class="muted">Новый пятак появится в общем списке только после проверки администратором.</p></details><button id="signup">Создать бесплатный аккаунт</button><button class="secondary" id="switchAuth">Уже есть аккаунт? Войти</button></div>`:`<div class="card"><h2>Вход</h2><label>Email<input id="email" type="email" autocomplete="email"></label>${passField('password','current-password')}<button id="login">Войти</button><label>Код подтверждения из письма (если пришёл)<input id="emailOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="6 цифр"></label><button type="button" id="verifyOtp" class="secondary">Подтвердить код</button><button type="button" id="resendConfirm" class="secondary">Отправить письмо подтверждения ещё раз</button><button type="button" id="resetPassword" class="secondary">Отправить код восстановления пароля</button><div class="pg-reset-fields"><label>Код восстановления<input id="resetOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Код из письма"></label>${passField('newPassword')}<button type="button" id="applyNewPassword" class="secondary">Сохранить новый пароль</button></div><button id="switchAuth" class="secondary">Создать аккаунт водителя</button></div>`;
 bindEyes();$('switchAuth').onclick=()=>loginUI(signup||passengerSignup?'login':'passenger');if(signup){loadRegistrationPitaks();$('signup').onclick=()=>auth('signup')}else if(passengerSignup){$('signupPassenger').onclick=()=>auth('passenger')}else{$('login').onclick=()=>auth('login');$('resendConfirm').onclick=()=>resendConfirmation();$('verifyOtp').onclick=()=>verifyEmailOtp();$('resetPassword').onclick=()=>resetPassword();$('applyNewPassword').onclick=()=>applyNewPassword();const guestActions=document.createElement('div');guestActions.className='pg-auth-actions';guestActions.innerHTML='<button id="passengerEntry" class="secondary">Регистрация пассажира</button><button id="guestBack" class="secondary">← В приложение без входа</button>';$('root').querySelector('.card').append(guestActions);$('passengerEntry').onclick=()=>loginUI('passenger');$('guestBack').onclick=pgBack}const back=document.createElement('button');back.className='secondary';back.textContent='← Смотреть приложение без регистрации';back.onclick=pgBack;$('root').querySelector('.card').append(back);setNav()}
async function loadRegistrationPitaks(){let ps=[];let errors=[];try{locations=await api('/rest/v1/location_catalog?select=region,locality&order=region.asc,locality.asc&limit=1000',{auth:false})}catch(e){errors.push('районы: '+e.message);locations=[]}try{ps=await api('/rest/v1/pitaks?select=id,city,name,region&order=city.asc',{auth:false})}catch(e){errors.push('пятаки: '+e.message)}setupCascades(ps);if(errors.length)msg('Справочник загружен частично: '+errors.join('; ')+'. Проверьте интернет.',true)}
async function finishRegistration(){const raw=localStorage.getItem('pg_pending_driver');if(!raw||!session?.user)return;let data;try{data=JSON.parse(raw)}catch{return}if(data.email!==session.user.email?.toLowerCase())return;
 try{const uid=session.user.id;await call('/rest/v1/driver_profiles',{method:'POST',body:{user_id:uid,full_name:data.name,home_pitak_id:data.home,active_pitak_id:data.home},headers:{Prefer:'resolution=merge-duplicates'}}).catch(async e=>{if(!/duplicate|409/i.test(e.message))throw e});
 const cars=await call('/rest/v1/vehicles?driver_id=eq.'+uid+'&select=id,plate');if(!cars.some(c=>c.plate===data.plate))await call('/rest/v1/vehicles',{method:'POST',body:{driver_id:uid,model:data.model,plate:data.plate}});
 await call('/rest/v1/driver_pitaks',{method:'POST',body:{driver_id:uid,pitak_id:data.home}}).catch(e=>{if(e.code!=='23505'&&!/duplicate key|unique constraint|409/i.test(e.message))throw e});
 if(data.second&&data.second!==data.home)await call('/rest/v1/driver_pitaks',{method:'POST',body:{driver_id:uid,pitak_id:data.second}}).catch(e=>{if(e.code!=='23505'&&!/duplicate key|unique constraint|409/i.test(e.message))throw e});
 if(data.newCity&&data.newPitak)await call('/rest/v1/pitak_requests',{method:'POST',body:{requester_id:uid,city:data.newCity,proposed_name:data.newPitak,details:data.details||''}});
 localStorage.removeItem('pg_pending_driver');msg('Регистрация водителя завершена. Новый пятак, если указан, отправлен на проверку.');}catch(e){msg('Профиль ещё не завершён: '+e.message,true)}}
function showAuthNotice(text,isError=false){msg(text,isError);const card=$('root')?.querySelector('.card');if(card){let box=$('pgAuthNotice');if(!box){box=document.createElement('div');box.id='pgAuthNotice';box.className='pg-auth-notice';card.prepend(box)}box.textContent=text;box.style.borderColor=isError?'#c84949':'#159b74';box.scrollIntoView({block:'nearest',behavior:'smooth'})}}
async function resendConfirmation(){const email=$('email')?.value.trim().toLowerCase();if(!email||!email.includes('@'))return showAuthNotice('Введите email, указанный при регистрации.',true);const b=$('resendConfirm');b.disabled=true;try{await api('/auth/v1/resend',{method:'POST',body:{type:'signup',email},auth:false});showAuthNotice('Если аккаунт ожидает подтверждения, письмо отправлено на '+email+'. Проверьте «Спам». Если ссылка откроет localhost, вернитесь в приложение и нажмите «Войти»: подтверждение могло уже пройти успешно.')}catch(e){showAuthNotice(e.message,true)}finally{b.disabled=false}}
async function verifyEmailOtp(){
 const email=$('email')?.value.trim().toLowerCase(),token=$('emailOtp')?.value.trim();
 if(!email||!token||!/^[0-9]{6,8}$/.test(token))return showAuthNotice('Укажите email и код из письма (6 цифр).',true);
 const button=$('verifyOtp');button.disabled=true;
 try{
  const result=await api('/auth/v1/verify',{method:'POST',body:{type:'signup',email,token},auth:false});
  if(result?.access_token&&result?.user){session=result;localStorage.setItem('pg_online_auth',JSON.stringify(result));await start()}
  else showAuthNotice('Почта подтверждена. Теперь войдите с email и паролем.');
 }catch(e){showAuthNotice('Не удалось подтвердить код: '+e.message,true)}finally{if(button.isConnected)button.disabled=false}
}
async function resetPassword(){const email=$('email')?.value.trim().toLowerCase();if(!email||!email.includes('@'))return showAuthNotice('Введите email для восстановления пароля.',true);const b=$('resetPassword');b.disabled=true;try{await api('/auth/v1/recover',{method:'POST',body:{email},auth:false});showAuthNotice('Если такой аккаунт существует, письмо для восстановления пароля отправлено на '+email+'.')}catch(e){showAuthNotice(e.message,true)}finally{b.disabled=false}}
async function applyNewPassword(){
 const email=$('email')?.value.trim().toLowerCase(),token=$('resetOtp')?.value.trim(),password=$('newPassword')?.value;
 if(!email||!/^[0-9]{6,8}$/.test(token)||!password||password.length<6)return showAuthNotice('Укажите email, код восстановления и новый пароль от 6 символов.',true);
 const button=$('applyNewPassword');button.disabled=true;
 try{
  const result=await api('/auth/v1/verify',{method:'POST',body:{type:'recovery',email,token},auth:false});
  if(!result?.access_token)throw Error('Код не дал доступа для смены пароля');
  const res=await fetch(URL+'/auth/v1/user',{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+result.access_token,'Content-Type':'application/json'},body:JSON.stringify({password})});
  if(!res.ok){const data=await res.json().catch(()=>({}));throw Error(data.msg||data.message||'Не удалось сохранить пароль')}
  session=result;localStorage.setItem('pg_online_auth',JSON.stringify(result));await start();msg('Пароль изменён. Вы вошли в аккаунт.');
 }catch(e){showAuthNotice('Восстановление: '+e.message,true)}finally{if(button.isConnected)button.disabled=false}
}
async function auth(action){const email=$('email').value.trim().toLowerCase(),password=$('password').value;if(!email||password.length<6){msg('Укажите email и пароль от 6 символов',true);return}
 let data=null;if(action==='signup'){data={email,name:$('regName').value.trim(),model:$('regModel').value.trim(),plate:$('regPlate').value.trim().toUpperCase(),home:$('regHome').value,second:$('regSecond').value,newCity:$('regCity').value.trim(),newPitak:$('regPitak').value.trim(),details:$('regDetails').value.trim()};if(!data.name||!data.model||!data.plate||!data.home){msg('Заполните имя, машину, номер и основной пятак',true);return}if(data.second&&data.second===data.home){msg('Первый и второй пятак должны отличаться',true);return}if(Boolean(data.newCity)!==Boolean(data.newPitak)){msg('Для нового питака укажите и город, и название',true);return}localStorage.setItem('pg_pending_driver',JSON.stringify(data))}
 const btn=$(action==='signup'?'signup':action==='passenger'?'signupPassenger':'login');if(btn)btn.disabled=true;try{let s;if(action==='signup'||action==='passenger'){const displayName=action==='passenger'?$('regName').value.trim():data.name;if(!displayName)throw Error('Введите имя');s=await api('/auth/v1/signup',{method:'POST',body:{email,password, data:{display_name:displayName,role:action==='passenger'?'passenger':'driver'}},auth:false});if(!s.access_token){loginUI('login');$('email').value=email;showAuthNotice('Аккаунт создан. Проверьте почту '+email+' и папку «Спам», подтвердите адрес по ссылке, затем войдите.');return}}else{s=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},auth:false})}session=s;localStorage.setItem('pg_online_auth',JSON.stringify(s));msg('');await start()}catch(e){showAuthNotice(e.message,true)}finally{if(btn&&btn.isConnected)btn.disabled=false}}
async function start(){
 if(!session?.access_token||!session?.user?.id){guestHome();return}
 mode=view==='driver'?'driver':'passenger';
 // Login success must be independent of public catalog, driver profile or bookings.
 dashboard();
 try{
  pitaks=await call('/rest/v1/pitaks?select=id,name,city,region,verified,latitude,longitude&order=city.asc');
  try{await finishRegistration()}catch(e){console.warn('Driver registration:',e)}
  try{await loadProfile()}catch(e){console.warn('Driver profile:',e)}
  if($('work'))drawWork();if($('root')){const role=$('root').querySelector('.pg-account-role');if(role)role.textContent=(driverProfile||session?.user?.user_metadata?.role==='driver')?'🚕 Водитель · Пассажир':'👤 Пассажир'}
 }catch(e){
  console.warn('Catalog:',e);
  if(guestPitaks.length){pitaks=guestPitaks; if($('work'))drawWork()}
  msg('Вы вошли в аккаунт. Справочник пока недоступен: '+e.message,true);
 }
 try{await reload()}catch(e){console.warn('Trips:',e)}
 pgLaunchWelcome();
 try{await pgPollInbox(true)}catch(e){console.warn('Inbox:',e)}
 checkRestReminder();stop();
 timer=setInterval(async()=>{
  if(!session)return;
  try{if(view!=='services')await reload(true)}catch(e){console.warn('Sync:',e)}
  try{await pgPollInbox()}catch(e){console.warn('Messages:',e)}
  checkRestReminder();
 },12000);
}
function stop(){if(timer)clearInterval(timer);timer=null}
async function loadProfile(){const uid=session?.user?.id;if(!uid)return;const rows=await call('/rest/v1/driver_profiles?user_id=eq.'+uid+'&select=user_id,full_name,home_pitak_id,active_pitak_id,work_status,rest_until');driverProfile=rows[0]||null;try{const vehicles=await call('/rest/v1/vehicles?driver_id=eq.'+uid+'&select=id,model,plate,seats_total&limit=1');driverVehicle=vehicles[0]||null}catch(e){driverVehicle=null;console.warn('Vehicle:',e)}}
function checkRestReminder(){if(!driverProfile||driverProfile.work_status!=='resting'||!driverProfile.rest_until)return;const until=Date.parse(driverProfile.rest_until);if(Date.now()<until||reminderShownFor===driverProfile.rest_until)return;reminderShownFor=driverProfile.rest_until;msg('⏰ Время отдыха закончилось. Подтвердите «Готов к работе», чтобы пассажиры увидели ваши рейсы.');if(mode!=='driver'){mode='driver';drawWork()} }
function statusText(){if(!driverProfile)return 'Автомобиль ещё не зарегистрирован';const x=driverProfile.work_status;return x==='ready'?'🟢 Готов принимать пассажиров':x==='resting'?'🟠 Отдых до '+new Date(driverProfile.rest_until).toLocaleString('ru-RU'):'⚪ Не на линии'}
async function setStatus(status){const actionButton=$(status==='ready'?'ready':status==='resting'?'rest':'offline');if(actionButton?.disabled)return;if(actionButton)actionButton.disabled=true;try{if(!driverProfile)throw Error('Сначала зарегистрируйте автомобиль');const pitak=$('activePitak')?.value||driverProfile.active_pitak_id;if(status!=='offline'&&!pitak)throw Error('Сначала выберите рабочий пятак');const date=$('restUntil')?.value;const until=status==='resting'&&date?new Date(date).toISOString():null;if(status==='resting'&&(!date||new Date(date)<=new Date()))throw Error('Укажите будущее время окончания отдыха');await call('/rest/v1/rpc/set_driver_work_status',{method:'POST',body:{p_status:status,p_pitak:pitak,p_rest_until:until}});await loadProfile();reminderShownFor='';drawWork();await reload();msg(status==='ready'?'Вы на линии — рейсы видны пассажирам':status==='resting'?'Отдых сохранён. Подтвердите выход на линию после отдыха.':'Вы сняты с линии')}catch(e){msg('Режим работы: '+e.message,true)}finally{if(actionButton?.isConnected)actionButton.disabled=false}}
const pgTripActionBusy=new Set();
async function closeTrip(id){if(pgTripActionBusy.has(id))return;pgTripActionBusy.add(id);const b=[...document.querySelectorAll('[data-close]')].find(x=>x.dataset.close===id);if(b)b.disabled=true;try{await call('/rest/v1/trips?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:{status:'closed'}});msg('Рейс закрыт');await reload()}catch(e){msg(e.message,true)}finally{pgTripActionBusy.delete(id);if(b?.isConnected)b.disabled=false}}
function dashboard(){msg('');pgAuthVisible=false;$('root').innerHTML=`<div class="actions pg-hidden"><button id="pass" class="secondary">Пассажир</button><button id="drive" class="secondary">Водитель</button></div><div id="work"></div><div id="feed"></div>`;
 $('pass').onclick=()=>{mode='passenger';drawWork();reload()};$('drive').onclick=()=>{mode='driver';drawWork();reload()};drawWork();setNav()}

function pgRecentRouteKey(){return session?.user?.id?'pg_recent_route_v1_'+session.user.id:''}
function pgReadRecentRoute(){try{const key=pgRecentRouteKey(),r=key?JSON.parse(localStorage.getItem(key)||'null'):null;return r&&r.fromId&&r.toId&&r.fromId!==r.toId&&pitaks.some(p=>p.id===r.fromId)&&pitaks.some(p=>p.id===r.toId)?r:null}catch{return null}}
function pgApplyRecentRoute(){const r=pgReadRecentRoute();if(!r)return;pgFromQuery=pname(r.fromId);pgToQuery=pname(r.toId);pgRouteSelections.set('filterFromText',{kind:'pitak',id:r.fromId});pgRouteSelections.set('filterToText',{kind:'pitak',id:r.toId});drawWork();msg('Повторяем прошлый маршрут. Проверьте направление и выберите актуальный рейс.');reload()}
function drawWork(){if(mode==='driver'){
 const current=driverProfile?.active_pitak_id||driverProfile?.home_pitak_id||'';
 const dt=new Date(Date.now()+3600000);const local=new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,16);
 $('work').innerHTML=`<div class="card"><h3>Мой автомобиль</h3><label>Имя водителя<input id="driverName" placeholder="Имя" value="${esc(driverProfile?.full_name||'')}"></label><label>Модель автомобиля<input id="model" placeholder="Chevrolet Cobalt" value="${esc(driverVehicle?.model||'')}"></label><label>Госномер<input id="plate" placeholder="01 A 123 AA" value="${esc(driverVehicle?.plate||'')}"></label><div class="pg-picker-field"><strong>Мой основной пятак</strong><select id="homePitak" class="pg-driver-select-hidden">${optionList(driverProfile?.home_pitak_id||current)}</select><button type="button" class="pg-driver-place-button" id="homePitakPick">Выбрать пятак</button></div><button id="saveCar">Сохранить машину</button><p class="muted">Данные автомобиля можно изменить и сохранить.</p></div>
 <div class="card"><h3>Мои пятаки</h3><div id="myPitaks">Загрузка…</div><div class="pg-picker-field"><strong>Добавить существующий пятак</strong><select id="addKnownPitak" class="pg-driver-select-hidden">${optionList()}</select><button type="button" class="pg-driver-place-button" id="addKnownPitakPick">Выбрать пятак</button></div><button id="addPitak">Добавить второй пятак</button><details><summary>Предложить новый пятак</summary><label>Город<input id="newPitakCity"></label><label>Название питака<input id="newPitakName"></label><label>Ориентир<input id="newPitakDetails"></label><button id="requestPitak">Отправить на проверку</button></details><p class="muted">Новые точки проверяет администратор. До подтверждения они не появятся в списке.</p></div>
 <div class="card"><h3>Мой рабочий пятак</h3><p><b>${esc(statusText())}</b></p><div class="pg-picker-field"><strong>Где я сейчас работаю</strong><select id="activePitak" class="pg-driver-select-hidden">${optionList(current)}</select><button type="button" class="pg-driver-place-button" id="activePitakPick">Выбрать пятак</button></div><label>Вернусь с отдыха<input id="restUntil" type="datetime-local" value="${local}"></label><div class="actions pg-driver-status-actions"><button id="ready">Готов к работе</button><button id="rest" class="secondary">Отдыхать</button><button id="offline" class="secondary">Не на линии</button></div><div class="card"><h3>📍 Умный пятак</h3><p class="muted">GPS работает только пока приложение открыто. Через 60 минут возле другого подтверждённого питака появится запрос. В фоне Android это пока не гарантируется.</p><button id="gpsStart" class="secondary">Включить определение GPS</button><button id="gpsStop" class="secondary">Остановить GPS</button><p id="gpsState" class="muted">GPS выключен</p></div><p class="muted">При отдыхе или выходе с линии новые пассажиры не видят ваши открытые рейсы. Автоматический выход на линию не происходит.</p></div>
 <div class="card"><h3>Создать онлайн-рейс</h3><div class="pg-picker-field"><strong>Откуда</strong><select id="from" class="pg-driver-select-hidden">${optionList(current)}</select><button type="button" class="pg-driver-place-button" id="fromPick">Выбрать пятак отправления</button></div><div class="pg-picker-field"><strong>Куда</strong><select id="to" class="pg-driver-select-hidden">${optionList()}</select><button type="button" class="pg-driver-place-button" id="toPick">Выбрать пятак назначения</button></div><button id="createTrip">Опубликовать рейс</button><p class="muted">Публикация разрешена только в режиме «Готов к работе» и с вашего текущего питака.</p></div>`;
 pgBindDriverPickers();
 $('addPitak').onclick=addKnownPitak;$('requestPitak').onclick=requestNewPitak;loadMyPitaks();$('gpsStart').onclick=startGpsWatch;$('gpsStop').onclick=stopGpsWatch;showGpsState();$('saveCar').onclick=saveCar;$('createTrip').onclick=createTrip;$('ready').onclick=()=>setStatus('ready');$('rest').onclick=()=>setStatus('resting');$('offline').onclick=()=>setStatus('offline');
 }else{const recent=pgReadRecentRoute();$('work').innerHTML=`<div class="card pg-trip-search"><h3>🚕 Куда поедем?</h3><p class="muted">Начните вводить город или название стоянки — появятся подсказки.</p>${recent?`<button type="button" class="secondary" id="pgRepeatRoute">↻ Повторить маршрут: ${esc(pname(recent.fromId))} → ${esc(pname(recent.toId))}</button>`:''}<label>Откуда<input id="filterFromText" type="search" autocomplete="off" placeholder="Например, Ташкент" value="${esc(pgFromQuery)}"></label><label>Куда<input id="filterToText" type="search" autocomplete="off" placeholder="Например, Самарканд" value="${esc(pgToQuery)}"></label><button id="findTrips">Найти поездки</button></div>`;
 pgSetupAutocomplete('filterFromText',()=>pitaks,v=>pgFromQuery=v);
 pgSetupAutocomplete('filterToText',()=>pitaks,v=>pgToQuery=v);const repeat=$('pgRepeatRoute');if(repeat)repeat.onclick=pgApplyRecentRoute;
 $('findTrips').onclick=()=>{if(!$('filterFromText').value.trim()||!$('filterToText').value.trim()){msg('Укажите, откуда и куда вы едете.',true);return}msg('');pgFromQuery=$('filterFromText').value.trim();pgToQuery=$('filterToText').value.trim();activeFrom='';activeTo='';reload()}}
}
function pgBindDriverPickers(){
 // Bind the proven full-screen picker directly to the visible button.
 // No hidden input, synthetic click or delegated proxy is involved.
 for(const id of ['homePitak','addKnownPitak','activePitak','from','to']){
  const sel=$(id),button=$(id+'Pick');
  if(!sel||!button)continue;
  const sync=()=>{button.textContent=sel.value?pname(sel.value):'Выбрать пятак'};
  sync();
  const open=pgSetupAutocomplete(button.id,()=>pitaks,()=>{
   const choice=pgRouteSelections.get(button.id);
   if(choice?.kind!=='pitak')return;
   if(![...sel.options].some(opt=>opt.value===choice.id)){
    const opt=document.createElement('option');opt.value=choice.id;opt.textContent=pname(choice.id);sel.add(opt);
   }
   sel.value=choice.id;
   sel.dispatchEvent(new Event('change',{bubbles:true}));
   sync();
  },false);
  // Prevent label activation / synthetic select clicks on Android. The real
  // visible button is the only trigger and calls the picker exactly once.
  button.onclick=e=>{e.preventDefault();e.stopPropagation();open()};
  button.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();open()}};
 }
}
async function loadMyPitaks(){
 if(!session||!$('myPitaks'))return;
 try{
  const rows=await call('/rest/v1/driver_pitaks?driver_id=eq.'+session.user.id+'&select=pitak_id');
  const el=$('myPitaks');
  el.replaceChildren();
  if(!rows.length){el.textContent='Пока не добавлены';return}
  const ul=document.createElement('div');ul.className='pg-my-stands';
  for(const r of rows){
   const line=document.createElement('div');line.className='pg-my-stand';
   line.textContent=pname(r.pitak_id);
   ul.append(line);
  }
  el.append(ul);
 }catch(e){$('myPitaks').textContent='Не удалось загрузить список пятаков.'}
}
async function addKnownPitak(){
 const actionButton=$('addPitak');if(actionButton?.disabled)return;if(actionButton)actionButton.disabled=true;
 try{
  const id=$('addKnownPitak')?.value;
  if(!id)throw Error('Сначала выберите пятак');
  const uid=session.user.id;
  const rows=await call('/rest/v1/driver_pitaks?driver_id=eq.'+uid+'&select=pitak_id');
  if(rows.some(r=>r.pitak_id===id)){msg('Этот пятак уже добавлен.');return}
  try{await call('/rest/v1/driver_pitaks',{method:'POST',body:{driver_id:uid,pitak_id:id}})}catch(e){if(e.code==='23505'||/duplicate key|unique constraint/i.test(e.message)){msg('Этот пятак уже добавлен.');$('addKnownPitak').value='';$('addKnownPitakPick').textContent='Выбрать пятак';pgRouteSelections.delete('addKnownPitakPick');await loadMyPitaks();return}throw e}
  $('addKnownPitak').value='';$('addKnownPitakPick').textContent='Выбрать пятак';pgRouteSelections.delete('addKnownPitakPick');msg('Пятак добавлен');await loadMyPitaks();
 }catch(e){msg('Не удалось добавить пятак: '+e.message,true)}finally{if(actionButton?.isConnected)actionButton.disabled=false}
}
const pgPitakRequestBusy=new Set();
async function requestNewPitak(){const button=$('requestPitak');const key=session?.user?.id||'guest';if(pgPitakRequestBusy.has(key))return;pgPitakRequestBusy.add(key);if(button)button.disabled=true;try{if(!session?.user?.id)throw Error('Войдите в аккаунт, чтобы предложить пятак');const city=$('newPitakCity')?.value.trim()||'',name=$('newPitakName')?.value.trim()||'',details=$('newPitakDetails')?.value.trim()||'';if(!city||!name)throw Error('Укажите город и название');if(city.length>100||name.length>120||details.length>500)throw Error('Проверьте длину: город до 100, название до 120, ориентир до 500 символов');await call('/rest/v1/pitak_requests',{method:'POST',body:{requester_id:session.user.id,city,proposed_name:name,details}});if($('newPitakCity'))$('newPitakCity').value='';if($('newPitakName'))$('newPitakName').value='';if($('newPitakDetails'))$('newPitakDetails').value='';msg('Заявка на новый пятак отправлена администратору. До проверки он не виден пассажирам.')}catch(e){msg('Заявка на пятак: '+e.message,true)}finally{pgPitakRequestBusy.delete(key);if(button?.isConnected)button.disabled=false}}
async function loadAdminRequests(){if(!session||!$('adminRequests'))return;try{const a=await call('/rest/v1/pitak_admins?user_id=eq.'+session.user.id+'&select=user_id');if(!a.length){$('adminRequests').remove();return}const rs=await call('/rest/v1/pitak_requests?status=eq.pending&select=id,city,proposed_name,details,created_at&order=created_at.asc');$('adminRequests').innerHTML='<h3>Заявки на новые пятаки · администратор</h3>'+(rs.length?rs.map(r=>`<div class="card"><b>${esc(r.city)} — ${esc(r.proposed_name)}</b><p>${esc(r.details)}</p><button data-pitak-approve="${r.id}">Подтвердить</button><button class="secondary" data-pitak-reject="${r.id}">Отклонить</button></div>`).join(''):'Нет заявок');document.querySelectorAll('[data-pitak-approve]').forEach(b=>b.onclick=()=>reviewPitak(b.dataset.pitakApprove,true));document.querySelectorAll('[data-pitak-reject]').forEach(b=>b.onclick=()=>reviewPitak(b.dataset.pitakReject,false))}catch(e){$('adminRequests').textContent='Заявки: '+e.message}}
const pgPitakReviewBusy=new Set();
async function reviewPitak(id,yes){if(!id||pgPitakReviewBusy.has(id))return;pgPitakReviewBusy.add(id);const buttons=[...document.querySelectorAll('[data-pitak-approve],[data-pitak-reject]')].filter(b=>b.dataset.pitakApprove===id||b.dataset.pitakReject===id);buttons.forEach(b=>b.disabled=true);try{await call('/rest/v1/rpc/review_pitak_request',{method:'POST',body:{p_request_id:id,p_approve:yes}});msg(yes?'Пятак добавлен в каталог (GPS ещё не подтверждён)':'Заявка отклонена');await loadAdminRequests()}catch(e){msg('Проверка питака: '+e.message,true)}finally{pgPitakReviewBusy.delete(id);buttons.forEach(b=>{if(b.isConnected)b.disabled=false})}}
async function saveCar(){const actionButton=$('saveCar');if(actionButton?.disabled)return;if(actionButton)actionButton.disabled=true;try{const name=$('driverName').value.trim(),model=$('model').value.trim(),plate=$('plate').value.trim().toUpperCase(),home=$('homePitak').value;if(!name)throw Error('Укажите имя водителя');if(!home)throw Error('Выберите основной пятак');const uid=session.user.id;
 if(!driverProfile){if(!model||!plate)throw Error('Введите модель и госномер');await call('/rest/v1/driver_profiles',{method:'POST',body:{user_id:uid,full_name:name,home_pitak_id:home,active_pitak_id:home}})}
 else await call('/rest/v1/driver_profiles?user_id=eq.'+uid,{method:'PATCH',body:{full_name:name,home_pitak_id:home}});
 // Keep in-memory state aligned with the server before the next write. If vehicle saving fails, retry must not attempt a duplicate profile insert.
 await loadProfile();
 const cars=await call('/rest/v1/vehicles?driver_id=eq.'+uid+'&select=id,plate');if(!model||!plate)throw Error('Введите модель и госномер');if(!cars.length){await call('/rest/v1/vehicles',{method:'POST',body:{driver_id:uid,model,plate}})}else{await call('/rest/v1/vehicles?id=eq.'+encodeURIComponent(cars[0].id),{method:'PATCH',body:{model,plate}})}
 if(home){
  const links=await call('/rest/v1/driver_pitaks?driver_id=eq.'+uid+'&select=pitak_id');
  if(!links.some(x=>x.pitak_id===home)){try{await call('/rest/v1/driver_pitaks',{method:'POST',body:{driver_id:uid,pitak_id:home}})}catch(e){if(e.code!=='23505'&&!/duplicate key|unique constraint/i.test(e.message))throw e}}
 }
 await loadProfile();drawWork();msg('Профиль водителя и автомобиль сохранены');await reload()}catch(e){msg('Автомобиль: '+e.message,true)}finally{if(actionButton?.isConnected)actionButton.disabled=false}}
async function createTrip(){const actionButton=$('createTrip');if(actionButton?.disabled)return;if(actionButton)actionButton.disabled=true;try{const from=$('from').value,to=$('to').value,active=$('activePitak')?.value||driverProfile?.active_pitak_id;if(driverProfile?.work_status!=='ready')throw Error('Сначала нажмите «Готов к работе»');if(!active)throw Error('Сначала выберите рабочий пятак');if(active!==driverProfile?.active_pitak_id)throw Error('Сначала нажмите «Готов к работе», чтобы сохранить выбранный рабочий пятак');if(!from||!to)throw Error('Выберите пятаки отправления и назначения');if(from!==active)throw Error('Отправление должно совпадать с вашим рабочим пятаком');if(from===to)throw Error('Выберите разные точки');const cars=await call('/rest/v1/vehicles?driver_id=eq.'+session.user.id+'&select=id&order=created_at.desc&limit=1');if(!cars.length)throw Error('Сначала зарегистрируйте машину');await call('/rest/v1/rpc/publish_trip',{method:'POST',body:{p_vehicle:cars[0].id,p_from:from,p_to:to}});msg('Поездка опубликована');await reload()}catch(e){msg('Публикация: '+e.message,true)}finally{if(actionButton?.isConnected)actionButton.disabled=false}}
const pname=id=>{const p=pitaks.find(x=>x.id===id);return p?p.city+' — '+p.name:'Точка'};
// Passenger seat map: 1=front passenger, 2=rear left, 3=rear middle, 4=rear right.
// Extra seats (5+) are shown in subsequent rows; driver's seat is never selectable.
const pgSeatName=n=>({1:'Спереди',2:'Сзади слева · окно',3:'Сзади · центр',4:'Сзади справа · окно'})[n]||'Место '+n;
function pgSeatMap(total,occupied=[],selected=[],group='seat',editable=true){
 total=Math.min(8,Math.max(1,Number(total)||4));
 occupied=Array.isArray(occupied)?occupied.map(Number):[];selected=Array.isArray(selected)?selected.map(Number):[];
 const seat=(n,driver=false)=>{
  if(driver)return '<div class="pg-seat pg-seat-driver" aria-label="Место водителя">🚘<small>Водитель</small></div>';
  if(n>total)return '<div class="pg-seat pg-seat-aisle"></div>';
  const taken=occupied.includes(n),active=selected.includes(n);
  return `<button type="button" class="pg-seat ${taken?'pg-seat-taken':active?'pg-seat-selected':'pg-seat-free'}" data-seat-group="${esc(group)}" data-seat-num="${n}" ${taken||!editable?'disabled':''} aria-pressed="${active}" title="${esc(pgSeatName(n))}">💺<small>${esc(pgSeatName(n))}</small></button>`;
 };
 let html=`<div class="pg-seat-map" data-seat-map="${esc(group)}"><div class="pg-seat-map-caption">ПЕРЕД АВТОМОБИЛЯ</div><div class="pg-seat-front">${seat(1)}${seat(0,true)}</div><div class="pg-seat-rear">${seat(2)}${seat(3)}${seat(4)}</div>`;
 for(let i=5;i<=total;i+=3)html+=`<div class="pg-seat-rear">${seat(i)}${seat(i+1)}${seat(i+2)}</div>`;
 return html+'<div class="pg-seat-legend">🟢 Свободно · 🟡 Выбрано · ⚪ Занято</div></div>';
}
const pgCommunitySelections=new Map();
function pgWireSeatMap(root,group,limit=1,onSelect){
 root.querySelectorAll('[data-seat-group]').forEach(b=>b.onclick=()=>{
  const n=Number(b.dataset.seatNum),selected=pgCommunitySelections.get(group)||[];
  const next=selected.includes(n)?selected.filter(x=>x!==n):selected.length<limit?[...selected,n]:limit===1?[n]:selected;
  pgCommunitySelections.set(group,next);root.querySelectorAll('[data-seat-group]').forEach(el=>{if(el.disabled)return;const active=next.includes(Number(el.dataset.seatNum));el.classList.toggle('pg-seat-selected',active);el.classList.toggle('pg-seat-free',!active);el.setAttribute('aria-pressed',String(active))});
  onSelect?.(next);
 });
}

function pgLaunchCard(){return `<div class="pg-launch-note"><span class="pg-launch-kicker">🎉 Годовщина Пятак Go · сентябрь 2027</span><h3>Планируется розыгрыш 3 новых Chevrolet Cobalt</h3><div class="pg-prize-cars" aria-label="Три автомобиля Chevrolet Cobalt"><span>🚘</span><span>🚘</span><span>🚘</span></div><p>В честь первого года работы Пятак Go мы готовим розыгрыш трёх новых автомобилей Chevrolet Cobalt. Дата проведения — сентябрь 2027 года.</p><p class="pg-launch-small">Правила, требования к участникам, точная дата и порядок определения победителей будут опубликованы отдельно до начала акции. Регистрация в приложении сама по себе пока не подтверждает участие.</p><p>А пока мы подключаем водителей и пассажиров. Не нашли поездку? Оставьте заявку — водители смогут увидеть спрос на вашем маршруте.</p></div>`}
function pgLaunchWelcome(){
 if(!session?.user?.id)return;
 const key='pg_launch_welcome_v2_'+session.user.id;
 if(localStorage.getItem(key))return;
 const overlay=document.createElement('div');overlay.className='pg-launch-overlay';overlay.id='pgLaunchWelcome';
 overlay.innerHTML=`<div class="pg-launch-dialog" role="dialog" aria-modal="true" aria-labelledby="pgLaunchTitle"><span class="pg-launch-kicker">🎉 Добро пожаловать в число первых пользователей</span><h2 id="pgLaunchTitle">Пятак Go растёт вместе с вами!</h2><p>Мы запускаем междугородние поездки по Узбекистану. Водители и пассажиры постепенно присоединяются — некоторые маршруты пока без машин.</p><div class="pg-anniversary-highlight"><strong>🚘 🚘 🚘</strong><b>3 новых Chevrolet Cobalt</b><span>Планируемый розыгрыш к годовщине · сентябрь 2027</span></div><p>Условия участия, точную дату и правила розыгрыша мы опубликуем отдельно. Само создание аккаунта ещё не означает участие в розыгрыше.</p><p>Вы уже можете искать поездки, предлагать рейсы и оставлять заявки.</p><button type="button" id="pgLaunchClose">Начать пользоваться</button></div>`;
 document.body.append(overlay);
 overlay.querySelector('#pgLaunchClose').onclick=()=>{localStorage.setItem(key,'1');overlay.remove()};
}
async function reload(silent=false){const requestId=++reloadSequence,userId=session?.user?.id;if(!userId||view==='services')return;const isCurrentReload=()=>requestId===reloadSequence&&session?.user?.id===userId&&view!=='services';try{const ts=await call('/rest/v1/trips?select=id,driver_id,from_pitak_id,to_pitak_id,status,created_at,vehicles(model,plate,seats_total)&status=eq.open&order=created_at.desc&limit=60');const openTripIds=ts.map(t=>t.id),ownTripIds=ts.filter(t=>t.driver_id===userId).map(t=>t.id);const bookingFields='select=id,trip_id,seat_number,passenger_name,passenger_phone,status,passenger_id&limit=300';const bookingQueries=[];if(openTripIds.length)bookingQueries.push(call('/rest/v1/bookings?'+bookingFields+'&trip_id=in.('+openTripIds.map(encodeURIComponent).join(',')+')&passenger_id=eq.'+encodeURIComponent(userId)));if(ownTripIds.length)bookingQueries.push(call('/rest/v1/bookings?'+bookingFields+'&trip_id=in.('+ownTripIds.map(encodeURIComponent).join(',')+')'));const bookingResults=await Promise.all(bookingQueries);if(!isCurrentReload())return;const bookingMap=new Map();for(const rows of bookingResults)for(const b of rows)bookingMap.set(b.id,b);const bs=[...bookingMap.values()];const occupiedRows=await call('/rest/v1/rpc/open_trip_occupied_seats',{method:'POST',body:{}});if(!isCurrentReload())return;const occupiedByTrip=new Map();for(const r of occupiedRows){if(!occupiedByTrip.has(r.trip_id))occupiedByTrip.set(r.trip_id,[]);occupiedByTrip.get(r.trip_id).push(Number(r.seat_number))}const relevant=bs;const snapshot=JSON.stringify(relevant.map(b=>[b.id,b.status]).sort((a,b)=>a[0].localeCompare(b[0])));if(lastBookingSnapshot!==null&&snapshot!==lastBookingSnapshot){const prior=new Map(JSON.parse(lastBookingSnapshot));const changed=relevant.filter(b=>prior.get(b.id)!==b.status);if(changed.length)msg('🔔 Изменение бронирования: '+changed.map(b=>'место '+b.seat_number+' — '+({pending:'ожидает',confirmed:'подтверждено',rejected:'отклонено',cancelled:'отменено'}[b.status]||b.status)).join('; '));}lastBookingSnapshot=snapshot;let html='<div class="card"><h2>Доступные поездки</h2>';let shownTrips=0;

 for(const t of ts){const own=t.driver_id===session.user.id, all=bs.filter(b=>b.trip_id===t.id),totalSeats=Math.max(1,Number(t.vehicles?.seats_total)||4),occupiedCount=(occupiedByTrip.get(t.id)||[]).length,confirmedCount=all.filter(b=>b.status==='confirmed').length,pendingCount=all.filter(b=>b.status==='pending').length;let seatStatus='Занято '+occupiedCount+'/'+totalSeats;if(own){if(confirmedCount>=totalSeats)seatStatus='✅ Все '+totalSeats+' места подтверждены — рейс готов к отправлению';else if(occupiedCount>=totalSeats)seatStatus='⏳ Все места заняты, ожидают подтверждения: '+pendingCount;else seatStatus+=' · подтверждено '+confirmedCount+', ожидают '+pendingCount}if(view==='bookings'&&!own&&!all.some(b=>b.passenger_id===session.user.id))continue;if(view==='search'&&own)continue;if(view==='search'&&!all.some(b=>b.passenger_id===session.user.id)&&((pgFromQuery&&!pgMatchSelected(pitaks.find(p=>p.id===t.from_pitak_id)||{},pgRouteSelections.get('filterFromText'),pgFromQuery))||(pgToQuery&&!pgMatchSelected(pitaks.find(p=>p.id===t.to_pitak_id)||{},pgRouteSelections.get('filterToText'),pgToQuery))))continue;shownTrips++;html+=`<div class="card pg-deletable">${own?`<button class="pg-delete-x" data-delete-trip="${t.id}" title="Удалить рейс" aria-label="Удалить рейс">×</button>`:""}<h3>${esc(pname(t.from_pitak_id))} → ${esc(pname(t.to_pitak_id))}</h3><p>${esc(t.vehicles?.model||'Авто')} · ${esc(t.vehicles?.plate||'')} · ${esc(seatStatus)}</p><p>Статус: ${esc(t.status)}</p>`;
 if(own&&t.status==='open')html+=`<button class="secondary" data-close="${t.id}">Закрыть рейс</button>`;if(view==='search'&&t.status==='open'&&!own){const seats=Array.from({length:t.vehicles?.seats_total||4},(_,i)=>i+1).filter(n=>!(occupiedByTrip.get(t.id)||[]).includes(n));html+=`<div class="pg-seat-title">Выберите место в автомобиле</div>${pgSeatMap(t.vehicles?.seats_total||4,occupiedByTrip.get(t.id)||[],[],t.id)}<input type="hidden" id="seat-${t.id}" value=""><label>Ваше имя<input id="name-${t.id}" placeholder="Имя"></label><label>Телефон<input id="phone-${t.id}" type="tel" placeholder="+998..."></label><button data-book="${t.id}" data-from="${esc(t.from_pitak_id)}" data-to="${esc(t.to_pitak_id)}" ${seats.length?'':'disabled'}>Запросить бронь</button>`}
 for(const b of all.filter(b=>own||b.passenger_id===session.user.id)){html+=`<p>Место ${b.seat_number}: ${esc(b.status)} ${own?'· '+esc(b.passenger_name)+' · '+esc(b.passenger_phone):''}</p>`;
 if(own&&b.status==='pending')html+=`<button data-approve="${b.id}">Подтвердить</button><button data-reject="${b.id}" class="secondary">Отклонить</button>`;
 if(!own&&b.passenger_id===session.user.id&&['pending','confirmed'].includes(b.status))html+=`<button data-cancel="${b.id}" class="pg-delete-x pg-delete-inline" title="Отменить бронь" aria-label="Отменить бронь">×</button>`}
 html+='</div>'}if(!shownTrips&&view==='search')html+=pgLaunchCard()+'<button type="button" id="pg-request-ride" class="secondary">Оставить заявку на поездку</button>'+pgDemoEntry();html+='</div>';$('feed').innerHTML=html;const demoOpen=$('pg-demo-open');if(demoOpen)demoOpen.onclick=pgDemoStart;const requestRide=$('pg-request-ride');if(requestRide)requestRide.onclick=()=>{view='services';serviceKind='ride_request';drawWork();setNav()};setNav();if(view==='bookings')pgShowAgreedRides();
 document.querySelectorAll('[data-seat-map]').forEach(map=>{const id=map.dataset.seatMap;pgCommunitySelections.set(id,[]);pgWireSeatMap(map,id,1,chosen=>{const field=$('seat-'+id);if(field)field.value=chosen[0]||''})});
 document.querySelectorAll('[data-delete-trip]').forEach(el=>el.onclick=()=>deleteTrip(el.dataset.deleteTrip));document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>closeTrip(el.dataset.close));document.querySelectorAll('[data-book]').forEach(el=>el.onclick=()=>book(el.dataset.book,el.dataset.from,el.dataset.to));document.querySelectorAll('[data-approve]').forEach(el=>el.onclick=()=>decision(el.dataset.approve,true));document.querySelectorAll('[data-reject]').forEach(el=>el.onclick=()=>decision(el.dataset.reject,false));document.querySelectorAll('[data-cancel]').forEach(el=>el.onclick=()=>cancel(el.dataset.cancel));
 }catch(e){if(isCurrentReload()&&!silent)msg('Не удалось загрузить рейсы: '+e.message,true)}}
const pgBookingBusy=new Set();
async function book(id,fromId,toId){
 if(pgBookingBusy.has(id))return;
 const button=[...document.querySelectorAll('[data-book]')].find(b=>b.dataset.book===id);
 pgBookingBusy.add(id);if(button)button.disabled=true;
 try{
  const seat=Number($('seat-'+id)?.value);if(!seat)throw Error('Выберите свободное место на схеме');
  const name=$('name-'+id)?.value.trim()||'',phone=$('phone-'+id)?.value.trim()||'';
  if(!name)throw Error('Введите ваше имя');
  if(phone.replace(/\D/g,'').length<7)throw Error('Укажите корректный номер телефона');
  await call('/rest/v1/rpc/reserve_seat',{method:'POST',body:{p_trip_id:id,p_seat_number:seat,p_name:name,p_phone:phone}});
  try{const key=pgRecentRouteKey();if(key&&fromId&&toId&&fromId!==toId)localStorage.setItem(key,JSON.stringify({fromId,toId,at:Date.now()}))}catch{}
  if(mode==='passenger'&&view==='search')drawWork();msg('Бронь отправлена водителю. Ожидайте подтверждения.');await reload()
 }catch(e){msg('Бронирование: '+e.message,true)}finally{pgBookingBusy.delete(id);if(button?.isConnected)button.disabled=false}
}
const pgBookingActionBusy=new Set();
async function decision(id,yes){
 if(pgBookingActionBusy.has(id))return;
 pgBookingActionBusy.add(id);const buttons=[...document.querySelectorAll('[data-approve],[data-reject]')].filter(b=>b.dataset.approve===id||b.dataset.reject===id);buttons.forEach(b=>b.disabled=true);
 try{await call('/rest/v1/rpc/driver_booking_decision',{method:'POST',body:{p_booking_id:id,p_accept:yes}});msg(yes?'Бронь подтверждена':'Бронь отклонена');await reload()}
 catch(e){msg(e.message,true)}finally{pgBookingActionBusy.delete(id);buttons.forEach(b=>{if(b.isConnected)b.disabled=false})}
}
async function cancel(id){if(pgTripActionBusy.has(id)||!confirm('Отменить бронирование?'))return;pgTripActionBusy.add(id);const b=[...document.querySelectorAll('[data-cancel]')].find(x=>x.dataset.cancel===id);if(b)b.disabled=true;try{await call('/rest/v1/rpc/passenger_cancel_booking',{method:'POST',body:{p_booking_id:id}});msg('Бронь отменена');await reload()}catch(e){msg(e.message,true)}finally{pgTripActionBusy.delete(id);if(b?.isConnected)b.disabled=false}}
// Render immediately. Network/auth refresh must never block the first screen.


window.addEventListener('focus',async()=>{if(session){try{await pgPollInbox(true);await loadProfile();if(mode==='driver')drawWork();await reload(true);checkRestReminder()}catch(e){msg(e.message,true)}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session){pgPollInbox(true);loadProfile().then(()=>{if(mode==='driver')drawWork();checkRestReminder();return reload(true)}).catch(e=>msg(e.message,true))}});

function distanceMeters(a,b,c,d){const R=6371000,rad=x=>x*Math.PI/180,dl=rad*(c-a),dn=rad*(d-b),h=Math.sin(dl/2)**2+Math.cos(rad*a)*Math.cos(rad*c)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function showGpsState(t){const e=$('gpsState');if(e)e.textContent=t|| (gpsWatch!==null?'GPS активен · приложение должно оставаться открытым':'GPS выключен')}
function stopGpsWatch(){if(gpsWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;gpsCandidate=null;gpsSince=0;gpsPrompted=false;showGpsState()}
function startGpsWatch(){if(gpsWatch!==null){showGpsState('GPS уже включён');return}if(!navigator.geolocation){showGpsState('GPS не поддерживается устройством');return}if(!driverProfile){showGpsState('Сначала зарегистрируйте автомобиль');return}
 gpsWatch=navigator.geolocation.watchPosition(pos=>{if(!session||!driverProfile)return;const {latitude,longitude,accuracy}=pos.coords;if(accuracy>150){showGpsState('Точность GPS '+Math.round(accuracy)+' м. Ожидаем точные координаты');return}
 const known=pitaks.filter(p=>p.verified&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)).map(p=>({...p,distance:distanceMeters(latitude,longitude,p.latitude,p.longitude)})).sort((a,b)=>a.distance-b.distance);const nearest=known[0];if(!nearest||nearest.distance>500){gpsCandidate=null;gpsSince=0;gpsPrompted=false;showGpsState('Рядом нет подтверждённых пятаков (до 500 м)');return}
 if(nearest.id===driverProfile.active_pitak_id){gpsCandidate=null;gpsSince=0;gpsPrompted=false;showGpsState('Вы на рабочем пятаке: '+nearest.city+' — '+nearest.name);return}
 if(gpsCandidate!==nearest.id){gpsCandidate=nearest.id;gpsSince=Date.now();gpsPrompted=false}const elapsed=Date.now()-gpsSince;showGpsState('Возле '+nearest.city+' — '+nearest.name+' · '+Math.floor(elapsed/60000)+'/60 минут');if(elapsed>=3600000&&!gpsPrompted){gpsPrompted=true;promptNewPitak(nearest)}
 },err=>showGpsState('GPS: '+err.message),{enableHighAccuracy:true,maximumAge:30000,timeout:25000});showGpsState('Ожидаем разрешение на GPS…')}
async function promptNewPitak(p){if(!confirm('Вы более часа возле '+p.city+' — '+p.name+'. Это ваш новый рабочий пятак?'))return;try{await call('/rest/v1/rpc/set_driver_work_status',{method:'POST',body:{p_status:'offline',p_pitak:p.id,p_rest_until:null}});await loadProfile();mode='driver';view='driver';localStorage.setItem('pg_view',view);drawWork();setNav();const ready=confirm('Новый пятак сохранён. Вы готовы принимать пассажиров? Нажмите ОК для работы или Отмена для отдыха.');if(ready)await setStatus('ready');else{msg('Выберите время отдыха и нажмите «Отдыхать». До подтверждения вы не на линии.');} }catch(e){msg('Новый пятак: '+e.message,true)}}
function setNav(){
 const tabs=$('pgTabs');if(!tabs)return;
 tabs.classList.remove('pg-hidden');pgUpdateBack();if($('topLogin'))$('topLogin').style.display=session?'none':'';
 tabs.querySelectorAll('[data-view]').forEach(b=>{
  b.classList.toggle('active',b.dataset.view===view);
  b.onclick=()=>{
   const next=b.dataset.view;if(next===view&&!(view==='services'&&serviceScreen!=='home'))return;pgRemember();pgAuthVisible=false;view=next;if(view==='services')serviceScreen='home';localStorage.setItem('pg_view',view);
   if(!session){renderGuestView();return}
   mode=view==='driver'?'driver':'passenger';if(view!=='services')drawWork();setNav();if(view!=='services')reload(true);
  };
 });
 if(!session){if($('work'))$('work').classList.add('pg-hidden');if($('feed'))$('feed').classList.add('pg-hidden');return}
 if($('work'))$('work').classList.toggle('pg-hidden',view==='bookings'||view==='profile'||view==='services');
 if($('feed'))$('feed').classList.toggle('pg-hidden',view==='profile'||view==='services');
 if(view==='services'&&$('work')){$('work').classList.remove('pg-hidden');renderServices()}
 if(view==='profile'&&$('work')){$('work').classList.remove('pg-hidden');$('work').innerHTML='<div class="card"><h3>👤 Мой профиль <span style="color:#16965b;font-size:14px">● Аккаунт активен</span></h3><p>'+esc(session.user.email||'')+'</p><button id="profileLogout" class="secondary">Выйти из аккаунта</button><div id="profileVehicle" class="pg-profile-vehicle"></div><button id="profileDriver" class="secondary">🚕 Мой автомобиль</button><div id="adminRequests"></div></div>';$('profileVehicle').innerHTML=driverVehicle?'<b>🚘 Мой автомобиль</b><p>'+esc(driverVehicle.model)+' · '+esc(driverVehicle.plate)+'</p><p class="muted">Основной пятак: '+esc(pname(driverProfile?.home_pitak_id))+'</p>':'<p class="muted">Автомобиль ещё не добавлен</p>'; $('profileLogout').onclick=()=>{reloadSequence++;lastBookingSnapshot=null;pgInboxSnapshot=null;pgMessageSnapshot=null;pgInboxPolling=null;pgInboxLoadSequence++;pgThreadLoadSequence++;pgRepliesLoadSequence.clear();stop();stopGpsWatch();session=null;driverProfile=null;localStorage.removeItem('pg_online_auth');guestHome()};$('profileDriver').onclick=()=>{view='driver';mode='driver';localStorage.setItem('pg_view',view);drawWork();setNav()};loadAdminRequests()}
}
function guestHome(){msg('');pgAuthVisible=false;session=null;stop();view='search';localStorage.setItem('pg_view','search');renderGuestView();loadGuestCatalog()}
function guestAuthButtons(){return '<div class="pg-guest-actions"><button data-auth="login">Войти</button><button data-auth="passenger" class="secondary">Создать аккаунт</button><button data-auth="signup" class="secondary">🚕 Добавить водителя</button></div>'}
function guestWire(){
 document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>loginUI(b.dataset.auth));
}
function renderGuestView(){
 guestPreviewOpen=false;setNav();const root=$('root');if(!root)return;
 const intro='<div class="pg-guest-top"><b>Пятак Go</b><span>Путешествуй удобно по Узбекистану</span></div>';
 const buttons=guestAuthButtons();
 let content='';
 if(view==='search'){
  content=`<div class="card pg-trip-search"><h2>🚕 Найти междугороднее такси</h2><p class="muted">Укажите маршрут. Мы подскажем города и стоянки по мере ввода.</p><label>Откуда<input id="guestFrom" type="search" placeholder="Город отправления" autocomplete="off" value="${esc(pgGuestFrom)}"></label><label>Куда<input id="guestTo" type="search" placeholder="Город назначения" autocomplete="off" value="${esc(pgGuestTo)}"></label><button id="guestFind">Найти поездку</button><div id="guestCatalogStatus" role="status" aria-live="polite"></div><div id="guestList"></div></div>`;
 }else if(view==='driver'){
  content='<div class="card"><h2>🚕 Для водителей</h2><p>Зарегистрируйте автомобиль бесплатно, выберите свой пятак и публикуйте рейсы.</p><p>В будущем здесь будут очередь машин, заявки пассажиров и статистика спроса.</p><button data-auth="signup">Добавить автомобиль</button><button data-auth="login" class="secondary">У меня уже есть аккаунт</button></div>';
 }else if(view==='services'){
  content=`<section class="svc-hero"><span class="svc-kicker">ПЯТАК GO · СЕРВИСЫ</span><h2>Всё по пути.<br><em>Всё рядом.</em></h2><p>Найдите попутчиков, передайте посылку или закажите покупку из другого города.</p><div class="svc-hero-pill">✓ Бесплатное размещение</div></section><section class="svc-section"><h3>Что хотите сделать?</h3><div class="svc-tiles">${serviceTiles()}</div><div class="svc-safe">Для публикации объявлений и ответов нужна бесплатная регистрация пассажира или водителя.</div></section>`;
 }else if(view==='bookings'){
  content='<div class="card"><h2>🎫 Мои поездки</h2><p>Здесь будут ваши бронирования и статусы подтверждения водителем.</p><p class="muted">Войдите, чтобы увидеть свои поездки.</p></div>';
 }else{
  content='<div class="card"><h2>👤 Профиль</h2><p>Вы можете пользоваться каталогом без регистрации.</p><p>Для бронирования создайте бесплатный аккаунт пассажира. Если хотите работать водителем, добавьте автомобиль отдельно.</p></div>';
 }
 root.innerHTML=intro+content+'<div class="card"><h3>Начните, когда будете готовы</h3>'+buttons+'<p class="muted">Просмотр приложения — без регистрации. Регистрация пассажира и водителя бесплатная.</p></div>';
 guestWire();
 if(view==='services')document.querySelectorAll('[data-service-kind]').forEach(b=>b.onclick=()=>{
  pgRemember();serviceSelected=b.dataset.serviceKind;serviceKind=serviceSelected;guestServicePreview(serviceSelected);
 });
 if(view==='search')guestFilterSetup();
}
function guestServicePreview(kind){
 const x=SERVICE_INFO[kind];if(!x)return;guestPreviewOpen=true;
 const root=$('root');
 root.innerHTML=`<div class="svc-heading"><button class="svc-back" id="guestServiceBack" aria-label="Назад">‹</button><div><h2>${x.icon} ${x.name}</h2><p>${x.desc}</p></div></div>
 <div class="svc-form-card"><h3>Как это работает</h3><div class="pg-how-step"><b>1</b><span>Укажите откуда, куда и когда</span></div><div class="pg-how-step"><b>2</b><span>${esc(x.title)} — заполните детали и цену</span></div><div class="pg-how-step"><b>3</b><span>Получайте предложения и договаривайтесь напрямую</span></div></div>
 <div class="svc-safe">Размещение бесплатно. Для публикации и откликов понадобится аккаунт. Не переводите предоплату незнакомым людям.</div>
 <button id="guestServiceStart" class="svc-primary">Создать объявление бесплатно</button><button id="guestServiceCancel" class="svc-quiet">← Все сервисы</button>`;
 $('guestServiceBack').onclick=$('guestServiceCancel').onclick=()=>renderGuestView();
 $('guestServiceStart').onclick=()=>loginUI('passenger');
 pgUpdateBack();
}
async function loadGuestCatalog(){
 // The home screen must never wait indefinitely for a slow/offline server.
 guestCatalogState=guestPitaks.length?'cached':'loading';
 const controller=new AbortController(),abort=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch(URL+'/rest/v1/pitaks?select=id,name,city,region,verified&order=city.asc&limit=1000',{
   headers:{apikey:KEY},signal:controller.signal
  });
  if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(/permission denied/i.test(err.message||'')?'Для каталога не настроены права Supabase':(err.message||'Сервер ответил '+response.status))}
  const data=await response.json();
  if(!Array.isArray(data))throw Error('Неверный ответ каталога');
  guestPitaks=data;guestCatalogState='ready';guestCatalogError='';
  try{localStorage.setItem(GUEST_CACHE_KEY,JSON.stringify({at:Date.now(),items:data}))}catch{}
 }catch(e){
  guestCatalogState=guestPitaks.length?'cached':'error';
  guestCatalogError=e.name==='AbortError'?'Сервер долго не отвечает':e.message;
 }finally{
  clearTimeout(abort);
  if(!session&&view==='search'&&!pgAuthVisible)renderGuestView();
 }
}
function guestFilterSetup(){
 const from=$('guestFrom'),to=$('guestTo'),list=$('guestList'),status=$('guestCatalogStatus'),button=$('guestFind');
 if(!from||!to||!list||!button)return;
 pgSetupAutocomplete('guestFrom',()=>guestPitaks,v=>{pgGuestFrom=v;pgGuestSearched=false;list.innerHTML=''});
 pgSetupAutocomplete('guestTo',()=>guestPitaks,v=>{pgGuestTo=v;pgGuestSearched=false;list.innerHTML=''});
 const paint=()=>{
  if(guestCatalogState==='error'&&!guestPitaks.length){status.textContent='Не удалось загрузить направления. Проверьте интернет.';return}
  status.textContent='';
  if(!pgGuestSearched){list.innerHTML='';return}
  if(!pgGuestFrom.trim()||!pgGuestTo.trim()){list.innerHTML='<p class="muted">Укажите город отправления и назначения.</p>';return}
  if(pgGuestFrom.trim().toLocaleLowerCase('ru')===pgGuestTo.trim().toLocaleLowerCase('ru')){list.innerHTML='<p class="muted">Выберите разные пункты отправления и назначения.</p>';return}
  const starts=guestPitaks.filter(p=>pgMatchSelected(p,pgRouteSelections.get('guestFrom'),pgGuestFrom));const ends=guestPitaks.filter(p=>pgMatchSelected(p,pgRouteSelections.get('guestTo'),pgGuestTo));
  if(!starts.length||!ends.length){list.innerHTML='<p class="muted">Не нашли такую стоянку. Попробуйте ввести только название города.</p>';return}
  const summarize=(arr,title)=>`<div class="pg-route-result"><strong>${title}</strong>${arr.slice(0,5).map(p=>`<div class="pg-route-stop">📍 ${esc(p.city)} — ${esc(p.name)}</div>`).join('')}${arr.length>5?`<small>И ещё ${arr.length-5} стоянок</small>`:''}</div>`;
  list.innerHTML='<h3>Ваш маршрут</h3>'+summarize(starts,'Отправление')+summarize(ends,'Прибытие')+'<p class="muted">Чтобы посмотреть предложения водителей и забронировать место, войдите в аккаунт.</p><button type="button" id="pgGuestLogin" class="secondary">Войти или зарегистрироваться</button>';
  $('pgGuestLogin').onclick=()=>loginUI('login');
 };
 button.onclick=()=>{pgGuestFrom=from.value.trim();pgGuestTo=to.value.trim();pgGuestSearched=true;paint()};
 paint();
}

// Community services: public trip offers, passenger requests, parcels, and shopping requests.
// Only signed-in users can post or respond; offers are private to the post owner and responder.
const SERVICE_NAMES={ride_offer:'🚗 Еду по маршруту',ride_request:'🙋 Ищу попутную машину',parcel:'📦 Передать посылку',shopping:'🛍️ Купите и привезите'};
let serviceKind='ride_offer', serviceFilter='all';
const SERVICE_INFO={
 ride_offer:{icon:'🚗',name:'Еду по пути',tag:'Для водителей',desc:'Едете в другой город? Возьмите попутчиков.',hint:'Например: выезжаю от Регистана, 2 свободных места',title:'Куда и когда вы едете?',price:'Цена за место, сум',details:'Место посадки, багаж, условия поездки',action:'Опубликовать поездку'},
 ride_request:{icon:'🙋',name:'Ищу машину',tag:'Для пассажиров',desc:'Оставьте заявку — водители предложат поездку.',hint:'Например: нужно 2 места, выезд после обеда',title:'Какая поездка вам нужна?',price:'Бюджет за место, сум',details:'Количество пассажиров, багаж, пожелания',action:'Найти попутную машину'},
 parcel:{icon:'📦',name:'Передать посылку',tag:'Доставка по пути',desc:'Передайте небольшой пакет через попутную машину.',hint:'Например: документы в папке, вес до 1 кг',title:'Что нужно передать?',price:'Предлагаю за доставку, сум',details:'Размер, вес, место передачи и получения. Без запрещённых предметов.',action:'Найти доставку'},
 shopping:{icon:'🛍️',name:'Купите и привезите',tag:'Покупки из другого города',desc:'Попросите попутчика купить и привезти нужное.',hint:'Например: купите 2 кг сухофруктов на рынке',title:'Что нужно купить?',price:'Оплата за услугу, сум (без цены товара)',details:'Товар, количество, магазин или рынок, максимальная цена товара',action:'Разместить поручение'}
};
let pgActiveOffer=null, pgInboxSnapshot=null, pgMessageSnapshot=null, pgInboxPolling=null, pgThreadLoadSequence=0;
let serviceScreen='home', serviceSelected='ride_offer', serviceFromFilter='',serviceToFilter='',serviceBusy=false,serviceLoadSequence=0;
const serviceTiles=()=>Object.entries(SERVICE_INFO).map(([key,x])=>`<button class="svc-tile" data-service-kind="${key}" type="button"><span class="svc-tile-icon">${x.icon}</span><span class="svc-tile-body"><b>${x.name}</b><small>${x.desc}</small></span><span class="svc-arrow">›</span></button>`).join('');
function serviceHeader(title,sub='',back=false){return `<div class="svc-heading">${back?'<button class="svc-back" id="svcBack" aria-label="Назад">‹</button>':''}<div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div></div>`}
function renderServices(){
 const el=$('work');if(!el)return;
 el.classList.remove('pg-hidden');
 if(serviceScreen==='compose'){renderServiceForm();return}
 if(['roadhelp','tripplanner','mycar'].includes(serviceScreen)){renderEverydayUtility();return}
 if(serviceScreen==='mine'){renderServiceMine();return}
 if(serviceScreen==='inbox'){renderInbox();return}
 if(serviceScreen==='thread'){renderOfferThread();return}
 el.innerHTML=`<section class="svc-hero"><span class="svc-kicker">ПЯТАК GO · СЕРВИСЫ</span><h2>Всё по пути.<br><em>Всё рядом.</em></h2><p>Попутчики, посылки и покупки между городами Узбекистана.</p><div class="svc-hero-pill">✓ Размещение бесплатно</div></section>
 <section class="svc-section"><button id="svcInbox" class="svc-inbox-button">💬 Сообщения и предложения <span id="svcInboxBadge">Открыть →</span></button><div class="svc-section-top"><h3>Что хотите сделать?</h3></div><div class="svc-tiles">${serviceTiles()}</div></section>
 <section class="svc-section"><div class="svc-section-top"><h3>Полезно каждый день</h3></div><div class="svc-tiles svc-everyday-tiles"><button class="svc-tile" type="button" data-everyday="roadhelp"><span class="svc-tile-icon">🆘</span><span class="svc-tile-body"><b>Помощь на дороге</b><small>Колесо, аккумулятор, топливо, эвакуатор</small></span><span class="svc-arrow">›</span></button><button class="svc-tile" type="button" data-everyday="tripplanner"><span class="svc-tile-icon">🏞️</span><span class="svc-tile-body"><b>План поездки</b><small>Море, горы, Чарвак, выходные и обратно</small></span><span class="svc-arrow">›</span></button><button class="svc-tile" type="button" data-everyday="mycar"><span class="svc-tile-icon">🚘</span><span class="svc-tile-body"><b>Мой автомобиль</b><small>Данные машины и напоминания о сервисе</small></span><span class="svc-arrow">›</span></button></div></section>
 <section class="svc-section"><div class="svc-section-top"><h3>Объявления по Узбекистану</h3><button id="svcMy" class="svc-text-button">Мои объявления →</button></div>
 <div class="svc-filter-pills" id="svcFilters"><button class="${serviceFilter==='all'?'on':''}" data-filter="all">Все</button>${Object.entries(SERVICE_INFO).map(([k,x])=>`<button class="${serviceFilter===k?'on':''}" data-filter="${k}">${x.icon} ${x.name}</button>`).join('')}</div>
 <div class="svc-searchline"><input id="svcFromSearch" placeholder="Откуда (город)" value="${esc(serviceFromFilter)}" aria-label="Откуда"><span>→</span><input id="svcToSearch" placeholder="Куда (город)" value="${esc(serviceToFilter)}" aria-label="Куда"></div>
 <div class="svc-feedbar"><span>Актуальные объявления</span><button class="svc-text-button" id="serviceRefresh">↻ Обновить</button></div><div id="serviceList" aria-live="polite"><div class="svc-empty">Загрузка объявлений…</div></div></section>
 <section class="svc-section"><div class="svc-section-top"><h3>🚕 Живой пятак</h3><button id="livePitakRefresh" class="svc-text-button" type="button">↻ Обновить</button></div><p class="svc-help">Сколько водителей отметили готовность к работе. Не GPS-очередь и не гарантированное наличие машины.</p><div id="livePitakCounts" class="svc-live" aria-live="polite">Загрузка…</div><p id="livePitakUpdated" class="svc-help" aria-live="polite"></p></section>`;
 el.querySelectorAll('[data-service-kind]').forEach(b=>b.onclick=()=>{serviceSelected=b.dataset.serviceKind;serviceKind=serviceSelected;pgRemember();serviceScreen='compose';renderServices()});
 el.querySelectorAll('[data-everyday]').forEach(b=>b.onclick=()=>{pgRemember();serviceScreen=b.dataset.everyday;renderServices()});
 el.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{serviceFilter=b.dataset.filter;renderServices()});
 $('svcMy').onclick=()=>{pgRemember();serviceScreen='mine';renderServices()};
 $('svcInbox').onclick=()=>{pgRemember();serviceScreen='inbox';renderServices()};
 $('serviceRefresh').onclick=loadServices;
 $('svcFromSearch').oninput=e=>{serviceFromFilter=e.target.value;servicePaintFilter()};
 $('svcToSearch').oninput=e=>{serviceToFilter=e.target.value;servicePaintFilter()};
 loadServices();loadLivePitaks();$('livePitakRefresh').onclick=loadLivePitaks;pgPollInbox(true);
}
function pgLocalJson(key,fallback={}){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
function pgLocalSave(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){throw Error('Не удалось сохранить данные на этом устройстве. Проверьте свободное место и разрешение хранилища.')}}
function pgLocalDateString(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
function pgValidLocalDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d}
function pgValidatePlanDates(value){const today=pgLocalDateString();if(value.date&&(!pgValidLocalDate(value.date)||value.date<today))throw Error('Дата отправления должна быть сегодня или позже.');if(value.returnDate&&(!pgValidLocalDate(value.returnDate)||value.returnDate<today))throw Error('Дата возвращения должна быть сегодня или позже.');if(value.date&&value.returnDate&&value.returnDate<value.date)throw Error('Дата возвращения не может быть раньше отправления.')}
function pgShowLocalError(error){msg(error?.message||'Не удалось выполнить действие. Попробуйте ещё раз.',true)}
async function pgShareText(text){
 try{if(navigator.share){await navigator.share({title:'Pitak Go',text});msg('Открылось системное меню отправки. Выберите контакт или приложение.');return}
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);msg('Текст скопирован. Отправьте его выбранной службе или близкому человеку.');return}
  const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok)throw Error('Копирование недоступно');msg('Текст скопирован. Отправьте его выбранному контакту.');
 }catch(e){if(e.name!=='AbortError')msg('Не удалось поделиться автоматически. Скопируйте текст вручную: '+text,true)}
}
function renderEverydayUtility(){
 const el=$('work');if(!el)return;
 const back=()=>{serviceScreen='home';renderServices()};
 if(serviceScreen==='roadhelp'){
  el.innerHTML=`${serviceHeader('🆘 Помощь на дороге','Подготовьте понятный запрос для службы или близкого человека',true)}<div class="svc-safe">Важно: Pitak Go пока не диспетчеризует эвакуаторы и механиков. Эта форма не вызывает помощь автоматически и не подтверждает, что кто-то уже едет. При угрозе жизни обращайтесь в местную экстренную службу.</div><div class="svc-form-card"><label>Что случилось?<select id="pgRoadProblem"><option>Прокол / замена колеса</option><option>Разрядился аккумулятор</option><option>Нужно топливо</option><option>Нужен эвакуатор</option><option>Машина не заводится</option><option>Другая проблема</option></select></label><label>Где вы находитесь?<input id="pgRoadLocation" maxlength="180" placeholder="Город, дорога, ориентир"></label><button type="button" class="svc-outline" id="pgRoadGps">📍 Определить координаты</button><label>Ваш телефон для связи<input id="pgRoadPhone" inputmode="tel" maxlength="30" placeholder="Номер телефона"></label><label>Дополнительные детали<textarea id="pgRoadDetails" rows="3" maxlength="500" placeholder="Марка машины, направление движения, что нужно"></textarea></label><button type="button" class="svc-primary" id="pgRoadShare">Поделиться запросом</button></div><p class="svc-help">Геолокация используется только после вашего нажатия. Перед отправкой проверьте текст и получателя.</p>`;
  $('svcBack').onclick=back;
  $('pgRoadGps').onclick=()=>{if(!navigator.geolocation){msg('Геолокация недоступна на этом устройстве.',true);return}const b=$('pgRoadGps'),field=$('pgRoadLocation');if(!b||!field||b.disabled)return;b.disabled=true;b.textContent='Определяем местоположение…';const isCurrent=()=>b.isConnected&&field.isConnected&&$('pgRoadGps')===b&&$('pgRoadLocation')===field;navigator.geolocation.getCurrentPosition(pos=>{if(!isCurrent())return;const lat=pos.coords.latitude.toFixed(6),lon=pos.coords.longitude.toFixed(6);field.value=`Координаты: ${lat}, ${lon} · Карта: https://maps.google.com/?q=${lat},${lon}`;b.disabled=false;b.textContent='📍 Обновить координаты'},()=>{if(!isCurrent())return;msg('Не удалось определить местоположение. Введите ориентир вручную.',true);b.disabled=false;b.textContent='📍 Повторить определение'},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})};
  $('pgRoadShare').onclick=()=>{const problem=$('pgRoadProblem').value,location=$('pgRoadLocation').value.trim(),phone=$('pgRoadPhone').value.trim(),details=$('pgRoadDetails').value.trim();if(!location){msg('Укажите место поломки или определите координаты.',true);$('pgRoadLocation').focus();return}const lines=['Нужна помощь на дороге через Pitak Go','Проблема: '+problem,'Местоположение: '+location,phone?'Телефон: '+phone:'',details?'Подробности: '+details:''].filter(Boolean);pgShareText(lines.join('\n'))};return;
 }
 if(serviceScreen==='tripplanner'){
  const plan=pgLocalJson('pg_trip_plan_v1',{});
  el.innerHTML=`${serviceHeader('🏞️ План поездки','Соберите план на выходные или отпуск',true)}<div class="svc-form-card"><label>Откуда<input id="pgPlanFrom" maxlength="100" value="${esc(plan.from||'')}" placeholder="Например, Ташкент"></label><label>Куда<input id="pgPlanTo" maxlength="120" value="${esc(plan.to||'')}" placeholder="Чарвак, горы, побережье…"></label><label>Дата отправления<input id="pgPlanDate" type="date" min="${pgLocalDateString()}" value="${esc(plan.date||'')}"></label><label>Обратно / дата возвращения<input id="pgPlanReturn" type="date" min="${pgLocalDateString()}" value="${esc(plan.returnDate||'')}"></label><label>Кто едет?<select id="pgPlanPeople"><option value="1">1 человек</option><option value="2">2 человека</option><option value="3">3 человека</option><option value="4">4 человека</option><option value="5+">5 и более</option></select></label><label>Заметки<textarea id="pgPlanNotes" rows="3" maxlength="600" placeholder="Багаж, остановки, что взять с собой">${esc(plan.notes||'')}</textarea></label><button type="button" class="svc-primary" id="pgPlanSave">Сохранить план на этом устройстве</button><button type="button" class="svc-outline" id="pgPlanShare">Поделиться планом</button><p class="svc-help">План хранится только на этом устройстве. Это не бронь, а даты и заметки; стоимость и наличие машины не подтверждаются.</p></div>`;
  if(plan.people&&$('pgPlanPeople'))$('pgPlanPeople').value=plan.people;
  $('svcBack').onclick=back;
  const departure=$('pgPlanDate'),returning=$('pgPlanReturn');if(plan.date&&plan.date>=departure.min)returning.min=plan.date;departure.onchange=()=>{returning.min=departure.value||pgLocalDateString();if(returning.value&&returning.value<returning.min)returning.value=''};
  const read=()=>({from:$('pgPlanFrom').value.trim(),to:$('pgPlanTo').value.trim(),date:$('pgPlanDate').value,returnDate:$('pgPlanReturn').value,people:$('pgPlanPeople').value,notes:$('pgPlanNotes').value.trim()});
  const validate=()=>{const value=read();if(!value.from||!value.to)throw Error('Укажите отправление и место назначения.');pgValidatePlanDates(value);return value};
  $('pgPlanSave').onclick=()=>{try{const value=validate();pgLocalSave('pg_trip_plan_v1',value);msg('План сохранён на этом устройстве.')}catch(e){pgShowLocalError(e)}};
  $('pgPlanShare').onclick=()=>{try{const v=validate();pgShareText(['План поездки · Pitak Go',`Маршрут: ${v.from} → ${v.to}`,v.date?'Отправление: '+v.date:'',v.returnDate?'Возвращение: '+v.returnDate:'','Пассажиры: '+v.people,v.notes?'Заметки: '+v.notes:''].filter(Boolean).join('\n'))}catch(e){pgShowLocalError(e)}};return;
 }
 const car=pgLocalJson('pg_my_car_v1',{});
 el.innerHTML=`${serviceHeader('🚘 Мой автомобиль','Сохраните данные и даты обслуживания',true)}<div class="svc-form-card"><label>Марка и модель<input id="pgCarModel" maxlength="100" value="${esc(car.model||'')}" placeholder="Например, Chevrolet Cobalt"></label><label>Государственный номер (необязательно)<input id="pgCarPlate" maxlength="20" value="${esc(car.plate||'')}" placeholder="Номер автомобиля"></label><label>Следующее ТО<input id="pgCarService" type="date" value="${esc(car.serviceDate||'')}"></label><label>Окончание страховки<input id="pgCarInsurance" type="date" value="${esc(car.insuranceDate||'')}"></label><label>Другие напоминания<textarea id="pgCarNotes" rows="3" maxlength="500" placeholder="Шины, масло, техосмотр…">${esc(car.notes||'')}</textarea></label><button type="button" class="svc-primary" id="pgCarSave">Сохранить данные</button><p class="svc-help">Данные хранятся локально на этом устройстве и не синхронизируются с аккаунтом. Не сохраняйте здесь секретные документы или коды.</p><div id="pgCarReminders" class="svc-safe"></div></div>`;
 $('svcBack').onclick=back;
 $('pgCarSave').onclick=()=>{try{const value={model:$('pgCarModel').value.trim(),plate:$('pgCarPlate').value.trim(),serviceDate:$('pgCarService').value,insuranceDate:$('pgCarInsurance').value,notes:$('pgCarNotes').value.trim()};if(!value.model)throw Error('Укажите марку или модель автомобиля.');for(const [key,label] of [['serviceDate','Дата следующего ТО'],['insuranceDate','Окончание страховки']])if(value[key]&&!pgValidLocalDate(value[key]))throw Error(label+' указана некорректно. Проверьте дату.');pgLocalSave('pg_my_car_v1',value);paintCarReminders(value);msg('Данные автомобиля сохранены на этом устройстве.')}catch(e){pgShowLocalError(e)}};
 function paintCarReminders(value){const box=$('pgCarReminders');if(!box)return;const today=pgLocalDateString(),todayUtc=Date.parse(today+'T00:00:00Z');const lines=[];for(const [key,label] of [['serviceDate','Следующее ТО'],['insuranceDate','Страховка']]){if(!value[key])continue;const days=pgValidLocalDate(value[key])?Math.round((Date.parse(value[key]+'T00:00:00Z')-todayUtc)/86400000):NaN;lines.push(`${label}: ${value[key]} — ${!Number.isFinite(days)?'проверьте дату':days<0?'дата прошла':days===0?'сегодня':`через ${days} дн.`}`)}box.textContent=lines.length?'Напоминания\n'+lines.join('\n'):'Добавьте даты ТО и страховки — здесь будут отображаться напоминания.';}
 paintCarReminders(car);
}

function renderServiceForm(){
 const kind=serviceSelected,x=SERVICE_INFO[kind],el=$('work');
 el.innerHTML=`${serviceHeader(x.icon+' '+x.name,x.desc,true)}
 <div class="svc-step"><span class="svc-step-number">1</span><div><h3>Маршрут</h3><p>Укажите города или районы отправления и назначения</p></div></div>
 <div class="svc-form-card"><label>Откуда<input id="serviceFrom" maxlength="90" placeholder="Например, Самарканд" autocomplete="off"></label><label>Куда<input id="serviceTo" maxlength="90" placeholder="Например, Ташкент" autocomplete="off"></label><button type="button" class="svc-swap" id="svcSwap">⇅ Поменять местами</button><label>Когда ${kind==='shopping'?'нужно привезти':'планируете поездку'}<input id="serviceWhen" type="datetime-local"></label></div>
 <div class="svc-step"><span class="svc-step-number">2</span><div><h3>${x.title}</h3><p>Коротко и понятно для других пользователей</p></div></div>
 <div class="svc-form-card"><label>Описание<input id="serviceTitle" maxlength="140" placeholder="${esc(x.hint)}"></label><label>Дополнительные детали<textarea id="serviceDetails" maxlength="1000" rows="4" placeholder="${esc(x.details)}"></textarea></label>${kind==='ride_offer'?'<label>Свободных пассажирских мест<input id="serviceSeats" type="number" min="1" max="8" inputmode="numeric" placeholder="Например, 2"></label>':''}<label>${x.price}<input id="servicePrice" type="number" min="0" max="100000000" inputmode="numeric" placeholder="Необязательно"></label></div>
 <div class="svc-safe">🔒 Не отправляйте предоплату незнакомым людям. Запрещены опасные и незаконные грузы. Пятак Go не выступает гарантом сделки.</div>
 <button class="svc-primary" id="servicePublish">${x.action} · бесплатно</button><button class="svc-quiet" id="svcCancel">Отмена</button>`;
 const whenInput=$('serviceWhen');if(whenInput){const now=new Date();now.setMinutes(now.getMinutes()+1-now.getTimezoneOffset());whenInput.min=now.toISOString().slice(0,16)}
 $('svcBack').onclick=$('svcCancel').onclick=()=>{pgRemember();serviceScreen='home';renderServices()};
 $('svcSwap').onclick=()=>{const a=$('serviceFrom'),b=$('serviceTo');[a.value,b.value]=[b.value,a.value]};
 $('servicePublish').onclick=()=>publishService(kind);
}
function renderServiceMine(){
 const el=$('work');
 el.innerHTML=`${serviceHeader('Мои объявления','Ваши активные и завершённые заявки',true)}<div id="serviceList" class="svc-feed"><div class="svc-empty">Загрузка…</div></div>`;
 $('svcBack').onclick=()=>{pgRemember();serviceScreen='home';renderServices()};
 loadServices();
}
function servicePaintFilter(){const el=$('serviceList');if(!el)return;el.querySelectorAll('[data-from][data-to]').forEach(card=>{const from=serviceFromFilter.trim().toLocaleLowerCase('ru'),to=serviceToFilter.trim().toLocaleLowerCase('ru');card.hidden=!!((from&&!card.dataset.from.toLocaleLowerCase('ru').includes(from))||(to&&!card.dataset.to.toLocaleLowerCase('ru').includes(to)))});}
let livePitakRequest=null;
async function loadLivePitaks(){const el=$("livePitakCounts"),updated=$("livePitakUpdated"),button=$("livePitakRefresh");if(!el||livePitakRequest?.element===el)return;const requestToken=Symbol('live-pitak');livePitakRequest={element:el,token:requestToken};const isCurrent=()=>livePitakRequest?.token===requestToken&&el.isConnected;if(button)button.disabled=true;if(updated)updated.textContent="Обновляем данные…";try{const rows=await call("/rest/v1/rpc/live_pitak_counts",{method:"POST",body:{}});if(!isCurrent())return;el.innerHTML=rows.length?rows.sort((a,b)=>Number(b.ready_drivers)-Number(a.ready_drivers)).slice(0,20).map(r=>`<p><b>${esc(pname(r.pitak_id))}</b> — ${Math.max(0,Number(r.ready_drivers)||0)} водителей на линии</p>`).join(""):"Сейчас никто не отметил готовность к работе";if(updated)updated.textContent="Обновлено: "+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})+" · число водителей, отметивших готовность"}catch(e){if(isCurrent()){if(updated)updated.textContent="Не удалось обновить данные. Проверьте соединение и попробуйте снова.";el.textContent="Данные временно недоступны."}}finally{if(livePitakRequest?.token===requestToken)livePitakRequest=null;if(button?.isConnected)button.disabled=false}}
async function publishService(kind=serviceSelected){
 const form=$('servicePublish'),userId=session?.user?.id;
 if(!form||form.disabled||serviceBusy||view!=='services'||serviceScreen!=='compose'||serviceSelected!==kind||serviceKind!==kind)return;
 const isCurrent=()=>form.isConnected&&$('servicePublish')===form&&view==='services'&&serviceScreen==='compose'&&serviceSelected===kind&&serviceKind===kind&&session?.user?.id===userId;
 try{
  const from=$('serviceFrom').value.trim(),to=$('serviceTo').value.trim(),title=$('serviceTitle').value.trim(),details=$('serviceDetails').value.trim();
  if(!from||!to||!title)throw Error('Укажите откуда, куда и описание');
  if(from.toLowerCase()===to.toLowerCase())throw Error('Выберите разные города или районы');
  const price=$('servicePrice').value,seats=$('serviceSeats')?.value||'',when=$('serviceWhen').value;
  if(when&&(!Number.isFinite(Date.parse(when))||Date.parse(when)<=Date.now()))throw Error('Выберите дату и время в будущем');
  if(price&&(!Number.isInteger(+price)||+price<0||+price>100000000))throw Error('Укажите целую сумму от 0 до 100 000 000 сум');
  if(kind==='ride_offer'&&(!seats||!Number.isInteger(+seats)||+seats<1||+seats>8))throw Error('Укажите количество свободных мест: от 1 до 8');
  if(!userId){msg(guestMessage,true);return}serviceBusy=true;form.disabled=true;
  await call('/rest/v1/community_posts',{method:'POST',body:{author_id:userId,kind,from_city:from,to_city:to,title,details,price_uzs:price?+price:null,seats:kind==='ride_offer'&&seats?+seats:null,departure_at:when?new Date(when).toISOString():null}});
  if(!isCurrent())return;msg('Объявление опубликовано бесплатно');pgRemember();serviceScreen='mine';renderServices();
 }catch(e){if(isCurrent())msg('Объявление: '+e.message,true)}finally{serviceBusy=false;if(form.isConnected)form.disabled=false}
}
async function loadServices(){
 const el=$('serviceList');if(!el)return;
 const requestId=++serviceLoadSequence,userId=session?.user?.id,screen=serviceScreen;
 const isCurrent=()=>requestId===serviceLoadSequence&&session?.user?.id===userId&&el.isConnected&&$('serviceList')===el&&serviceScreen===screen&&view==='services';
 if(!session){el.innerHTML='<div class="svc-empty">Для просмотра объявлений войдите в аккаунт.</div>';return}
 try{
  const mineMode=serviceScreen==='mine';
  const filter=!mineMode&&serviceFilter!=='all'?'&kind=eq.'+encodeURIComponent(serviceFilter):'';
  const own=mineMode?'&author_id=eq.'+encodeURIComponent(session.user.id)+'&status=neq.deleted':'&status=eq.open';
  const posts=await call('/rest/v1/community_posts?select=id,author_id,kind,from_city,to_city,departure_at,title,details,price_uzs,seats,status,created_at'+own+filter+'&order=created_at.desc&limit=100');
  if(!isCurrent())return;
  el.innerHTML=posts.length?posts.map(p=>{
   const x=SERVICE_INFO[p.kind]||SERVICE_INFO.ride_request,owner=p.author_id===session.user.id;
   return `<article class="svc-post" data-from="${esc(p.from_city)}" data-to="${esc(p.to_city)}">
    <div class="svc-post-head"><span class="svc-post-type">${x.icon} ${esc(x.name)}</span><span class="svc-post-actions">${owner?`<button class="pg-delete-x" data-service-delete="${p.id}" title="Удалить объявление" aria-label="Удалить объявление">×</button>`:''}<span class="svc-post-status">${p.status==='closed'?'Завершено':'● Активно'}</span></span></div>
    <div class="svc-route"><b>${esc(p.from_city)}</b><span>→</span><b>${esc(p.to_city)}</b></div>
    <h4>${esc(p.title)}</h4>${p.details?`<p class="svc-post-details">${esc(p.details)}</p>`:''}
    <div class="svc-post-meta">${p.departure_at?`<span>🕒 ${esc(new Date(p.departure_at).toLocaleString('ru-RU'))}</span>`:''}${p.price_uzs!==null?`<span>💰 ${Number(p.price_uzs).toLocaleString('ru-RU')} сум</span>`:''}${p.seats?`<span>💺 ${Number(p.seats)} мест всего</span>`:''}</div>
    <div class="svc-post-bottom"><small>Опубликовано ${esc(new Date(p.created_at).toLocaleDateString('ru-RU'))}</small>
    ${owner?`<div class="svc-post-buttons"><button class="svc-outline" data-service-replies="${p.id}">Отклики / чат</button>${p.status==='open'?`<button class="svc-outline" data-service-close="${p.id}">Завершить</button>`:''}</div>`:`<button class="svc-outline" data-service-open-reply="${p.id}">Предложить помощь →</button>`}</div>
    <div class="svc-reply-box" id="replybox-${p.id}" hidden>${p.kind==='ride_offer'?`<div class="pg-seat-title">Выберите конкретные места</div><div id="pgCommunityMap-${p.id}" class="pg-seat-map-loading">Проверяем доступность мест…</div><input type="hidden" id="replyseats-${p.id}" value="0">`:''}<label>Сообщение автору<textarea id="reply-${p.id}" maxlength="500" rows="3" placeholder="Например: смогу забрать по пути за 20 000 сум"></textarea></label><label>Ваша цена, сум (необязательно)<input id="replyprice-${p.id}" type="number" min="0" max="100000000"></label><button class="svc-primary" data-service-reply="${p.id}">Отправить предложение</button></div>
    <div id="replies-${p.id}"></div></article>`;
  }).join(''):'<div class="svc-empty"><div style="font-size:35px">📭</div><b>Пока нет объявлений</b><p>Станьте первым — разместите поездку или поручение бесплатно.</p></div>';
  el.querySelectorAll('[data-service-delete]').forEach(b=>b.onclick=()=>deleteService(b.dataset.serviceDelete));
  el.querySelectorAll('[data-service-close]').forEach(b=>b.onclick=()=>closeService(b.dataset.serviceClose));
  el.querySelectorAll('[data-service-open-reply]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.serviceOpenReply,box=$('replybox-'+id);if(!box)return;box.hidden=!box.hidden;
  if(box.hidden||!$('replyseats-'+id))return;
  const holder=$('pgCommunityMap-'+id),userId=session?.user?.id,feed=$('serviceList'),screen=serviceScreen; if(!holder||!feed)return;
  const isCurrent=()=>holder.isConnected&&$('pgCommunityMap-'+id)===holder&&box.isConnected&&!box.hidden&&feed.isConnected&&$('serviceList')===feed&&session?.user?.id===userId&&serviceScreen===screen&&view==='services';holder.textContent='Проверяем свободные места…';
  try{
   const rows=await call('/rest/v1/rpc/community_seat_map',{method:'POST',body:{p_post:id}});
   if(!isCurrent())return;
   if(!rows.length){holder.textContent='Поездка недоступна';return}
   const row=rows[0],total=Number(row.total_seats)||4,occupied=row.occupied_seats||[];
   pgCommunitySelections.set(id,[]);holder.innerHTML=pgSeatMap(total,occupied,[],id);
   pgWireSeatMap(holder,id,total,selected=>{$('replyseats-'+id).value=selected.length});
  }catch(e){if(isCurrent())holder.textContent='Не удалось проверить места. Повторите попытку.'}
 });
  el.querySelectorAll('[data-service-reply]').forEach(b=>b.onclick=()=>replyService(b.dataset.serviceReply));
  el.querySelectorAll('[data-service-replies]').forEach(b=>b.onclick=()=>loadReplies(b.dataset.serviceReplies));
  if(!mineMode)servicePaintFilter();
 }catch(e){if(isCurrent())el.innerHTML='<div class="svc-empty">Не удалось загрузить объявления. <small>'+esc(e.message)+'</small></div>'}
}
const pgReplyBusy=new Set(),pgRepliesLoadSequence=new Map();
async function replyService(id){
 const key=String(id),form=$('replybox-'+key),button=form?.querySelector('[data-service-reply]'),feed=$('serviceList'),userId=session?.user?.id,screen=serviceScreen;
 if(!session||!userId||!form||!button||!feed||form.hidden||pgReplyBusy.has(key)||view!=='services')return;
 const isCurrent=()=>form.isConnected&&$('replybox-'+key)===form&&!form.hidden&&feed.isConnected&&$('serviceList')===feed&&session?.user?.id===userId&&serviceScreen===screen&&view==='services';
 pgReplyBusy.add(key);button.disabled=true;
 try{
  const message=$('reply-'+key)?.value.trim()||'',raw=$('replyprice-'+key)?.value||'';
  if(message.length<3)throw Error('Напишите предложение');
  if(raw!==''&&(!Number.isInteger(Number(raw))||Number(raw)<0||Number(raw)>100000000))throw Error('Проверьте цену: укажите целое число от 0 до 100 000 000 сум');
  const seatInput=$('replyseats-'+key),chosen=seatInput?(pgCommunitySelections.get(key)||[]):[],seats=seatInput?chosen.length:1;
  if(!Number.isInteger(seats)||seats<1||seats>8)throw Error('Укажите от 1 до 8 мест');
  await call('/rest/v1/community_offers',{method:'POST',body:{post_id:key,author_id:userId,message,price_uzs:raw?+raw:null,seats_requested:seats,requested_seat_numbers:seatInput?chosen:null}});
  if(!isCurrent())return;msg('Отклик отправлен автору объявления');pgPollInbox(true);loadServices();
 }catch(e){if(isCurrent())msg('Отклик: '+e.message,true)}finally{pgReplyBusy.delete(key);if(button.isConnected)button.disabled=false}
}
async function loadReplies(id){
 const key=String(id),el=$('replies-'+key),feed=$('serviceList'),userId=session?.user?.id,screen=serviceScreen;
 if(!el||!feed||!userId||view!=='services')return;
 const requestId=(pgRepliesLoadSequence.get(key)||0)+1;pgRepliesLoadSequence.set(key,requestId);
 const isCurrent=()=>pgRepliesLoadSequence.get(key)===requestId&&el.isConnected&&$('replies-'+key)===el&&feed.isConnected&&$('serviceList')===feed&&session?.user?.id===userId&&serviceScreen===screen&&view==='services';
 el.textContent='Загружаем отклики…';
 try{
  const replies=await call('/rest/v1/community_offers?post_id=eq.'+encodeURIComponent(key)+'&select=id,message,price_uzs,created_at&order=created_at.desc');
  if(!isCurrent())return;
  el.innerHTML=replies.length?replies.map(r=>`<div class="card"><p>${esc(r.message)}</p><small>${r.price_uzs!==null?Number(r.price_uzs).toLocaleString('ru-RU')+' сум · ':''}${esc(new Date(r.created_at).toLocaleString('ru-RU'))}</small><button class="svc-outline" data-offer-thread="${esc(r.id)}">💬 Открыть обсуждение</button></div>`).join(''):'Откликов пока нет';
  el.querySelectorAll('[data-offer-thread]').forEach(b=>b.onclick=()=>{if(isCurrent())pgOpenOffer(b.dataset.offerThread)});
 }catch(e){if(isCurrent())el.textContent='Не удалось загрузить отклики. '+e.message}
}
const pgServiceActionBusy=new Set();
async function closeService(id){
 const userId=session?.user?.id,screen=serviceScreen,feed=$('serviceList'),key='close:'+id;
 if(!userId||!id||view!=='services'||!feed||pgServiceActionBusy.has(key))return;
 const button=[...feed.querySelectorAll('[data-service-close]')].find(b=>b.dataset.serviceClose===id);
 const isCurrent=()=>session?.user?.id===userId&&serviceScreen===screen&&view==='services'&&feed.isConnected&&$('serviceList')===feed;
 pgServiceActionBusy.add(key);if(button)button.disabled=true;
 try{await call('/rest/v1/community_posts?id=eq.'+encodeURIComponent(id)+'&author_id=eq.'+encodeURIComponent(userId),{method:'PATCH',body:{status:'closed'}});if(!isCurrent())return;msg('Объявление закрыто');await loadServices()}
 catch(e){if(isCurrent())msg(e.message,true)}finally{pgServiceActionBusy.delete(key);if(button?.isConnected&&isCurrent())button.disabled=false}
}

async function deleteService(id){
 const userId=session?.user?.id,screen=serviceScreen,feed=$('serviceList'),key='delete:'+id;
 if(!userId||!id||view!=='services'||!feed||pgServiceActionBusy.has(key)||!confirm('Удалить объявление? Оно исчезнет из списков и больше не будет принимать отклики.'))return;
 const button=[...feed.querySelectorAll('[data-service-delete]')].find(b=>b.dataset.serviceDelete===id);
 const isCurrent=()=>session?.user?.id===userId&&serviceScreen===screen&&view==='services'&&feed.isConnected&&$('serviceList')===feed;
 pgServiceActionBusy.add(key);if(button)button.disabled=true;
 try{await call('/rest/v1/community_posts?id=eq.'+encodeURIComponent(id)+'&author_id=eq.'+encodeURIComponent(userId),{method:'PATCH',body:{status:'deleted'}});if(!isCurrent())return;msg('Объявление удалено');await loadServices()}
 catch(e){if(isCurrent())msg('Не удалось удалить: '+e.message,true)}finally{pgServiceActionBusy.delete(key);if(button?.isConnected&&isCurrent())button.disabled=false}
}
async function deleteTrip(id){
 if(pgTripActionBusy.has(id)||!session||!confirm('Убрать рейс из приложения? Если есть брони, пассажиры потеряют активную поездку.'))return;
 pgTripActionBusy.add(id);const b=[...document.querySelectorAll('[data-delete-trip]')].find(x=>x.dataset.deleteTrip===id);if(b)b.disabled=true;
 try{
  await call('/rest/v1/trips?id=eq.'+encodeURIComponent(id)+'&driver_id=eq.'+encodeURIComponent(session.user.id),{method:'PATCH',body:{status:'cancelled'}});
  msg('Рейс удалён из активных');await reload();
 }catch(e){msg('Не удалось удалить рейс: '+e.message,true)}finally{pgTripActionBusy.delete(id);if(b?.isConnected)b.disabled=false}
}


// In-app history: synchronous, independent of Supabase and native network.
const pgStack=[];let pgRestoring=false;let pgAuthVisible=false;
function pgState(){return {view,service:serviceScreen,selected:serviceSelected,auth:pgAuthVisible?authScreen:null}}
function pgRemember(){
 if(pgRestoring)return;
 const state=pgState(),last=pgStack[pgStack.length-1];
 if(!last||JSON.stringify(last)!==JSON.stringify(state))pgStack.push(state);
 if(pgStack.length>80)pgStack.shift();
 pgUpdateBack();
}
function pgUpdateBack(){const b=$('pgHeaderBack');if(b)b.classList.toggle('pg-visible',guestPreviewOpen||pgStack.length>0||pgAuthVisible||view!=='search'||serviceScreen!=='home')}
function pgBack(){
 if(pgRestoring)return;
 // Back should dismiss the topmost modal first, not navigate the underlying screen.
 const picker=document.getElementById('pg-location-overlay');
 if(picker){picker.remove();document.body.classList.remove('pg-picker-open');pgUpdateBack();return;}
 const demo=document.getElementById('pg-demo-overlay');
 if(demo){pgDemoClose();pgUpdateBack();return;}
 const welcome=document.getElementById('pgLaunchWelcome');
 if(welcome){welcome.querySelector('#pgLaunchClose')?.click();pgUpdateBack();return;}
 if(guestPreviewOpen&&!session){renderGuestView();pgUpdateBack();return;}
 pgRestoring=true;
 try{
  const prior=pgStack.pop()||{view:'search',service:'home',selected:'ride_offer',auth:null};
  view=prior.view;serviceScreen=prior.service;serviceSelected=prior.selected;serviceKind=serviceSelected;
  localStorage.setItem('pg_view',view);
  if(prior.auth){pgAuthVisible=false;loginUI(prior.auth)}
  else if(!session){pgAuthVisible=false;renderGuestView()}
  else{pgAuthVisible=false;if(!$('work'))dashboard();else{if(view!=='services')drawWork();setNav();if(view!=='services')reload(true)}}
 }catch(e){console.error('Back navigation',e);view='search';serviceScreen='home';if(!session)renderGuestView();else setNav()}
 finally{pgRestoring=false;pgUpdateBack()}
}
function pgInitBack(){
 const app=window.Capacitor?.Plugins?.App;
 if(app?.addListener){try{Promise.resolve(app.addListener('backButton',()=>pgBack())).catch(e=>console.warn('Native Back:',e))}catch(e){console.warn('Native Back:',e)}}
 window.addEventListener('popstate',()=>{pgBack();history.pushState({pitakgo:true},'',location.href)});
 history.pushState({pitakgo:true},'',location.href);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();pgBack()}});
 pgUpdateBack();
}
pgInitBack();

(async()=>{guestHome();try{const saved=JSON.parse(localStorage.getItem('pg_online_auth')||'null');if(saved?.access_token){session=saved;const ok=await refreshSession();if(ok&&session){await start();return}}}catch(e){console.warn('Session restore:',e)} })();


// Private offer inbox and per-offer messaging. Both participants are checked by RLS.
const pgOfferLabels={pending:'⏳ Ожидает ответа',accepted:'✅ Согласовано',rejected:'❌ Отклонено',withdrawn:'Отозвано',cancelled:'Отменено'};
const pgBookingText=o=>o.ride_booking_status==='confirmed'?`<div class="pg-reserved">🎟️ <b>Бронь подтверждена</b> · ${Number(o.seats_requested||1)} мест(а). Места: ${esc((o.confirmed_seat_numbers||[]).map(pgSeatName).join(', ')||'уточняются')}.</div>`:o.ride_booking_status==='cancelled'?'<div class="pg-reserved cancelled">Бронирование отменено. Места снова свободны.</div>':'';
function pgOpenOffer(id){pgRemember();pgActiveOffer=id;serviceScreen='thread';view='services';localStorage.setItem('pg_view',view);setNav()}
async function pgPollInbox(silent=false){
 const pollUserId=session?.user?.id;if(!pollUserId)return;
 if(pgInboxPolling?.userId===pollUserId)return;
 const pollToken=Symbol('inbox-poll');pgInboxPolling={userId:pollUserId,token:pollToken};
 const isCurrentPoll=()=>session?.user?.id===pollUserId&&pgInboxPolling?.token===pollToken;
 try{
  const offers=await call('/rest/v1/rpc/my_community_inbox_v3',{method:'POST',body:{}});
  if(!isCurrentPoll())return;
  const fingerprint=JSON.stringify(offers.map(o=>[o.offer_id,o.offer_status]));
  if(pgInboxSnapshot!==null&&fingerprint!==pgInboxSnapshot){
   const old=new Map(JSON.parse(pgInboxSnapshot));
   const newOffers=offers.filter(o=>!old.has(o.offer_id));
   const updates=offers.filter(o=>old.has(o.offer_id)&&old.get(o.offer_id)!==o.offer_status);
   if(newOffers.length||updates.length){msg('🔔 '+(newOffers.length?'Новые предложения: '+newOffers.length:'')+(updates.length?' Изменение статуса: '+updates.map(o=>pgOfferLabels[o.offer_status]||o.offer_status).join(', '):''));}
  }
  pgInboxSnapshot=fingerprint;
  try{
   const incoming=await call('/rest/v1/rpc/my_message_alerts',{method:'POST',body:{}});
   if(!isCurrentPoll())return;
   const messagesKey=JSON.stringify(incoming.map(x=>[x.offer_id,x.last_message_at]));
   if(pgMessageSnapshot!==null&&pgMessageSnapshot!==messagesKey){
    const previous=new Map(JSON.parse(pgMessageSnapshot));
    const newMessages=incoming.filter(x=>previous.get(x.offer_id)!==x.last_message_at);
    if(newMessages.length){msg('💬 Новое сообщение: '+newMessages[0].last_message+(newMessages.length>1?' (и ещё '+(newMessages.length-1)+')':''));}
    if(serviceScreen==='thread')pgLoadThread();
   }
   pgMessageSnapshot=messagesKey;
  }catch(e){console.warn('Message updates:',e.message)}
  const badge=$('svcInboxBadge');if(badge)badge.textContent=offers.filter(o=>o.offer_status==='pending').length+' ожидают · Открыть →';
  if(serviceScreen==='inbox'&&$('pgInboxList'))pgPaintInbox(offers);
 }catch(e){if(isCurrentPoll()&&!silent)console.warn('Inbox:',e.message)}finally{if(pgInboxPolling?.token===pollToken)pgInboxPolling=null}
}
function renderInbox(){
 $('work').innerHTML=`${serviceHeader('💬 Предложения и сообщения','Ваши переговоры с пассажирами и водителями',true)}<div class="svc-safe">Предложение не является подтверждённым бронированием места. Для поездки на конкретном рейсе используйте раздел «Поездки».</div><div id="pgInboxList" class="svc-feed"><div class="svc-empty">Загружаем сообщения…</div></div>`;
 $('svcBack').onclick=()=>{serviceScreen='home';renderServices()};
 pgLoadInbox();
}
let pgInboxLoadSequence=0;
async function pgLoadInbox(){
 const el=$('pgInboxList'),userId=session?.user?.id,requestId=++pgInboxLoadSequence;if(!el||!userId)return;
 const isCurrent=()=>requestId===pgInboxLoadSequence&&session?.user?.id===userId&&el.isConnected&&serviceScreen==='inbox';
 try{const offers=await call('/rest/v1/rpc/my_community_inbox_v3',{method:'POST',body:{}});if(isCurrent())pgPaintInbox(offers)}catch(e){if(isCurrent())el.textContent='Не удалось загрузить: '+e.message}
}
function pgPaintInbox(offers){
 const el=$('pgInboxList');if(!el)return;
 el.innerHTML=offers.length?offers.map(o=>`<div class="svc-post pg-offer-card"><div class="svc-post-head"><span class="svc-post-type">${o.post_kind==='ride_offer'?'🚗 Поездка':o.post_kind==='ride_request'?'🙋 Поиск машины':o.post_kind==='parcel'?'📦 Посылка':'🛍️ Покупка'}</span><span class="pg-offer-state pg-state-${esc(o.offer_status)}">${esc(pgOfferLabels[o.offer_status]||o.offer_status)}</span></div><div class="svc-route"><b>${esc(o.post_from)}</b><span>→</span><b>${esc(o.post_to)}</b></div><h4>${esc(o.post_title)}</h4><p class="svc-post-details">${esc(o.offer_message)}</p>${o.offer_price!==null?`<p>💰 ${Number(o.offer_price).toLocaleString('ru-RU')} сум</p>`:''}<small>${o.am_owner?'Вам предложили условия':'Вы предложили условия'}</small>${o.post_kind==='ride_offer'&&o.offer_status==='accepted'?pgBookingText(o):''}<button class="svc-outline" data-open-offer="${o.offer_id}">💬 ${o.offer_status==='pending'?'Ответить и согласовать':'Открыть переписку'} →</button></div>`).join(''):'<div class="svc-empty">Пока нет предложений. Откликнитесь на объявление или дождитесь ответа на своё.</div>';
 el.querySelectorAll('[data-open-offer]').forEach(b=>b.onclick=()=>pgOpenOffer(b.dataset.openOffer));
}
async function renderOfferThread(){
 const el=$('work');el.innerHTML=`${serviceHeader('💬 Обсуждение предложения','Договоритесь о времени, цене и месте встречи',true)}<div id="pgThreadStatus" class="svc-form-card">Загрузка предложения…</div><div class="svc-form-card"><h3>Переписка</h3><div id="pgThreadMessages" class="pg-thread-messages">Загрузка сообщений…</div><div class="pg-quick-messages"><button type="button" data-quick="Уточните, пожалуйста, время отправления.">🕒 Время?</button><button type="button" data-quick="Где именно встречаемся?">📍 Место встречи?</button><button type="button" data-quick="Подтвердите, пожалуйста, окончательную стоимость.">💰 Цена?</button></div><label>Сообщение<textarea id="pgMessageText" rows="3" maxlength="1000" placeholder="Например: подъеду к главному входу в 9:00"></textarea></label><button class="svc-primary" id="pgSendMessage">Отправить сообщение</button><button class="svc-outline" id="pgRefreshThread">↻ Обновить переписку</button></div>`;
 $('svcBack').onclick=()=>{serviceScreen='inbox';renderServices()};
 $('pgSendMessage').onclick=pgSendMessage;
 $('pgRefreshThread').onclick=pgLoadThread;
 document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{const f=$('pgMessageText');if(!f)return;f.value=(f.value.trim()?f.value.trim()+'\n':'')+b.dataset.quick;f.focus()});
 $('pgMessageText').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();pgSendMessage()}});
 await pgLoadThread();
}
async function pgLoadThread(){
 if(!session||!pgActiveOffer||serviceScreen!=='thread')return;
 const requestId=++pgThreadLoadSequence,id=pgActiveOffer,userId=session.user.id,work=$('work'),status=$('pgThreadStatus'),list=$('pgThreadMessages');
 const isCurrent=()=>requestId===pgThreadLoadSequence&&session?.user?.id===userId&&pgActiveOffer===id&&serviceScreen==='thread'&&view==='services'&&work?.isConnected&&$('work')===work;
 try{
  const offers=await call('/rest/v1/rpc/my_community_inbox_v3',{method:'POST',body:{}});
  if(!isCurrent())return;
  const offer=offers.find(o=>o.offer_id===id);
  if(!offer)throw Error('Предложение недоступно для вашего аккаунта');
  if(!isCurrent()||!status||!status.isConnected)return;
  status.innerHTML=`<h3>${esc(offer.post_title)}</h3><p>${esc(offer.post_from)} → ${esc(offer.post_to)}</p><p>${esc(offer.offer_message)}</p><p><b>${esc(pgOfferLabels[offer.offer_status]||offer.offer_status)}</b></p>${offer.offer_price!==null?`<p>Предложенная цена: ${Number(offer.offer_price).toLocaleString('ru-RU')} сум</p>`:''}${offer.post_kind==='ride_offer'?`<p>Запрошены места: <b>${esc((offer.requested_seat_numbers||[]).map(pgSeatName).join(', ')||Number(offer.seats_requested||1)+' мест(а)')}</b></p>${pgBookingText(offer)}`:''}<div class="svc-post-buttons">${offer.am_owner&&offer.offer_status==='pending'?`<button class="svc-primary" id="pgAcceptOffer">✓ Принять предложение</button><button class="svc-outline" id="pgRejectOffer">Отклонить</button>`:''}${!offer.am_owner&&offer.offer_status==='pending'?'<button class="svc-outline" id="pgWithdrawOffer">Отозвать предложение</button>':''}${offer.ride_booking_status==='confirmed'?'<button class="svc-outline" id="pgCancelRideBooking">× Отменить бронь</button>':''}</div>${offer.offer_status==='accepted'?`<div class="pg-agreement-confirmed"><b>✓ Условия согласованы</b><p>Следующий шаг: договоритесь в чате о точном месте посадки, времени, числе пассажиров и оплате.</p>${offer.post_kind==='ride_offer'?'<p>Подтверждены места в поездке по пути. Выбранные сиденья закреплены за бронью. Точку встречи уточните в чате.</p>':''}</div>`:''}<p class="svc-help">Приложение не списывает деньги автоматически. Не отправляйте предоплату незнакомым людям.</p>`;
  if($('pgAcceptOffer'))$('pgAcceptOffer').onclick=()=>pgDecideOffer(id,true);
  if($('pgRejectOffer'))$('pgRejectOffer').onclick=()=>pgDecideOffer(id,false);
  if($('pgWithdrawOffer'))$('pgWithdrawOffer').onclick=()=>pgWithdrawOffer(id);if($('pgCancelRideBooking'))$('pgCancelRideBooking').onclick=()=>pgCancelRideBooking(id);
  const messages=await call('/rest/v1/pitak_messages?offer_id=eq.'+encodeURIComponent(id)+'&select=id,sender_id,body,created_at&order=created_at.asc&limit=100');
  if(!isCurrent()||!list||!list.isConnected)return;
  list.innerHTML=messages.length?messages.map(m=>`<div class="pg-chat-bubble ${m.sender_id===session.user.id?'mine':''}"><p>${esc(m.body)}</p><small>${esc(new Date(m.created_at).toLocaleString('ru-RU'))}</small></div>`).join(''):'<p class="svc-help">Сообщений пока нет. Напишите первым.</p>';
 }catch(e){if(isCurrent()&&status?.isConnected)status.textContent='Ошибка: '+e.message}
}
async function pgSendMessage(){
 const field=$('pgMessageText'),button=$('pgSendMessage'),userId=session?.user?.id,offerId=pgActiveOffer,work=$('work');
 if(!field||!button||!userId||!offerId||serviceScreen!=='thread'||view!=='services'||button.disabled)return;
 const isCurrent=()=>field.isConnected&&$('pgMessageText')===field&&button.isConnected&&$('pgSendMessage')===button&&work?.isConnected&&$('work')===work&&session?.user?.id===userId&&pgActiveOffer===offerId&&serviceScreen==='thread'&&view==='services';
 const text=field.value.trim();if(!text){msg('Напишите сообщение',true);return}
 button.disabled=true;
 try{await call('/rest/v1/pitak_messages',{method:'POST',body:{offer_id:offerId,sender_id:userId,body:text}});if(!isCurrent())return;field.value='';await pgLoadThread();if(isCurrent())msg('Сообщение отправлено')}
 catch(e){if(isCurrent())msg('Сообщение: '+e.message,true)}finally{if(button.isConnected)button.disabled=false}
}
let pgDecisionBusy=false;
async function pgDecideOffer(id,yes){
 const userId=session?.user?.id,offerId=pgActiveOffer,work=$('work');
 if(pgDecisionBusy||!userId||!id||String(offerId)!==String(id)||serviceScreen!=='thread'||view!=='services'||!work)return;
 if(!confirm(yes?'Принять это предложение?':'Отклонить предложение?'))return;
 const isCurrent=()=>session?.user?.id===userId&&String(pgActiveOffer)===String(offerId)&&serviceScreen==='thread'&&view==='services'&&work.isConnected&&$('work')===work;
 pgDecisionBusy=true;const buttons=[$('pgAcceptOffer'),$('pgRejectOffer')].filter(Boolean);buttons.forEach(b=>b.disabled=true);
 try{await call('/rest/v1/rpc/decide_community_offer',{method:'POST',body:{p_offer:id,p_accept:yes}});if(!isCurrent())return;msg(yes?'Предложение принято':'Предложение отклонено');await pgLoadThread();if(isCurrent())pgPollInbox(true)}catch(e){if(isCurrent())msg(e.message,true)}finally{pgDecisionBusy=false;buttons.forEach(b=>{if(b.isConnected)b.disabled=false})}
}
const pgWithdrawBusy=new Set();
async function pgWithdrawOffer(id){
 const userId=session?.user?.id,offerId=pgActiveOffer,work=$('work');
 if(!id||!userId||String(offerId)!==String(id)||serviceScreen!=='thread'||view!=='services'||!work||pgWithdrawBusy.has(id)||!confirm('Отозвать предложение?'))return;
 const button=$('pgWithdrawOffer'),isCurrent=()=>session?.user?.id===userId&&String(pgActiveOffer)===String(offerId)&&serviceScreen==='thread'&&view==='services'&&work.isConnected&&$('work')===work;
 pgWithdrawBusy.add(id);if(button)button.disabled=true;
 try{await call('/rest/v1/rpc/withdraw_community_offer',{method:'POST',body:{p_offer:id}});if(!isCurrent())return;msg('Предложение отозвано');await pgLoadThread();if(isCurrent())pgPollInbox(true)}catch(e){if(isCurrent())msg(e.message,true)}finally{pgWithdrawBusy.delete(id);if(button?.isConnected)button.disabled=false}
}

// A separate, clearly labelled section for agreed rides via the Services marketplace.
// Does not pretend that a seat on a formal driver trip has been reserved.
async function pgShowAgreedRides(){
 const feed=$('feed'),userId=session?.user?.id;if(!feed||view!=='bookings'||!userId)return;
 let box=$('pgAgreedRides');if(!box){box=document.createElement('section');box.id='pgAgreedRides';box.className='card pg-agreed-rides';feed.prepend(box)}
 const isCurrent=()=>session?.user?.id===userId&&view==='bookings'&&feed.isConnected&&$('feed')===feed&&box.isConnected&&$('pgAgreedRides')===box;
 box.innerHTML='<h2>🤝 Согласованные поездки по пути</h2><p class="muted">Договорённости из раздела «Сервисы». Бронирование конкретного сиденья — отдельно.</p><p>Загружаем…</p>';
 try{
  const offers=await call('/rest/v1/rpc/my_community_inbox_v3',{method:'POST',body:{}});
  if(!isCurrent())return;
  const rides=offers.filter(o=>o.post_kind==='ride_offer'&&(o.offer_status==='accepted'||o.offer_status==='cancelled'));
  box.innerHTML='<h2>🤝 Согласованные поездки по пути</h2><p class="muted">Подтверждённые места и переписка с водителем.</p>'+(rides.length?rides.map(o=>`<div class="pg-agreed-item"><b>${esc(o.post_from)} → ${esc(o.post_to)}</b><span>${o.ride_booking_status==='confirmed'?'🎟️ Подтверждено '+Number(o.seats_requested||1)+' мест(а)':o.ride_booking_status==='cancelled'?'× Бронь отменена':'✓ Согласовано'}</span><p>${esc(o.post_title)}</p><button class="svc-outline" data-go-agreement="${o.offer_id}">💬 Открыть договорённость</button></div>`).join(''):'<p class="muted">Пока нет согласованных поездок по пути.</p>');
  box.querySelectorAll('[data-go-agreement]').forEach(b=>b.onclick=()=>{if(isCurrent())pgOpenOffer(b.dataset.goAgreement)});
 }catch(e){if(isCurrent())box.innerHTML='<h2>🤝 Согласованные поездки по пути</h2><p class="muted">Не удалось загрузить: '+esc(e.message)+'</p>'}
}

let pgCancelBusy=false;
async function pgCancelRideBooking(id){
 const userId=session?.user?.id,offerId=pgActiveOffer,work=$('work');
 if(pgCancelBusy||!userId||!id||String(offerId)!==String(id)||serviceScreen!=='thread'||view!=='services'||!work||!confirm('Отменить подтверждённую бронь? Места снова станут доступными другим пассажирам.'))return;
 const button=$('pgCancelRideBooking'),isCurrent=()=>session?.user?.id===userId&&String(pgActiveOffer)===String(offerId)&&serviceScreen==='thread'&&view==='services'&&work.isConnected&&$('work')===work;
 pgCancelBusy=true;if(button)button.disabled=true;
 try{await call('/rest/v1/rpc/cancel_community_ride_booking',{method:'POST',body:{p_offer:id}});if(!isCurrent())return;msg('Бронь отменена, места освобождены');await pgLoadThread();if(isCurrent())pgPollInbox(true)}catch(e){if(isCurrent())msg('Не удалось отменить: '+e.message,true)}finally{pgCancelBusy=false;if(button?.isConnected)button.disabled=false}
}

// Local-only demo: never writes trips, bookings, messages or money to the server.
let pgDemoState=null;
function pgDemoEntry(){return `<div class="pg-demo-entry"><span class="pg-demo-pill">ДЕМО · тестовый маршрут</span><h3>Посмотрите, как работает бронирование</h3><p>Машина, выбор места, стоимость, сообщения водителю и подтверждение — без реального заказа.</p><button type="button" id="pg-demo-open">▶ Попробовать демо-поездку</button></div>`}
function pgDemoStart(){pgDemoState={seat:0,price:85000,stage:'choose',messages:[]};pgDemoRender()}
function pgDemoClose(){const e=$('pg-demo-overlay');if(e)e.remove();pgDemoState=null}
function pgDemoRender(){if(!pgDemoState)return;let o=$('pg-demo-overlay');if(!o){o=document.createElement('div');o.id='pg-demo-overlay';o.className='pg-demo-overlay';document.body.appendChild(o)}
const st=pgDemoState;const routeFrom=pgFromQuery||'Иштихан',routeTo=pgToQuery||'Ташкент';
let content=`<div class="pg-demo-head"><span class="pg-demo-pill">ДЕМО · без реального заказа</span><button type="button" id="pg-demo-close" aria-label="Закрыть">×</button></div><h2>${esc(routeFrom)} → ${esc(routeTo)}</h2><p class="pg-demo-muted">🚕 Chevrolet Cobalt · водитель Азиз (пример) · 3 свободных места</p><div class="pg-demo-price"><span>Цена за место (пример)</span><strong>${st.price.toLocaleString('ru-RU')} сум</strong></div>`;
if(st.stage==='choose'){
content+=`<h3>Выберите место</h3><div class="pg-demo-seatgrid"><div class="pg-demo-driver">🚘<small>Водитель</small></div><button data-demo-seat="1" class="${st.seat===1?'selected':''}">1<small>Спереди</small></button><button data-demo-seat="2" class="${st.seat===2?'selected':''}">2<small>Сзади слева</small></button><div class="pg-demo-taken">3<small>Занято</small></div><button data-demo-seat="4" class="${st.seat===4?'selected':''}">4<small>Сзади справа</small></button></div><label>Имя пассажира<input id="pg-demo-name" placeholder="Ваше имя" autocomplete="off"></label><label>Телефон<input id="pg-demo-phone" type="tel" placeholder="+998 90 123 45 67"></label><button id="pg-demo-next" ${st.seat?'':'disabled'}>Продолжить</button>`;
}else if(st.stage==='chat'){
content+=`<div class="pg-demo-status">Место ${st.seat} выбрано · заявка ожидает согласования</div><h3>Обсуждение с водителем</h3><div class="pg-demo-chat"><p><b>Азиз · водитель (демо)</b><br>Здравствуйте! Отправление около 09:00. Цена ${st.price.toLocaleString('ru-RU')} сум за место.</p>${st.messages.map(m=>`<p class="pg-demo-mine">${esc(m)}</p>`).join('')}</div><div class="pg-demo-compose"><input id="pg-demo-message" placeholder="Написать водителю"><button id="pg-demo-send">➤</button></div><button id="pg-demo-confirm">✓ Подтвердить договорённость (демо)</button><button id="pg-demo-back" class="secondary">Назад к местам</button>`;
}else{content+=`<div class="pg-demo-success">✓ Бронирование подтверждено (демо)</div><p>Место №${st.seat}. Сумма: <b>${st.price.toLocaleString('ru-RU')} сум</b>.</p><p>В настоящем заказе водитель подтвердит бронь, а вы увидите статус в разделе «Поездки».</p><p class="pg-demo-muted">Это учебный сценарий: денег не списано, водитель не уведомлён, бронь не создана.</p><button id="pg-demo-finish">Завершить демо</button>`}
o.innerHTML=`<div class="pg-demo-dialog">${content}</div>`;
$('pg-demo-close').onclick=pgDemoClose;
o.querySelectorAll('[data-demo-seat]').forEach(b=>b.onclick=()=>{st.seat=Number(b.dataset.demoSeat);const name=$('pg-demo-name')?.value||'';const phone=$('pg-demo-phone')?.value||'';pgDemoRender();if($('pg-demo-name'))$('pg-demo-name').value=name;if($('pg-demo-phone'))$('pg-demo-phone').value=phone});
if($('pg-demo-next'))$('pg-demo-next').onclick=()=>{if(!st.seat)return;st.stage='chat';pgDemoRender()};
if($('pg-demo-send'))$('pg-demo-send').onclick=()=>{const m=$('pg-demo-message').value.trim();if(!m)return;st.messages.push(m);pgDemoRender()};
if($('pg-demo-confirm'))$('pg-demo-confirm').onclick=()=>{st.stage='done';pgDemoRender()};
if($('pg-demo-back'))$('pg-demo-back').onclick=()=>{st.stage='choose';pgDemoRender()};
if($('pg-demo-finish'))$('pg-demo-finish').onclick=pgDemoClose;
}
