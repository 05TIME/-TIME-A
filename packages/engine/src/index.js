const { randomUUID } = require('node:crypto');

const STATES = Object.freeze({ QUEUED:'QUEUED', RUNNING:'RUNNING', WAITING:'WAITING', VERIFIED:'VERIFIED', FAILED:'FAILED', RETRY:'RETRY', COMPLETED:'COMPLETED' });

class ExecutionGraph {
  constructor(){ this.tasks=new Map(); this.events=[]; }
  addTask(task){ this.tasks.set(task.id, task); return task; }
  emit(type,payload={}){ const event={id:randomUUID(),type,createdAt:new Date().toISOString(),payload}; this.events.push(event); return event; }
  ready(){ return [...this.tasks.values()].filter(t=>t.state===STATES.QUEUED && t.dependencies.every(id=>this.tasks.get(id)?.state===STATES.VERIFIED || this.tasks.get(id)?.state===STATES.COMPLETED)); }
  snapshot(){ return {tasks:[...this.tasks.values()],events:[...this.events]}; }
}

class TimeoeEngine {
  constructor({workers={}, maxRetries=3}={}){ this.graph=new ExecutionGraph(); this.workers=workers; this.maxRetries=maxRetries; }
  registerWorker(name,fn){ this.workers[name]=fn; }
  command(input){ const commandId=randomUUID(); this.graph.emit('COMMAND_RECEIVED',{commandId,input}); return {commandId,input}; }
  plan(commandId, steps=[]){ return steps.map((step,i)=>this.graph.addTask({id:randomUUID(),commandId,name:step.name||`step-${i+1}`,worker:step.worker,dependencies:step.dependencies||[],state:STATES.QUEUED,attempts:0,result:null,error:null})); }
  async runReady(){
    const ready=this.graph.ready();
    return Promise.all(ready.map(async task=>{
      task.state=STATES.RUNNING; task.attempts+=1; this.graph.emit('TASK_RUNNING',{taskId:task.id,commandId:task.commandId});
      try { const worker=this.workers[task.worker]; if(!worker) throw new Error(`Worker not registered: ${task.worker}`); task.result=await worker(task); task.state=STATES.VERIFIED; this.graph.emit('TASK_VERIFIED',{taskId:task.id,commandId:task.commandId}); return task; }
      catch(error){ task.error=error.message; task.state=task.attempts<this.maxRetries?STATES.RETRY:STATES.FAILED; if(task.state===STATES.RETRY) task.state=STATES.QUEUED; this.graph.emit('TASK_FAILED',{taskId:task.id,commandId:task.commandId,error:error.message,retry:task.state===STATES.QUEUED}); return task; }
    }));
  }
}

module.exports={ExecutionGraph,TimeoeEngine,STATES};
