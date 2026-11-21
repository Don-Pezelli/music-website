(() => {
  const form = document.querySelector('[data-reason-reflection]');
  if (!form) return;
  const storageKey = 'music-method-reason-to-make-music-v1';
  const fields = [...form.querySelectorAll('textarea[name]')];
  const status = form.querySelector('[data-reason-save-status]');
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    fields.forEach(field => { field.value = typeof saved[field.name] === 'string' ? saved[field.name] : ''; });
  } catch {
    if (status) status.textContent = 'Lokales Speichern ist in diesem Browser nicht verfügbar.';
  }
  let saveTimer;
  function save() {
    const answers = Object.fromEntries(fields.map(field => [field.name, field.value]));
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
      if (status) status.textContent = 'Leitbild in diesem Browser gespeichert.';
    } catch {
      if (status) status.textContent = 'Speichern nicht möglich. Deine Eingaben bleiben vorerst auf dieser Seite.';
    }
  }
  fields.forEach(field => field.addEventListener('input', () => {
    if (status) status.textContent = 'Änderungen werden gespeichert …';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 300);
  }));
  form.querySelector('[data-save-reason]')?.addEventListener('click', () => {
    clearTimeout(saveTimer);
    save();
  });
})();
