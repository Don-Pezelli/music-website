(() => {
  const STORAGE_KEY = 'music-method-course-workboards-v1';
  const phases = [
    ['Zu erlernende Fähigkeit bestimmen', 5],
    ['Lernziel und Kursumfang eingrenzen', 5],
    ['Teilziele und Voraussetzungen bestimmen', 5],
    ['Kurszusammenfassung schreiben', 5],
    ['Kapitel und didaktische Reihenfolge festlegen', 10],
    ['Kapiteltexte ausarbeiten, Medien und Tools planen', 15],
    ['Notationen, Grafiken, Tools und Audiomaterial erstellen', 20],
    ['Kurs redigieren und Querverweise setzen', 10],
    ['Videomaterial produzieren, sofern vorgesehen', 10],
    ['Übungen und Lernzielkontrollen prüfen', 5],
    ['Kurs praktisch testen und überarbeiten', 5],
    ['Abschließende Qualitätskontrolle und Freigabe', 5]
  ];

  const estimate = (done = [], active = [], notePhase = 0) => {
    const status = Array(phases.length).fill('open');
    status[8] = 'na'; // Video is not currently planned in these course drafts.
    done.forEach(phase => { status[phase - 1] = 'done'; });
    active.forEach(phase => { status[phase - 1] = 'in-progress'; });
    return { status, notePhase };
  };
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

  // Initial estimates are conservative snapshots of the material already in the project.
  // The first visit stores them so all displayed progress is calculated from saved statuses.
  const estimates = {
    'philosophie-1': estimate([], [1], 1),
    'philosophie-2': estimate([], [1], 1),
    'philosophie-3': estimate([1, 2, 3, 4], [5, 6, 8], 5),
    'philosophie-4': estimate([1, 2, 3, 4, 5, 6, 7], [8, 10], 8),
    'rhythmus-1': estimate(range(1, 7), [8, 10, 11], 8),
    'rhythmus-2': estimate(range(1, 7), [8, 10, 11], 8),
    'rhythmus-3': estimate(range(1, 7), [8, 10, 11], 8),
    'rhythmus-4': estimate(range(1, 7), [8, 10, 11], 8),
    'rhythmus-5': estimate(range(1, 7), [8, 10, 11], 8),
    'gehoertraining-1': estimate(range(1, 8), [10, 11], 11),
    'gehoerbildung-2': estimate(range(1, 5), [6, 7, 8, 10, 11], 6),
    'gehoertraining-3': estimate(range(1, 5), [6, 7, 8], 7),
    'melodie-1': estimate([...range(1, 8), 10], [11], 11),
    'notenschrift-1': estimate(range(1, 6), [7, 8, 10, 11], 7),
    'gesang-1': estimate(range(1, 5), [6, 8], 7),
    'harmonie-1': estimate(range(1, 6), [7, 8, 10], 7),
    'harmonie-2': estimate(range(1, 5), [6], 6),
    'gesang-einfuehrung': estimate(range(1, 8), [10, 11], 7),
    'gesang-2': estimate(range(1, 8), [10, 11], 11),
    'gesang-3': estimate(range(1, 5), [6, 7, 8], 7),
    'gitarre-1': estimate(range(1, 8), [10, 11], 11),
    'gitarre-2': estimate(range(1, 8), [10, 11], 11),
    'gitarre-6': estimate(range(1, 5), [6, 7, 8], 6),
    'gitarre-3': estimate(range(1, 6), [7, 8, 10, 11], 5),
    'gitarre-7': estimate([...range(1, 8), 10], [11], 11),
    'gitarre-5': estimate(range(1, 5), [6], 5),
    'gitarre-4': estimate([...range(1, 8), 10], [11], 11),
    'gitarre-8': estimate([...range(1, 8), 10], [11], 11),
    'learning-path': estimate(range(1, 4), [5, 6, 7, 8, 10, 11], 7),
    'musikertraining-1': estimate(range(1, 5), [6, 8], 7)
  };

  const boardNotes = {
    'rhythmus-6': 'Groove-Aufgaben entwickeln, innere Zeit schrittweise aufbauen und die rhythmischen Grundlagen praktisch einbinden.',
    'harmonie-1': 'Kursstruktur und Übungen ausarbeiten; die vorhandenen Tonfarb-Grafiken didaktisch einbetten.',
    'harmonie-2': 'Akkordfolgen, Hörbeispiele und praktische Aufgaben ausarbeiten.',
    'gesang-einfuehrung': 'Kursinhalte und Anatomie-Galerie sind angelegt; Übungen und praktische Überprüfung ergänzen.',
    'gesang-2': 'Die Intonationsübungen und Tools sind vorhanden; Kursablauf und Übungen praktisch weiter prüfen.',
    'gesang-3': 'Aufgaben, Hörbeispiele und Grafiken für Register, Resonanz und Klanggestaltung ergänzen.',
    'gitarre-1': 'Prinzipienkurs mit Übungen redigieren und praktisch auf Verständlichkeit prüfen.',
    'gitarre-2': 'Übungen und Griffbrettgrafiken praktisch prüfen und den Lernweg redigieren.',
    'gitarre-6': 'Übungen und passende Griffbrettgrafiken ergänzen; Oktavmuster verständlich ausarbeiten.',
    'gitarre-3': 'Offene Akkorde, Trockenübungen und bewegliche Formen mit Griffbildern und Liedaufgaben ausarbeiten.',
    'gitarre-7': 'Kursinhalte und interaktive Griffbrettgrafiken praktisch prüfen; Noteneingabe und Aufgabenablauf überarbeiten.',
    'gitarre-5': 'Kursstruktur und konkrete Melodiespiel-Aufgaben entwickeln.',
    'gitarre-4': 'Griffwege und interaktive Grafiken überprüfen; Übergänge und Übungen redigieren.',
    'gitarre-8': 'Tonleiterakkorde und Gitarrengriffe praktisch prüfen; Hör- und Liedaufgaben ergänzen.',
    'learning-path': 'Einstufungstests entwickeln, Antworten und Ergebnisse speichern sowie Empfehlungen nachvollziehbar mit passenden Kursen, Kapiteln und Voraussetzungen verknüpfen und praktisch prüfen.',
    'philosophie-4': 'Sechs Kapitel, Reflexionsfragen, Pflanzen-Grafik und lokal gespeichertes Leitbild sind angelegt. Kurs redigieren und mit Lernenden praktisch prüfen.',
    'philosophie-5': 'Neun Kapitel und ein fortlaufender, lokal gespeicherter Übungsplan sind angelegt. Inhalte redigieren und die Vorlage praktisch erproben.'
  };

  const statusLabels = {
    open: 'Offen',
    'in-progress': 'In Arbeit',
    done: 'Abgeschlossen',
    na: 'Entfällt'
  };
  const statusValues = ['open', 'in-progress', 'done', 'na'];
  const defaultRecord = (courseId, note) => {
    const initial = estimates[courseId] || estimate();
    const comments = {};
    if (note && initial.notePhase) comments[initial.notePhase - 1] = note;
    return {
      status: [...initial.status],
      comments,
      generalNote: '',
      updatedAt: null
    };
  };

  let savedData = {};
  let storageAvailable = true;
  try {
    savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!savedData || typeof savedData !== 'object' || Array.isArray(savedData)) savedData = {};
  } catch {
    storageAvailable = false;
    savedData = {};
  }

  const targets = [...document.querySelectorAll('.catalog-card, #lernwege[data-workboard-id]')];
  const boards = targets.map(target => {
    const isCourseCard = target.classList.contains('catalog-card');
    let board = isCourseCard
      ? target.querySelector(':scope > .catalog-work-note')
      : target.querySelector(':scope > .catalog-work-note[data-workboard-id]');
    if (!board && isCourseCard) {
      board = document.createElement('aside');
      board.className = 'catalog-work-note';
      const label = document.createElement('strong');
      label.textContent = 'Baustelle';
      const note = document.createElement('span');
      note.textContent = boardNotes[target.id] || 'Kursinhalte anhand des vorhandenen Materials weiter ausarbeiten.';
      board.append(label, note);
      target.append(board);
    }
    return board;
  }).filter(Boolean);
  let needsSeedSave = false;

  const setRecordShape = (record, defaultRecordValue) => {
    if (!Array.isArray(record.status)) record.status = [...defaultRecordValue.status];
    record.status = phases.map((_, index) => statusValues.includes(record.status[index]) ? record.status[index] : defaultRecordValue.status[index]);
    if (!record.comments || typeof record.comments !== 'object' || Array.isArray(record.comments)) record.comments = { ...defaultRecordValue.comments };
    else record.comments = { ...defaultRecordValue.comments, ...record.comments };
    if (typeof record.generalNote !== 'string') record.generalNote = '';
    return record;
  };

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
      storageAvailable = true;
      return true;
    } catch {
      storageAvailable = false;
      return false;
    }
  };

  const percentFor = status => {
    let eligibleWeight = 0;
    let completedWeight = 0;
    phases.forEach(([, weight], index) => {
      const value = status[index];
      if (value === 'na') return;
      eligibleWeight += weight;
      if (value === 'done') completedWeight += weight;
      if (value === 'in-progress') completedWeight += weight * 0.5;
    });
    return eligibleWeight ? Math.round(completedWeight / eligibleWeight * 100) : 0;
  };

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const renderBoard = board => {
    const card = board.closest('.catalog-card');
    const target = card || board.closest('[data-workboard-id]');
    const courseId = card?.id || board.dataset.workboardId;
    if (!target || !courseId) return;
    const summary = board.querySelector('span')?.textContent.trim() || '';
    const recordDefaults = defaultRecord(courseId, summary);
    if (!savedData[courseId]) {
      savedData[courseId] = recordDefaults;
      needsSeedSave = true;
    }
    const record = setRecordShape(savedData[courseId], recordDefaults);
    board.classList.add('course-workboard');
    board.setAttribute('aria-label', `Baustellentafel für ${card?.querySelector('h3')?.textContent.trim() || 'den individuellen Lernweg'}`);
    board.replaceChildren();

    const hazard = make('div', 'workboard-hazard');
    hazard.setAttribute('aria-hidden', 'true');
    hazard.append(make('span', '', '🚧'));
    hazard.append(make('strong', '', 'Baustelle'));
    board.append(hazard);

    const sign = make('div', 'workboard-sign');
    const titleRow = make('div', 'workboard-title-row');
    titleRow.append(make('strong', 'workboard-title', 'Kursentwicklung'));
    const progress = make('span', 'workboard-percent');
    titleRow.append(progress);
    sign.append(titleRow);
    sign.append(make('p', 'workboard-summary', summary));

    const meter = make('div', 'workboard-meter');
    meter.setAttribute('role', 'progressbar');
    meter.setAttribute('aria-label', 'Gewichteter Fortschritt der Kursentwicklung');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', '100');
    const meterFill = make('span', 'workboard-meter-fill');
    meter.append(meterFill);
    sign.append(meter);

    const active = make('p', 'workboard-active');
    sign.append(active);
    sign.append(make('p', 'workboard-estimate-note', 'Erste Schätzung anhand des vorhandenen Materials. Status und Kommentare kannst du anpassen; Änderungen werden in diesem Browser gespeichert.'));

    const details = document.createElement('details');
    details.className = 'workboard-details';
    const detailsSummary = make('summary', '', 'Entwicklungsphasen bearbeiten');
    details.append(detailsSummary);
    const generalNotes = make('section', 'workboard-general-notes');
    generalNotes.append(make('h4', '', 'Allgemeine Notizen'));
    const generalNoteLabel = make('label', 'workboard-control-label', 'Letzter Stand und nächste Schritte');
    const generalNoteInput = document.createElement('textarea');
    generalNoteInput.rows = 3;
    generalNoteInput.maxLength = 3000;
    generalNoteInput.setAttribute('aria-label', 'Allgemeine Notizen zum Kurs');
    generalNoteInput.placeholder = 'Was hast du zuletzt bearbeitet? Was möchtest du als Nächstes tun?';
    generalNoteInput.value = record.generalNote;
    generalNoteLabel.append(generalNoteInput);
    generalNotes.append(generalNoteLabel);
    generalNoteInput.addEventListener('input', () => {
      record.generalNote = generalNoteInput.value;
      record.updatedAt = new Date().toISOString();
      savedData[courseId] = record;
      const stored = persist();
      saveMessage.textContent = stored ? 'Änderung gespeichert.' : 'Speicherung in diesem Browser nicht verfügbar.';
    });
    const phaseList = make('div', 'workboard-phase-list');
    const saveMessage = make('p', 'workboard-save-message');
    saveMessage.setAttribute('role', 'status');
    saveMessage.setAttribute('aria-live', 'polite');
    details.append(generalNotes, phaseList, saveMessage);

    phases.forEach(([name, weight], index) => {
      const phase = make('section', 'workboard-phase');
      const header = make('div', 'workboard-phase-header');
      header.append(make('h4', '', `${index + 1}. ${name}`));
      header.append(make('span', 'workboard-phase-weight', `${weight} %`));
      phase.append(header);

      const selectLabel = make('label', 'workboard-control-label', `Status · ${name}`);
      const select = document.createElement('select');
      select.setAttribute('aria-label', `Status für Phase ${index + 1}: ${name}`);
      statusValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = statusLabels[value];
        select.append(option);
      });
      select.value = record.status[index];
      selectLabel.append(select);
      phase.append(selectLabel);

      const commentLabel = make('label', 'workboard-control-label', 'Kommentar');
      const textarea = document.createElement('textarea');
      textarea.rows = 2;
      textarea.maxLength = 1000;
      textarea.setAttribute('aria-label', `Kommentar für Phase ${index + 1}: ${name}`);
      textarea.placeholder = 'Notiz zur Phase (optional)';
      textarea.value = String(record.comments[index] || '');
      commentLabel.append(textarea);
      phase.append(commentLabel);

      const saveChange = () => {
        record.status[index] = select.value;
        record.comments[index] = textarea.value;
        record.updatedAt = new Date().toISOString();
        savedData[courseId] = record;
        const stored = persist();
        saveMessage.textContent = stored ? 'Änderung gespeichert.' : 'Speicherung in diesem Browser nicht verfügbar.';
        updateSummary();
      };
      select.addEventListener('change', saveChange);
      textarea.addEventListener('input', saveChange);
      phaseList.append(phase);
    });

    sign.append(details);
    board.append(sign);

    function updateSummary() {
      const percent = percentFor(record.status);
      progress.textContent = `${percent} %`;
      meter.setAttribute('aria-valuenow', String(percent));
      meter.setAttribute('aria-valuetext', `${percent} Prozent`);
      meterFill.style.width = `${percent}%`;
      const activePhases = phases.flatMap(([name], index) => record.status[index] === 'in-progress' ? [`${index + 1}. ${name}`] : []);
      active.textContent = activePhases.length ? `Aktuell in Arbeit: ${activePhases.join(' · ')}` : 'Aktuell ist keine Phase als „In Arbeit“ markiert.';
    }
    updateSummary();
  };

  boards.forEach(renderBoard);
  if (needsSeedSave) persist();
})();
