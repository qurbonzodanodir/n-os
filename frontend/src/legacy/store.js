import {emptyWorkspace,validate} from './domain.js';
const developmentHeaders=import.meta.env.DEV?{'X-User-Id':'local-owner'}:{};
const pendingKey='n-os-pending-workspace-v1';
function readPending(){try{return JSON.parse(localStorage.getItem(pendingKey)||'null');}catch{return null;}}
function writePending(value){try{if(value)localStorage.setItem(pendingKey,JSON.stringify(value));else localStorage.removeItem(pendingKey);}catch{/* The in-memory draft remains available even when device storage is full. */}}
export class WorkspaceStore {
  /** @type {import('../types').Workspace} */
  data;
  constructor(){this.data=emptyWorkspace();this.revision=0;this.loaded=false;this.busy=false;this.dirty=false;this.conflict=false;}
  async load(){
    const pending=readPending();let result;
    try{const res=await fetch('/api/v1/workspace',{cache:'no-store',headers:developmentHeaders});if(!res.ok)throw Error('loadError');result=await res.json();}
    catch(error){if(!pending)throw error;this.data=validate(pending.workspace);this.revision=pending.revision;this.loaded=true;this.dirty=true;return this.data;}
    this.data=result.workspace?validate(result.workspace):emptyWorkspace();this.revision=result.revision;this.loaded=true;this.dirty=false;this.conflict=false;
    if(pending){this.data=validate(pending.workspace);this.dirty=true;this.conflict=pending.revision!==result.revision;this.revision=pending.revision;}
    return this.data;
  }
  async save(){
    if(!this.loaded||this.busy)throw Error('saving');
    if(this.conflict)throw Error('conflict');
    validate(this.data);this.busy=true;this.dirty=true;writePending({workspace:this.data,revision:this.revision});
    try{const res=await fetch('/api/v1/workspace',{method:'PUT',headers:{'content-type':'application/json','x-nodir-client':'workspace-v2',...developmentHeaders},body:JSON.stringify({workspace:this.data,revision:this.revision})});if(res.status===409){this.conflict=true;throw Error('conflict');}if(!res.ok)throw Error('saveError');const result=await res.json();this.revision=result.revision;this.dirty=false;writePending(null);}
    finally{this.busy=false;}
  }
}
