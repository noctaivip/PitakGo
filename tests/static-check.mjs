import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const js = fs.readFileSync(new URL('../www/online.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/online.html', import.meta.url), 'utf8');
execFileSync(process.execPath, ['--check', new URL('../www/online.js', import.meta.url).pathname]);
for (const file of ['index.html', 'online.html', 'demo.html']) {
  const source = fs.readFileSync(new URL('../www/' + file, import.meta.url), 'utf8');
  let inlineIndex = 0;
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    assert.doesNotThrow(() => new vm.Script(match[2], { filename: file + ':inline-' + inlineIndex }), file + ' inline script syntax');
    inlineIndex++;
  }
}
for (const density of ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi']) {
  for (const icon of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    const path = new URL('../assets/android-icons/' + density + '/' + icon, import.meta.url);
    assert.ok(fs.existsSync(path), 'Android launcher icon exists: ' + density + '/' + icon);
    assert.deepEqual(fs.readFileSync(path).subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'Android launcher asset is a PNG: ' + density + '/' + icon);
  }
}

const declarations = [...js.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
const duplicates = declarations.filter((name, i) => declarations.indexOf(name) !== i);
assert.deepEqual(duplicates, [], 'duplicate top-level function declarations');

for (const id of ['homePitak', 'addKnownPitak', 'activePitak', 'from', 'to']) {
  assert.match(js, new RegExp(`'${id}'`), `driver picker ${id} is bound`);
  assert.match(js, new RegExp(`id="${id}Pick"`), `visible button ${id}Pick exists`);
}
assert.match(js, /pgSetupAutocomplete\(button\.id,\(\)=>pitaks,[\s\S]*?\},false\)/, 'driver buttons avoid duplicate auto-binding');
assert.match(js, /button\.onclick=e=>\{e\.preventDefault\(\);e\.stopPropagation\(\);open\(\)\}/, 'driver picker uses direct click handler');
assert.match(js, /function optionList\(selected=''\)\{const exists=pitaks\.some\(p=>p\.id===selected\)/, 'pitak selects include an explicit empty state');
assert.match(js, /if\(!home\)throw Error\('Выберите основной пятак'\)/, 'saving a vehicle requires a main pitak');
assert.match(js, /driverProfile\?\.work_status!=='ready'/, 'trip publishing requires ready status');
assert.match(js, /if\(from!==active\)throw Error\('Отправление должно совпадать с вашим рабочим пятаком'\)/, 'trip origin must match current working pitak');
assert.match(js, /if\(active!==driverProfile\?\.active_pitak_id\)throw Error\('Сначала нажмите «Готов к работе», чтобы сохранить выбранный рабочий пятак'\)/, 'trip publishing requires the selected working pitak to be saved server-side');
assert.ok(js.includes("'pg_recent_route_v1_'+session.user.id"), 'recent route is stored per signed-in account');
assert.match(js, /id=\"pgRepeatRoute\"[\s\S]*?pgApplyRecentRoute/, 'passenger can repeat the last booked route with one tap');
assert.match(js, /localStorage\.setItem\(key,JSON\.stringify\(\{fromId,toId,at:Date\.now\(\)\}\)\)/, 'only route IDs and timestamp are stored after a successful booking');
assert.match(js, /if\(mode==='passenger'&&view==='search'\)drawWork\(\);msg\('Бронь отправлена водителю/, 'recent route shortcut appears immediately after a successful booking');
assert.match(js, /if\(!name\)throw Error\('Введите ваше имя'\)/, 'booking requires passenger name');
assert.match(js, /phone\.replace\(\/\\D\/g,''\)\.length<7/, 'booking validates passenger phone');
assert.match(js, /const openTripIds=ts\.map\(t=>t\.id\),ownTripIds=ts\.filter\(t=>t\.driver_id===userId\)\.map\(t=>t\.id\)/, 'booking queries are scoped to the open trips and the account that started the refresh');
assert.match(js, /if\(openTripIds\.length\)bookingQueries\.push\(call\('[^']*'\+bookingFields\+'&trip_id=in\.\('/, 'passenger booking query is restricted to open trip IDs');
assert.ok(js.includes("&passenger_id=eq.'+encodeURIComponent(userId)"), 'passenger booking query is separately filtered to the account that started the refresh');
assert.match(js, /if\(ownTripIds\.length\)bookingQueries\.push/, 'driver booking query is restricted to the signed-in driver’s open trips');
assert.match(js, /const bookingMap=new Map\(\);for\(const rows of bookingResults\)for\(const b of rows\)bookingMap\.set\(b\.id,b\)/, 'overlapping booking query results are deduplicated');
assert.match(js, /id="livePitakRefresh"/, 'live pitak count has a manual refresh control');
assert.match(js, /let livePitakRequest=null;[\s\S]*?if\(!el\|\|livePitakRequest\?\.element===el\)return;[\s\S]*?const isCurrent=\(\)=>livePitakRequest\?\.token===requestToken&&el\.isConnected[\s\S]*?Обновлено:/, 'live pitak refresh prevents same-screen duplicates and ignores results for detached screens');
assert.match(js, /reloadSequence=0/, 'trip feed has a monotonically increasing reload sequence');
assert.match(js, /async function reload\(silent=false\)\{const requestId=\+\+reloadSequence,userId=session\?\.user\?\.id/, 'each feed refresh captures the account that started it');
assert.match(js, /const isCurrentReload=\(\)=>requestId===reloadSequence&&session\?\.user\?\.id===userId&&view!==.services./, 'stale feed responses cannot overwrite a newer screen or different account');
assert.match(js, /async function call\(path,opts\)\{const userId=session\?\.user\?\.id;try\{return await api\(path,opts\)\}catch\(e\)\{if\(e\.httpStatus===401\|\|\/JWT expired\|Invalid JWT\/i\.test\(e\.message\)\)\{if\(!session\|\|session\.user\?\.id!==userId\)throw e;if\(await refreshSession\(\)\)\{if\(session\?\.user\?\.id!==userId\)throw e;return api\(path,opts\)\}\}throw e\}\}/, 'expired-token retries cannot silently switch to a different signed-in account');
assert.match(js, /async function refreshSession\(\)\{const startingSession=session,userId=startingSession\?\.user\?\.id,refreshToken=startingSession\?\.refresh_token;[\s\S]*?if\(session\?\.user\?\.id!==userId\)return false;[\s\S]*?session\?\.refresh_token!==refreshToken\)return true;[\s\S]*?session===startingSession\)\{session=null;localStorage\.removeItem\('pg_online_auth'\)/, 'late refresh success/failure cannot overwrite or clear a newer session');
assert.match(js, /const bookingResults=await Promise\.all\(bookingQueries\);if\(!isCurrentReload\(\)\)return;const bookingMap/, 'stale feed refreshes stop after booking queries before making the next request');
assert.match(js, /if\(!isCurrentReload\(\)\)return;const occupiedByTrip/, 'feed results are checked after async queries before rendering');
assert.match(js, /catch\(e\)\{if\(isCurrentReload\(\)&&!silent\)msg\('Не удалось загрузить рейсы:/, 'stale feed errors do not replace current-screen messages');
assert.match(js, /function loginUI\(screen=.login.\)[\s\S]*?reloadSequence\+\+;lastBookingSnapshot=null/, 'entering authentication invalidates pending feed requests');
assert.match(js, /profileLogout.*?onclick=\(\)=>\{reloadSequence\+\+;lastBookingSnapshot=null/, 'logout invalidates pending feed requests and booking notifications');

assert.match(js, /const pgBookingBusy=new Set\(\)/, 'double-tap booking guard exists');
assert.match(js, /Все '\+totalSeats\+' места подтверждены — рейс готов к отправлению/, 'driver sees when every seat is confirmed');
assert.match(html, /\.pg-picker-field\{display:block/, 'picker wrappers are not labels');
assert.ok(js.includes("'&#39;'"), 'apostrophes in Uzbek names are escaped correctly');
assert.doesNotMatch(js, /service_role|sb_secret_/, 'no Supabase service-role/secret key in client JS');

assert.match(js, /const picker=document\.getElementById\('pg-location-overlay'\);[\s\S]*?if\(picker\)\{picker\.remove\(\);document\.body\.classList\.remove\('pg-picker-open'\);pgUpdateBack\(\);return;\}/, 'Android back closes the location picker before changing screens');
assert.match(js, /const demo=document\.getElementById\('pg-demo-overlay'\);[\s\S]*?if\(demo\)\{pgDemoClose\(\);pgUpdateBack\(\);return;\}/, 'back closes demo overlay before changing screens');
assert.match(js, /const welcome=document\.getElementById\('pgLaunchWelcome'\);[\s\S]*?if\(welcome\)\{welcome\.querySelector\('#pgLaunchClose'\)\?\.click\(\);pgUpdateBack\(\);return;\}/, 'back dismisses welcome dialog before changing screens');
assert.match(js, /search\.addEventListener\('keydown',e=>\{if\(e\.key==='Escape'\)\{e\.preventDefault\(\);e\.stopPropagation\(\);search\.blur\(\);close\(\)\}\}\)/, 'Escape closes picker without also triggering global navigation');

assert.match(js, /async function saveCar\(\)\{const actionButton=\$\('saveCar'\);if\(actionButton\?\.disabled\)return;/, 'saving the vehicle is protected from rapid repeat taps');
assert.match(js, /async function saveCar\(\)[\s\S]*?await loadProfile\(\);[\s\S]*?const cars=await call\('\/rest\/v1\/vehicles/, 'profile state is refreshed before vehicle persistence so retries avoid duplicate profile creation');
assert.match(js, /body:\{driver_id:uid,pitak_id:data\.home\}\}\)\.catch\(e=>\{if\(e\.code!=='23505'/, 'home pitak registration ignores only duplicate-link errors');
assert.match(js, /body:\{driver_id:uid,pitak_id:data\.second\}\}\)\.catch\(e=>\{if\(e\.code!=='23505'/, 'second pitak registration keeps retryable errors visible');
assert.match(js, /async function createTrip\(\)\{const actionButton=\$\('createTrip'\);if\(actionButton\?\.disabled\)return;/, 'publishing a trip is protected from rapid repeat taps');
assert.match(js, /const pgReplyBusy=new Set\(\),pgRepliesLoadSequence=new Map\(\);[\s\S]*?if\(!session\|\|!userId\|\|!form\|\|!button\|\|!feed\|\|form\.hidden\|\|pgReplyBusy\.has\(key\)\|\|view!==.services.\)return;/, 'service replies are protected from duplicate submissions and require the current authenticated form');
assert.match(js, /async function loadReplies\(id\)[\s\S]*?pgRepliesLoadSequence\.get\(key\)===requestId[\s\S]*?session\?\.user\?\.id===userId[\s\S]*?if\(isCurrent\(\)\)el\.textContent=/, 'stale community reply loads and errors cannot repaint another account or screen');
assert.match(js, /async function publishService\(kind=serviceSelected\)[\s\S]*?serviceSelected!==kind\|\|serviceKind!==kind[\s\S]*?author_id:userId,kind,/, 'community post publication is scoped to the exact selected service and starting account');
assert.match(js, /const now=new Date\(\);now\.setMinutes\(now\.getMinutes\(\)\+1-now\.getTimezoneOffset\(\)\);whenInput\.min=now\.toISOString\(\)\.slice\(0,16\)/, 'community requested date picker prevents selecting past local date-times');
assert.match(js, /const isCurrent=\(\)=>holder\.isConnected[\s\S]*?serviceScreen===screen&&view==='services'/, 'community seat-map results are scoped to the active feed and account');
assert.match(js, /raw!==''&&\(!Number\.isInteger\(Number\(raw\)\)\|\|Number\(raw\)<0\|\|Number\(raw\)>100000000\)/, 'service reply price is validated in JavaScript');
assert.match(js, /!Number\.isInteger\(\+price\)\|\|\+price<0\|\|\+price>100000000/, 'service publication price is a bounded integer');
assert.match(js, /if\(when&&\(!Number\.isFinite\(Date\.parse\(when\)\)\|\|Date\.parse\(when\)<=Date\.now\(\)\)\)throw Error\('Выберите дату и время в будущем'\)/, 'community posts reject invalid or past requested times');


assert.match(js, /const pgTripActionBusy=new Set\(\);[\s\S]*?async function closeTrip\(id\)\{if\(pgTripActionBusy\.has\(id\)\)return;/, 'trip close/cancel/delete actions share a duplicate-action guard');
assert.match(js, /async function setStatus\(status\)\{const actionButton=\$\(status==='ready'\?'ready':status==='resting'\?'rest':'offline'\);if\(actionButton\?\.disabled\)return;/, 'work status changes ignore rapid duplicate taps');

assert.match(js, /async function api\(path,\{method='GET',body,auth=true,headers:extraHeaders=\{\}\}=\{\}\)\{\s*const h=\{'apikey':KEY,'Content-Type':'application\/json',\.\.\.\(extraHeaders\|\|\{\}\)\}/, 'API helper preserves explicit request headers such as Prefer');


assert.match(js, /occupiedByTrip\.get\(r\.trip_id\)\.push\(Number\(r\.seat_number\)\)/, 'occupied seat values are normalized before availability checks');
assert.match(js, /function pgSeatMap\(total,occupied=\[\],selected=\[\],group='seat',editable=true\)\{[\s\S]*?occupied=Array\.isArray\(occupied\)\?occupied\.map\(Number\):\[\];selected=Array\.isArray\(selected\)\?selected\.map\(Number\):\[\];/, 'seat occupancy values are normalized to numbers');
assert.match(js, /root\.querySelectorAll\('\[data-seat-group\]'\)\.forEach\(el=>\{if\(el\.disabled\)return;/, 'seat selection preserves occupied/disabled seat styling');

assert.match(js, /const pgPitakRequestBusy=new Set\(\);[\s\S]*?if\(pgPitakRequestBusy\.has\(key\)\)return;[\s\S]*?button\.disabled=true/, 'new pitak request is protected from duplicate taps');
assert.match(js, /city\.length>100\|\|name\.length>120\|\|details\.length>500/, 'new pitak request fields have bounded lengths');
assert.match(js, /const pgPitakReviewBusy=new Set\(\);[\s\S]*?if\(!id\|\|pgPitakReviewBusy\.has\(id\)\)return;[\s\S]*?buttons\.forEach\(b=>b\.disabled=true\)/, 'admin pitak review actions are protected from duplicate taps');
assert.match(js, /const pollUserId=session\?\.user\?\.id;if\(!pollUserId\)return;[\s\S]*?const isCurrentPoll=\(\)=>session\?\.user\?\.id===pollUserId&&pgInboxPolling\?\.token===pollToken/, 'inbox poll results are scoped to the account and request that started them');
assert.match(js, /if\(!isCurrentPoll\(\)\)return;[\s\S]*?my_message_alerts/, 'stale inbox responses are discarded after account changes');
assert.match(js, /pgInboxPolling=null;pgInboxLoadSequence\+\+;pgThreadLoadSequence\+\+;pgRepliesLoadSequence\.clear\(\);stop\(\);stopGpsWatch\(\);session=null/, 'logout invalidates in-flight inbox polling before clearing the account');
assert.match(js, /async function pgSendMessage\(\)[\s\S]*?offerId=pgActiveOffer[\s\S]*?session\?\.user\?\.id===userId[\s\S]*?sender_id:userId,body:text[\s\S]*?if\(!isCurrent\(\)\)return/, 'message sending requires the active authenticated thread and ignores stale account responses');
assert.match(js, /const pgWithdrawBusy=new Set\(\);[\s\S]*?async function pgWithdrawOffer\(id\)[\s\S]*?pgWithdrawBusy\.has\(id\)[\s\S]*?button\.disabled=true[\s\S]*?pgWithdrawBusy\.delete\(id\)/, 'withdrawing a community offer is protected against repeat taps and restores the button');
assert.match(js, /const pgServiceActionBusy=new Set\(\);[\s\S]*?async function closeService\(id\)[\s\S]*?pgServiceActionBusy\.has\(key\)[\s\S]*?data-service-close[\s\S]*?async function deleteService\(id\)[\s\S]*?pgServiceActionBusy\.has\(key\)[\s\S]*?data-service-delete/, 'closing and deleting service posts are scoped to the owner and protected from duplicate actions');
assert.match(js, /async function closeService\(id\)[\s\S]*?const userId=session\?\.user\?\.id,screen=serviceScreen,feed=\$\('serviceList'\)[\s\S]*?session\?\.user\?\.id===userId&&serviceScreen===screen&&view===.services.[\s\S]*?if\(!isCurrent\(\)\)return/, 'closing a post ignores stale responses after account or screen changes');
assert.match(js, /async function deleteService\(id\)[\s\S]*?const userId=session\?\.user\?\.id,screen=serviceScreen,feed=\$\('serviceList'\)[\s\S]*?session\?\.user\?\.id===userId&&serviceScreen===screen&&view===.services.[\s\S]*?if\(!isCurrent\(\)\)return/, 'deleting a post ignores stale responses after account or screen changes');
assert.match(js, /async function pgShowAgreedRides\(\)[\s\S]*?userId=session\?\.user\?\.id[\s\S]*?const isCurrent=\(\)=>session\?\.user\?\.id===userId&&view===.bookings.[\s\S]*?if\(!isCurrent\(\)\)return/, 'agreed-ride list responses are scoped to the account and bookings screen');
assert.match(js, /let serviceScreen='home',[\s\S]*?serviceLoadSequence=0/ , 'service-feed requests have an independent sequence guard');
assert.match(js, /async function loadServices\(\)[\s\S]*?const requestId=\+\+serviceLoadSequence,userId=session\?\.user\?\.id,screen=serviceScreen[\s\S]*?const isCurrent=\(\)=>requestId===serviceLoadSequence&&session\?\.user\?\.id===userId&&el\.isConnected&&\$\('serviceList'\)===el&&serviceScreen===screen&&view===.services.[\s\S]*?if\(!isCurrent\(\)\)return;[\s\S]*?catch\(e\)\{if\(isCurrent\(\)\)/, 'stale service-feed responses and errors cannot repaint another account or screen');
assert.match(js, /pgThreadLoadSequence=0/, 'community chat loads use a request sequence');
assert.ok(js.includes("const el=$('pgInboxList'),userId=session?.user?.id,requestId=++pgInboxLoadSequence") && js.includes("session?.user?.id===userId&&el.isConnected&&serviceScreen==='inbox'"), 'inbox list refreshes are scoped to the active account and screen');
assert.match(js, /pgInboxPolling=null;pgInboxLoadSequence\+\+;pgThreadLoadSequence\+\+;pgRepliesLoadSequence\.clear\(\);stop\(\);stopGpsWatch\(\);session=null/, 'logout invalidates pending inbox-list requests');

assert.match(js, /async function pgLoadThread\(\)[\s\S]*?const requestId=\+\+pgThreadLoadSequence,id=pgActiveOffer,userId=session\.user\.id[\s\S]*?session\?\.user\?\.id===userId[\s\S]*?if\(!isCurrent\(\)\)return/, 'community chat loads cannot overwrite another account, offer or screen');
assert.match(js, /async function pgSendMessage\(\)[\s\S]*?offerId=pgActiveOffer[\s\S]*?sender_id:userId,body:text[\s\S]*?if\(!isCurrent\(\)\)return/, 'community chat sends use the starting account and avoid stale success feedback');

assert.match(js, /data-everyday=\"roadhelp\"[\s\S]*?data-everyday=\"tripplanner\"[\s\S]*?data-everyday=\"mycar\"/, 'services hub exposes roadside help, trip planning, and car-owner utilities');
assert.match(js, /function renderEverydayUtility\(\)[\s\S]*?navigator\.geolocation\.getCurrentPosition/, 'roadside help can request location only after a user action');
assert.match(js, /const isCurrent=\(\)=>b\.isConnected&&field\.isConnected&&\$\('pgRoadGps'\)===b&&\$\('pgRoadLocation'\)===field/, 'late GPS callbacks cannot overwrite a newly opened roadside-help form');
assert.match(js, /pgShareText\(lines\.join\('\\n'\)\)/, 'roadside request is shared by the user and is not falsely presented as dispatched');
assert.match(js, /pgLocalSave\('pg_trip_plan_v1',value\)/, 'trip plan can be saved locally on the device');
assert.match(js, /pgLocalSave\('pg_my_car_v1',value\)/, 'car details and service dates can be saved locally on the device');
assert.match(js, /if\(value\[key\]&&!pgValidLocalDate\(value\[key\]\)\)throw Error\(label\+' указана некорректно/, 'expired vehicle documents can be saved so overdue reminders remain visible');
assert.match(js, /Pitak Go пока не диспетчеризует эвакуаторы и механиков/, 'roadside-help screen is transparent that no live dispatch is connected');
assert.match(js, /function pgLocalDateString\(date=new Date\(\)\)/, 'local date input uses the device calendar date rather than UTC');
assert.match(js, /function pgValidLocalDate\(value\)[\s\S]*?date\.getUTCFullYear\(\)===y&&date\.getUTCMonth\(\)===m-1&&date\.getUTCDate\(\)===d/, 'local date validation rejects malformed and impossible calendar dates');
assert.match(js, /function pgValidatePlanDates\(value\)[\s\S]*?value\.returnDate<value\.date/, 'trip plans reject past dates and return dates before departure');
assert.match(js, /departure\.onchange=\(\)=>\{returning\.min=departure\.value\|\|pgLocalDateString\(\)/, 'return-date picker follows the selected departure date');
assert.match(js, /catch\(e\)\{pgShowLocalError\(e\)\}/, 'local save and validation failures are shown to the user');
assert.match(js, /function pgLocalSave\(key,value\)\{try\{localStorage\.setItem[\s\S]*?Не удалось сохранить данные на этом устройстве/, 'local storage write failures are surfaced instead of falsely claiming success');
assert.match(js, /const today=pgLocalDateString\(\),todayUtc=Date\.parse\(today\+'T00:00:00Z'\)/, 'vehicle reminder day counts avoid daylight-saving and local-time arithmetic errors');
assert.match(js, /Карта: https:\/\/maps\.google\.com/, 'GPS roadside request includes a shareable map link');
const localDateHelpers = js.match(/function pgLocalDateString\(date=new Date\(\)\)[\s\S]*?function pgShowLocalError\(error\)[\s\S]*?\n/,)?.[0];
assert.ok(localDateHelpers, 'local date validation helpers are available for behaviour tests');
const dateContext = vm.createContext({ Date });
vm.runInContext(localDateHelpers + `globalThis.dateTests = {
  valid: pgValidLocalDate('2028-02-29'),
  impossible: pgValidLocalDate('2027-02-29'),
  malformed: pgValidLocalDate('2027-2-03'),
  rejectsReturnBeforeDeparture: (() => { try { pgValidatePlanDates({date:'2099-06-12', returnDate:'2099-06-11'}); return false; } catch (e) { return /не может быть раньше/.test(e.message); } })(),
  rejectsPastDeparture: (() => { try { pgValidatePlanDates({date:'2000-01-01', returnDate:''}); return false; } catch (e) { return /сегодня или позже/.test(e.message); } })()
};`, dateContext);
assert.deepEqual(JSON.parse(JSON.stringify(dateContext.dateTests)), {valid:true, impossible:false, malformed:false, rejectsReturnBeforeDeparture:true, rejectsPastDeparture:true}, 'local date helpers handle leap days, malformed dates, and invalid trip ranges');

assert.match(js, /async function pgDecideOffer\(id,yes\)[\s\S]*?String\(offerId\)!==String\(id\)[\s\S]*?const isCurrent=\(\)=>session\?\.user\?\.id===userId[\s\S]*?if\(!isCurrent\(\)\)return/, 'accept/reject actions are scoped to the current account, offer and thread');
assert.match(js, /async function pgWithdrawOffer\(id\)[\s\S]*?String\(offerId\)!==String\(id\)[\s\S]*?if\(!isCurrent\(\)\)return/, 'withdrawing an offer cannot repaint a different account or thread after navigation');
assert.match(js, /async function pgCancelRideBooking\(id\)[\s\S]*?String\(offerId\)!==String\(id\)[\s\S]*?if\(!isCurrent\(\)\)return/, 'booking cancellation feedback is scoped to the originating account and thread');

console.log(`PitakGo static checks passed (${declarations.length} functions checked).`);

const setup = fs.readFileSync(new URL('../SETUP_ANDROID.ps1', import.meta.url), 'utf8');
assert.match(setup, /Test-Path \"node_modules\/\@capacitor\/core\"[\s\S]*?npm install[\s\S]*?npm install failed/, 'Android setup installs dependencies before Capacitor commands when needed');
