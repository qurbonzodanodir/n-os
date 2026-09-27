import {WorkspaceStore} from './src/store.js';
import {collections,id,day,iso,todayIn,emptyWorkspace,validate,toMinor,occurs,isDue,streak,completeTask,goalProgress,balance,totals,weekDays,migrateLegacy} from './src/domain.js';
import {translate} from './src/i18n.js';
import {icon} from './src/icons.js';
import {basmala,surahs,azkar,arabicLesson} from './src/islam-content.js';
const store=new WorkspaceStore();
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nav=['today','tasks','calendar','habits','islam','notes','goals','projects','finance','review','settings'];
const types={task:'tasks',event:'events',habit:'habits',note:'notes',goal:'goals',project:'projects',account:'accounts',transaction:'transactions',budget:'budgets'};
let view=nav.includes(location.hash.slice(1))?location.hash.slice(1):'today';
let selected=todayIn(),calendarMode='month',taskMode='list',taskFilter='all',noteFilter='active',projectFilter='',noteQuery='',financeMonth=selected.slice(0,7),reviewDate=selected;
let syncError='',toastTimer,undo=null,editing=null,focusBefore=null;
let deferredInstallPrompt=null;
let islamTab='prayer',prayerState={date:'',loading:false,error:false,data:null},prayerTimers=[];
const w=()=>store.data;
const t=k=>translate(w().settings.language,k);
const today=()=>todayIn(w().settings.timezone);
const dateLabel=(d,opts={day:'numeric',month:'short'})=>d?new Intl.DateTimeFormat(w().settings.language, {...opts,timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'—';
const money=(n,c=w().settings.currency)=>new Intl.NumberFormat(w().settings.language,{style:'currency',currency:c}).format(n/100);
const button=(label,action,value='',cls='btn',ico='')=>`<button type="button" class="${cls}" data-action="${action}" data-value="${esc(value)}">${ico?icon(ico):''}<span>${t(label)}</span></button>`;
const iconButton=(label,action,value='',ico=label)=>`<button type="button" class="btn icon-btn" data-action="${action}" data-value="${esc(value)}" aria-label="${t(label)}">${icon(ico)}</button>`;
const editButton=(type,row,content,cls='row-body')=>`<button type="button" class="${cls}" data-action="edit" data-type="${type}" data-id="${row.id}">${content}</button>`;
const empty=(type='task')=>`<div class="empty">${icon(types[type]||type)}<strong>${t('empty')}</strong><p>${t('emptyHint')}</p>${button('add','add',type,'btn','plus')}</div>`;
const head=(key,actionType)=>`<header class="hero"><div><div class="eyebrow">n-os / ${t('workspace')}</div><h1>${t(key)}</h1></div>${actionType?button('add','add',actionType,'btn primary','plus'):''}</header>`;
const cardHead=(key,target,ico=key)=>`<div class="card-head"><h2 class="card-title">${icon(ico)}${t(key)}</h2>${target?button('allItems','view',target,'text-btn','arrow'):''}</div>`;
const segments=(values,current,action)=>`<div class="segments">${values.map(v=>button(v,action,v,current===v?'active':'')).join('')}</div>`;
function navButton(v){return `<button type="button" data-action="view" data-value="${v}" class="${view===v?'active':''}" ${view===v?'aria-current="page"':''}>${icon(v)}<span>${t(v)}</span>${v==='tasks'?`<span class="count">${w().tasks.filter(t=>!['completed','cancelled'].includes(t.status)).length}</span>`:''}</button>`;}
function render(){
  const settings=w().settings; document.documentElement.lang=settings.language;
  document.documentElement.dataset.theme=settings.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):settings.theme;
  document.documentElement.dataset.reduced=settings.reducedTransparency;
  document.title=`${t(view)} · n-os`;
  $('#app').innerHTML=`<div class="shell"><aside class="sidebar glass"><a href="#today" class="brand"><span class="logo">n</span><span>n-<em>os</em></span></a><p class="section-label">${t('workspace')}</p><nav class="nav">${nav.map(navButton).join('')}</nav><div class="sidebar-foot"><p>${icon('lock')}${t('private')}</p><div class="profile"><span class="avatar">${esc((settings.name||'n').slice(0,2).toUpperCase())}</span><div><strong>${esc(settings.name||'n-os')}</strong><br><small>${t('workspace')}</small></div></div></div></aside><main class="main"><header class="topbar"><div class="breadcrumbs">${icon(view)}<span>${t(view)}</span></div><div class="mobile-brand"><span class="logo">n</span><span>n-os</span></div><div class="actions"><button class="btn search-trigger" data-action="search">${icon('search')}<span>${t('search')}</span><kbd>⌘ K</kbd></button><button class="btn" data-action="language" aria-label="${t('language')}">${settings.language==='ru'?'EN':'RU'}</button>${iconButton('theme','theme','',settings.theme==='dark'?'moon':'sun')}${iconButton('notifications','notifications','','bell')}${button('add','quick','','btn primary','plus')}</div></header><div class="sync">${icon('cloud')}<span>${t(store.busy?'saving':store.dirty?'retained':'cloud')}</span></div>${syncError?`<div class="error-banner" role="alert">${t(syncError)}<div class="actions">${button('export','export')}${button(store.conflict?'reload':'retry',store.conflict?'reload':'retry')}</div></div>`:''}<section id="content">${renderView()}</section></main></div><nav class="mobile-nav glass" aria-label="${t('workspace')}">${['today','tasks','calendar','notes'].map(v=>`<button data-action="view" data-value="${v}" class="${view===v?'active':''}">${icon(v)}${t(v)}</button>`).join('')}<button data-action="more" class="${!['today','tasks','calendar','notes'].includes(view)?'active':''}">${icon('more')}${t('more')}</button></nav>`;
  updateInstallPrompt();
}
function renderView(){return ({today:renderToday,tasks:renderTasks,calendar:renderCalendar,habits:renderHabits,islam:renderIslam,notes:renderNotes,goals:()=>renderLinks('goal'),projects:()=>renderLinks('project'),finance:renderFinance,review:renderReview,settings:renderSettings})[view]();}
function renderToday(){
  const date=today(),tasks=w().tasks.filter(x=>x.date===date&&x.status!=='cancelled'),done=tasks.filter(x=>x.status==='completed').length;
  const habits=w().habits.filter(h=>isDue(h,date)),checked=habits.filter(h=>h.completions.includes(date)).length;
  const total=tasks.length+habits.length,rate=total?Math.round((done+checked)/total*100):0;
  const events=w().events.filter(e=>occurs(e,date)).sort((a,b)=>a.time.localeCompare(b.time));
  const greeting=t('greeting')+(w().settings.name?', '+esc(w().settings.name):'');
  return `<header class="hero"><div><div class="eyebrow">${greeting}</div><h1>${t('heading')}</h1><p>${t('todaySub')}</p></div><div class="date-badge"><b>${dateLabel(date,{weekday:'long'})}</b><br>${dateLabel(date,{day:'numeric',month:'long',year:'numeric'})}</div></header>${collections.every(c=>w()[c].length===0)?`<div class="sample-banner glass"><p>${t('demoNotice')}</p>${button('demo','demo','','btn')}</div>`:''}<div class="dashboard"><div class="column"><article class="card glass momentum"><div><h2>${t('momentum')}</h2><p>${dateLabel(date,{weekday:'long',day:'numeric',month:'long'})}</p><div class="metrics"><div><strong>${done}/${tasks.length}</strong><small>${t('tasks')}</small></div><div><strong>${checked}/${habits.length}</strong><small>${t('habits')}</small></div><div><strong>${events.length}</strong><small>${t('calendar')}</small></div></div></div><div class="ring" style="--value:${rate}"><span>${rate}<small>%</small></span></div></article><article class="card glass">${cardHead('focus','tasks','tasks')}<div class="rows">${tasks.length?tasks.map(taskRow).join(''):empty('task')}</div></article><article class="card glass">${cardHead('schedule','calendar','calendar')}<div class="week-strip">${weekDays(date,w().settings.weekStart).map(d=>`<button class="date-tile ${d===date?'active':''}" data-action="open-date" data-value="${d}"><small>${dateLabel(d,{weekday:'short'})}</small><strong>${Number(d.slice(8))}</strong></button>`).join('')}</div><div class="rows">${events.length?events.map(eventRow).join(''):empty('event')}</div></article></div><div class="column"><article class="card glass">${cardHead('habits','habits')}<div class="rows">${habits.length?habits.map(h=>`<div class="row"><span class="habit-symbol">${icon('habits')}</span>${editButton('habit',h,`<strong>${esc(h.title)}</strong><small>${esc(h.goal||'')} · ${streak(h,date).current} ${t('days')}</small>`)}<button class="check ${h.completions.includes(date)?'done':''}" data-action="habit-check" data-id="${h.id}" data-value="${date}" aria-label="${t('checkIn')} ${esc(h.title)}">${h.completions.includes(date)?icon('check'):''}</button></div>`).join(''):empty('habit')}</div></article><article class="card glass">${cardHead('quickNotes','notes','notes')}<div class="note-tiles">${w().notes.filter(n=>!n.archived).sort((a,b)=>Number(b.pinned)-Number(a.pinned)).slice(0,2).map(n=>editButton('note',n,`<strong>${esc(n.title)}</strong><p>${esc(n.body)}</p>`,'note-tile')).join('')||empty('note')}</div></article><article class="card glass">${cardHead('goals','goals')}<div class="rows">${w().goals.slice(0,2).map(g=>`<div class="row">${editButton('goal',g,`<strong>${esc(g.title)}</strong><div class="bar"><i style="width:${goalProgress(w(),g)}%"></i></div><small>${goalProgress(w(),g)}%</small>`)}</div>`).join('')||empty('goal')}</div></article></div></div>`;
}
function taskRow(x){const overdue=x.date&&x.date<today()&&!['completed','cancelled'].includes(x.status);return `<div class="row ${x.status==='completed'?'done':''}"><button class="check ${x.status==='completed'?'done':''}" data-action="task-check" data-id="${x.id}" aria-label="${t('done')} ${esc(x.title)}">${x.status==='completed'?icon('check'):''}</button>${editButton('task',x,`<strong>${esc(x.title)}</strong><small class="${overdue?'overdue':''}">${x.date?dateLabel(x.date):''} ${esc(x.time||'')} · ${t(x.status)}${x.subtasks?.length?' · '+x.subtasks.filter(s=>s.done).length+'/'+x.subtasks.length:''}</small>`)}<span class="tag ${x.priority}">${t(x.priority||'medium')}</span></div>`;}
function eventRow(e){return `<div class="row"><time class="event-time">${esc(e.time)}</time><i class="event-line"></i>${editButton('event',e,`<strong>${esc(e.title)}</strong><small>${esc(e.time)}–${esc(e.endTime)}${e.location?' · '+esc(e.location):''}${e.repeat&&e.repeat!=='none'?' · '+t(e.repeat):''}</small>`)}</div>`;}
function renderTasks(){
  const filtered=w().tasks.filter(x=>(!projectFilter||x.projectId===projectFilter)&&(taskFilter==='all'||taskFilter==='today'&&x.date===today()||taskFilter==='upcoming'&&x.date>today()&&!['completed','cancelled'].includes(x.status)||taskFilter==='overdue'&&x.date<today()&&!['completed','cancelled'].includes(x.status)||taskFilter==='completed'&&x.status==='completed')).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  return head('tasks','task')+`<div class="toolbar">${segments(['list','board'],taskMode,'task-mode')}<select class="filter" id="task-filter" aria-label="${t('tasks')}">${['all','today','upcoming','overdue','completed'].map(v=>`<option value="${v}" ${v===taskFilter?'selected':''}>${t(v)}</option>`).join('')}</select><span class="spacer"></span><select class="filter" id="project-filter" aria-label="${t('project')}"><option value="">${t('projects')}: ${t('all')}</option>${w().projects.map(p=>`<option value="${p.id}" ${p.id===projectFilter?'selected':''}>${esc(p.title)}</option>`).join('')}</select></div>`+(taskMode==='list'?`<article class="card glass"><div class="rows">${filtered.length?filtered.map(taskRow).join(''):empty('task')}</div></article>`:`<div class="board">${['todo','progress','completed','cancelled'].map(status=>`<section class="board-col"><header><strong>${t(status)}</strong><span>${filtered.filter(x=>x.status===status).length}</span></header>${filtered.filter(x=>x.status===status).map(x=>`<article class="task-card glass">${editButton('task',x,`<span class="tag ${x.priority}">${t(x.priority)}</span><strong>${esc(x.title)}</strong><small>${dateLabel(x.date)}</small>`)}<div class="row"><small>${(x.subtasks||[]).filter(s=>s.done).length}/${(x.subtasks||[]).length}</small><button class="check ${x.status==='completed'?'done':''}" data-action="task-check" data-id="${x.id}" aria-label="${t('done')}">${x.status==='completed'?icon('check'):''}</button></div></article>`).join('')}</section>`).join('')}</div>`);
}
function agendaFor(date){const es=w().events.filter(e=>occurs(e,date)).sort((a,b)=>a.time.localeCompare(b.time));const tasks=w().tasks.filter(x=>x.date===date&&x.status!=='cancelled');return `<div class="agenda-head"><h3>${dateLabel(date,{weekday:'short',day:'numeric',month:'long'})}</h3>${iconButton('add','add-date',date,'plus')}</div><div class="rows">${es.map(eventRow).join('')}${tasks.map(taskRow).join('')}${!es.length&&!tasks.length?`<p class="meta" style="padding:18px 0">${t('empty')}</p>`:''}</div>`;}
function renderCalendar(){
 const current=new Date(selected+'T12:00:00Z'),start=selected.slice(0,8)+'01';
 const offset=(new Date(start+'T12:00:00Z').getUTCDay()-Number(w().settings.weekStart)+7)%7;
 const dates=Array.from({length:42},(_,i)=>day(start,i-offset));
 const controls=`<div class="toolbar">${segments(['month','week','day','agenda'],calendarMode,'calendar-mode')}<span class="spacer"></span>${button('today','calendar-today')}</div><div class="cal-header"><h2>${dateLabel(selected,{month:'long',year:'numeric'})}</h2><div class="actions">${iconButton('back','calendar-prev','','arrow')}${iconButton('next','calendar-next','','arrow')}</div></div>`;
 let content='';
 if(calendarMode==='month')content=`<div class="split"><article class="card glass">${controls}<div class="cal-grid">${dates.slice(0,7).map(d=>`<div class="weekday">${dateLabel(d,{weekday:'short'})}</div>`).join('')}${dates.map(d=>{const es=w().events.filter(e=>occurs(e,d));const tasks=w().tasks.filter(x=>x.date===d&&x.status!=='cancelled');return `<button data-action="date" data-value="${d}" class="cal-day ${d===selected?'selected':''} ${d===today()?'today':''} ${d.slice(0,7)!==start.slice(0,7)?'out':''}"><strong>${Number(d.slice(8))}</strong>${es.slice(0,2).map(e=>`<small>${esc(e.title)}</small>`).join('')}${tasks.length?`<small>${t('tasks')}: ${tasks.length}</small>`:''}</button>`;}).join('')}</div></article><aside class="card glass">${agendaFor(selected)}</aside></div>`;
 else if(calendarMode==='week')content=`<article class="card glass">${controls}<div class="week-columns">${weekDays(selected,w().settings.weekStart).map(d=>`<section class="week-column"><h3>${dateLabel(d,{weekday:'short',day:'numeric'})}</h3>${w().events.filter(e=>occurs(e,d)).map(e=>editButton('event',e,`<small>${esc(e.time)}</small><strong>${esc(e.title)}</strong>`,'event-block')).join('')}${w().tasks.filter(x=>x.date===d).map(x=>editButton('task',x,`<small>${t('task')}</small><strong>${esc(x.title)}</strong>`,'event-block')).join('')}${iconButton('add','add-date',d,'plus')}</section>`).join('')}</div></article>`;
 else content=`<article class="card glass">${controls}${Array.from({length:calendarMode==='day'?1:7},(_,i)=>agendaFor(day(selected,i))).join('')}</article>`;
 return head('calendar','event')+content;
}
function renderHabits(){const dates=Array.from({length:7},(_,i)=>day(today(),i-6));return head('habits','habit')+`<div class="cards">${w().habits.map(h=>{const s=streak(h,today());return `<article class="card glass habit-card"><div class="habit-top"><span class="habit-symbol">${icon('habits')}</span>${editButton('habit',h,`<strong>${esc(h.title)}</strong><small>${esc(h.goal||'')}</small>`)}</div><div class="habit-history">${dates.map(d=>`<div class="habit-date"><small>${dateLabel(d,{weekday:'short'})}</small><button class="check ${h.completions.includes(d)?'done':''}" data-action="habit-check" data-id="${h.id}" data-value="${d}" aria-label="${t('checkIn')} ${d}" ${!isDue(h,d)?'disabled':''}>${h.completions.includes(d)?icon('check'):'·'}</button></div>`).join('')}</div><div class="habit-stats"><span>${t('streak')}: ${s.current} ${t('days')}</span><span>${h.completions.length} ${t('checked').toLowerCase()}</span></div></article>`;}).join('')||empty('habit')}</div>`;}
const prayerNames={Fajr:'Фаджр',Dhuhr:'Зухр',Asr:'Аср',Maghrib:'Магриб',Isha:'Иша'};
function prayerMoment(date,time){return new Date(`${date}T${time}:00+05:00`);}
function nextPrayerInfo(){
 const data=prayerState.data;if(!data)return null;const now=new Date();
 for(const key of Object.keys(prayerNames)){const at=prayerMoment(data.date,data.timings[key]);if(at>now)return {key,at,time:data.timings[key]};}
 return null;
}
function countdown(at){const mins=Math.max(0,Math.ceil((at-new Date())/60000));return mins>=60?`${Math.floor(mins/60)} ч ${mins%60} мин`:`${mins} мин`;}
async function loadPrayerTimes(){
 const date=today();prayerState={date,loading:true,error:false,data:null};if(view==='islam')render();
 try{const response=await fetch(`/api/prayer-times?date=${date}`,{cache:'no-store'});if(!response.ok)throw Error('prayer');prayerState={date,loading:false,error:false,data:await response.json()};schedulePrayerNotifications();}
 catch{prayerState={date,loading:false,error:true,data:null};}
 if(view==='islam')render();
}
function schedulePrayerNotifications(){
 for(const timer of prayerTimers)clearTimeout(timer);prayerTimers=[];
 if(!w().islam.settings.notifications||typeof Notification==='undefined'||Notification.permission!=='granted'||!prayerState.data)return;
 const lead=Number(w().islam.settings.reminderMinutes)||15;
 for(const key of Object.keys(prayerNames)){const delay=prayerMoment(prayerState.data.date,prayerState.data.timings[key])-new Date()-lead*60000;if(delay>0&&delay<86400000)prayerTimers.push(setTimeout(()=>new Notification(`${prayerNames[key]} через ${lead} мин`,{body:`Время намаза: ${prayerState.data.timings[key]} · Душанбе`,icon:'/icon-192.png',tag:`n-os-${prayerState.data.date}-${key}`}),delay));}
}
function renderIslam(){
 if(prayerState.date!==today()&&!prayerState.loading)setTimeout(loadPrayerTimes,0);
 const learned=Object.values(w().islam.surahProgress).filter(Boolean).length;
 const top=`<header class="hero islam-heading"><div><div class="eyebrow">n-os / ${t('workspace')}</div><h1>${t('islam')}</h1><p>${t('islamSub')}</p></div><div class="islam-progress"><strong>${learned}/${surahs.length}</strong><small>${t('surahs')} · ${t('learned').toLowerCase()}</small></div></header><div class="islam-tabs">${segments(['prayer','surahs','azkar','arabicStudy'],islamTab,'islam-tab')}</div>`;
 return top+(islamTab==='prayer'?renderPrayerTab():islamTab==='surahs'?renderSurahsTab():islamTab==='azkar'?renderAzkarTab():renderArabicTab());
}
function renderPrayerTab(){
 if(prayerState.loading)return `<article class="card glass islam-loading">${icon('islam')}<p>${t('loading')}</p></article>`;
 if(prayerState.error)return `<article class="card glass islam-loading"><p>${t('prayerLoadError')}</p>${button('retry','prayer-retry')}</article>`;
 const data=prayerState.data,next=nextPrayerInfo(),date=today(),done=w().islam.prayerLogs[date]||[];
 if(!data)return '';
 return `<section class="prayer-hero glass"><div><span class="eyebrow">${t('nextPrayer')}</span><h2>${next?prayerNames[next.key]:'—'}</h2><p>${next?`${next.time} · ${countdown(next.at)}`:t('completed')}</p></div><div class="prayer-meta"><strong>${t('dushanbe')}</strong><span>${data.hijri||date}</span><small>${t('hanafi')}</small></div></section><div class="prayer-toolbar"><p>${t('calculatedTimes')}</p><div class="actions"><label class="reminder-select">${t('remindBefore')} <select id="prayer-reminder">${[5,10,15,30].map(n=>`<option value="${n}" ${Number(w().islam.settings.reminderMinutes)===n?'selected':''}>${n} ${t('minutes')}</option>`).join('')}</select></label>${button(w().islam.settings.notifications?'notifications':'enablePrayerReminders','prayer-notifications','','btn','bell')}</div></div><div class="prayer-grid">${Object.entries(prayerNames).map(([key,name])=>`<article class="card glass prayer-card ${done.includes(key)?'complete':''}"><span class="prayer-orb">${icon(key==='Fajr'?'sun':'islam')}</span><div><small>${t('prayer')}</small><h3>${name}</h3></div><time>${data.timings[key]}</time><button class="check ${done.includes(key)?'done':''}" data-action="prayer-check" data-value="${key}" aria-label="${t('prayed')} ${name}">${done.includes(key)?icon('check'):''}</button></article>`).join('')}</div><p class="islam-note">${t('notificationOpen')}</p>`;
}
function renderSurahsTab(){return `<div class="surah-intro glass"><div class="arabic" dir="rtl" lang="ar">${basmala.arabic}</div><strong>${basmala.tajik}</strong><p>${basmala.russian}</p></div><p class="islam-note">${t('phoneticNote')}</p><div class="surah-grid">${surahs.map(s=>`<button class="card glass surah-card" data-action="open-surah" data-value="${s.id}"><span class="surah-number">${s.number}</span><div><h3>${s.name}</h3><small>${s.verses.length} ${t('verse').toLowerCase()}</small></div><strong class="arabic" dir="rtl" lang="ar">${s.arabicName}</strong>${w().islam.surahProgress[s.id]?`<span class="learned-badge">${icon('check')} ${t('learned')}</span>`:''}</button>`).join('')}</div>`;}
function openSurah(id){const s=surahs.find(x=>x.id===id);if(!s)return;showDialog(`${s.number}. ${s.name}`,`<div class="surah-reader"><div class="reading-key"><span>${t('originalArabic')}</span><span>${t('tajikReading')}</span><span>${t('russianMeaning')}</span></div>${s.verses.map((v,i)=>`<section class="verse"><span class="verse-number">${i+1}</span><p class="arabic" dir="rtl" lang="ar">${v.arabic}</p><p class="tajik">${v.tajik}</p><p class="meaning">${v.russian}</p></section>`).join('')}<p class="islam-note">${t('phoneticNote')}</p><div class="form-footer">${button(w().islam.surahProgress[s.id]?'learned':'markLearned','surah-learned',s.id,'btn primary','check')}</div></div>`);}
function renderAzkarTab(){const counts=w().islam.azkar[today()]||{};return `<div class="azkar-grid">${azkar.map(z=>{const n=counts[z.id]||0,p=Math.min(100,n/z.target*100);return `<article class="card glass zikr-card"><div class="arabic" dir="rtl" lang="ar">${z.arabic}</div><h3>${z.tajik}</h3><p>${z.russian}</p><button data-action="zikr-count" data-value="${z.id}" class="zikr-counter" style="--value:${p}"><strong>${n}</strong><small>/ ${z.target}</small></button></article>`;}).join('')}</div><div class="islam-actions">${button('reset','zikr-reset')}</div>`;}
function renderArabicTab(){const done=w().islam.arabicLessons[arabicLesson.id];return `<article class="card glass arabic-lesson"><div class="lesson-head"><div><span class="eyebrow">${t('lesson')} 1</span><h2>${arabicLesson.title}</h2></div>${done?`<span class="learned-badge">${icon('check')} ${t('lessonComplete')}</span>`:''}</div><div class="letter-grid">${arabicLesson.letters.map(x=>`<div class="letter-card"><strong lang="ar">${x.letter}</strong><h3>${x.name}</h3><small>${x.sound}</small></div>`).join('')}</div><p class="islam-note">Произносите медленно и повторяйте каждую букву 5 раз.</p><div class="form-footer">${button(done?'lessonComplete':'completeLesson','arabic-complete',arabicLesson.id,'btn primary','check')}</div></article>`;}
function renderNotes(){const notes=w().notes.filter(n=>(noteFilter==='archived'?n.archived:!n.archived)&&(noteFilter!=='pinned'||n.pinned)&&(!noteQuery||`${n.title} ${n.body} ${n.tags} ${n.folder}`.toLowerCase().includes(noteQuery.toLowerCase())));return head('notes','note')+`<div class="toolbar">${segments(['active','pinned','archived'],noteFilter,'note-filter')}<span class="spacer"></span><input class="filter" id="note-query" placeholder="${t('search')}" value="${esc(noteQuery)}" aria-label="${t('search')}"></div><div class="cards">${notes.map(n=>`<button class="card glass note-card" data-action="edit" data-type="note" data-id="${n.id}" data-color="${esc(n.color)}"><span class="meta">${n.pinned?icon('pin'):icon('notes')} ${esc(n.folder||'')}</span><h3>${esc(n.title)}</h3><div class="snippet">${esc(n.body)}</div><footer>${(n.tags||'').split(',').filter(Boolean).map(tag=>`<span class="tag">${esc(tag.trim())}</span>`).join('')}<small>${dateLabel(n.updatedAt||n.createdAt)}</small></footer></button>`).join('')||empty('note')}</div>`;}
function renderLinks(type){const list=w()[types[type]];return head(types[type],type)+`<div class="cards">${list.map(r=>{const tasks=w().tasks.filter(x=>(type==='goal'?x.goalId:x.projectId)===r.id);const rate=type==='goal'?goalProgress(w(),r):tasks.length?Math.round(tasks.filter(x=>x.status==='completed').length/tasks.length*100):0;return `<article class="card glass project-card">${editButton(type,r,`<span class="tag">${t(type)}</span><h3 style="margin-top:15px">${esc(r.title)}</h3><p>${esc(r.description||'')}</p><small>${dateLabel(r.date)}</small>`)}<div class="bar"><i style="width:${rate}%"></i></div><div class="actions"><small>${tasks.filter(x=>x.status==='completed').length}/${tasks.length} ${t('tasks').toLowerCase()}</small><span class="spacer"></span><strong>${rate}%</strong></div>${(r.milestones||[]).map((s,i)=>`<div class="milestone"><button class="check ${s.done?'done':''}" data-action="milestone" data-id="${r.id}" data-value="${i}" aria-label="${esc(s.title)}">${s.done?icon('check'):''}</button>${esc(s.title)}</div>`).join('')}${type==='project'?button('tasks','project-tasks',r.id,'text-btn','arrow'):''}</article>`;}).join('')||empty(type)}</div>`;}
function renderFinance(){const currency=w().settings.currency,summary=totals(w(),financeMonth,currency),sum=w().accounts.filter(a=>a.currency===currency).reduce((s,a)=>s+balance(w(),a),0);const tx=w().transactions.filter(x=>x.date.startsWith(financeMonth)).sort((a,b)=>b.date.localeCompare(a.date));return head('finance','transaction')+`<div class="toolbar"><input type="month" class="filter" id="finance-month" value="${financeMonth}" aria-label="${t('month')}"><span class="spacer"></span>${button('account','add','account','btn','plus')}${button('budget','add','budget','btn','plus')}</div><div class="stat-grid">${[['balance',sum],['income',summary.income],['expense',summary.expense]].map(([k,n])=>`<article class="card glass stat"><small>${t(k)} · ${currency}</small><strong>${money(n)}</strong></article>`).join('')}</div><div class="account-list">${w().accounts.map(a=>editButton('account',a,`<small>${esc(a.title)} · ${a.currency}</small><strong>${money(balance(w(),a),a.currency)}</strong>`,'card glass account-card')).join('')}</div><div class="finance-grid"><article class="card glass">${cardHead('transaction',null,'finance')}<div class="rows">${tx.map(x=>{const account=w().accounts.find(a=>a.id===x.accountId);return `<div class="row">${editButton('transaction',x,`<strong>${esc(x.title||x.category||t(x.kind))}</strong><small>${dateLabel(x.date)} · ${esc(account?.title)} · ${t(x.kind)}</small>`)}<span class="tx-amount ${x.kind}">${x.kind==='income'?'+':x.kind==='expense'?'−':''}${money(x.amount,account?.currency)}</span></div>`;}).join('')||empty('transaction')}</div></article><aside class="card glass">${cardHead('budget',null,'goals')}<div class="rows">${w().budgets.filter(b=>b.monthKey===financeMonth).map(b=>{const spent=w().transactions.filter(x=>x.kind==='expense'&&x.date.startsWith(b.monthKey)&&x.category===b.category&&w().accounts.find(a=>a.id===x.accountId)?.currency===b.currency).reduce((s,x)=>s+x.amount,0);return `<div class="row">${editButton('budget',b,`<strong>${esc(b.title)}</strong><small>${esc(b.category)} · ${money(spent,b.currency)} / ${money(b.amount,b.currency)}</small><div class="bar"><i style="width:${Math.min(100,spent/b.amount*100)}%"></i></div><small>${t('remaining')}: ${money(b.amount-spent,b.currency)}</small>`)}</div>`;}).join('')||empty('budget')}</div></aside></div>`;}
function renderReview(){const dates=weekDays(reviewDate,w().settings.weekStart),start=dates[0],end=dates[6];const counts=dates.map(d=>w().tasks.filter(x=>x.completedAt===d&&x.status==='completed').length);const max=Math.max(1,...counts);let checked=0,due=0;for(const h of w().habits)for(const d of dates.filter(d=>d<=today()))if(isDue(h,d)){due++;if(h.completions.includes(d))checked++;}const reflection=w().reviews.find(r=>r.week===start)||{};return head('review')+`<div class="toolbar">${button('back','review-prev')}${button('next','review-next')}<span class="meta">${dateLabel(start)} — ${dateLabel(end)}</span><span class="spacer"></span><span class="tag">${t('actualData')}</span></div><div class="stat-grid"><article class="card glass stat"><small>${t('completed')}</small><strong>${counts.reduce((a,b)=>a+b,0)}</strong></article><article class="card glass stat"><small>${t('consistency')}</small><strong>${due?Math.round(checked/due*100):0}%</strong></article><article class="card glass stat"><small>${t('notes')}</small><strong>${w().notes.filter(n=>n.createdAt>=start&&n.createdAt<=end).length}</strong></article></div><div class="settings-grid"><article class="card glass pad"><h2>${t('weeklyProgress')}</h2><div class="review-chart">${counts.map((n,i)=>`<div class="chart-column"><small>${n}</small><i style="height:${n/max*125}px"></i><small>${dateLabel(dates[i],{weekday:'short'})}</small></div>`).join('')}</div></article><article class="card glass pad"><h2>${t('reflection')}</h2><form id="reflection-form" data-week="${start}">${['wins','improve','nextFocus'].map(k=>`<div class="field"><label for="${k}">${t(k)}</label><textarea name="${k}" id="${k}">${esc(reflection[k]||'')}</textarea></div>`).join('')}<div class="form-footer">${button('save','save-reflection','','btn primary')}</div></form></article></div>`;}
function renderSettings(){const s=w().settings;return head('settings')+`<form id="settings-form"><div class="settings-grid"><article class="card glass"><h2>${t('preferences')}</h2>${field('name',s.name)}${field('timezone',s.timezone,'select',['Asia/Dushanbe','UTC','Europe/Berlin','Europe/London','America/New_York'])}${field('currency',s.currency,'select',['TJS','USD','EUR','RUB','CNY'])}${field('weekStart',String(s.weekStart),'select',[['1','monday'],['0','sunday']])}</article><article class="card glass"><h2>${t('appearance')}</h2>${field('language',s.language,'select',[['ru','Русский'],['en','English']])}${field('theme',s.theme,'select',['light','dark','system'])}${checkField('reducedTransparency',s.reducedTransparency,'glass')}<div class="form-footer">${button('save','save-settings','','btn primary')}</div></article></div></form><article class="card glass pad install-card" style="margin-top:18px"><div><h2>${t('installApp')}</h2><p class="meta">${installMessage()}</p></div>${installButton()}</article><article class="card glass pad" style="margin-top:18px"><h2>${t('data')}</h2><p class="meta" style="margin-top:10px">${t('syncNote')}</p><div class="data-actions">${button('export','export','','btn','download')}${button('import','import')}${hasLegacy()?button('migrate','migrate'):''}</div></article>`;}

const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
function installMessage(){return t(isStandalone()?'installedApp':isIOS()?'installIOS':deferredInstallPrompt?'installText':'installUnavailable');}
function installButton(){return !isStandalone()&&deferredInstallPrompt?button('installApp','install-app','','btn primary','download'):'';}
function updateInstallPrompt(){
 const prompt=$('#install-prompt');if(!prompt)return;
 const dismissed=sessionStorage.getItem('n-os-install-dismissed')==='1';
 if(isStandalone()||dismissed||(!deferredInstallPrompt&&!isIOS())){prompt.hidden=true;return;}
 prompt.innerHTML=`<div class="install-mark">n</div><div><strong>${t('installApp')}</strong><p>${t(isIOS()?'installIOS':'installText')}</p></div><div class="install-actions">${deferredInstallPrompt?button('installApp','install-app','','btn primary','download'):''}${button('later','dismiss-install','','text-btn')}</div>`;
 prompt.hidden=false;
}

function field(name,value='',type='text',options=[],full=false,required=false,label=name){
 const attr=`id="field-${name}" name="${name}" ${required?'required':''}`;
 let control=type==='textarea'?`<textarea ${attr} maxlength="50000">${esc(value)}</textarea>`:type==='select'?`<select ${attr}>${options.map(opt=>{const [v,l]=Array.isArray(opt)?opt:[opt,opt];return `<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(t(l))}</option>`;}).join('')}</select>`:`<input ${attr} type="${type}" value="${esc(value)}" ${type==='text'?'maxlength="250"':''} ${type==='number'?'min="0" step="1"':''}>`;
 return `<div class="field ${full?'full':''}"><label for="field-${name}">${t(label)}</label>${control}</div>`;
}
function checkField(name,value,label=name){return `<label class="check-field"><input type="checkbox" name="${name}" ${value?'checked':''}>${t(label)}</label>`;}
const linkedFields=(r)=>field('projectId',r.projectId||'','select',[['','none'],...w().projects.map(p=>[p.id,p.title])],false,false,'project')+field('goalId',r.goalId||'','select',[['','none'],...w().goals.map(g=>[g.id,g.title])],false,false,'goal');
function showDialog(title,body){focusBefore=document.activeElement;const d=$('#dialog');d.innerHTML=`<header class="dialog-head"><h2 id="dialog-title">${title}</h2>${iconButton('close','close','','close')}</header><div class="dialog-body">${body}</div>`;if(!d.open)d.showModal();setTimeout(()=>d.querySelector('input:not([type=checkbox]),textarea')?.focus(),0);}
function closeDialog(){ $('#dialog').close();editing=null;focusBefore?.focus?.(); }
function openEditor(type,itemId=null){
 if(['transaction','budget'].includes(type)&&!w().accounts.length){toast(t('accountNeeded'));type='account';itemId=null;}
 const item=itemId?w()[types[type]].find(r=>r.id===itemId):null;if(itemId&&!item)return;
 editing={type,id:itemId};const r=item||{},date=r.date||selected,repeat=['none','daily','weekly','monthly'];
 let fields=field('title',r.title||'','text',[],true,type!=='transaction');
 if(type==='task')fields+=field('description',r.description||'','textarea',[],true)+field('date',date,'date',[],false,true)+field('time',r.time||'09:00','time')+field('status',r.status||'todo','select',['todo','progress','completed','cancelled'])+field('priority',r.priority||'medium','select',['low','medium','high','urgent'])+linkedFields(r)+field('repeat',r.repeat||'none','select',repeat)+field('tags',r.tags||'')+field('subtasks',(r.subtasks||[]).map(s=>(s.done?'[x] ':'[ ] ')+s.title).join('\n'),'textarea',[],true);
 if(type==='event')fields+=field('description',r.description||'','textarea',[],true)+field('date',date,'date',[],false,true)+field('location',r.location||'')+field('time',r.time||'09:00','time',[],false,true)+field('endTime',r.endTime||'10:00','time',[],false,true)+field('repeat',r.repeat||'none','select',repeat)+field('repeatUntil',r.repeatUntil||'','date')+field('reminder',r.reminder||0,'number')+field('taskId',r.taskId||'','select',[['','none'],...w().tasks.map(x=>[x.id,x.title])],false,false,'task')+linkedFields(r);
 if(type==='habit')fields+=field('goal',r.goal||'','text',[],false,false,'target')+field('startDate',r.startDate||today(),'date',[],false,true)+field('endDate',r.endDate||'','date')+`<div class="field full"><label>${t('weekdays')}</label><div class="actions" style="flex-wrap:wrap">${[1,2,3,4,5,6,0].map((d,i)=>`<label class="check-field"><input type="checkbox" name="weekday" value="${d}" ${!r.weekdays?.length||r.weekdays.includes(d)?'checked':''}>${dateLabel(day('2026-09-21',i),{weekday:'short'})}</label>`).join('')}</div></div>`+linkedFields(r);
 if(type==='note')fields+=field('body',r.body||'','textarea',[],true)+field('folder',r.folder||'')+field('tags',r.tags||'')+field('color',r.color||'blue','select',['blue','violet','rose','green'])+`<div class="field">${checkField('pinned',r.pinned)}${checkField('archived',r.archived)}</div>`+linkedFields(r);
 if(['goal','project'].includes(type))fields+=field('description',r.description||'','textarea',[],true)+field('date',r.date||today(),'date')+field('color',r.color||'blue','select',['blue','violet','rose','green'])+(type==='goal'?field('milestones',(r.milestones||[]).map(s=>(s.done?'[x] ':'[ ] ')+s.title).join('\n'),'textarea',[],true):'');
 if(type==='account')fields+=field('opening',r.opening===undefined?'0':(r.opening/100).toFixed(2))+field('currency',r.currency||w().settings.currency,'select',['TJS','USD','EUR','RUB','CNY']);
 if(type==='transaction')fields+=field('kind',r.kind||'expense','select',['expense','income','transfer'])+field('amount',r.amount?(r.amount/100).toFixed(2):'','text',[],false,true)+field('date',date,'date',[],false,true)+field('category',r.category||'')+field('accountId',r.accountId||w().accounts[0]?.id,'select',w().accounts.map(a=>[a.id,a.title+' · '+a.currency]))+field('toAccountId',r.toAccountId||'','select',[['','none'],...w().accounts.map(a=>[a.id,a.title+' · '+a.currency])]);
 if(type==='budget')fields+=field('category',r.category||'','text',[],false,true)+field('amount',r.amount?(r.amount/100).toFixed(2):'','text',[],false,true)+field('monthKey',r.monthKey||financeMonth,'month',[],false,true)+field('currency',r.currency||w().settings.currency,'select',['TJS','USD','EUR','RUB','CNY']);
 const extra=item&&type==='project'?`<div class="form-links">${button('tasks','project-tasks',item.id,'text-btn','arrow')}${w().notes.filter(n=>n.projectId===item.id).map(n=>editButton('note',n,esc(n.title),'text-btn')).join('')}${w().events.filter(e=>e.projectId===item.id).map(e=>editButton('event',e,esc(e.title),'text-btn')).join('')}</div>`:'';
 showDialog(t(item?'edit':'add')+' · '+t(type),`<form id="item-form"><div class="form-grid">${fields}</div>${type==='event'?`<p class="form-note">${t('seriesEdit')} ${t('reminderNote')}</p>`:''}${extra}<p class="form-error" role="alert"></p><div class="form-footer">${item?button('delete','delete',type,'btn danger'):''}${type==='note'?button('preview','note-preview'):''}${button('cancel','close')}<button type="submit" class="btn primary">${t('save')}</button></div></form>`);
}
function lines(text){return String(text||'').split('\n').map(s=>s.trim()).filter(Boolean).map(s=>({title:s.replace(/^\[[ xX]\]\s*/,''),done:/^\[[xX]\]/.test(s)}));}
async function submitItem(form){
 if(!form.reportValidity()||!editing)return;
 const values=new FormData(form),data=Object.fromEntries(values),{type}=editing;let itemId=editing.id;
 const old=itemId?w()[types[type]].find(r=>r.id===itemId):null;
 try{
  data.title=(data.title||'').trim();if(type!=='transaction'&&!data.title)throw Error('invalid');
  if(type==='task'){data.subtasks=lines(data.subtasks);data.completedAt=data.status==='completed'?(old?.completedAt||today()):null;}
  if(type==='event'){if(data.endTime<=data.time)throw Error('endError');if(data.repeatUntil&&data.repeatUntil<data.date)throw Error('invalid');data.reminder=Number(data.reminder);}
  if(type==='habit'){data.weekdays=values.getAll('weekday').map(Number);if(!data.weekdays.length)throw Error('invalid');if(data.endDate&&data.endDate<data.startDate)throw Error('invalid');data.completions=old?.completions||[];}
  if(type==='note'){data.pinned=values.has('pinned');data.archived=values.has('archived');}
  if(type==='goal')data.milestones=lines(data.milestones);
  if(type==='account'){
   data.opening=toMinor(data.opening);
   if(old&&old.currency!==data.currency&&w().transactions.some(x=>x.accountId===old.id||x.toAccountId===old.id))throw Error('accountUsed');
  }
  if(['transaction','budget'].includes(type)){data.amount=toMinor(data.amount);if(data.amount<=0)throw Error('amountError');}
  if(type==='transaction'&&data.kind==='transfer'){const a=w().accounts.find(a=>a.id===data.accountId),b=w().accounts.find(a=>a.id===data.toAccountId);if(!b||a.id===b.id||a.currency!==b.currency)throw Error('transferError');}
  const next=structuredClone(w());const r={...old,...data,id:itemId||id(),createdAt:old?.createdAt||today(),updatedAt:today()};
  if(itemId)next[types[type]]=next[types[type]].map(x=>x.id===itemId?r:x);else next[types[type]].push(r);
  validate(next);store.data=next;editing.id=r.id;
  if(await persist()){closeDialog();toast(t('saved'));}
 }catch(e){$('.form-error',form).textContent=t(e.message==='amount'?'amountError':e.message in {endError:1,invalid:1,accountUsed:1,transferError:1,amountError:1}?e.message:'invalid');}
}
async function persist(){
 try{syncError='';await store.save();render();return true;}
 catch(e){syncError=e.message==='conflict'?'conflict':'saveError';render();const error=$('.form-error');if(error)error.textContent=t(syncError);return false;}
}
function toast(message,withUndo=false){clearTimeout(toastTimer);$('#toast').innerHTML=esc(message)+(withUndo?button('undo','undo','','text-btn'):'');$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),withUndo?12000:4000);}
function go(v){if(!nav.includes(v))return;view=v;history.pushState(null,'','#'+v);if($('#dialog').open)closeDialog();render();window.scrollTo(0,0);}
function exportData(){const blob=new Blob([JSON.stringify(w(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`n-os-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function hasLegacy(){try{return !!localStorage.getItem('nodir-os-v1');}catch{return false;}}
async function importData(file){try{if(file.size>1500000)throw Error();const data=validate(JSON.parse(await file.text()));showDialog(t('import'),`<p>${t('importAsk')}</p><div class="form-footer">${button('export','export')}${button('cancel','close')}${button('import','confirm-import','','btn primary')}</div>`);pendingImport=data;}catch{toast(t('fileError'));}}
let pendingImport=null;
function markdown(text){
 const safe=esc(text||'');const blocks=[];let html=safe.replace(/```[^\n]*\n([\s\S]*?)```/g,(_,code)=>{blocks.push('<pre><code>'+code+'</code></pre>');return `\u0000${blocks.length-1}\u0000`;});
 html=html.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^[-*] (.+)$/gm,'<div>• $1</div>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g,'<br>');
 return html.replace(/\u0000(\d+)\u0000/g,(_,n)=>blocks[Number(n)]);
}
function searchResults(query){const q=query.trim().toLowerCase();const rows=Object.entries(types).flatMap(([type,c])=>w()[c].map(r=>({type,...r}))).filter(r=>!q||`${r.title} ${r.body||''} ${r.category||''} ${r.tags||''}`.toLowerCase().includes(q)).slice(0,25);return rows.map(r=>`<button class="search-result" data-action="edit" data-type="${r.type}" data-id="${r.id}">${icon(types[r.type])}<span><strong>${esc(r.title||r.category||t(r.kind))}</strong></span><small>${t(r.type)}</small></button>`).join('')||`<div class="empty">${t('noResults')}</div>`;}
function addSamples(){
 const date=today(),projectId=id(),goalId=id();w().projects.push({id:projectId,title:t('demoProject'),description:'',date:day(date,7),createdAt:date});w().goals.push({id:goalId,title:t('demoGoal'),description:'',date:day(date,14),milestones:[],createdAt:date});
 w().tasks.push({id:id(),title:t('demoTask'),date,time:'10:00',status:'todo',priority:'medium',subtasks:[],repeat:'none',projectId,goalId,createdAt:date});
 w().events.push({id:id(),title:t('demoEvent'),date,time:'10:00',endTime:'11:00',repeat:'none',projectId,createdAt:date});
 w().habits.push({id:id(),title:t('demoHabit'),goal:'20 min',startDate:date,weekdays:[],completions:[],createdAt:date});
 w().notes.push({id:id(),title:t('demoNote'),body:t('demoBody'),color:'violet',pinned:true,archived:false,projectId,createdAt:date,updatedAt:date});
}
async function deleteItem(){
 if(!editing?.id)return;const {type,id:itemId}=editing;
 if(type==='account'&&w().transactions.some(x=>x.accountId===itemId||x.toAccountId===itemId)){toast(t('accountUsed'));return;}
 const before=structuredClone(w());w()[types[type]]=w()[types[type]].filter(x=>x.id!==itemId);
 const key=type==='project'?'projectId':type==='goal'?'goalId':type==='task'?'taskId':null;
 if(key)for(const c of collections)for(const r of w()[c])if(r[key]===itemId)r[key]='';
 undo=before;closeDialog();await persist();toast(t('deleted'),true);
}
function shiftCalendar(sign){if(calendarMode==='month'){const d=new Date(selected+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+sign);selected=iso(d);}else selected=day(selected,sign*(calendarMode==='day'?1:7));render();}
document.addEventListener('click',async event=>{
 const el=event.target.closest('[data-action]');if(!el)return;const {action,value,id:itemId,type}=el.dataset;
 if(store.busy&&!['close','export'].includes(action))return;
 if(action==='view')return go(value);
 if(action==='close')return closeDialog();
 if(action==='add')return openEditor(value);
 if(action==='edit')return openEditor(type,itemId);
 if(action==='quick'){showDialog(t('add'),`<div class="picker">${Object.keys(types).map(type=>button(type,'add',type,'',types[type])).join('')}</div>`);return;}
 if(action==='more'){showDialog(t('workspace'),`<div class="picker">${nav.map(v=>button(v,'view',v,'',v)).join('')}${button('search','search','','','search')}</div>`);return;}
 if(action==='language'){w().settings.language=w().settings.language==='ru'?'en':'ru';await persist();return;}
 if(action==='theme'){const effective=document.documentElement.dataset.theme;w().settings.theme=effective==='dark'?'light':'dark';await persist();return;}
 if(action==='dismiss-install'){sessionStorage.setItem('n-os-install-dismissed','1');updateInstallPrompt();return;}
 if(action==='install-app'&&deferredInstallPrompt){deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(choice.outcome==='accepted')toast(t('installedApp'));updateInstallPrompt();if(view==='settings')render();return;}
 if(action==='task-check'){completeTask(w(),w().tasks.find(x=>x.id===itemId),today());await persist();return;}
 if(action==='habit-check'){if(value>today())return toast(t('future'));const h=w().habits.find(x=>x.id===itemId);h.completions=h.completions.includes(value)?h.completions.filter(d=>d!==value):[...h.completions,value];await persist();return;}
 if(action==='islam-tab'){islamTab=value;render();return;}
 if(action==='prayer-retry'){loadPrayerTimes();return;}
 if(action==='prayer-check'){const date=today(),logs=w().islam.prayerLogs[date]||[];w().islam.prayerLogs[date]=logs.includes(value)?logs.filter(x=>x!==value):[...logs,value];await persist();return;}
 if(action==='prayer-notifications'){
   if(typeof Notification==='undefined')return toast(t('reminderNote'));
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   w().islam.settings.notifications=permission==='granted';await persist();schedulePrayerNotifications();return;
 }
 if(action==='open-surah'){openSurah(value);return;}
 if(action==='surah-learned'){w().islam.surahProgress[value]=!w().islam.surahProgress[value];closeDialog();await persist();return;}
 if(action==='zikr-count'){const date=today(),counts=w().islam.azkar[date]||(w().islam.azkar[date]={}),z=azkar.find(x=>x.id===value);counts[value]=Math.min(z.target,(counts[value]||0)+1);await persist();return;}
 if(action==='zikr-reset'){w().islam.azkar[today()]={};await persist();return;}
 if(action==='arabic-complete'){w().islam.arabicLessons[value]=true;await persist();return;}
 if(action==='milestone'){const g=w().goals.find(x=>x.id===itemId);g.milestones[Number(value)].done=!g.milestones[Number(value)].done;await persist();return;}
 if(action==='date'){selected=value;render();return;}
 if(action==='open-date'){selected=value;return go('calendar');}
 if(action==='add-date'){selected=value;return openEditor('event');}
 if(action==='calendar-mode'){calendarMode=value;render();return;}
 if(action==='calendar-prev'||action==='calendar-next')return shiftCalendar(action==='calendar-prev'?-1:1);
 if(action==='calendar-today'){selected=today();render();return;}
 if(action==='task-mode'){taskMode=value;render();return;}
 if(action==='note-filter'){noteFilter=value;render();return;}
 if(action==='project-tasks'){projectFilter=value;return go('tasks');}
 if(action==='review-prev'||action==='review-next'){reviewDate=day(reviewDate,action==='review-prev'?-7:7);render();return;}
 if(action==='demo'){addSamples();await persist();return;}
 if(action==='delete'){const form=$('#item-form');if(!form.querySelector('[data-action=confirm-delete]'))form.insertAdjacentHTML('beforeend',`<div class="error-banner">${t('deleteAsk')}<div class="actions">${button('delete','confirm-delete','','btn danger')}</div></div>`);return;}
 if(action==='confirm-delete')return deleteItem();
 if(action==='undo'&&undo){store.data=undo;undo=null;await persist();toast(t('saved'));return;}
 if(action==='export')return exportData();
 if(action==='import'){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>input.files[0]&&importData(input.files[0]);input.click();return;}
 if(action==='migrate'){try{pendingImport=migrateLegacy(JSON.parse(localStorage.getItem('nodir-os-v1')));showDialog(t('migrate'),`<p>${t('migration')}</p><p class="form-note">${t('importAsk')}</p><div class="form-footer">${button('export','export')}${button('cancel','close')}${button('import','confirm-import','','btn primary')}</div>`);}catch{toast(t('fileError'));}return;}
 if(action==='confirm-import'&&pendingImport){store.data=pendingImport;pendingImport=null;if(await persist())closeDialog();return;}
 if(action==='retry')return persist();
 if(action==='reload')return load();
 if(action==='search'){showDialog(t('search'),`<input class="search-input" id="global-search" aria-label="${t('search')}" placeholder="${t('search')}"><div id="search-results">${searchResults('')}</div>`);return;}
 if(action==='notifications'){const date=today();const rows=w().tasks.filter(x=>x.date<=date&&!['completed','cancelled'].includes(x.status)).map(taskRow).join('')+w().events.filter(e=>Number(e.reminder)>0&&occurs(e,date)).map(eventRow).join('');showDialog(t('notifications'),`<p class="form-note">${t('reminderNote')}</p>${rows||`<p>${t('noReminders')}</p>`}`);return;}
 if(action==='note-preview'){let preview=$('#note-preview');if(!preview){$('#item-form').insertAdjacentHTML('beforeend','<div id="note-preview" class="md"></div>');preview=$('#note-preview');}preview.innerHTML=markdown($('#item-form textarea[name=body]').value);preview.scrollIntoView({block:'nearest'});return;}
 if(action==='save-settings'){const form=$('#settings-form');if(!form.reportValidity())return;const values=new FormData(form);Object.assign(w().settings,Object.fromEntries(values),{weekStart:Number(values.get('weekStart')),reducedTransparency:values.has('reducedTransparency')});await persist();return;}
 if(action==='save-reflection'){const form=$('#reflection-form'),values=Object.fromEntries(new FormData(form)),week=form.dataset.week;const old=w().reviews.find(r=>r.week===week);if(old)Object.assign(old,values);else w().reviews.push({id:id(),week,...values});await persist();toast(t('saved'));}
});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='item-form')submitItem(e.target);});
document.addEventListener('change',async e=>{if(e.target.id==='task-filter'){taskFilter=e.target.value;render();}if(e.target.id==='project-filter'){projectFilter=e.target.value;render();}if(e.target.id==='finance-month'){financeMonth=e.target.value||today().slice(0,7);render();}if(e.target.id==='note-query'){noteQuery=e.target.value;render();}if(e.target.id==='prayer-reminder'){w().islam.settings.reminderMinutes=Number(e.target.value);await persist();schedulePrayerNotifications();}});
document.addEventListener('input',e=>{if(e.target.id==='global-search')$('#search-results').innerHTML=searchResults(e.target.value);});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('[data-action=search]')?.click();}});
window.addEventListener('hashchange',()=>{if(nav.includes(location.hash.slice(1))){view=location.hash.slice(1);render();}});
window.addEventListener('beforeunload',e=>{if(store.dirty||store.busy){e.preventDefault();e.returnValue='';}});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(w().settings.theme==='system')render();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;updateInstallPrompt();if(view==='settings')render();});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;sessionStorage.removeItem('n-os-install-dismissed');updateInstallPrompt();toast(t('installedApp'));});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
async function load(){try{await store.load();syncError='';selected=today();financeMonth=selected.slice(0,7);reviewDate=selected;render();}catch{if(store.loaded){syncError='loadError';render();}else $('#app').innerHTML=`<div class="boot"><h1>n-os</h1><p>${t('loadError')}</p>${button('retry','reload')}</div>`;}}
let lastToday=today();setInterval(()=>{const d=today();if(d!==lastToday){lastToday=d;if(!$('#dialog').open&&view==='today')render();}},60000);
load();
