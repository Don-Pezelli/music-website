(() => {
  const KEY = 'music-method-gehoerbildung1-progress-v1';
  const empty = () => ({ largeIntervals: { attempts: 0, correct: 0 }, singleTones: { attempts: 0, hits: 0 }, earTraining: {}, sequences: {} });
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '{}');
      const data = empty();
      data.largeIntervals = { attempts: Number(value.largeIntervals?.attempts) || 0, correct: Number(value.largeIntervals?.correct) || 0 };
      data.singleTones = { attempts: Number(value.singleTones?.attempts) || 0, hits: Number(value.singleTones?.hits) || 0 };
      for (const [group, score] of Object.entries(value.sequences || {})) data.sequences[group] = { attempts: Number(score.attempts) || 0, correct: Number(score.correct) || 0 };
      for (const [stage, score] of Object.entries(value.earTraining || {})) {
        data.earTraining[stage] = { attempts: Number(score.attempts) || 0, correct: Number(score.correct) || 0 };
      }
      return data;
    } catch { return empty(); }
  };
  const progress = read();
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* Storage can be disabled. */ } };
  const percent = score => score.attempts ? Math.round(score.correct / score.attempts * 100) : 0;
  const earLabels = { '7-11': 'große Abstände', '3-7': 'mittlere Abstände', '2-4': 'kleine Abstände', all: 'Tonpaare' };

  const earOutputs = [...document.querySelectorAll('[data-ear-saved-progress]')];
  const updateEarOutput = () => {
    earOutputs.forEach(output => {
      const stage = output.dataset.earSavedProgress, score = progress.earTraining[stage];
      output.textContent = score?.attempts
        ? `Gespeichert: ${score.correct} von ${score.attempts} in dieser Station richtig.`
        : 'Ergebnisse dieser Station werden auf diesem Gerät gespeichert.';
    });
  };
  window.recordEarTrainingResult = (stage, hit) => {
    const score = progress.earTraining[stage] || (progress.earTraining[stage] = { attempts: 0, correct: 0 });
    score.attempts += 1;
    if (hit) score.correct += 1;
    write(); updateEarOutput();
  };
  updateEarOutput();

  const toneOutput = document.getElementById('single-tone-progress');
  const updateToneOutput = () => {
    if (!toneOutput) return;
    const score = progress.singleTones;
    toneOutput.textContent = score.attempts
      ? `Einzeltöne: ${score.hits} von ${score.attempts} Zieltönen mindestens zwei Sekunden im Zielbereich gehalten. Gespeichert auf diesem Gerät.`
      : 'Zielton-Treffer werden auf diesem Gerät gespeichert.';
  };
  window.recordSingleToneAttempt = () => { progress.singleTones.attempts += 1; write(); updateToneOutput(); };
  window.recordSingleToneHit = () => { progress.singleTones.hits += 1; write(); updateToneOutput(); };
  updateToneOutput();

  const intervalOutput = document.getElementById('large-interval-progress');
  const updateIntervalOutput = () => {
    if (!intervalOutput) return;
    const score = progress.largeIntervals;
    intervalOutput.textContent = score.attempts
      ? `Bisher geprüft: ${score.attempts} ${score.attempts === 1 ? 'Intervall' : 'Intervalle'} · ${score.correct} richtig (${percent(score)} %). Dein Lernstand wird auf diesem Gerät gespeichert.`
      : 'Dein Lernstand wird auf diesem Gerät gespeichert.';
  };
  window.recordLargeIntervalResult = hit => {
    progress.largeIntervals.attempts += 1;
    if (hit) progress.largeIntervals.correct += 1;
    write(); updateIntervalOutput();
  };
  updateIntervalOutput();

  const sequenceLabels = { middleIntervals: 'mittlere Intervalle', smallIntervals: 'kleine Intervalle', simpleMelodies: 'einfache Melodien', advancedMelodies: 'anspruchsvollere Melodien' };
  window.recordSequenceResult = (group, correct, total) => {
    const score = progress.sequences[group] || (progress.sequences[group] = { attempts: 0, correct: 0 });
    score.attempts += total; score.correct += correct; write();
    return `Gespeichert: ${score.correct} von ${score.attempts} Tönen in ${sequenceLabels[group] || group} getroffen.`;
  };

  const summary = document.getElementById('learning-path-summary');
  if (!summary) return;
  const table = document.getElementById('learning-path-results');
  const recommendationLink = document.getElementById('learning-path-link');
  const totalEar = Object.entries(progress.earTraining).filter(([stage]) => stage !== 'all').reduce((total, [, score]) => ({ attempts: total.attempts + score.attempts, correct: total.correct + score.correct }), { attempts: 0, correct: 0 });
  const stages = [
    { key: 'direction', label: 'Höher, tiefer oder gleich?', score: totalEar, minimum: 30, threshold: .8, href: 'melodie-1-kapitel-1.html#hoertraining', details: ['7-11', '3-7', '2-4'].map(stage => { const score = progress.earTraining[stage]; return score?.attempts ? `${earLabels[stage]} ${score.correct}/${score.attempts}` : null; }).filter(Boolean).join(' · ') },
    { key: 'singleTones', label: 'Einzelne Töne nachsingen', score: { attempts: progress.singleTones.attempts, correct: progress.singleTones.hits }, minimum: 5, threshold: .7, href: 'melodie-1-kapitel-2.html#voice-trainer' },
    { key: 'largeIntervals', label: 'Große Intervalle · Quinte bis Septime', score: progress.largeIntervals, minimum: 3, threshold: .75, href: 'melodie-1-kapitel-2.html#large-interval-trainer' },
    { key: 'middleIntervals', label: 'Mittlere Intervalle · Terz bis Quinte', score: progress.sequences.middleIntervals || { attempts: 0, correct: 0 }, minimum: 6, threshold: .7, href: 'melodie-1-kapitel-2.html#sequence-middleIntervals' },
    { key: 'smallIntervals', label: 'Kleine Intervalle · Sekunde bis Terz', score: progress.sequences.smallIntervals || { attempts: 0, correct: 0 }, minimum: 6, threshold: .7, href: 'melodie-1-kapitel-2.html#sequence-smallIntervals' },
    { key: 'simpleMelodies', label: 'Einfache Melodien', score: progress.sequences.simpleMelodies || { attempts: 0, correct: 0 }, minimum: 10, threshold: .7, href: 'melodie-1-kapitel-2.html#sequence-simpleMelodies' },
    { key: 'advancedMelodies', label: 'Anspruchsvollere Melodien', score: progress.sequences.advancedMelodies || { attempts: 0, correct: 0 }, minimum: 10, threshold: .7, href: 'melodie-1-kapitel-2.html#sequence-advancedMelodies' }
  ];
  const addCell = (row, value) => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); };
  stages.forEach(stage => {
    const { attempts, correct } = stage.score;
    const rate = attempts ? correct / attempts : null;
    const enough = attempts >= stage.minimum;
    const state = enough ? (rate >= stage.threshold ? 'ready' : 'retry') : 'pending';
    const label = enough ? (rate >= stage.threshold ? 'Sicher' : 'Hier wiederholen') : (attempts ? `Noch ${stage.minimum - attempts} nötig` : 'Noch keine Ergebnisse');
    const row = document.createElement('tr'); row.dataset.state = state;
    addCell(row, stage.label);
    addCell(row, attempts ? `${correct} von ${attempts} richtig · ${percent(stage.score)} %${stage.details ? ` · ${stage.details}` : ''}` : '—');
    addCell(row, label);
    table?.append(row);
  });
  const next = stages.find(stage => stage.score.attempts < stage.minimum || stage.score.correct / stage.score.attempts < stage.threshold);
  if (!next) {
    summary.textContent = 'Du hast alle Übungsstufen sicher abgeschlossen. Als Nächstes kannst du mit dem Intervalltraining in Gehörbildung 2 weitermachen.';
    if (recommendationLink) recommendationLink.innerHTML = '<a class="button" href="kurs-gehoerbildung-2.html">Zu Gehörbildung 2 →</a>';
  } else {
    const { attempts, correct } = next.score;
    if (attempts >= next.minimum) {
      summary.textContent = `Deine Ergebnisse werden ab „${next.label}“ unsicher: ${correct} von ${attempts} richtig (${percent(next.score)} %). Setze deinen Lernweg hier fort und wiederhole diese Stufe.`;
    } else if (attempts) {
      summary.textContent = `Für „${next.label}“ gibt es bisher ${correct} von ${attempts} richtige Ergebnisse. Sammle noch mindestens ${next.minimum - attempts} weitere, bevor du zur nächsten Stufe wechselst.`;
    } else {
      summary.textContent = `Beginne mit „${next.label}“. Für diese Stufe liegen noch keine Ergebnisse vor; danach zeigt dir die Übersicht, ob du weitergehen oder hier üben solltest.`;
    }
    if (recommendationLink) recommendationLink.innerHTML = `<a class="button" href="${next.href}">Zur empfohlenen Übung →</a>`;
  }
})();
