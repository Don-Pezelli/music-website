(() => {
  const form = document.querySelector('[data-practice-system]');
  if (!form) return;

  const storageKey = 'music-method-practice-system-v1';
  const fields = [...document.querySelectorAll('[data-practice-field]')];
  const statusNodes = [...document.querySelectorAll('[data-practice-status]')];
  const summaries = [...document.querySelectorAll('[data-practice-summary]')];
  let values = {};
  let storageAvailable = true;
  let saveTimer;

  function setStatus(message) {
    statusNodes.forEach(node => { node.textContent = message; });
  }

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) values = stored;
    fields.forEach(field => {
      const value = values[field.dataset.practiceField];
      if (typeof value === 'string') field.value = value;
    });
  } catch {
    storageAvailable = false;
    setStatus('Lokales Speichern ist in diesem Browser nicht verfügbar.');
  }

  function updateSummaries() {
    summaries.forEach(summary => {
      const value = String(values[summary.dataset.practiceSummary] || '').trim();
      if (!value) {
        summary.textContent = 'Noch nicht eingetragen.';
        return;
      }
      const compact = value.replace(/\s+/g, ' ');
      summary.textContent = compact.length > 230 ? `${compact.slice(0, 227).trimEnd()}…` : compact;
    });
  }

  function persist() {
    clearTimeout(saveTimer);
    if (!storageAvailable) {
      setStatus('Speicherung nicht verfügbar. Deine Eingaben bleiben vorerst auf dieser Seite.');
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
      setStatus('Einträge in diesem Browser gespeichert.');
    } catch {
      storageAvailable = false;
      setStatus('Speichern nicht möglich. Deine Eingaben bleiben vorerst auf dieser Seite.');
    }
  }

  function updateField(source) {
    const key = source.dataset.practiceField;
    const value = source.value;
    values[key] = value;
    fields.filter(field => field !== source && field.dataset.practiceField === key)
      .forEach(field => { field.value = value; });
    updateSummaries();
    setStatus(storageAvailable ? 'Änderungen werden gespeichert …' : 'Lokales Speichern ist in diesem Browser nicht verfügbar.');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
  }

  fields.forEach(field => {
    field.addEventListener('input', () => updateField(field));
    field.addEventListener('change', () => updateField(field));
  });
  form.addEventListener('submit', event => event.preventDefault());
  form.querySelector('[data-practice-save]')?.addEventListener('click', persist);
  updateSummaries();
})();
