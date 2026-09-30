// Clutter backend adapter.
// Set CLUTTER_SUPABASE_URL and CLUTTER_SUPABASE_PUBLISHABLE_KEY in the eventual app runtime.
// Never place a Supabase secret/service-role key in browser code.

export function createClutterRepository(supabase) {
  return {
    async currentUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    async submitItem(item) {
      const user = await this.currentUser();
      if (!user) throw new Error('Authentication required');
      const { data, error } = await supabase.from('items').insert({
        seller_id: user.id,
        title: item.title,
        category: item.category,
        description: item.description || '',
        condition: item.condition || '',
        location: item.location || '',
        seller_asking_price: item.sellerAskingPrice || null,
        status: 'under_review'
      }).select().single();
      if (error) throw error;
      return data;
    },

    async staffItems() {
      const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  };
}
