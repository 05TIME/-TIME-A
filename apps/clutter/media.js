// Clutter media upload helper.
// Files are private and stored under <seller-user-id>/<item-id>/<timestamp>-<filename>.
export async function uploadItemMedia(supabase, itemId, file) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('Authentication required');
  if (!file) throw new Error('Select a photo or video first.');

  const isVideo = file.type.startsWith('video/');
  const isPhoto = file.type.startsWith('image/');
  if (!isPhoto && !isVideo) throw new Error('Only photos and videos are supported.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${auth.user.id}/${itemId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('clutter-media')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data, error: rowError } = await supabase.from('item_media').insert({
    item_id: itemId,
    storage_path: path,
    media_type: isVideo ? 'video' : 'photo'
  }).select().single();

  if (rowError) {
    await supabase.storage.from('clutter-media').remove([path]);
    throw rowError;
  }
  return data;
}

export async function createPrivateMediaUrl(supabase, storagePath, expiresIn=3600) {
  const { data, error } = await supabase.storage
    .from('clutter-media')
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
