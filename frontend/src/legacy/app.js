import {WorkspaceStore} from './store.js';
import {collections,id,day,iso,todayIn,emptyWorkspace,validate,toMinor,occurs,isDue,streak,completeTask,goalProgress,balance,totals,weekDays,migrateLegacy} from './domain.js';
import {translate} from './i18n.js';
import {icon} from './icons.js';
import {basmala,surahs,azkar,azkarCategories} from './islam-content.js';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {createElement} from 'react';
import {LegacySettingsPanel} from '../components/LegacySettingsPanel.tsx';
import {LegacyNotesPanel} from '../components/LegacyNotesPanel.tsx';
import {LegacyLinksPanel} from '../components/LegacyLinksPanel.tsx';
import {LegacyReviewPanel} from '../components/LegacyReviewPanel.tsx';
import {LegacyTasksPanel} from '../components/LegacyTasksPanel.tsx';
import {LegacyHabitsPanel} from '../components/LegacyHabitsPanel.tsx';
import {LegacyCalendarPanel} from '../components/LegacyCalendarPanel.tsx';
import {LegacyTodayPanel} from '../components/LegacyTodayPanel.tsx';
import {LegacyFinancePanel} from '../components/LegacyFinancePanel.tsx';
import {LegacyIslamPanel} from '../components/LegacyIslamPanel.tsx';
import {LegacyShellPanel} from '../components/LegacyShellPanel.tsx';
import {LegacyInstallPrompt,LegacyToast} from '../components/LegacyUtilityPanels.tsx';
import {LegacyDialogPanel} from '../components/LegacyDialogPanel.tsx';
import {LegacySearchDialog} from '../components/LegacySearchDialog.tsx';
import {LegacyPickerDialog} from '../components/LegacyPickerDialog.tsx';
const store=new WorkspaceStore();
const developmentHeaders=import.meta.env.DEV?{'X-User-Id':'local-owner'}:{};
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nav=['today','tasks','calendar','habits','islam','notes','goals','projects','finance','review','settings'];
const types={task:'tasks',event:'events',habit:'habits',note:'notes',goal:'goals',project:'projects',account:'accounts',transaction:'transactions',budget:'budgets'};
let view=nav.includes(location.hash.slice(1))?location.hash.slice(1):'today';
let launchAction=new URLSearchParams(location.search).get('add');
let selected=todayIn(),dashboardDate=selected,calendarMode='month',taskMode='list',taskFilter='all',noteFilter='active',projectFilter='',noteQuery='',financeMonth=selected.slice(0,7),financeRange='month',reviewDate=selected,reviewPeriod='week';
let detailPeriod='year',detailCursor=selected,detailItem=null;
let syncError='',toastTimer,undo=null,editing=null,focusBefore=null;
let deferredInstallPrompt=null;
let reactViewRoot=null;
let reactShellRoot=null;
let reactInstallRoot=null,reactToastRoot=null,reactDialogRoot=null;
let islamTab='prayer',zikrCategory='morning',prayerState={date:'',loading:false,error:false,data:null},prayerTimers=[],workspaceTimers=[];
const w=()=>store.data;
const t=k=>translate(w().settings.language,k);
const today=()=>todayIn(w().settings.timezone);
const dateLabel=(d,opts={day:'numeric',month:'short'})=>d?new Intl.DateTimeFormat(w().settings.language, {...opts,timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'—';
const dateTimeLabel=value=>new Intl.DateTimeFormat(w().settings.language,{dateStyle:'medium',timeStyle:'short',timeZone:w().settings.timezone}).format(new Date(value));
const money=(n,c=w().settings.currency)=>new Intl.NumberFormat(w().settings.language,{style:'currency',currency:c}).format(n/100);
const button=(label,action,value='',cls='btn',ico='')=>`<button type="button" class="${cls}" data-action="${action}" data-value="${esc(value)}">${ico?icon(ico):''}<span>${t(label)}</span></button>`;
const iconButton=(label,action,value='',ico=label)=>`<button type="button" class="btn icon-btn" data-action="${action}" data-value="${esc(value)}" aria-label="${t(label)}">${icon(ico)}</button>`;
const editButton=(type,row,content,cls='row-body')=>`<button type="button" class="${cls}" data-action="detail" data-type="${type}" data-id="${row.id}">${content}</button>`;
const empty=(type='task')=>`<div class="empty">${icon(types[type]||type)}<strong>${t('empty')}</strong><p>${t('emptyHint')}</p>${button('add','add',type,'btn','plus')}</div>`;
const head=(key,actionType)=>`<header class="hero"><div><div class="eyebrow">n-os / ${t('workspace')}</div><h1>${t(key)}</h1></div>${actionType?button('add','add',actionType,'btn primary','plus'):''}</header>`;
const segments=(values,current,action)=>`<div class="segments">${values.map(v=>button(v,action,v,current===v?'active':'')).join('')}</div>`;
const viewMounts={today:mountTodayView,tasks:mountTasksView,calendar:mountCalendarView,habits:mountHabitsView,islam:mountIslamView,notes:mountNotesView,goals:()=>mountLinksView('goal'),projects:()=>mountLinksView('project'),finance:mountFinanceView,review:mountReviewView,settings:mountSettingsView};
if(nav.some(key=>!viewMounts[key]))throw Error('Every primary view must have a React mount');
function render(){
  reactViewRoot?.unmount();reactViewRoot=null;
  const settings=w().settings; document.documentElement.lang=settings.language;
  document.documentElement.dataset.theme=settings.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):settings.theme;
  document.documentElement.dataset.reduced=settings.reducedTransparency;
  document.title=`${t(view)} · n-os`;
  const contentHtml=renderView();
  reactShellRoot||=(createRoot($('#app')));
  flushSync(()=>reactShellRoot.render(createElement(LegacyShellPanel,{view,nav,settings,taskCount:w().tasks.filter(task=>!['completed','cancelled'].includes(task.status)).length,online:navigator.onLine,syncLabel:t(navigator.onLine?(store.busy?'saving':store.dirty?'retained':'cloud'):'offline'),syncError,conflict:store.conflict,contentHtml,label:t,icon})));
  viewMounts[view]();
  updateInstallPrompt();
}
function renderView(){return ({today:renderToday,tasks:renderTasks,calendar:renderCalendar,habits:renderHabits,islam:renderIslam,notes:renderNotes,goals:()=>renderLinks('goal'),projects:()=>renderLinks('project'),finance:renderFinance,review:renderReview,settings:renderSettings})[view]();}
function renderToday(){
  const date=dashboardDate,tasks=w().tasks.filter(x=>x.date===date&&x.status!=='cancelled'),done=tasks.filter(x=>x.status==='completed').length;
  const habits=w().habits.filter(h=>isDue(h,date)),checked=habits.filter(h=>h.completions.includes(date)).length;
  const total=tasks.length+habits.length,rate=total?Math.round((done+checked)/total*100):0;
  const events=w().events.filter(e=>occurs(e,date)).sort((a,b)=>a.time.localeCompare(b.time));
  const openTasks=tasks.filter(x=>x.status!=='completed').sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]??2)-({urgent:0,high:1,medium:2,low:3}[b.priority]??2)||(a.time||'99:99').localeCompare(b.time||'99:99'));
  const openHabits=habits.filter(h=>!h.completions.includes(date)),overdue=w().tasks.filter(x=>x.date<today()&&!['completed','cancelled'].includes(x.status)).sort((a,b)=>a.date.localeCompare(b.date));
  const nextEvent=events.find(e=>date!==today()||e.time>=new Intl.DateTimeFormat('en-GB',{timeZone:w().settings.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()))||events[0];
  const greeting=t('greeting')+(w().settings.name?', '+esc(w().settings.name):'');
  todayViewModel={date,currentDate:today(),isToday:date===today(),isFuture:date>today(),greeting,weekday:dateLabel(date,{weekday:'long'}),fullDate:dateLabel(date,{day:'numeric',month:'long',year:'numeric'}),momentumDate:dateLabel(date,{weekday:'long',day:'numeric',month:'long'}),showDemo:collections.every(c=>w()[c].length===0),overdueCount:overdue.length,commandItems:[openTasks[0]?{type:'task',id:openTasks[0].id,title:openTasks[0].title,subtitle:`${t('priority')}: ${t(openTasks[0].priority||'medium')}`}:null,nextEvent?{type:'event',id:nextEvent.id,title:nextEvent.title,subtitle:`${nextEvent.time}–${nextEvent.endTime}`}:null,openHabits[0]?{type:'habit',id:openHabits[0].id,title:openHabits[0].title,subtitle:t('notCompleted')}:null].filter(Boolean),tasks,completedTasks:done,habits:habits.map(h=>({...h,streak:streak(h,date).current,checked:h.completions.includes(date)})),checkedHabits:checked,events,notes:w().notes.filter(n=>!n.archived).sort((a,b)=>Number(b.pinned)-Number(a.pinned)).slice(0,2),goals:w().goals.slice(0,2).map(g=>({...g,progress:goalProgress(w(),g)})),weekDays:weekDays(date,w().settings.weekStart).map(d=>({date:d,weekday:dateLabel(d,{weekday:'short'}),day:Number(d.slice(8))})),rate};
  return '<div id="react-today-view"></div>';
}
let todayViewModel=null;
function mountTodayView(){const root=$('#react-today-view');if(!root||!todayViewModel)return;reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyTodayPanel,{...todayViewModel,label:t,formatDate:value=>dateLabel(value),icon}));}
function taskRow(x,completionDate=today()){const overdue=x.date&&x.date<today()&&!['completed','cancelled'].includes(x.status);return `<div class="row ${x.status==='completed'?'done':''}"><button class="check ${x.status==='completed'?'done':''}" data-action="task-check" data-id="${x.id}" data-value="${completionDate}" aria-label="${t('done')} ${esc(x.title)}">${x.status==='completed'?icon('check'):''}</button>${editButton('task',x,`<strong>${esc(x.title)}</strong><small class="${overdue?'overdue':''}">${x.date?dateLabel(x.date):''} ${esc(x.time||'')} · ${t(x.status)}${x.subtasks?.length?' · '+x.subtasks.filter(s=>s.done).length+'/'+x.subtasks.length:''}</small>`)}<span class="tag ${x.priority}">${t(x.priority||'medium')}</span></div>`;}
function eventRow(e){return `<div class="row"><time class="event-time">${esc(e.time)}</time><i class="event-line"></i>${editButton('event',e,`<strong>${esc(e.title)}</strong><small>${esc(e.time)}–${esc(e.endTime)}${e.location?' · '+esc(e.location):''}${e.repeat&&e.repeat!=='none'?' · '+t(e.repeat):''}</small>`)}</div>`;}
function renderTasks(){
  const filtered=w().tasks.filter(x=>(!projectFilter||x.projectId===projectFilter)&&(taskFilter==='all'||taskFilter==='today'&&x.date===today()||taskFilter==='upcoming'&&x.date>today()&&!['completed','cancelled'].includes(x.status)||taskFilter==='overdue'&&x.date<today()&&!['completed','cancelled'].includes(x.status)||taskFilter==='completed'&&x.status==='completed')).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  taskViewModel=filtered;
  return head('tasks','task')+'<div id="react-tasks-view"></div>';
}
let taskViewModel=[];
function mountTasksView(){const root=$('#react-tasks-view');if(!root)return;reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyTasksPanel,{tasks:taskViewModel,projects:w().projects,mode:taskMode,filter:taskFilter,projectFilter,today:today(),label:t,formatDate:value=>dateLabel(value)}));}
function renderCalendar(){
 const start=selected.slice(0,8)+'01';
 const offset=(new Date(start+'T12:00:00Z').getUTCDay()-Number(w().settings.weekStart)+7)%7;
 const dates=Array.from({length:42},(_,i)=>day(start,i-offset));
 const agenda=date=>({date,label:dateLabel(date,{weekday:'short',day:'numeric',month:'long'}),events:w().events.filter(e=>occurs(e,date)).sort((a,b)=>a.time.localeCompare(b.time)),tasks:w().tasks.filter(x=>x.date===date&&x.status!=='cancelled')});
 calendarViewModel={mode:calendarMode,monthLabel:dateLabel(selected,{month:'long',year:'numeric'}),weekdayLabels:dates.slice(0,7).map(d=>dateLabel(d,{weekday:'short'})),monthDays:dates.map(date=>{const events=w().events.filter(e=>occurs(e,date)),tasks=w().tasks.filter(x=>x.date===date&&x.status!=='cancelled');return {date,day:Number(date.slice(8)),selected:date===selected,today:date===today(),outside:date.slice(0,7)!==start.slice(0,7),eventTitles:events.slice(0,2).map(e=>e.title),taskCount:tasks.length};}),weekDays:weekDays(selected,w().settings.weekStart).map(date=>({...agenda(date),tasks:w().tasks.filter(x=>x.date===date)})),agendaDays:Array.from({length:calendarMode==='day'?1:7},(_,i)=>agenda(day(selected,i))),selectedAgenda:agenda(selected)};
 return head('calendar','event')+'<div id="react-calendar-view"></div>';
}
let calendarViewModel=null;
function mountCalendarView(){const root=$('#react-calendar-view');if(!root||!calendarViewModel)return;reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyCalendarPanel,{...calendarViewModel,label:t,formatDate:value=>dateLabel(value)}));}
function rangeDays(start,end){const result=[];for(let d=start;d<=end;d=day(d,1))result.push(d);return result;}
function monthEnd(month){return day(`${month}-01`,new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate()-1);}
function shiftMonth(month,delta){const d=new Date(`${month}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+delta);return iso(d).slice(0,7);}
function statBox(label,value){return `<div class="detail-stat"><small>${label}</small><strong>${value}</strong></div>`;}
function habitPeriodBounds(){
 if(detailPeriod==='month'){const start=`${detailCursor.slice(0,7)}-01`;return {start,end:monthEnd(detailCursor.slice(0,7))};}
 const year=detailCursor.slice(0,4);return {start:`${year}-01-01`,end:`${year}-12-31`};
}
function habitDetail(h){
 const {start,end}=habitPeriodBounds(),visible=rangeDays(start,end),past=visible.filter(d=>d<=today()&&isDue(h,d)),checked=past.filter(d=>h.completions.includes(d)),s=streak(h,today()),rate=past.length?Math.round(checked.length/past.length*100):0;
 const pad=(new Date(`${start}T12:00:00Z`).getUTCDay()+6)%7,cells=[...Array(pad).fill(null),...visible];
 const weekday=[1,2,3,4,5,6,0].map(d=>{const due=past.filter(x=>new Date(`${x}T12:00:00Z`).getUTCDay()===d),done=due.filter(x=>h.completions.includes(x)).length,p=due.length?Math.round(done/due.length*100):0;const sample=day('2026-09-21',(d+6)%7);return `<div class="weekday-rate"><span>${dateLabel(sample,{weekday:'short'})}</span><i><b style="width:${p}%"></b></i><strong>${p}%</strong></div>`;}).join('');
 const label=detailPeriod==='month'?dateLabel(start,{month:'long',year:'numeric'}):start.slice(0,4);
 return `<div class="detail-toolbar">${segments(['month','year'],detailPeriod,'detail-period')}<span class="spacer"></span>${iconButton('back','detail-prev','','arrow')}<strong>${label}</strong>${iconButton('next','detail-next','','arrow')}</div><div class="detail-stats">${statBox(t('currentStreak'),`${s.current} ${t('days')}`)}${statBox(t('bestStreak'),`${s.best} ${t('days')}`)}${statBox(t('checked'),checked.length)}${statBox(t('completionRate'),`${rate}%`)}</div><section class="detail-section"><div class="section-title"><h3>${t('activity')}</h3><small>${t('habitHistoryHint')}</small></div><div class="heatmap-wrap"><div class="heatmap ${detailPeriod}">${cells.map(d=>d?`<button type="button" class="heat-cell ${h.completions.includes(d)?'checked':''} ${isDue(h,d)?'due':'off'} ${d>today()?'future':''}" ${isDue(h,d)&&d<=today()?`data-action="habit-detail-check" data-id="${h.id}" data-value="${d}"`:''} title="${dateLabel(d,{day:'numeric',month:'long',year:'numeric'})}: ${h.completions.includes(d)?t('checked'):isDue(h,d)?t('notCompleted'):t('notScheduled')}" aria-label="${d}"></button>`:'<span class="heat-cell blank"></span>').join('')}</div></div><div class="heat-legend"><span>${t('notScheduled')}</span><i class="heat-cell off"></i><i class="heat-cell due"></i><i class="heat-cell checked"></i><span>${t('checked')}</span></div></section><section class="detail-section"><h3>${t('weekdayConsistency')}</h3><div class="weekday-rates">${weekday}</div></section>`;
}
function detailLink(type,row,subtitle=''){return `<button class="related-item" data-action="detail" data-type="${type}" data-id="${row.id}">${icon(types[type])}<span><strong>${esc(row.title||row.category||t(row.kind))}</strong>${subtitle?`<small>${subtitle}</small>`:''}</span>${icon('arrow')}</button>`;}
function taskSeries(task){let root=task,guard=0;while(root.sourceId&&guard++<100){const parent=w().tasks.find(x=>x.id===root.sourceId);if(!parent)break;root=parent;}const result=[],queue=[root.id],seen=new Set();while(queue.length){const parentId=queue.shift();if(seen.has(parentId))continue;seen.add(parentId);const row=w().tasks.find(x=>x.id===parentId);if(row)result.push(row);for(const child of w().tasks.filter(x=>x.sourceId===parentId))queue.push(child.id);}return result.sort((a,b)=>(a.date||'').localeCompare(b.date||''));}
function genericDetail(type,r){
 const linkedProjects=type==='goal'?w().projects.filter(x=>x.goalId===r.id):[],parentGoal=type==='project'?w().goals.find(x=>x.id===r.goalId):null,projectIds=new Set(linkedProjects.map(x=>x.id));
 const linkedTasks=w().tasks.filter(x=>type==='goal'?(x.goalId===r.id||projectIds.has(x.projectId)):type==='project'?x.projectId===r.id:false),linkedNotes=w().notes.filter(x=>(type==='goal'?x.goalId:type==='project'?x.projectId:'')===r.id),linkedEvents=w().events.filter(x=>(type==='goal'?x.goalId:type==='project'?x.projectId:'')===r.id);
 let body='';
 if(type==='note')body=`<div class="detail-meta"><span>${icon('calendar')} ${dateLabel(r.updatedAt||r.createdAt,{day:'numeric',month:'long',year:'numeric'})}</span>${r.folder?`<span>${icon('projects')} ${esc(r.folder)}</span>`:''}</div><article class="md detail-copy">${markdown(r.body||'')}</article>`;
 else if(type==='task')body=`<div class="detail-stats">${statBox(t('status'),t(r.status))}${statBox(t('priority'),t(r.priority||'medium'))}${statBox(t('date'),dateLabel(r.date,{day:'numeric',month:'long',year:'numeric'}))}${statBox(t('subtasks'),`${(r.subtasks||[]).filter(x=>x.done).length}/${(r.subtasks||[]).length}`)}</div>${r.description?`<p class="detail-copy">${esc(r.description)}</p>`:''}${(r.subtasks||[]).length?`<section class="detail-section"><h3>${t('subtasks')}</h3>${r.subtasks.map(x=>`<div class="detail-check ${x.done?'done':''}">${x.done?icon('check'):''}<span>${esc(x.title)}</span></div>`).join('')}</section>`:''}`;
 else if(type==='event')body=`<div class="detail-stats">${statBox(t('date'),dateLabel(r.date,{day:'numeric',month:'long',year:'numeric'}))}${statBox(t('time'),`${esc(r.time)}–${esc(r.endTime)}`)}${statBox(t('repeat'),t(r.repeat||'none'))}${statBox(t('location'),esc(r.location||'—'))}</div>${r.description?`<p class="detail-copy">${esc(r.description)}</p>`:''}`;
 else if(type==='goal'||type==='project'){const rate=type==='goal'?goalProgress(w(),r):linkedTasks.length?Math.round(linkedTasks.filter(x=>x.status==='completed').length/linkedTasks.length*100):0,projectLinks=`${parentGoal?detailLink('goal',parentGoal):''}${linkedProjects.map(x=>detailLink('project',x)).join('')}`;body=`<div class="detail-stats">${statBox(t('progress'),`${rate}%`)}${statBox(t('tasks'),`${linkedTasks.filter(x=>x.status==='completed').length}/${linkedTasks.length}`)}${statBox(t('projects'),type==='goal'?linkedProjects.length:'—')}${statBox(t('calendar'),linkedEvents.length)}</div><div class="bar detail-progress"><i style="width:${rate}%"></i></div>${r.description?`<p class="detail-copy">${esc(r.description)}</p>`:''}${(r.milestones||[]).length?`<section class="detail-section"><h3>${t('milestones')}</h3>${r.milestones.map(x=>`<div class="detail-check ${x.done?'done':''}">${x.done?icon('check'):''}<span>${esc(x.title)}</span></div>`).join('')}</section>`:''}${projectLinks||linkedTasks.length||linkedNotes.length||linkedEvents.length?`<section class="detail-section"><h3>${t('linkedItems')}</h3><div class="related-list">${projectLinks}${linkedTasks.map(x=>detailLink('task',x,t(x.status))).join('')}${linkedNotes.map(x=>detailLink('note',x)).join('')}${linkedEvents.map(x=>detailLink('event',x,dateLabel(x.date))).join('')}</div></section>`:''}`;}
 else if(type==='account'){const rows=w().transactions.filter(x=>x.accountId===r.id||x.toAccountId===r.id).sort((a,b)=>b.date.localeCompare(a.date));body=`<div class="detail-stats">${statBox(t('balance'),money(balance(w(),r),r.currency))}${statBox(t('transaction'),rows.length)}${statBox(t('currency'),r.currency)}</div><section class="detail-section"><h3>${t('history')}</h3><div class="related-list">${rows.map(x=>detailLink('transaction',x,`${dateLabel(x.date)} · ${money(x.amount,r.currency)}`)).join('')||`<p class="meta">${t('noData')}</p>`}</div></section>`;}
 else if(type==='transaction'){const a=w().accounts.find(x=>x.id===r.accountId);body=`<div class="detail-stats">${statBox(t('amount'),money(r.amount,a?.currency))}${statBox(t('kind'),t(r.kind))}${statBox(t('date'),dateLabel(r.date,{day:'numeric',month:'long',year:'numeric'}))}${statBox(t('account'),esc(a?.title||'—'))}</div>`;}
 else if(type==='budget')body=`<div class="detail-stats">${statBox(t('amount'),money(r.amount,r.currency))}${statBox(t('category'),esc(r.category))}${statBox(t('month'),esc(r.monthKey))}</div>`;
 if(['task','event','note'].includes(type)){const related=[];const project=w().projects.find(x=>x.id===r.projectId),goal=w().goals.find(x=>x.id===r.goalId);if(project)related.push(detailLink('project',project));if(goal)related.push(detailLink('goal',goal));if(type==='event'){const task=w().tasks.find(x=>x.id===r.taskId);if(task)related.push(detailLink('task',task,t(task.status)));}if(type==='task'&&r.repeat&&r.repeat!=='none')for(const item of taskSeries(r))if(item.id!==r.id)related.push(detailLink('task',item,`${dateLabel(item.date)} · ${t(item.status)}`));if(related.length)body+=`<section class="detail-section"><h3>${t(type==='task'&&r.repeat&&r.repeat!=='none'?'repeatHistory':'linkedItems')}</h3><div class="related-list">${related.join('')}</div></section>`;}
 return body||`<p class="meta">${t('noData')}</p>`;
}
function openDetails(type,itemId){const row=w()[types[type]]?.find(r=>r.id===itemId);if(!row)return;detailItem={type,id:itemId};detailCursor=type==='habit'?(detailCursor||today()):today();showDialog(esc(row.title||row.category||t(row.kind)),`${type==='habit'?habitDetail(row):genericDetail(type,row)}<div class="form-footer">${button('close','close')}${button('edit','edit-item',`${type}:${itemId}`,'btn primary')}</div>`,'detail-dialog');}
function renderHabits(){return head('habits','habit')+'<div id="react-habits-view"></div>';}
function mountHabitsView(){const root=$('#react-habits-view');if(!root)return;const current=today(),dates=Array.from({length:7},(_,i)=>day(current,i-6)),habits=w().habits.map(h=>({id:h.id,title:h.title,goal:h.goal||'',currentStreak:streak(h,current).current,completedCount:h.completions.length,days:dates.map(date=>({date,label:dateLabel(date,{weekday:'short'}),due:isDue(h,date),completed:h.completions.includes(date)}))}));reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyHabitsPanel,{habits,label:t}));}
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
 try{const response=await fetch(`/api/v1/prayer-times?date=${date}`,{cache:'no-store',headers:developmentHeaders});if(!response.ok)throw Error('prayer');prayerState={date,loading:false,error:false,data:await response.json()};schedulePrayerNotifications();}
 catch{prayerState={date,loading:false,error:true,data:null};}
 if(view==='islam')render();
}
function schedulePrayerNotifications(){
 for(const timer of prayerTimers)clearTimeout(timer);prayerTimers=[];
 if(!w().islam.settings.notifications||typeof Notification==='undefined'||Notification.permission!=='granted'||!prayerState.data)return;
 const lead=Number(w().islam.settings.reminderMinutes)||15;
 for(const key of Object.keys(prayerNames)){const delay=prayerMoment(prayerState.data.date,prayerState.data.timings[key])-new Date()-lead*60000;if(delay>0&&delay<86400000)prayerTimers.push(setTimeout(()=>new Notification(`${prayerNames[key]} через ${lead} мин`,{body:`Время намаза: ${prayerState.data.timings[key]} · Душанбе`,icon:'/icon-192.png',tag:`n-os-${prayerState.data.date}-${key}`}),delay));}
}
function scheduleWorkspaceNotifications(){
 for(const timer of workspaceTimers)clearTimeout(timer);workspaceTimers=[];
 const settings=w().settings;if(!settings.remindersEnabled||typeof Notification==='undefined'||Notification.permission!=='granted')return;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:settings.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])),nowMinutes=Number(parts.hour)*60+Number(parts.minute);
 const schedule=(time,kind)=>{const [hour,minute]=String(time).split(':').map(Number),target=hour*60+minute,delay=((target-nowMinutes+1440)%1440||1440)*60000;workspaceTimers.push(setTimeout(()=>{const date=today(),tasks=w().tasks.filter(x=>x.date===date&&!['completed','cancelled'].includes(x.status)).length,habits=w().habits.filter(h=>isDue(h,date)&&!h.completions.includes(date)).length,events=w().events.filter(e=>occurs(e,date)).length;new Notification(kind==='morning'?t('morningSummary'):t('eveningSummary'),{body:kind==='morning'?`${tasks} ${t('tasks').toLowerCase()} · ${events} ${t('event').toLowerCase()} · ${habits} ${t('habits').toLowerCase()}`:`${t('left')}: ${tasks} ${t('tasks').toLowerCase()}, ${habits} ${t('habits').toLowerCase()}`,icon:'/icon.svg',tag:`n-os-${kind}-${date}`});scheduleWorkspaceNotifications();},delay));};
 schedule(settings.morningTime||'08:00','morning');schedule(settings.eveningTime||'20:30','evening');
}
function renderIslam(){
 if(prayerState.date!==today()&&!prayerState.loading)setTimeout(loadPrayerTimes,0);
 const learned=Object.values(w().islam.surahProgress).filter(Boolean).length;
 islamViewModel={tab:islamTab,learned,surahCount:surahs.length};
 if(islamTab==='prayer')islamViewModel.prayer=prayerViewModel();
 if(islamTab==='surahs')islamViewModel.surahs={basmala,note:t('phoneticNote'),items:[...surahs].sort((a,b)=>a.number-b.number).map(s=>({id:s.id,number:s.number,name:s.name,arabicName:s.arabicName,verses:s.verses.length,learned:!!w().islam.surahProgress[s.id]}))};
 if(islamTab==='azkar')islamViewModel.azkar=azkarViewModel();
 return '<div id="react-islam-view"></div>';
}
let islamViewModel=null;
function historyViewModel(title,valueForDay,max){const days=Array.from({length:30},(_,i)=>day(today(),i-29));return {title,subtitle:t('last30Days'),total:days.reduce((sum,date)=>sum+valueForDay(date),0),cells:days.map(date=>{const value=valueForDay(date);return {date,title:`${dateLabel(date,{day:'numeric',month:'long'})}: ${value}/${max}`,level:max?value/max:0};})};}
function prayerViewModel(){if(prayerState.loading)return {state:'loading'};if(prayerState.error)return {state:'error'};const data=prayerState.data;if(!data)return {state:'empty'};const next=nextPrayerInfo(),date=today(),done=w().islam.prayerLogs[date]||[];return {state:'ready',nextName:next?prayerNames[next.key]:'—',nextDescription:next?`${next.time} · ${countdown(next.at)}`:t('completed'),city:t('dushanbe'),hijri:data.hijri||date,reminderMinutes:Number(w().islam.settings.reminderMinutes),notifications:w().islam.settings.notifications,cards:Object.entries(prayerNames).map(([key,name])=>({key,name,time:data.timings[key],done:done.includes(key),iconName:key==='Fajr'?'sun':'islam'})),history:historyViewModel(t('prayerHistory'),d=>(w().islam.prayerLogs[d]||[]).length,5),note:t('notificationOpen')};}
function azkarViewModel(){const counts=w().islam.azkar[today()]||{},items=azkar.filter(z=>z.category===zikrCategory),lang=w().settings.language;return {categories:azkarCategories.map(c=>({id:c.id,name:c[lang],active:c.id===zikrCategory})),completed:items.filter(z=>(counts[z.id]||0)>=z.target).length,total:items.length,history:historyViewModel(t('azkarHistory'),d=>items.filter(z=>((w().islam.azkar[d]||{})[z.id]||0)>=z.target).length,items.length),items:items.map(z=>{const count=counts[z.id]||0;return {id:z.id,target:z.target,count,percent:Math.min(100,count/z.target*100),complete:count>=z.target,arabic:z.arabic,tajik:z.tajik,russian:z.russian};})};}
function mountIslamView(){const root=$('#react-islam-view');if(!root||!islamViewModel)return;reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyIslamPanel,{...islamViewModel,label:t,icon}));}
function openSurah(id){const s=surahs.find(x=>x.id===id);if(!s)return;showDialog(`${s.number}. ${s.name}`,`<div class="surah-reader"><div class="reading-key"><span>${t('originalArabic')}</span><span>${t('tajikReading')}</span><span>${t('russianMeaning')}</span></div>${s.verses.map((v,i)=>`<section class="verse"><span class="verse-number">${i+1}</span><p class="arabic" dir="rtl" lang="ar">${v.arabic}</p><p class="tajik">${v.tajik}</p><p class="meaning">${v.russian}</p></section>`).join('')}<p class="islam-note">${t('phoneticNote')}</p><div class="form-footer">${button(w().islam.surahProgress[s.id]?'learned':'markLearned','surah-learned',s.id,'btn primary','check')}</div></div>`);}
function renderNotes(){return head('notes','note')+'<div id="react-notes-view"></div>';}
function mountNotesView(){const root=$('#react-notes-view');if(!root)return;const notes=w().notes.filter(n=>(noteFilter==='archived'?n.archived:!n.archived)&&(noteFilter!=='pinned'||n.pinned)&&(!noteQuery||`${n.title} ${n.body} ${n.tags} ${n.folder}`.toLowerCase().includes(noteQuery.toLowerCase())));reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyNotesPanel,{notes,filter:noteFilter,query:noteQuery,label:t,formatDate:value=>dateLabel(value)}));}
function renderLinks(type){return head(types[type],type)+`<div id="react-${types[type]}-view"></div>`;}
function mountLinksView(type){const root=$(`#react-${types[type]}-view`);if(!root)return;reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyLinksPanel,{type,records:w()[types[type]],projects:w().projects,tasks:w().tasks,workspace:w(),label:t,formatDate:value=>dateLabel(value)}));}
function periodBounds(anchor,period){
 const y=Number(anchor.slice(0,4)),m=Number(anchor.slice(5,7));
 if(period==='month')return {start:`${anchor.slice(0,7)}-01`,end:monthEnd(anchor.slice(0,7))};
 if(period==='quarter'){const qm=Math.floor((m-1)/3)*3+1,start=`${y}-${String(qm).padStart(2,'0')}-01`,last=`${y}-${String(qm+2).padStart(2,'0')}`;return {start,end:monthEnd(last)};}
 if(period==='year')return {start:`${y}-01-01`,end:`${y}-12-31`};
 const dates=weekDays(anchor,w().settings.weekStart);return {start:dates[0],end:dates[6]};
}
function monthsBetween(start,end){const result=[];for(let m=start.slice(0,7);m<=end.slice(0,7);m=shiftMonth(m,1))result.push(m);return result;}
function renderFinance(){
 const currency=w().settings.currency,{start,end}=periodBounds(`${financeMonth}-01`,financeRange),sum=w().accounts.filter(a=>a.currency===currency).reduce((s,a)=>s+balance(w(),a),0);
 const tx=w().transactions.filter(x=>x.date>=start&&x.date<=end&&w().accounts.find(a=>a.id===x.accountId)?.currency===currency).sort((a,b)=>b.date.localeCompare(a.date)),income=tx.filter(x=>x.kind==='income').reduce((s,x)=>s+x.amount,0),expense=tx.filter(x=>x.kind==='expense').reduce((s,x)=>s+x.amount,0),months=monthsBetween(start,end);
 const series=months.map(m=>({m,income:tx.filter(x=>x.kind==='income'&&x.date.startsWith(m)).reduce((s,x)=>s+x.amount,0),expense:tx.filter(x=>x.kind==='expense'&&x.date.startsWith(m)).reduce((s,x)=>s+x.amount,0)})),chartMax=Math.max(1,...series.flatMap(x=>[x.income,x.expense]));
 const categories=Object.entries(tx.filter(x=>x.kind==='expense').reduce((a,x)=>(a[x.category||t('untitled')]=(a[x.category||t('untitled')]||0)+x.amount,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,6);
 const budgets=w().budgets.filter(b=>b.monthKey>=start.slice(0,7)&&b.monthKey<=end.slice(0,7));
 financeViewModel={range:financeRange,month:financeMonth,currency,balance:money(sum),income:money(income),expense:money(expense),rangeLabel:`${dateLabel(start)} — ${dateLabel(end)}`,series:series.map(x=>({label:dateLabel(`${x.m}-01`,{month:'short'}),incomeHeight:Math.max(3,x.income/chartMax*130),expenseHeight:Math.max(3,x.expense/chartMax*130)})),categories:categories.map(([name,n])=>({name,width:expense?n/expense*100:0,value:money(n)})),accounts:w().accounts.map(a=>({id:a.id,title:a.title,currency:a.currency,balance:money(balance(w(),a),a.currency)})),transactions:tx.map(x=>{const account=w().accounts.find(a=>a.id===x.accountId);return {id:x.id,title:x.title||x.category||t(x.kind),subtitle:`${dateLabel(x.date)} · ${account?.title||''} · ${t(x.kind)}`,kind:x.kind,amount:`${x.kind==='income'?'+':x.kind==='expense'?'−':''}${money(x.amount,account?.currency)}`};}),budgets:budgets.map(b=>{const spent=w().transactions.filter(x=>x.kind==='expense'&&x.date.startsWith(b.monthKey)&&x.category===b.category&&w().accounts.find(a=>a.id===x.accountId)?.currency===b.currency).reduce((s,x)=>s+x.amount,0);return {id:b.id,title:b.title,category:b.category,spent:money(spent,b.currency),amount:money(b.amount,b.currency),remaining:money(b.amount-spent,b.currency),percent:b.amount?Math.min(100,spent/b.amount*100):0};})};
 return head('finance','transaction')+'<div id="react-finance-view"></div>';
}
let financeViewModel=null;
function mountFinanceView(){const root=$('#react-finance-view');if(!root||!financeViewModel)return;reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyFinancePanel,{...financeViewModel,label:t,icon}));}
function reviewBuckets(start,end,period){
 if(period==='week')return rangeDays(start,end).map(d=>({start:d,end:d,label:dateLabel(d,{weekday:'short'})}));
 if(period==='month'){const result=[];for(let d=start;d<=end;d=day(d,7)){const e=day(d,6)>end?end:day(d,6);result.push({start:d,end:e,label:`${Number(d.slice(8))}–${Number(e.slice(8))}`});}return result;}
 return monthsBetween(start,end).map(m=>({start:`${m}-01`,end:monthEnd(m),label:dateLabel(`${m}-01`,{month:'short'})}));
}
function reviewModel(){const {start,end}=periodBounds(reviewDate,reviewPeriod),dates=rangeDays(start,end).filter(d=>d<=today()),periods=reviewBuckets(start,end,reviewPeriod),counts=periods.map(b=>w().tasks.filter(x=>x.completedAt>=b.start&&x.completedAt<=b.end&&x.status==='completed').length);let checked=0,due=0;for(const h of w().habits)for(const d of dates)if(isDue(h,d)){due++;if(h.completions.includes(d))checked++;}return {start,end,completed:counts.reduce((a,b)=>a+b,0),consistency:due?Math.round(checked/due*100):0,notes:w().notes.filter(n=>n.createdAt>=start&&n.createdAt<=end).length,buckets:periods.map((bucket,index)=>({label:bucket.label,count:counts[index]})),reflection:w().reviews.find(r=>r.week===start)||{}};}
function renderReview(){return head('review')+'<div id="react-review-view"></div>';}
function mountReviewView(){const root=$('#react-review-view');if(!root)return;const model=reviewModel();reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacyReviewPanel,{...model,period:reviewPeriod,rangeLabel:`${dateLabel(model.start)} — ${dateLabel(model.end)}`,label:t}));}
function renderSettings(){return head('settings')+'<div id="react-settings-view"></div>';}
function mountSettingsView(){const root=$('#react-settings-view');if(!root)return;reactViewRoot=createRoot(root);reactViewRoot.render(createElement(LegacySettingsPanel,{settings:w().settings,label:t,installMessage:installMessage(),installAvailable:!isStandalone()&&!!deferredInstallPrompt,legacyImportAvailable:hasLegacy(),notificationsGranted:typeof Notification!=='undefined'&&Notification.permission==='granted'}));}

