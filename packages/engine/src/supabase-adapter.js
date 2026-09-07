function createSupabaseAdapter(supabase){
  if(!supabase) throw new Error('Supabase client required');
  return {
    async command(command){
      const {data,error}=await supabase.from('timeoe_commands').insert(command).select().single();
      if(error) throw error; return data;
    },
    async task(task){
      const {data,error}=await supabase.from('timeoe_execution_tasks').insert(task).select().single();
      if(error) throw error; return data;
    },
    async event(event){
      const {data,error}=await supabase.from('timeoe_events').insert(event).select().single();
      if(error) throw error; return data;
    },
    async agent(agent){
      const {data,error}=await supabase.from('timeoe_agents').upsert(agent).select().single();
      if(error) throw error; return data;
    }
  };
}
module.exports={createSupabaseAdapter};
