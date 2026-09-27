import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

test('dashboard loads, seeds examples, persists them, and switches language', async () => {
  const window=new Window({url:'https://n-os.test/'});
  window.document.write(await readFile(new URL('../index.html',import.meta.url),'utf8'));
  const media={matches:false,addEventListener(){},removeEventListener(){}};
  window.matchMedia=()=>media;
  window.scrollTo=()=>{};
  const workspace={schema:2,settings:{name:'',language:'ru',theme:'system',timezone:'Asia/Dushanbe',currency:'TJS',weekStart:1,reducedTransparency:false},tasks:[],events:[],habits:[],notes:[],projects:[],goals:[],accounts:[],transactions:[],budgets:[],reviews:[]};
  let revision=0,lastSaved=null;
  const fetch=async (_url,options={})=>{
    if(String(_url).startsWith('/api/prayer-times'))return new Response(JSON.stringify({date:'2026-09-27',timings:{Fajr:'05:00',Sunrise:'06:20',Dhuhr:'12:30',Asr:'16:00',Maghrib:'18:40',Isha:'20:00'},hijri:'16-04-1448',timezone:'Asia/Dushanbe'}),{status:200,headers:{'content-type':'application/json'}});
    if(options.method==='PUT'){
      const body=JSON.parse(options.body);
      assert.equal(body.revision,revision);
      lastSaved=body.workspace;revision+=1;
      return new Response(JSON.stringify({revision}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({workspace,revision}),{status:200,headers:{'content-type':'application/json'}});
  };
  Object.assign(globalThis,{window,document:window.document,location:window.location,history:window.history,localStorage:window.localStorage,sessionStorage:window.sessionStorage,FormData:window.FormData,Blob:window.Blob,File:window.File,HTMLElement:window.HTMLElement,HTMLDialogElement:window.HTMLDialogElement,matchMedia:window.matchMedia,fetch});
  const realSetInterval=globalThis.setInterval;
  globalThis.setInterval=()=>0;
  try{
    await import(`../app.js?ui=${Date.now()}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(document.title,'Сегодня · n-os');
    const demo=document.querySelector('[data-action="demo"]');
    assert.ok(demo);
    demo.click();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(lastSaved.tasks.length,1);
    assert.equal(lastSaved.events.length,1);
    assert.equal(lastSaved.notes.length,1);
    document.querySelector('[data-action="language"]').click();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(lastSaved.settings.language,'en');
    assert.equal(document.title,'Today · n-os');
    document.querySelector('[data-action="view"][data-value="islam"]').click();
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.match(document.title,/Islam/);
    assert.equal(document.querySelector('[data-value="arabicStudy"]'),null);
    document.querySelector('[data-action="islam-tab"][data-value="surahs"]').click();
    assert.equal(document.querySelectorAll('[data-action="open-surah"]').length,12);
    document.querySelector('[data-action="islam-tab"][data-value="azkar"]').click();
    assert.equal(document.querySelectorAll('[data-action="zikr-category"]').length,6);
    document.querySelector('[data-action="zikr-count"]').click();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(Object.values(lastSaved.islam.azkar)[0]['morning-life'],1);
  } finally {
    globalThis.setInterval=realSetInterval;
    window.close();
  }
});
