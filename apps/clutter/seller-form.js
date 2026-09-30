// Clutter seller form controller.
// Expects a Supabase client and the media.js uploadItemMedia helper.
export function createSellerForm({ supabase, submitItem, uploadItemMedia, onSubmitted }) {
  const form = document.querySelector('#clutter-seller-form');
  const filesInput = document.querySelector('#clutter-media-files');
  const progress = document.querySelector('#clutter-upload-progress');
  const result = document.querySelector('#clutter-submit-result');
  if (!form || !filesInput) throw new Error('Seller form markup not found.');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    result.textContent = '';
    progress.textContent = 'Submitting item…';

    try {
      const item = await submitItem({
        title: form.title.value.trim(),
        category: form.category.value,
        condition: form.condition.value.trim(),
        location: form.location.value.trim(),
        askingPrice: form.askingPrice.value ? Number(form.askingPrice.value) : null,
        description: form.description.value.trim()
      });

      const files = Array.from(filesInput.files || []);
      for (let i = 0; i < files.length; i++) {
        progress.textContent = `Uploading media ${i + 1} of ${files.length}…`;
        await uploadItemMedia(supabase, item.id, files[i]);
      }

      progress.textContent = files.length
        ? `Submitted with ${files.length} media file(s).`
        : 'Submitted. An agent can request photos or video during verification.';
      result.textContent = 'Your item is now in the agent review queue.';
      form.reset();
      if (onSubmitted) onSubmitted(item);
    } catch (error) {
      progress.textContent = '';
      result.textContent = error.message || 'Submission failed. Please try again.';
    }
  });
}
