export const collections = ['tasks','events','habits','notes','projects','goals','accounts','transactions','budgets','reviews'];
export const defaultIslam = () => ({
  settings:{city:'Dushanbe',country:'Tajikistan',method:3,school:1,reminderMinutes:15,notifications:false},
  prayerLogs:{},surahProgress:{},azkar:{},arabicLessons:{}
});
export const id = () => crypto.randomUUID();
const defaultSettings={name:'',language:'ru',theme:'system',timezone:'Asia/Dushanbe',currency:'TJS',weekStart:1,reducedTransparency:false,remindersEnabled:false,morningTime:'08:00',eveningTime:'20:30'};
export const iso = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
export const day = (date, delta=0) => { const d=new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+delta); return iso(d); };
export function todayIn(timezone='Asia/Dushanbe', now=new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
/** @returns {import('../types').Workspace} */
export function emptyWorkspace() {
  return {schema:3,settings:{...defaultSettings},...Object.fromEntries(collections.map(k=>[k,[]])),islam:defaultIslam()};
}
/** @param {any} w @returns {import('../types').Workspace} */
export function validate(w) {
  if(w?.schema===2){w.schema=3;w.islam=defaultIslam();}
  if (!w || w.schema!==3 || !w.settings || !['ru','en'].includes(w.settings.language)) throw Error('invalid');
  w.settings={...defaultSettings,...w.settings};
  const defaults=defaultIslam();
  if(!w.islam||typeof w.islam!=='object')w.islam=defaults;
  w.islam.settings={...defaults.settings,...(w.islam.settings||{})};
  for(const key of ['prayerLogs','surahProgress','azkar','arabicLessons'])if(!w.islam[key]||typeof w.islam[key]!=='object'||Array.isArray(w.islam[key]))throw Error('islam');
  try { todayIn(w.settings.timezone); } catch { throw Error('timezone'); }
  for (const c of collections) {
    if (!Array.isArray(w[c]) || w[c].length>3000) throw Error('limit');
    const ids=new Set();
    for(const r of w[c]) {
      if (!r || typeof r.id!=='string' || ids.has(r.id)) throw Error('invalid');
      ids.add(r.id);
      if(c!=='transactions' && c!=='reviews' && (typeof r.title!=='string' || !r.title.trim())) throw Error('title');
    }
  }
  for(const t of w.tasks) if(!['todo','progress','completed','cancelled'].includes(t.status)) throw Error('status');
  for(const h of w.habits) if(!Array.isArray(h.completions)) throw Error('invalid');
  for(const a of w.accounts) if(!Number.isSafeInteger(a.opening)) throw Error('amount');
  for(const t of w.transactions) {
    if(!Number.isSafeInteger(t.amount)||t.amount<=0||!['income','expense','transfer'].includes(t.kind)) throw Error('amount');
    const a=w.accounts.find(a=>a.id===t.accountId); if(!a) throw Error('account');
    if(t.kind==='transfer') { const b=w.accounts.find(a=>a.id===t.toAccountId); if(!b||b.id===a.id||a.currency!==b.currency) throw Error('transfer'); }
  }
  for(const b of w.budgets) if(!Number.isSafeInteger(b.amount)||b.amount<=0) throw Error('amount');
  for(const c of ['tasks','events','notes','habits']) for(const r of w[c]) {
    if(r.projectId && !w.projects.some(p=>p.id===r.projectId)) throw Error('project');
    if(r.goalId && !w.goals.some(g=>g.id===r.goalId)) throw Error('goal');
  }
  for(const p of w.projects) if(p.goalId && !w.goals.some(g=>g.id===p.goalId)) throw Error('goal');
  return w;
}
export function toMinor(value) {
  const text=String(value).trim().replace(',','.');
  if(!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('amount');
  const [a,b='']=text.split('.'); const n=Number(a)*100+Number(b.padEnd(2,'0'));
  if(!Number.isSafeInteger(n)) throw Error('amount'); return n;
}
export function nextDate(date, repeat) {
  if(repeat==='daily') return day(date,1);
  if(repeat==='weekly') return day(date,7);
  if(repeat==='monthly') { const d=new Date(date+'T12:00:00Z'); const n=d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+1); const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate(); d.setUTCDate(Math.min(n,last)); return iso(d); }
  return null;
}
export function occurs(event,date) {
  if(date<event.date || (event.repeatUntil && date>event.repeatUntil)) return false;
  if(event.date===date) return true;
  if(!event.repeat||event.repeat==='none') return false;
  if(event.repeat==='daily') return true;
  if(event.repeat==='weekly') return Math.round((new Date(date)-new Date(event.date))/86400000)%7===0;
  const d=new Date(date+'T12:00:00Z'); const target=Math.min(Number(event.date.slice(8)),new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate());
  return d.getUTCDate()===target;
}
export const isDue = (h,date) => date >= (h.startDate||'0000') && (!h.endDate||date<=h.endDate) && (!h.weekdays?.length||h.weekdays.includes(new Date(date+'T12:00:00Z').getUTCDay()));
export function streak(h,date) {
  let best=0,run=0; const checked=new Set(h.completions||[]);
  const first=h.startDate || [...checked].sort()[0] || date;
  for(let d=first;d<=date;d=day(d,1)) { if(!isDue(h,d))continue; if(checked.has(d)){run++;best=Math.max(best,run);}else if(d!==date)run=0; }
  return {current:run,best};
}
export function completeTask(w,task,today) {
  task.status=task.status==='completed'?'todo':'completed';
  task.completedAt=task.status==='completed'?today:null;
  if(task.status==='completed' && task.repeat && task.repeat!=='none' && !w.tasks.some(t=>t.sourceId===task.id)) {
    const next=structuredClone(task); Object.assign(next,{id:id(),sourceId:task.id,date:nextDate(task.date,task.repeat),status:'todo',completedAt:null,createdAt:today});
    next.subtasks=(next.subtasks||[]).map(s=>({...s,done:false})); w.tasks.push(next);
  }
}
export function goalProgress(w,g) {
  const projectIds=new Set(w.projects.filter(p=>p.goalId===g.id).map(p=>p.id));
  const linked=w.tasks.filter(t=>(t.goalId===g.id||projectIds.has(t.projectId))&&t.status!=='cancelled'); const steps=g.milestones||[];
  const all=linked.length+steps.length; return all?Math.round((linked.filter(t=>t.status==='completed').length+steps.filter(s=>s.done).length)/all*100):0;
}
export function balance(w,a) {
  return w.transactions.reduce((sum,t)=>sum+(t.accountId===a.id?(t.kind==='income'?t.amount:-t.amount):t.kind==='transfer'&&t.toAccountId===a.id?t.amount:0),a.opening);
}
export function totals(w,month,currency) {
  const tx=w.transactions.filter(t=>t.date.startsWith(month)&&w.accounts.find(a=>a.id===t.accountId)?.currency===currency);
  return {income:tx.filter(t=>t.kind==='income').reduce((s,t)=>s+t.amount,0),expense:tx.filter(t=>t.kind==='expense').reduce((s,t)=>s+t.amount,0)};
}
export function weekDays(date,start=1) { const offset=(new Date(date+'T12:00:00Z').getUTCDay()-Number(start)+7)%7; return Array.from({length:7},(_,i)=>day(date,i-offset)); }
export function migrateLegacy(old) {
  const w=emptyWorkspace();
  w.tasks=(old.tasks||[]).map(t=>({...t,status:t.done?'completed':'todo',completedAt:t.done?t.date:null,subtasks:[],repeat:'none',createdAt:t.date}));
  w.events=(old.events||[]).map(e=>({...e,endTime:endTime(e.time,parseInt(e.duration)||30),repeat:'none'}));
  // Old seven-slot arrays and hard-coded streaks have no reliable date semantics.
  // Retain a copy locally; do not invent historical dates during migration.
  w.habits=(old.habits||[]).map(h=>({id:h.id,title:h.title,goal:h.goal,startDate:todayIn(),completions:[],legacyDays:h.days,weekdays:[]}));
  w.notes=(old.notes||[]).map(n=>({...n,createdAt:todayIn(),updatedAt:todayIn(),tags:'',folder:'',archived:false}));
  return w;
}
export function endTime(time,minutes) { const [h,m]=(time||'09:00').split(':').map(Number); return `${String(Math.min(23,Math.floor((h*60+m+minutes)/60))).padStart(2,'0')}:${String((m+minutes)%60).padStart(2,'0')}`; }
