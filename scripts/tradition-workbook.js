const workbook = document.querySelector('[data-tradition-workbook]');

if (workbook) {
  const key = 'music-method-finding-my-tradition-v1';
  const fields = [...workbook.querySelectorAll('[data-tradition-field]')];
  const status = workbook.querySelector('[data-tradition-status]');
  let saved = {};

  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (data && typeof data === 'object') saved = data;
  } catch {
    status.textContent = 'Die gespeicherten Einträge konnten nicht geladen werden.';
  }

  fields.forEach(field => {
    const value = saved[field.dataset.traditionField];
    if (typeof value === 'string') field.value = value;
  });

  workbook.addEventListener('input', event => {
    if (!event.target.matches('[data-tradition-field]')) return;
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(
        fields.map(field => [field.dataset.traditionField, field.value])
      )));
      status.textContent = 'Deine Einträge werden in diesem Browser gespeichert.';
    } catch {
      status.textContent = 'Dieser Browser konnte deine Einträge nicht speichern.';
    }
  });
}
