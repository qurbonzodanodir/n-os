import {emptyWorkspace,validate} from './domain.js';
export class WorkspaceStore {
  constructor(){this.data=emptyWorkspace();this.revision=0;this.loaded=false;this.busy=false;this.dirty=false;this.conflict=false;}
  async load(){const res=await fetch('/api/workspace',{cache:'no-store'});if(!res.ok)throw Error('loadError');const result=await res.json();this.data=result.workspace?validate(result.workspace):emptyWorkspace();this.revision=result.revision;this.loaded=true;this.dirty=false;this.conflict=false;return this.data;}
  async save(){
    if(!this.loaded||this.busy)throw Error('saving');
    if(this.conflict)throw Error('conflict');
    validate(this.data);this.busy=true;this.dirty=true;
    try{const res=await fetch('/api/workspace',{method:'PUT',headers:{'content-type':'application/json','x-nodir-client':'workspace-v2'},body:JSON.stringify({workspace:this.data,revision:this.revision})});if(res.status===409){this.conflict=true;throw Error('conflict');}if(!res.ok)throw Error('saveError');const result=await res.json();this.revision=result.revision;this.dirty=false;}
    finally{this.busy=false;}
  }
}