const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
function installMessage(){return t(isStandalone()?'installedApp':isIOS()?'installIOS':deferredInstallPrompt?'installText':'installUnavailable');}
function updateInstallPrompt(){
 const prompt=$('#install-prompt');if(!prompt)return;
 const dismissed=sessionStorage.getItem('n-os-install-dismissed')==='1';
 if(isStandalone()||dismissed||(!deferredInstallPrompt&&!isIOS())){prompt.hidden=true;return;}
 reactInstallRoot||=(createRoot(prompt));
 flushSync(()=>reactInstallRoot.render(createElement(LegacyInstallPrompt,{message:t(isIOS()?'installIOS':'installText'),canInstall:!!deferredInstallPrompt,label:t,icon})));
 prompt.hidden=false;
}

function field(name,value='',type='text',options=[],full=false,required=false,label=name){
 const attr=`id="field-${name}" name="${name}" ${required?'required':''}`;
 let control=type==='textarea'?`<textarea ${attr} maxlength="50000">${esc(value)}</textarea>`:type==='select'?`<select ${attr}>${options.map(opt=>{const [v,l]=Array.isArray(opt)?opt:[opt,opt];return `<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(t(l))}</option>`;}).join('')}</select>`:`<input ${attr} type="${type}" value="${esc(value)}" ${type==='text'?'maxlength="250"':''} ${type==='number'?'min="0" step="1"':''}>`;
 return `<div class="field ${full?'full':''}"><label for="field-${name}">${t(label)}</label>${control}</div>`;
}
function checkField(name,value,label=name){return `<label class="check-field"><input type="checkbox" name="${name}" ${value?'checked':''}>${t(label)}</label>`;}
const linkedFields=(r)=>field('projectId',r.projectId||'','select',[['','none'],...w().projects.map(p=>[p.id,p.title])],false,false,'project')+field('goalId',r.goalId||'','select',[['','none'],...w().goals.map(g=>[g.id,g.title])],false,false,'goal');
function showDialog(title,body,cls=''){focusBefore=document.activeElement;const d=$('#dialog');d.className=cls;reactDialogRoot||=(createRoot(d));flushSync(()=>reactDialogRoot.render(createElement(LegacyDialogPanel,{title,bodyHtml:body,closeLabel:t('close'),icon})));if(!d.open)d.showModal();setTimeout(()=>d.querySelector('input:not([type=checkbox]),textarea')?.focus(),0);}
function showReactDialog(title,body,cls=''){focusBefore=document.activeElement;const d=$('#dialog');d.className=cls;reactDialogRoot||=(createRoot(d));flushSync(()=>reactDialogRoot.render(createElement(LegacyDialogPanel,{title,body,closeLabel:t('close'),icon})));if(!d.open)d.showModal();setTimeout(()=>d.querySelector('input:not([type=checkbox]),textarea')?.focus(),0);}
function closeDialog(){const d=$('#dialog');d.close();d.className='';reactDialogRoot?.render(null);editing=null;detailItem=null;focusBefore?.focus?.();}
function openEditor(type,itemId=null){
 if(['transaction','budget'].includes(type)&&!w().accounts.length){toast(t('accountNeeded'));type='account';itemId=null;}
 const item=itemId?w()[types[type]].find(r=>r.id===itemId):null;if(itemId&&!item)return;
 editing={type,id:itemId};const r=item||{},date=r.date||selected,repeat=['none','daily','weekly','monthly'];
 let fields=field('title',r.title||'','text',[],true,type!=='transaction');
 if(type==='task')fields+=field('description',r.description||'','textarea',[],true)+field('date',date,'date',[],false,true)+field('time',r.time||'09:00','time')+field('status',r.status||'todo','select',['todo','progress','completed','cancelled'])+field('priority',r.priority||'medium','select',['low','medium','high','urgent'])+linkedFields(r)+field('repeat',r.repeat||'none','select',repeat)+field('tags',r.tags||'')+field('subtasks',(r.subtasks||[]).map(s=>(s.done?'[x] ':'[ ] ')+s.title).join('\n'),'textarea',[],true);
 if(type==='event')fields+=field('description',r.description||'','textarea',[],true)+field('date',date,'date',[],false,true)+field('location',r.location||'')+field('time',r.time||'09:00','time',[],false,true)+field('endTime',r.endTime||'10:00','time',[],false,true)+field('repeat',r.repeat||'none','select',repeat)+field('repeatUntil',r.repeatUntil||'','date')+field('reminder',r.reminder||0,'number')+field('taskId',r.taskId||'','select',[['','none'],...w().tasks.map(x=>[x.id,x.title])],false,false,'task')+linkedFields(r);
 if(type==='habit')fields+=field('goal',r.goal||'','text',[],false,false,'target')+field('startDate',r.startDate||today(),'date',[],false,true)+field('endDate',r.endDate||'','date')+`<div class="field full"><label>${t('weekdays')}</label><div class="actions" style="flex-wrap:wrap">${[1,2,3,4,5,6,0].map((d,i)=>`<label class="check-field"><input type="checkbox" name="weekday" value="${d}" ${!r.weekdays?.length||r.weekdays.includes(d)?'checked':''}>${dateLabel(day('2026-09-21',i),{weekday:'short'})}</label>`).join('')}</div></div>`+linkedFields(r);
 if(type==='note')fields+=field('body',r.body||'','textarea',[],true)+field('folder',r.folder||'')+field('tags',r.tags||'')+field('color',r.color||'blue','select',['blue','violet','rose','green'])+`<div class="field">${checkField('pinned',r.pinned)}${checkField('archived',r.archived)}</div>`+linkedFields(r);
 if(['goal','project'].includes(type))fields+=field('description',r.description||'','textarea',[],true)+field('date',r.date||today(),'date')+field('color',r.color||'blue','select',['blue','violet','rose','green'])+(type==='goal'?field('milestones',(r.milestones||[]).map(s=>(s.done?'[x] ':'[ ] ')+s.title).join('\n'),'textarea',[],true):field('goalId',r.goalId||'','select',[['','none'],...w().goals.map(g=>[g.id,g.title])],false,false,'goal'));
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
 try{syncError='';await store.save();render();scheduleWorkspaceNotifications();return true;}
 catch(e){syncError=e.message==='conflict'?'conflict':'saveError';render();const error=$('.form-error');if(error)error.textContent=t(syncError);return false;}
}
function toast(message,withUndo=false){clearTimeout(toastTimer);const root=$('#toast');reactToastRoot||=(createRoot(root));flushSync(()=>reactToastRoot.render(createElement(LegacyToast,{message,withUndo,label:t})));root.classList.add('show');toastTimer=setTimeout(()=>root.classList.remove('show'),withUndo?12000:4000);}
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
function searchRows(){return Object.entries(types).flatMap(([type,collection])=>w()[collection].map(row=>({id:row.id,type,title:row.title||row.category||t(row.kind),searchable:`${row.title||''} ${row.body||''} ${row.category||''} ${row.tags||''}`.toLowerCase(),iconName:types[type]})));}
async function openWorkspaceHistory(){showDialog(t('versionHistory'),`<p class="form-note">${t('loading')}</p>`);try{const response=await fetch('/api/v1/workspace/history',{cache:'no-store',headers:developmentHeaders});if(!response.ok)throw Error();const rows=await response.json();showDialog(t('versionHistory'),`<p class="form-note">${t('historyHint')}</p><div class="related-list">${rows.map(row=>`<button class="related-item" data-action="revision-preview" data-value="${row.revision}">${icon('history')}<span><strong>${t('version')} ${row.revision}</strong><small>${dateTimeLabel(row.created_at)}</small></span>${icon('arrow')}</button>`).join('')||`<p class="meta">${t('noData')}</p>`}</div>`);}catch{closeDialog();toast(t('loadError'));}}
async function previewRevision(revision){try{const response=await fetch(`/api/v1/workspace/history/${revision}`,{cache:'no-store',headers:developmentHeaders});if(!response.ok)throw Error();const snapshot=await response.json(),data=validate(snapshot.workspace),count=collections.reduce((sum,key)=>sum+data[key].length,0);pendingRevision={workspace:data,revision:snapshot.revision};showDialog(`${t('version')} ${revision}`,`<div class="detail-stats">${statBox(t('records'),count)}${statBox(t('tasks'),data.tasks.length)}${statBox(t('notes'),data.notes.length)}${statBox(t('habits'),data.habits.length)}</div><p class="form-note">${t('restoreHint')}</p><div class="form-footer">${button('cancel','workspace-history')}${button('restore','restore-revision','','btn primary')}</div>`);}catch{toast(t('loadError'));}}
let pendingRevision=null;
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
function shiftReview(sign){if(reviewPeriod==='week')reviewDate=day(reviewDate,sign*7);else if(reviewPeriod==='month')reviewDate=`${shiftMonth(reviewDate.slice(0,7),sign)}-01`;else if(reviewPeriod==='quarter')reviewDate=`${shiftMonth(reviewDate.slice(0,7),sign*3)}-01`;else reviewDate=`${Number(reviewDate.slice(0,4))+sign}-01-01`;render();}
document.addEventListener('click',async event=>{
 const el=event.target.closest('[data-action]');if(!el)return;const {action,value,id:itemId,type}=el.dataset;
 if(store.busy&&!['close','export'].includes(action))return;
 if(action==='view')return go(value);
 if(action==='close')return closeDialog();
 if(action==='add')return openEditor(value);
 if(action==='detail')return openDetails(type,itemId);
 if(action==='edit')return openEditor(type,itemId);
 if(action==='edit-item'){const split=value.indexOf(':');return openEditor(value.slice(0,split),value.slice(split+1));}
 if(action==='detail-period'){detailPeriod=value;if(detailItem)return openDetails(detailItem.type,detailItem.id);return;}
 if(action==='detail-prev'||action==='detail-next'){const sign=action==='detail-prev'?-1:1;detailCursor=detailPeriod==='month'?`${shiftMonth(detailCursor.slice(0,7),sign)}-01`:`${Number(detailCursor.slice(0,4))+sign}-01-01`;if(detailItem)return openDetails(detailItem.type,detailItem.id);return;}
 if(action==='quick'){showReactDialog(t('add'),createElement(LegacyPickerDialog,{items:Object.keys(types).map(type=>({key:type,label:t(type),action:'add',value:type,iconName:types[type]})),icon}));return;}
 if(action==='more'){showReactDialog(t('workspace'),createElement(LegacyPickerDialog,{items:[...nav.map(value=>({key:value,label:t(value),action:'view',value,iconName:value})),{key:'search',label:t('search'),action:'search',iconName:'search'},{key:'notifications',label:t('notifications'),action:'notifications',iconName:'bell'}],icon}));return;}
 if(action==='language'){w().settings.language=w().settings.language==='ru'?'en':'ru';await persist();return;}
 if(action==='theme'){const effective=document.documentElement.dataset.theme;w().settings.theme=effective==='dark'?'light':'dark';await persist();return;}
 if(action==='dismiss-install'){sessionStorage.setItem('n-os-install-dismissed','1');updateInstallPrompt();return;}
 if(action==='install-app'&&deferredInstallPrompt){deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(choice.outcome==='accepted')toast(t('installedApp'));updateInstallPrompt();if(view==='settings')render();return;}
 if(action==='task-check'){const completedOn=value||today();if(completedOn>today())return toast(t('future'));completeTask(w(),w().tasks.find(x=>x.id===itemId),completedOn);await persist();return;}
 if(action==='habit-check'){if(value>today())return toast(t('future'));const h=w().habits.find(x=>x.id===itemId);h.completions=h.completions.includes(value)?h.completions.filter(d=>d!==value):[...h.completions,value];await persist();return;}
 if(action==='habit-detail-check'){if(value>today())return toast(t('future'));const h=w().habits.find(x=>x.id===itemId);h.completions=h.completions.includes(value)?h.completions.filter(d=>d!==value):[...h.completions,value];await persist();openDetails('habit',itemId);return;}
 if(action==='islam-tab'){islamTab=value;render();return;}
 if(action==='prayer-retry'){loadPrayerTimes();return;}
 if(action==='prayer-check'){const date=today(),logs=w().islam.prayerLogs[date]||[];w().islam.prayerLogs[date]=logs.includes(value)?logs.filter(x=>x!==value):[...logs,value];await persist();return;}
 if(action==='prayer-notifications'){
   if(typeof Notification==='undefined')return toast(t('reminderNote'));
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   w().islam.settings.notifications=permission==='granted';await persist();schedulePrayerNotifications();return;
 }
 if(action==='workspace-notifications'){if(typeof Notification==='undefined')return toast(t('notificationUnavailable'));const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();w().settings.remindersEnabled=permission==='granted';await persist();if(view==='settings')render();return;}
 if(action==='workspace-history')return openWorkspaceHistory();
 if(action==='revision-preview')return previewRevision(value);
 if(action==='restore-revision'&&pendingRevision){store.data=pendingRevision.workspace;store.revision=pendingRevision.revision;pendingRevision=null;if(await persist()){closeDialog();toast(t('restored'));}return;}
 if(action==='open-surah'){openSurah(value);return;}
 if(action==='surah-learned'){w().islam.surahProgress[value]=!w().islam.surahProgress[value];closeDialog();await persist();return;}
 if(action==='zikr-count'){const date=today(),counts=w().islam.azkar[date]||(w().islam.azkar[date]={}),z=azkar.find(x=>x.id===value);counts[value]=Math.min(z.target,(counts[value]||0)+1);await persist();return;}
 if(action==='zikr-category'){zikrCategory=value;render();return;}
 if(action==='zikr-reset'){const counts=w().islam.azkar[today()]||(w().islam.azkar[today()]={});for(const z of azkar.filter(x=>x.category===zikrCategory))delete counts[z.id];await persist();return;}
 if(action==='milestone'){const g=w().goals.find(x=>x.id===itemId);g.milestones[Number(value)].done=!g.milestones[Number(value)].done;await persist();return;}
 if(action==='date'){selected=value;render();return;}
 if(action==='dashboard-date'){dashboardDate=value;render();return;}
 if(action==='dashboard-prev'||action==='dashboard-next'){dashboardDate=day(dashboardDate,action==='dashboard-prev'?-1:1);render();return;}
 if(action==='dashboard-today'){dashboardDate=today();render();return;}
 if(action==='task-filter-view'){taskFilter=value;return go('tasks');}
 if(action==='open-date'){selected=value;return go('calendar');}
 if(action==='add-date'){selected=value;return openEditor('event');}
 if(action==='calendar-mode'){calendarMode=value;render();return;}
 if(action==='calendar-prev'||action==='calendar-next')return shiftCalendar(action==='calendar-prev'?-1:1);
 if(action==='calendar-today'){selected=today();render();return;}
 if(action==='task-mode'){taskMode=value;render();return;}
 if(action==='finance-range'){financeRange=value;render();return;}
 if(action==='note-filter'){noteFilter=value;render();return;}
 if(action==='project-tasks'){projectFilter=value;return go('tasks');}
 if(action==='review-period'){reviewPeriod=value;render();return;}
 if(action==='review-prev'||action==='review-next')return shiftReview(action==='review-prev'?-1:1);
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
 if(action==='search'){showReactDialog(t('search'),createElement(LegacySearchDialog,{rows:searchRows(),label:t,icon}));return;}
 if(action==='notifications'){const date=today();const rows=w().tasks.filter(x=>x.date<=date&&!['completed','cancelled'].includes(x.status)).map(taskRow).join('')+w().events.filter(e=>Number(e.reminder)>0&&occurs(e,date)).map(eventRow).join('');showDialog(t('notifications'),`<p class="form-note">${t('reminderNote')}</p>${rows||`<p>${t('noReminders')}</p>`}`);return;}
 if(action==='note-preview'){let preview=$('#note-preview');if(!preview){$('#item-form').insertAdjacentHTML('beforeend','<div id="note-preview" class="md"></div>');preview=$('#note-preview');}preview.innerHTML=markdown($('#item-form textarea[name=body]').value);preview.scrollIntoView({block:'nearest'});return;}
 if(action==='save-settings'){const form=$('#settings-form');if(!form.reportValidity())return;const values=new FormData(form);Object.assign(w().settings,Object.fromEntries(values),{weekStart:Number(values.get('weekStart')),reducedTransparency:values.has('reducedTransparency'),remindersEnabled:values.has('remindersEnabled')});await persist();return;}
 if(action==='save-reflection'){const form=$('#reflection-form'),values=Object.fromEntries(new FormData(form)),week=form.dataset.week;const old=w().reviews.find(r=>r.week===week);if(old)Object.assign(old,values);else w().reviews.push({id:id(),week,...values});await persist();toast(t('saved'));}
});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='item-form')submitItem(e.target);});
document.addEventListener('change',async e=>{if(e.target.id==='task-filter'){taskFilter=e.target.value;render();}if(e.target.id==='project-filter'){projectFilter=e.target.value;render();}if(e.target.id==='finance-month'){financeMonth=e.target.value||today().slice(0,7);render();}if(e.target.id==='note-query'){noteQuery=e.target.value;render();}if(e.target.id==='prayer-reminder'){w().islam.settings.reminderMinutes=Number(e.target.value);await persist();schedulePrayerNotifications();}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('[data-action=search]')?.click();}});
window.addEventListener('hashchange',()=>{if(nav.includes(location.hash.slice(1))){view=location.hash.slice(1);render();}});
window.addEventListener('beforeunload',e=>{if(store.dirty||store.busy){e.preventDefault();e.returnValue='';}});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(w().settings.theme==='system')render();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;updateInstallPrompt();if(view==='settings')render();});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;sessionStorage.removeItem('n-os-install-dismissed');updateInstallPrompt();toast(t('installedApp'));});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
async function load(){try{await store.load();syncError=store.conflict?'conflict':'';selected=today();dashboardDate=selected;financeMonth=selected.slice(0,7);reviewDate=selected;render();scheduleWorkspaceNotifications();if(launchAction&&types[launchAction]){const action=launchAction;launchAction=null;history.replaceState(null,'',location.pathname+location.hash);openEditor(action);}}catch{if(store.loaded){syncError='loadError';render();}else $('#app').innerHTML=`<div class="boot"><h1>n-os</h1><p>${t('loadError')}</p>${button('retry','reload')}</div>`;}}
window.addEventListener('online',()=>{if(store.loaded&&store.dirty&&!store.conflict&&!store.busy)persist();else render();});
window.addEventListener('offline',render);
let lastToday=today();setInterval(()=>{const d=today();if(d!==lastToday){lastToday=d;if(!$('#dialog').open&&view==='today')render();}},60000);
export function mountLegacyApp(){return load();}
