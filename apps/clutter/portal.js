// Clutter persistent workflow adapter.
export function createPortal(supabase) {
  async function user() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({email, password});
    if (error) throw error;
    return data.user;
  }

  async function signUp(email, password, fullName, role='seller') {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id, full_name: fullName, role
      });
      if (profileError) throw profileError;
    }
    return data;
  }

  async function submitItem(form) {
    const u = await user();
    if (!u) throw new Error('Please sign in first.');
    const { data, error } = await supabase.from('items').insert({
      seller_id:u.id, title:form.title, category:form.category,
      description:form.description || '', condition:form.condition || '',
      location:form.location || '', seller_asking_price:form.askingPrice || null,
      status:'under_review'
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function staffQueue() {
    const { data, error } = await supabase.from('items').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    return data || [];
  }

  async function updateItem(id, patch) {
    const { data, error } = await supabase.from('items').update({...patch, updated_at:new Date().toISOString()}).eq('id',id).select().single();
    if (error) throw error;
    return data;
  }

  return { user, signIn, signUp, submitItem, staffQueue, updateItem };
}
