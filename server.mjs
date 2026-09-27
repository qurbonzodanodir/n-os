import {createServer} from 'node:http';
import {readFile,mkdir,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {api} from './src/api-worker.js';
await mkdir('.local',{recursive:true});
const db=new DatabaseSync('.local/workspace.sqlite');
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()) {
  db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(file)){db.exec(await readFile('drizzle/'+file,'utf8'));db.prepare('INSERT INTO local_migrations VALUES (?)').run(file);}
}
const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}};}};}};
const publicFiles=new Set(['index.html','styles.css','app.js','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','src/domain.js','src/i18n.js','src/store.js','src/icons.js','src/islam-content.js']);
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost:'+ (process.env.PORT||4173));
    if(url.pathname.startsWith('/api/')||url.pathname==='/health'){
      // Local dev identity only. The deployed Worker never invents identity.
      const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-development');
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
      const response=await api(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const path=url.pathname==='/'?'index.html':url.pathname.slice(1);
    if(!publicFiles.has(path)){res.writeHead(404);res.end();return;}
    const type=path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':path.endsWith('.webmanifest')?'application/manifest+json':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.png')?'image/png':'text/html';res.setHeader('content-type',type);res.end(await readFile(path));
  }catch{res.writeHead(500);res.end('Local server error');}
}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Local workspace server ready'));
