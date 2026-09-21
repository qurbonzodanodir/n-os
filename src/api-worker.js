import { validate } from './domain.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function api(request,env) {
  const path=new URL(request.url).pathname;
  if(path==='/health') return json({ok:true});
  if(path!=='/api/workspace') return json({error:'not_found'},404);
  const owner=request.headers.get('oai-authenticated-user-id');
  if(!owner) return json({error:'unauthorized'},401);
  if(!env.DB) return json({error:'storage_unavailable'},503);
  try {
    if(request.method==='GET') {
      const row=await env.DB.prepare('SELECT payload, revision FROM workspaces WHERE owner_id = ?').bind(owner).first();
      return json({workspace:row?JSON.parse(row.payload):null,revision:row?.revision||0});
    }
    if(request.method!=='PUT') return json({error:'method'},405);
    if(request.headers.get('x-nodir-client')!=='workspace-v2') return json({error:'origin'},403);
    const origin=request.headers.get('origin');
    if(origin&&origin!==new URL(request.url).origin) return json({error:'origin'},403);
    const raw=await request.text();
    if(raw.length>1500000) return json({error:'limit'},413);
    let body; try {body=JSON.parse(raw);validate(body.workspace);}catch{return json({error:'invalid'},422);}
    const {workspace,revision}=body;
    if(!Number.isSafeInteger(revision)||revision<0) return json({error:'revision'},422);
    const payload=JSON.stringify(workspace); const updated=new Date().toISOString();
    if(revision===0) {
      const result=await env.DB.prepare('INSERT INTO workspaces (owner_id,payload,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,payload,updated).run();
      if(!result.meta.changes) return json({error:'conflict'},409);
    } else {
      const result=await env.DB.prepare('UPDATE workspaces SET payload = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ?').bind(payload,updated,owner,revision).run();
      if(!result.meta.changes) return json({error:'conflict'},409);
    }
    return json({revision:revision+1});
  } catch(error) { console.error('workspace_storage_failure',error?.name); return json({error:'storage_unavailable'},503); }
}
