(() => {
  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  function cloneRadioTemplate(template) {
    const radio = template.cloneNode(true);
    radio.querySelector('[data-radio-pattern-panel]')?.remove();
    delete radio.dataset.radioTaskSequence;
    return radio;
  }

  function notationEvents(alt) {
    const source = String(alt || '');
    const labeledBars = [...source.matchAll(/Takt\s+\d+\s*:?\s*([\s\S]*?)(?=Takt\s+\d+\s*:?\s*|$)/gi)];
    const listedBars = !labeledBars.length ? source.match(/(?:\d+|ein|zwei|drei|vier|fünf|sechs|sieben|acht)\s+4\/4-Takte\s*:\s*(.+)$/i)?.[1].split(/,\s*/).map(description => ({ 1: description })) : null;
    const bars = labeledBars.length ? labeledBars : (listedBars || []);
    if (!bars.length) {
      if (/Achtelpause[n]?.*wechseln.*kurzen Tönen/i.test(alt || '')) {
        const noteEvents = [];
        for (let bar = 0; bar < 2; bar += 1) {
          for (let beat = 0; beat < 4; beat += 1) noteEvents.push({ beat: bar * 4 + beat, duration: 0.5 });
        }
        return { noteEvents, durationBeats: 8 };
      }
      return null;
    }

    const quantity = '(?:(\\d+|ein(?:e|en)?|zwei|drei|vier|fünf|sechs|sieben|acht)\\s+)?';
    const values = [
      [new RegExp(`${quantity}ganze\\s+Paus(?:e|en)`, 'gi'), 4, false],
      [new RegExp(`${quantity}halbe\\s+Paus(?:e|en)`, 'gi'), 2, false],
      [new RegExp(`${quantity}Viertelpause(?:n)?`, 'gi'), 1, false],
      [new RegExp(`${quantity}Achtelpause(?:n)?`, 'gi'), 0.5, false],
      [new RegExp(`${quantity}ganze\\s+Not(?:e|en)`, 'gi'), 4, true],
      [new RegExp(`${quantity}halbe\\s+Not(?:e|en)`, 'gi'), 2, true],
      [new RegExp(`${quantity}Viertelnote(?:n)?`, 'gi'), 1, true],
      [new RegExp(`${quantity}Achtelnote(?:n)?`, 'gi'), 0.5, true]
    ];
    const countFor = value => ({ ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8 })[String(value || '').toLowerCase()] || Number(value) || 1;
    const noteEvents = [];
    for (const [index, bar] of bars.entries()) {
      const description = typeof bar === 'string' ? bar : bar[1];
      const tokens = [];
      values.forEach(([pattern, duration, isNote]) => {
        for (const match of description.matchAll(pattern)) tokens.push({ index: match.index, count: countFor(match[1]), duration, isNote });
      });
      tokens.sort((a, b) => a.index - b.index);
      if (!tokens.length) return null;
      let elapsed = 0;
      for (const token of tokens) {
        for (let repeat = 0; repeat < token.count; repeat += 1) {
          if (token.isNote) noteEvents.push({ beat: index * 4 + elapsed, duration: token.duration });
          elapsed += token.duration;
        }
      }
      if (Math.abs(elapsed - 4) > 0.01) return null;
    }
    return { noteEvents, durationBeats: bars.length * 4 };
  }

  function repeatedPattern(notesPerBar, duration = 1, bars = 8) {
    const noteEvents = [];
    for (let bar = 0; bar < bars; bar += 1) {
      notesPerBar.forEach(beat => noteEvents.push({ beat: bar * 4 + beat, duration }));
    }
    return { noteEvents, durationBeats: bars * 4 };
  }

  function fallbackPattern(label, groupIndex = 0) {
    const normalized = label.toLowerCase();
    if (/&|achtelposition|nur die/.test(normalized)) {
      const offbeats = /&|nur die/.test(normalized);
      return repeatedPattern(offbeats ? [0.5, 1.5, 2.5, 3.5] : [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], 0.5);
    }
    if (/jeden schlag|viertelnote|viertelnoten/.test(normalized)) return repeatedPattern([0, 1, 2, 3]);
    if (/halbe pause|zwei schläge stille/.test(normalized)) return repeatedPattern([2, 3]);
    if (/viertelpause|ein schlag stille/.test(normalized)) {
      const variations = [[0, 2], [0, 1, 3], [1, 3], [0, 2, 3]];
      return repeatedPattern(variations[groupIndex % variations.length]);
    }
    return repeatedPattern([0, 2]);
  }

  function makeFaxOutput(radio, solutionDetails, hearingIndex) {
    if (!radio || !solutionDetails || radio.querySelector('[data-fax-output]')) return;
    const solutionBody = solutionDetails.querySelector('.solution-body');
    const nextSection = document.getElementById(solutionDetails.dataset.nextSection || '');
    const reference = solutionDetails.parentElement.querySelector('[data-fax-reference]');
    const referenceImage = reference?.querySelector('img[data-marked-src]');
    const originalReference = referenceImage && {
      src: referenceImage.getAttribute('src'),
      alt: referenceImage.alt
    };
    if (!solutionBody) return;

    radio.classList.add('has-fax-output');
    const fax = document.createElement('section');
    fax.className = 'rhythm-fax-output';
    fax.dataset.faxOutput = '';
    fax.setAttribute('aria-label', 'Faxausgabe der Lösung');
    fax.innerHTML = `
      <div class="rhythm-fax-header"><span>NOTENBLATT-AUSGABE</span><span class="rhythm-fax-ready" aria-hidden="true"><i></i> READY</span></div>
      <div class="rhythm-fax-slot" aria-hidden="true"><i></i></div>
      <div class="rhythm-fax-stage" data-fax-stage>
        <div class="rhythm-fax-paper" data-fax-paper aria-hidden="true">
          <div class="rhythm-fax-paper-label">THE RHYTHM RADIO · LÖSUNG ${String(hearingIndex).padStart(2, '0')}</div>
        </div>
        <div class="rhythm-fax-support rhythm-fax-support-left" aria-hidden="true"></div>
        <div class="rhythm-fax-support rhythm-fax-support-right" aria-hidden="true"></div>
      </div>
      <button type="button" class="rhythm-fax-button rhythm-fax-previous" data-fax-previous hidden>Vorige Aufgabe</button>
      <button type="button" class="rhythm-fax-button" data-fax-print aria-expanded="false">Lösung</button>`;
    fax.querySelector('[data-fax-paper]').append(solutionBody.cloneNode(true));
    if (reference) {
      fax.classList.add('has-score-reference');
      fax.querySelector('.rhythm-fax-slot').before(reference);
    }
    radio.append(fax);
    solutionDetails.remove();

    const preprinted = radio.dataset.faxPreprinted === 'true';
    const paper = fax.querySelector('[data-fax-paper]');
    if (preprinted) {
      paper.setAttribute('aria-hidden', 'false');
      fax.querySelector('.rhythm-fax-paper-label').textContent = 'THE RHYTHM RADIO · AUFGABE 2.1';
      window.requestAnimationFrame(() => fax.classList.add('is-printed'));
    }

    const button = fax.querySelector('[data-fax-print]');
    const previousButton = fax.querySelector('[data-fax-previous]');
    const history = [];
    let stopSolutionPlayback = null;
    const decorateSolution = (body, task) => {
      if (radio.classList.contains('is-error-finding-sequence')) return;
      if (!['k2-lektion-2', 'k2-lektion-3', 'k2-lektion-4'].includes(radio.closest('.lesson-section')?.id)) return;
      const image = body.querySelector('.score-figure img');
      if (!image) return;
      const frame = document.createElement('div');
      frame.className = 'rhythm-solution-score';
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      overlay.setAttribute('viewBox', `0 0 ${Number(task.width) || 960} ${Number(task.height) || 135}`);
      overlay.setAttribute('preserveAspectRatio', 'none');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.add('rhythm-solution-counter');
      image.replaceWith(frame);
      frame.append(image, overlay);
      const controls = document.createElement('div');
      controls.className = 'rhythm-solution-playback';
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'rhythm-solution-play';
      play.textContent = '▶ Lösung abspielen';
      play.setAttribute('aria-label', 'Lösung mit Einzähler und Zählhilfe abspielen');
      const live = document.createElement('span');
      live.className = 'rhythm-solution-playback-status';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      controls.append(play, live);
      body.prepend(controls);

      let timer = 0;
      let startedAt = 0;
      const clearCounter = () => overlay.replaceChildren();
      const showCounter = (value, x, y) => {
        overlay.replaceChildren();
        const badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badge.setAttribute('x', String(x - 12));
        badge.setAttribute('y', String(y - 18));
        badge.setAttribute('width', '24');
        badge.setAttribute('height', '24');
        badge.setAttribute('rx', '4');
        badge.setAttribute('class', 'clap-score-counter-badge');
        const number = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        number.setAttribute('x', String(x));
        number.setAttribute('y', String(y));
        number.setAttribute('text-anchor', 'middle');
        number.setAttribute('class', 'clap-score-counter-number');
        number.textContent = String(value);
        overlay.append(badge, number);
      };
      const finish = () => {
        window.clearInterval(timer);
        timer = 0;
        clearCounter();
        live.textContent = '';
        play.textContent = '▶ Lösung abspielen';
        play.setAttribute('aria-label', 'Lösung mit Einzähler und Zählhilfe abspielen');
        if (stopSolutionPlayback === finish) stopSolutionPlayback = null;
      };
      play.addEventListener('click', () => {
        const radioPlay = radio.querySelector('[data-missing-clicks-play]');
        if (timer) {
          if (radioPlay?.getAttribute('aria-pressed') === 'true') radioPlay.click();
          finish();
          return;
        }
        if (!radioPlay) return;
        // The solution control always starts from a known point so its visual
        // count-in stays synchronized with the radio, even if the radio was
        // already playing from its own switch.
        if (radioPlay.getAttribute('aria-pressed') === 'true') radioPlay.click();
        radioPlay.click();
        const beatMs = 60000 / 50;
        const countInMs = 4 * beatMs;
        const scoreBeats = Number(task.bars || 4) * 4;
        const isHearingSequence = radio.dataset.hearingSequence === 'true';
        const scoreRepeats = Math.max(1, Number(radio.dataset.scoreRepeats || 1));
        const gapBeats = Math.max(0, Number(radio.dataset.gapBars || 0)) * 4;
        const cycleBeats = scoreBeats + gapBeats;
        const durationBeats = isHearingSequence ? scoreRepeats * cycleBeats : scoreBeats;
        const compactBeatXs = [[96, 147, 198, 249], [319, 368, 417, 466], [533, 582, 631, 680], [746, 794, 842, 890]];
        const singleBarBeatXs = [[96, 303, 510, 717]];
        const wideBeatXs = [
          [185, 257, 329, 401], [485, 557, 629, 701], [785, 857, 929, 1001], [1089, 1161, 1233, 1305],
          [185, 257, 329, 401], [485, 557, 629, 701], [785, 857, 929, 1001], [1089, 1161, 1233, 1305]
        ];
        const isWideScore = Number(task.width) > 1000 && Number(task.height) > 200;
        const isSingleBarLesson = radio.closest('.lesson-section')?.id === 'k2-lektion-4';
        const scoreBeatXs = isWideScore ? wideBeatXs : isSingleBarLesson ? singleBarBeatXs : compactBeatXs;
        startedAt = performance.now() + 120;
        play.textContent = '■ Wiedergabe stoppen';
        play.setAttribute('aria-label', 'Lösungswiedergabe stoppen');
        stopSolutionPlayback = finish;
        const update = () => {
          const elapsed = performance.now() - startedAt;
          if (elapsed >= countInMs + durationBeats * beatMs || radioPlay.getAttribute('aria-pressed') !== 'true') {
            finish();
            return;
          }
          if (elapsed < countInMs) {
            const count = Math.min(4, Math.floor(Math.max(0, elapsed) / beatMs) + 1);
            live.textContent = `Einzähler ${count}`;
            showCounter(count, 68, 18);
            return;
          }
          const playedBeats = (elapsed - countInMs) / beatMs;
          const cycleBeat = isHearingSequence ? playedBeats % cycleBeats : playedBeats;
          const inMetronomeGap = isHearingSequence && cycleBeat >= scoreBeats;
          if (inMetronomeGap) {
            const gapBeat = Math.min(4, Math.floor((cycleBeat - scoreBeats) % 4) + 1);
            live.textContent = `Einzähler ${gapBeat}`;
            showCounter(gapBeat, 68, 18);
            return;
          }
          const eighthStep = Math.floor(cycleBeat * 2);
          const beat = Math.floor(eighthStep / 2);
          const bar = isHearingSequence ? 0 : Math.floor(beat / 4);
          const row = Math.floor(bar / 4);
          const barInRow = bar % 4;
          const y = isWideScore ? (row === 0 ? 78 : 233) : 18;
          const beatInBar = beat % 4;
          const positions = scoreBeatXs[isWideScore ? bar : isSingleBarLesson ? 0 : barInRow];
          const x = eighthStep % 2 === 0
            ? positions[beatInBar]
            : beatInBar < 3
              ? (positions[beatInBar] + positions[beatInBar + 1]) / 2
              : positions[3] + (positions[3] - positions[2]) / 2;
          const countLabel = eighthStep % 2 === 0 ? String(beatInBar + 1) : '&';
          const cycleNumber = Math.floor(playedBeats / cycleBeats) + 1;
          live.textContent = inMetronomeGap
            ? `Metronompause · ${countLabel}`
            : isHearingSequence
              ? `Durchgang ${cycleNumber} von ${scoreRepeats} · ${countLabel}`
              : `Takt ${bar + 1} · ${countLabel}`;
          showCounter(countLabel, x, y);
        };
        update();
        timer = window.setInterval(update, 40);
      });
    };
    const initialBody = fax.querySelector('[data-fax-paper] .solution-body');
    const initialImage = initialBody?.querySelector('.score-figure img');
    if (initialBody && initialImage) decorateSolution(initialBody, {
      bars: radio.dataset.durationBars || '4',
      width: initialImage.getAttribute('width') || '960',
      height: initialImage.getAttribute('height') || '135'
    });
    const readQueue = () => {
      try { return JSON.parse(radio.dataset.hearingQueue || '[]'); } catch { return []; }
    };
    const currentTask = () => {
      const image = fax.querySelector('[data-fax-paper] img');
      return {
        title: radio.querySelector('.missing-clicks-screen strong').textContent.replace(/\s*·\s*Notation$/, ''),
        number: radio.querySelector('.missing-clicks-tuning-scale strong').textContent.match(/HÖR\s+(\d+)/)?.[1] || '01',
        events: radio.dataset.scoreEvents || '',
        bars: radio.dataset.durationBars || '8',
        durationLabel: radio.dataset.durationLabel || '8 Takte',
        continuousMetronome: radio.dataset.continuousMetronome || '',
        position: radio.dataset.coursePosition || '62%',
        image: image?.getAttribute('src') || '',
        alt: image?.getAttribute('alt') || '',
        width: image?.getAttribute('width') || '1410',
        height: image?.getAttribute('height') || '340'
      };
    };
    const applyTask = task => {
      stopSolutionPlayback?.();
      const playbackButton = radio.querySelector('[data-missing-clicks-play]');
      if (playbackButton?.getAttribute('aria-pressed') === 'true') playbackButton.click();
      radio.dataset.scoreEvents = task.events;
      radio.dataset.durationBars = task.bars;
      radio.dataset.durationLabel = task.durationLabel;
      if (task.continuousMetronome) radio.dataset.continuousMetronome = task.continuousMetronome;
      else delete radio.dataset.continuousMetronome;
      radio.dataset.coursePosition = task.position;
      radio.setAttribute('aria-label', `The Rhythm Radio spielt ${task.title}`);
      radio.querySelector('.missing-clicks-screen strong').textContent = `${task.title} · Notation`;
      const lessonMatch = radio.closest('.lesson-section')?.id.match(/^k(\d+)-lektion-(\d+)$/);
      const lessonLabel = `K${String(lessonMatch?.[1] || '02').padStart(2, '0')}L${String(lessonMatch?.[2] || '02').padStart(2, '0')}`;
      radio.querySelector('.missing-clicks-tuning-scale strong').textContent = `${lessonLabel} · HÖR ${task.number}`;
      radio.querySelector('.missing-clicks-tuning-scale').setAttribute('aria-label', `Kursfrequenz ${lessonLabel} · HÖR ${task.number}`);
      radio.querySelector('.missing-clicks-tuning-track i')?.style.setProperty('left', task.position);
      playbackButton?.setAttribute('aria-label', `${task.title} abspielen`);
      const paper = fax.querySelector('[data-fax-paper]');
      paper.querySelector('.rhythm-fax-paper-label').textContent = `THE RHYTHM RADIO · LÖSUNG ${task.number}`;
      paper.querySelector('.solution-body')?.remove();
      const figure = document.createElement('figure');
      figure.className = 'score-figure';
      const scroll = document.createElement('div');
      scroll.className = 'score-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', `Lösung zu ${task.title} · bei Bedarf seitlich scrollen`);
      const wrap = document.createElement('span');
      wrap.className = 'score-image-wrap';
      const image = document.createElement('img');
      image.src = task.image;
      image.alt = task.alt;
      image.width = Number(task.width) || 1410;
      image.height = Number(task.height) || 340;
      image.loading = 'lazy';
      wrap.append(image);
      scroll.append(wrap);
      figure.append(scroll);
      const caption = document.createElement('figcaption');
      caption.textContent = `Lösung · ${task.title}`;
      figure.append(caption);
      const body = document.createElement('div');
      body.className = 'solution-body';
      body.append(figure);
      decorateSolution(body, task);
      paper.append(body);
      fax.classList.remove('is-printed');
      paper.setAttribute('aria-hidden', 'true');
      button.dataset.action = 'solution';
      button.classList.remove('is-next-task');
      button.classList.remove('is-next-lesson');
      button.textContent = 'Lösung';
      button.disabled = false;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Lösung anzeigen');
      radio.dataset.hearingSequenceStarted = 'true';
      previousButton.hidden = history.length === 0;
      radio.dispatchEvent(new CustomEvent('rhythmradio:configure'));
    };
    previousButton.addEventListener('click', () => {
      const previous = history.pop();
      if (!previous) return;
      radio.dataset.hearingQueue = JSON.stringify([currentTask(), ...readQueue()]);
      applyTask(previous);
    });
    button.addEventListener('click', () => {
      if (preprinted) {
        const showErrors = !fax.classList.contains('is-error-visible');
        fax.classList.toggle('is-error-visible', showErrors);
        button.setAttribute('aria-expanded', String(showErrors));
        button.textContent = showErrors ? 'Lösung ausblenden' : 'Lösung';
        button.setAttribute('aria-label', showErrors ? 'Fehlermarkierungen ausblenden' : 'Lösung mit Fehlermarkierungen anzeigen');
        return;
      }
      if (button.dataset.action === 'next-section' && nextSection) {
        const play = radio.querySelector('[data-missing-clicks-play]');
        if (play?.getAttribute('aria-pressed') === 'true') play.click();
        window.history.replaceState(null, '', `#${nextSection.id}`);
        nextSection.focus({ preventScroll: true });
        nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (button.dataset.action === 'next-lesson') {
        const lessonMatch = radio.closest('.lesson-section')?.id.match(/^k(\d+)-lektion-(\d+)$/);
        const nextId = lessonMatch ? `k${lessonMatch[1]}-lektion-${Number(lessonMatch[2]) + 1}` : '';
        const nextLesson = nextId ? document.getElementById(nextId) : null;
        if (nextLesson) {
          window.history.replaceState(null, '', `#${nextLesson.id}`);
          nextLesson.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      if (button.dataset.action === 'next-task') {
        const queue = readQueue();
        const next = queue.shift();
        if (!next) return;
        history.push(currentTask());
        radio.dataset.hearingQueue = JSON.stringify(queue);
        applyTask(next);
        return;
      }
      const printed = !fax.classList.contains('is-printed');
      if (!printed && radio.dataset.hearingSequenceStarted === 'true') return;
      fax.classList.toggle('is-printed', printed);
      button.setAttribute('aria-expanded', String(printed));
      if (referenceImage) {
        referenceImage.src = printed ? referenceImage.dataset.markedSrc : originalReference.src;
        referenceImage.alt = printed ? referenceImage.dataset.markedAlt : originalReference.alt;
        paper.setAttribute('aria-hidden', String(!printed));
        button.textContent = printed ? 'Lösung ausblenden' : 'Lösung';
        return;
      }
      if (printed && nextSection) {
        paper.setAttribute('aria-hidden', 'false');
        button.dataset.action = 'next-section';
        button.classList.add('is-next-section');
        button.removeAttribute('aria-expanded');
        button.setAttribute('aria-label', 'Zur nächsten Aufgabe');
        button.textContent = 'Nächste Aufgabe';
        return;
      }
      let queue = [];
      try { queue = JSON.parse(radio.dataset.hearingQueue || '[]'); } catch {}
      const hasNextTask = queue.length > 0;
      const currentNumber = radio.querySelector('.missing-clicks-tuning-scale strong').textContent.match(/HÖR\s+(\d+)/)?.[1];
      const isFinalTaskComplete = printed && radio.dataset.hearingSequenceStarted === 'true' && currentNumber === (radio.dataset.hearingLastTaskNumber || '03') && !hasNextTask;
      button.dataset.action = isFinalTaskComplete ? 'next-lesson' : printed && hasNextTask ? 'next-task' : 'solution';
      button.classList.toggle('is-next-task', printed && hasNextTask);
      button.classList.toggle('is-next-lesson', isFinalTaskComplete);
      button.setAttribute('aria-label', isFinalTaskComplete ? 'Zur nächsten Lektion' : printed ? (hasNextTask ? 'Zur nächsten Aufgabe' : 'Lösung angezeigt') : 'Lösung anzeigen');
      button.textContent = isFinalTaskComplete ? 'Nächste Lektion' : printed ? (hasNextTask ? 'Nächste Aufgabe' : 'Lösung') : 'Lösung';
      button.disabled = printed && radio.dataset.hearingSequenceStarted === 'true' && !hasNextTask && !isFinalTaskComplete;
      fax.querySelector('[data-fax-paper]').setAttribute('aria-hidden', String(!printed));
    });
    return fax;
  }

  function replaceHearingTasks() {
    const tasks = [...document.querySelectorAll('.hearing-task')];
    const template = document.querySelector('[data-missing-clicks-player]');
    if (!template || !tasks.length) return;
    let converted = 0;

    tasks.forEach((task) => {
      const heading = task.querySelector('h4');
      const solution = task.querySelector('details.solution');
      const solutionImage = solution?.querySelector('.solution-body img[data-hearing-score]')
        || solution?.querySelector('.solution-body img');
      const parsed = notationEvents(solutionImage?.alt);
      const existingRadio = task.querySelector('[data-missing-clicks-player]');
      const audioAside = task.querySelector(':scope > aside.drive-audio-card');
      const placeholder = task.querySelector(':scope > [data-hearing-radio]');
      if (!solution || !parsed || (!existingRadio && !audioAside && !placeholder)) return;

      let radio = existingRadio;
      if (!radio) {
        radio = cloneRadioTemplate(template);
        radio.removeAttribute('id');
        radio.querySelectorAll('[id]').forEach(element => {
          if (!element.matches('linearGradient')) element.removeAttribute('id');
        });
        const gradient = radio.querySelector('linearGradient[id]');
        if (gradient) {
          const oldId = gradient.id;
          const newId = `radio-logo-hearing-${converted + 1}`;
          gradient.id = newId;
          radio.querySelectorAll('[style]').forEach(element => {
            element.setAttribute('style', element.getAttribute('style').replaceAll(`url(#${oldId})`, `url(#${newId})`));
          });
        }
        if (audioAside) audioAside.replaceWith(radio);
        else placeholder.replaceWith(radio);
      }

      const taskName = text(heading) || `Höraufgabe ${converted + 1}`;
      radio.classList.remove('has-fax-output');
      radio.setAttribute('aria-label', `The Rhythm Radio spielt ${taskName}`);
      radio.dataset.pattern = 'score-notation';
      radio.dataset.scoreEvents = parsed.noteEvents.map(note => `${note.beat}:${note.duration}`).join(',');
      radio.dataset.countIn = '4';
      const bars = Math.max(1, Math.round(parsed.durationBeats / 4));
      radio.dataset.durationBars = String(bars);
      if (task.closest('.lesson-section')?.id === 'k2-lektion-4') radio.dataset.continuousMetronome = 'true';
      else delete radio.dataset.continuousMetronome;
      radio.dataset.durationLabel = bars === 1 ? 'vier Durchgänge' : `${bars} Takte`;
      radio.dataset.coursePosition = `${Math.min(94, 22 + converted * 3)}%`;
      if (bars === 1) {
        radio.dataset.hearingSequence = 'true';
        radio.dataset.scoreRepeats = '4';
        radio.dataset.gapBars = '1';
      } else {
        delete radio.dataset.hearingSequence;
        delete radio.dataset.scoreRepeats;
        delete radio.dataset.gapBars;
      }

      const screen = radio.querySelector('.missing-clicks-screen');
      screen?.querySelector('strong') && (screen.querySelector('strong').textContent = `${taskName} · Notation`);
      if (screen?.lastElementChild) {
        screen.lastElementChild.textContent = bars === 1
          ? task.closest('.lesson-section')?.id === 'k2-lektion-4'
            ? 'Einzähler · 1 Takt viermal · Metronom läuft durch · 50 BPM'
            : 'Einzähler · 1 Takt viermal · dazwischen ein Metronomtakt · 50 BPM'
          : `Einzähler · ${bars} Takte · Rhythmus und Metronom · 50 BPM`;
      }
      const lessonId = task.closest('.lesson-section')?.id || '';
      const lessonMatch = lessonId.match(/^k(\d+)-lektion-(\d+)$/);
      const chapterCode = String(lessonMatch?.[1] || 1).padStart(2, '0');
      const lessonCode = String(lessonMatch?.[2] || 1).padStart(2, '0');
      const taskMatch = taskName.match(/(\d+)\s*$/);
      const taskCode = String(taskMatch?.[1] || converted + 1).padStart(2, '0');
      const label = `K${chapterCode}L${lessonCode} · HÖR ${taskCode}`;
      const tuning = radio.querySelector('.missing-clicks-tuning-scale');
      tuning?.setAttribute('aria-label', `Kursfrequenz ${label}`);
      tuning?.querySelector('strong') && (tuning.querySelector('strong').textContent = label);
      tuning?.querySelector('.missing-clicks-tuning-track i')?.style.setProperty('left', radio.dataset.coursePosition);
      radio.querySelector('[data-missing-clicks-play]')?.setAttribute('aria-label', `${taskName} abspielen`);

      if (bars === 1 && !task.querySelector('.hearing-duration-note')) {
        const note = document.createElement('p');
        note.className = 'hearing-duration-note';
        note.textContent = 'Diese Höraufgabe enthält einen Takt. Er wird viermal gespielt; dazwischen hörst du jeweils einen Takt lang nur das Metronom.';
        radio.before(note);
      }

      makeFaxOutput(radio, solution, taskCode);
      converted += 1;
    });

    ['k2-lektion-2', 'k2-lektion-3', 'k2-lektion-4', 'k3-lektion-1', 'k3-lektion-2', 'k3-lektion-3', 'k3-lektion-4'].forEach(lessonId => {
      const lessonTasks = tasks.filter(task => task.closest('.lesson-section')?.id === lessonId);
      if (lessonTasks.length < 2) return;
      const firstTask = lessonTasks[0];
      const firstRadio = firstTask.querySelector('[data-missing-clicks-player]');
      const sequence = lessonTasks.slice(1).map(task => {
        const taskRadio = task.querySelector('[data-missing-clicks-player]');
        const image = taskRadio?.querySelector('[data-fax-paper] img');
        if (!taskRadio || !image) return null;
        const title = text(task.querySelector('h4')) || 'Höraufgabe';
        return {
          title,
          number: String(title.match(/(\d+)$/)?.[1] || '02').padStart(2, '0'),
          events: taskRadio.dataset.scoreEvents || '',
          bars: taskRadio.dataset.durationBars || '8',
          durationLabel: taskRadio.dataset.durationLabel || '8 Takte',
          continuousMetronome: taskRadio.dataset.continuousMetronome || '',
          position: taskRadio.dataset.coursePosition || '68%',
          image: image.getAttribute('src'),
          alt: image.getAttribute('alt') || `Lösung zu ${title}`,
          width: image.getAttribute('width') || '1410',
          height: image.getAttribute('height') || '340'
        };
      }).filter(Boolean);
      if (firstRadio && sequence.length) {
        firstRadio.dataset.hearingQueue = JSON.stringify(sequence);
        firstRadio.dataset.hearingLastTaskNumber = String(lessonTasks.length).padStart(2, '0');
        firstTask.querySelector('h4')?.remove();
        lessonTasks.slice(1).forEach(task => task.remove());
      }
    });
  }

  function addErrorFindingRadio() {
    const slot = document.querySelector('[data-error-finding-radio]');
    const template = document.querySelector('[data-missing-clicks-player]');
    const lesson = slot?.closest('.lesson-section');
    if (!slot || !template || !['k2-lektion-5', 'k3-lektion-5'].includes(lesson?.id)) return;
    const isK3 = lesson.id === 'k3-lektion-5';

    const makeSourceFigure = (asset, alt, caption) => {
      const figure = document.createElement('figure');
      figure.className = 'score-figure';
      const scroll = document.createElement('div');
      scroll.className = 'score-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', `${caption} – bei Bedarf seitlich scrollen`);
      const wrap = document.createElement('span');
      wrap.className = 'score-image-wrap';
      const image = document.createElement('img');
      image.src = asset.startsWith('assets/') ? asset : `assets/kapitel-2/${asset}`;
      image.width = 960;
      image.height = 135;
      image.loading = 'lazy';
      image.alt = alt;
      wrap.append(image);
      scroll.append(wrap);
      figure.append(scroll);
      const figcaption = document.createElement('figcaption');
      figcaption.textContent = caption;
      figure.append(figcaption);
      return figure;
    };
    const k3SourceFigures = isK3 ? ['3-1', '3-2', '3-3'].map(number => lesson.querySelector(`#k3-aufgabe-${number}-score`)) : [];
    const k3CorrectFigures = isK3 ? k3SourceFigures.map(figure => figure?.nextElementSibling?.querySelector('.solution-correct-score')?.cloneNode(true)) : [];
    const taskFigures = isK3 ? k3SourceFigures.map((figure, index) => {
      if (!figure) return null;
      const clone = figure.cloneNode(true);
      const caption = document.createElement('figcaption');
      caption.textContent = `Aufgabe ${index + 1} · Fehlerhafte Notation`;
      clone.append(caption);
      return clone;
    }) : [
      makeSourceFigure('noten-168.svg', 'Takt 1: Achtelnote, Achtelnote, Viertelnote, Viertelnote, Achtelnote, Achtelnote', 'Aufgabe 2.1 · Fehlerhafte Notation'),
      makeSourceFigure('noten-170.svg', 'Takt 1: Achtelnote, Achtelnote, Achtelnote, Achtelnote, Achtelnote, Achtelnote, Viertelnote', 'Aufgabe 2.2 · Fehlerhafte Notation'),
      makeSourceFigure('noten-172.svg', 'Takt 1: Viertelnote, Viertelnote, Viertelnote, Achtelnote, Achtelnote', 'Aufgabe 2.3 · Fehlerhafte Notation')
    ];
    const sourceFigure = taskFigures[0];
    const sourceImage = sourceFigure?.querySelector('img');
    if (!sourceFigure || !sourceImage) return;

    const radio = cloneRadioTemplate(template);
    radio.removeAttribute('id');
    radio.querySelector('[data-fax-output]')?.remove();
    radio.classList.remove('has-fax-output');
    delete radio.dataset.hearingQueue;
    delete radio.dataset.hearingLastTaskNumber;
    delete radio.dataset.hearingSequenceStarted;
    radio.querySelectorAll('[id]').forEach(element => {
      if (!element.matches('linearGradient')) element.removeAttribute('id');
    });
    const gradient = radio.querySelector('linearGradient[id]');
    if (gradient) {
      const previousId = gradient.id;
      const nextId = `radio-logo-error-finding-${isK3 ? 'k3l5' : 'k2l5'}`;
      gradient.id = nextId;
      radio.querySelectorAll('[style]').forEach(element => {
        element.setAttribute('style', element.getAttribute('style').replaceAll(`url(#${previousId})`, `url(#${nextId})`));
      });
    }

    radio.dataset.pattern = 'score-notation';
    radio.dataset.scoreEvents = '0:0.5,0.5:0.5,1:2,3:0.5,3.5:0.5';
    radio.dataset.countIn = '4';
    radio.dataset.durationBars = '1';
    radio.dataset.durationLabel = 'vier Durchgänge';
    radio.dataset.hearingSequence = 'true';
    radio.dataset.scoreRepeats = '4';
    radio.dataset.gapBars = '1';
    radio.dataset.continuousMetronome = 'true';
    radio.dataset.faxPreprinted = 'true';
    radio.classList.add('is-error-finding-sequence');
    radio.dataset.coursePosition = '42%';
    radio.setAttribute('aria-label', 'Rhythm Radio · Aufgabe 2.1');
    const screen = radio.querySelector('.missing-clicks-screen');
    screen?.querySelector('strong') && (screen.querySelector('strong').textContent = 'Aufgabe 2.1 · Hörvergleich');
    if (screen?.lastElementChild) screen.lastElementChild.textContent = 'Einzähler · 1 Takt viermal · Metronom läuft durch · 50 BPM';
    const tuning = radio.querySelector('.missing-clicks-tuning-scale');
    tuning?.setAttribute('aria-label', 'Kursfrequenz K02L05 · AUFG 2.1');
    tuning?.querySelector('strong') && (tuning.querySelector('strong').textContent = 'K02L05 · AUFG 2.1');
    tuning?.querySelector('.missing-clicks-tuning-track i')?.style.setProperty('left', '42%');
    radio.querySelector('[data-missing-clicks-play]')?.setAttribute('aria-label', 'Aufgabe 2.1 abspielen');

    const taskData = isK3 ? [
      {
        number: '3.1', figure: taskFigures[0], correctFigure: k3CorrectFigures[0],
        events: '0:1,1:1,2:1,3:0.5,3.5:0.5', marks: [{ x: 770, kind: 'note' }], fiveFour: true,
        countLabels: [[105, '1'], [270, '2'], [435, '3'], [600, '4'], [683, '&'], [766, '5', true]],
        caption: 'Fehler markiert: Die letzte Viertelnote ergibt einen zusätzlichen fünften Schlag.'
      },
      {
        number: '3.2', figure: taskFigures[1], correctFigure: k3CorrectFigures[1],
        events: '0:1,3:0.5,3.5:0.5', marks: [{ x: 311, kind: 'note' }, { x: 518, kind: 'note' }],
        correctMarks: [{ x: 311, kind: 'rest' }],
        caption: 'Fehler markiert: Die Viertelnote auf Schlag 3 entfällt; dort beginnt die halbe Pause.'
      },
      {
        number: '3.3', figure: taskFigures[2], correctFigure: k3CorrectFigures[2],
        events: '2:0.5,2.5:0.5,3:0.5', marks: [{ x: 832, kind: 'note' }],
        caption: 'Fehler markiert: Die letzte Achtelnote auf 4 & wird nicht gespielt.'
      }
    ] : [
      { number: '2.1', figure: taskFigures[0], correctFigure: makeSourceFigure('noten-187.svg', 'Korrigierter Takt 1: Achtelnote, Achtelnote, halbe Note, Achtelnote, Achtelnote', 'Lösung 2.1 · Korrigierter Takt'), events: '0:0.5,0.5:0.5,1:2,3:0.5,3.5:0.5', marks: [311, 518], caption: 'Fehler markiert: Die Viertelnoten auf Schlag 2 und 3 gehören als halbe Note auf Schlag 2.' },
      { number: '2.2', figure: taskFigures[1], correctFigure: makeSourceFigure('noten-188.svg', 'Korrigierter Takt 1: Achtelnote, Achtelnote, Achtelnote, Achtelnote, Viertelnote, Achtelnote, Achtelnote', 'Lösung 2.2 · Korrigierter Takt'), events: '0:0.5,0.5:0.5,1:0.5,1.5:0.5,2:1,3:0.5,3.5:0.5', marks: [622, 725], caption: 'Fehler markiert: Die Noten auf den Zählzeiten 2 & und 4 weichen vom gehörten Rhythmus ab.' },
      { number: '2.3', figure: taskFigures[2], correctFigure: makeSourceFigure('noten-186.svg', 'Korrigierter Takt 1: Viertelnote, Viertelnote, Achtelnote, Achtelnote, Achtelnote, Achtelnote', 'Lösung 2.3 · Korrigierter Takt'), events: '0:1,1:1,2:0.5,2.5:0.5,3:0.5,3.5:0.5', marks: [518], caption: 'Fehler markiert: Die Viertelnote auf Schlag 3 muss mit dem gehörten Rhythmus abgeglichen werden.' }
    ];
    if (taskData.some(task => !task.figure || !task.correctFigure)) return;
    if (isK3) {
      const courseLesson = 'K03L05';
      radio.dataset.scoreEvents = taskData[0].events;
      radio.setAttribute('aria-label', `Rhythm Radio · Aufgabe ${taskData[0].number}`);
      screen?.querySelector('strong') && (screen.querySelector('strong').textContent = `Aufgabe ${taskData[0].number} · Fehler finden`);
      tuning?.setAttribute('aria-label', `Kursfrequenz ${courseLesson} · Aufgabe ${taskData[0].number}`);
      tuning?.querySelector('strong') && (tuning.querySelector('strong').textContent = `${courseLesson} · AUFG ${taskData[0].number}`);
      radio.querySelector('[data-missing-clicks-play]')?.setAttribute('aria-label', `Aufgabe ${taskData[0].number} abspielen`);
    }
    const makeSolutionSheet = task => {
      const figure = task.figure.cloneNode(true);
      const image = figure.querySelector('img');
      const scoreWidth = Number(image.getAttribute('width')) || 960;
      const scoreHeight = Number(image.getAttribute('height')) || 135;
      const frame = document.createElement('div');
      frame.className = 'rhythm-solution-score';
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      overlay.setAttribute('viewBox', `0 0 ${scoreWidth} ${scoreHeight}`);
      overlay.setAttribute('preserveAspectRatio', 'none');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.add('rhythm-solution-counter', 'rhythm-error-solution-overlay');
      if (task.fiveFour) {
        const signaturePatch = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        signaturePatch.setAttribute('x', '47');
        signaturePatch.setAttribute('y', '50');
        signaturePatch.setAttribute('width', '38');
        signaturePatch.setAttribute('height', '55');
        signaturePatch.setAttribute('fill', 'white');
        overlay.append(signaturePatch);
        const staff = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        staff.setAttribute('d', 'M47 80H85');
        staff.setAttribute('stroke', '#111');
        staff.setAttribute('stroke-width', '1');
        overlay.append(staff);
        [['5', '74', '#e12f26'], ['4', '94', '#111']].forEach(([value, y, color]) => {
          const digit = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          digit.setAttribute('x', '51');
          digit.setAttribute('y', y);
          digit.setAttribute('fill', color);
          digit.setAttribute('font-family', 'Georgia,serif');
          digit.setAttribute('font-size', '23');
          digit.setAttribute('font-weight', 'bold');
          digit.textContent = value;
          overlay.append(digit);
        });
      }
      const countPositions = task.countLabels || [[96, '1'], [199.5, '&'], [303, '2'], [406.5, '&'], [510, '3'], [613.5, '&'], [717, '4'], [820.5, '&']];
      countPositions.forEach(([x, value, wrong]) => {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(x));
        label.setAttribute('y', '25');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', wrong ? 'rhythm-error-count-label rhythm-error-count-label-wrong' : 'rhythm-error-count-label');
        label.textContent = value;
        overlay.append(label);
      });
      task.marks.forEach(mark => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        circle.setAttribute('cx', String(typeof mark === 'number' ? mark : mark.x));
        circle.setAttribute('cy', '80');
        circle.setAttribute('rx', '18');
        circle.setAttribute('ry', '12');
        circle.setAttribute('class', typeof mark === 'object' && mark.kind === 'rest' ? 'rhythm-error-rest-mark' : 'rhythm-error-note-mark');
        overlay.append(circle);
      });
      image.replaceWith(frame);
      frame.append(image, overlay);
      const caption = figure.querySelector('figcaption');
      if (caption) caption.textContent = task.caption;
      return figure;
    };
    const addMovingCounter = figure => {
      const image = figure.querySelector('img');
      if (!image) return;
      let frame = image.closest('.rhythm-solution-score');
      if (!frame) {
        frame = document.createElement('div');
        frame.className = 'rhythm-solution-score';
        image.replaceWith(frame);
        frame.append(image);
      }
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      overlay.setAttribute('viewBox', `0 0 ${Number(image.getAttribute('width')) || 960} ${Number(image.getAttribute('height')) || 135}`);
      overlay.setAttribute('preserveAspectRatio', 'none');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.add('rhythm-solution-counter', 'rhythm-error-play-counter');
      frame.append(overlay);
    };
    const makeTaskPaper = task => {
      const group = document.createElement('div');
      group.className = 'rhythm-error-task-paper';
      group.dataset.taskNumber = task.number;
      const wrongLabel = document.createElement('p');
      wrongLabel.className = 'rhythm-error-score-label';
      wrongLabel.textContent = 'Fehlerhafte Notation';
      const wrongFigure = makeSolutionSheet(task);
      addMovingCounter(wrongFigure);
      group.append(wrongLabel, wrongFigure);
      return group;
    };
    const makeCorrectNotation = task => {
      if (!task.correctFigure) return null;
      const correctGroup = document.createElement('div');
      correctGroup.className = 'rhythm-error-corrected-score';
      correctGroup.dataset.correctedScore = '';
      const correctLabel = document.createElement('p');
      correctLabel.className = 'rhythm-error-score-label';
      correctLabel.textContent = 'Korrekte Notation';
      const correctFigure = task.correctFigure.cloneNode(true);
      if (task.correctMarks?.length) {
        const image = correctFigure.querySelector('img');
        const scoreWidth = Number(image?.getAttribute('width')) || 960;
        const scoreHeight = Number(image?.getAttribute('height')) || 145;
        const frame = document.createElement('div');
        frame.className = 'rhythm-solution-score';
        const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.setAttribute('viewBox', `0 0 ${scoreWidth} ${scoreHeight}`);
        overlay.setAttribute('preserveAspectRatio', 'none');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.add('rhythm-solution-counter', 'rhythm-error-correct-overlay');
        task.correctMarks.forEach(mark => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          circle.setAttribute('cx', String(mark.x));
          circle.setAttribute('cy', '84');
          circle.setAttribute('rx', '23');
          circle.setAttribute('ry', '22');
          circle.setAttribute('class', 'rhythm-error-correct-mark');
          overlay.append(circle);
        });
        image.replaceWith(frame);
        frame.append(image, overlay);
      }
      addMovingCounter(correctFigure);
      correctGroup.append(correctLabel, correctFigure);
      return correctGroup;
    };
    const solutionDetails = document.createElement('details');
    solutionDetails.className = 'solution';
    const solutionBody = document.createElement('div');
    solutionBody.className = 'solution-body';
    solutionBody.append(makeTaskPaper(taskData[0]));
    solutionDetails.append(solutionBody);
    const fax = makeFaxOutput(radio, solutionDetails, isK3 ? '3.1' : '2.1');
    if (fax) {
      fax.classList.add('is-error-sequence');
      fax.classList.add('is-error-collapsed');
      fax.dataset.activeTaskIndex = '0';
      const solutionButton = fax.querySelector('[data-fax-print]');
      solutionButton.textContent = 'Lösung';
      solutionButton.setAttribute('aria-label', 'Fehlermarkierungen und Zählzeiten anzeigen');
      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.className = 'rhythm-fax-button rhythm-fax-next-notation';
      nextButton.textContent = 'Nächste Notation';
      nextButton.setAttribute('aria-label', 'Nächste Notation anzeigen');
      fax.append(nextButton);
      let taskIndex = 0;
      const showTask = nextIndex => {
        const task = taskData[nextIndex];
        if (!task) return;
        const play = radio.querySelector('[data-missing-clicks-play]');
        if (play?.getAttribute('aria-pressed') === 'true') play.click();
        fax.classList.remove('is-error-visible', 'is-solution-counting');
        fax.classList.add('is-error-collapsed');
        clearMovingCounters();
        taskIndex = nextIndex;
        fax.dataset.activeTaskIndex = String(nextIndex);
        radio.dataset.scoreEvents = task.events;
        radio.dataset.durationBars = '1';
        radio.dataset.durationLabel = 'vier Durchgänge';
        radio.dataset.continuousMetronome = 'true';
        radio.dataset.coursePosition = `${42 + nextIndex * 9}%`;
        const courseLesson = isK3 ? 'K03L05' : 'K02L05';
        radio.setAttribute('aria-label', `Rhythm Radio · Aufgabe ${task.number}`);
        radio.dispatchEvent(new CustomEvent('rhythmradio:configure'));
        radio.setAttribute('data-switch-prompt', '');
        radio.querySelector('.missing-clicks-screen strong').textContent = `Aufgabe ${task.number} · ${isK3 ? 'Fehler finden' : 'Hörvergleich'}`;
        if (radio.querySelector('.missing-clicks-screen')?.lastElementChild) radio.querySelector('.missing-clicks-screen').lastElementChild.textContent = 'Einzähler · 1 Takt viermal · Metronom läuft durch · 50 BPM';
        radio.querySelector('.missing-clicks-tuning-scale strong').textContent = `${courseLesson} · AUFG ${task.number}`;
        radio.querySelector('.missing-clicks-tuning-scale').setAttribute('aria-label', `Kursfrequenz ${courseLesson} · Aufgabe ${task.number}`);
        radio.querySelector('.missing-clicks-tuning-track i')?.style.setProperty('left', `${42 + nextIndex * 9}%`);
        radio.querySelector('[data-missing-clicks-play]')?.setAttribute('aria-label', `Aufgabe ${task.number} abspielen`);
        const paper = fax.querySelector('[data-fax-paper]');
        const paperBody = paper?.querySelector('.solution-body');
        if (paperBody) paperBody.replaceChildren(makeTaskPaper(task));
        const taskImage = paperBody?.querySelector('.score-figure img');
        if (paperBody && taskImage) decorateSolution(paperBody, {
          bars: '1',
          width: taskImage.getAttribute('width') || '960',
          height: taskImage.getAttribute('height') || '135'
        });
        fax.querySelector('.rhythm-fax-paper-label').textContent = `THE RHYTHM RADIO · AUFGABE ${task.number}`;
        solutionButton.setAttribute('aria-expanded', 'false');
        solutionButton.textContent = 'Lösung';
        solutionButton.setAttribute('aria-label', 'Fehlermarkierungen und Zählzeiten anzeigen');
        nextButton.textContent = 'Nächste Notation';
        nextButton.classList.remove('is-next-lesson');
        nextButton.setAttribute('aria-label', 'Nächste Notation anzeigen');
        fax.classList.add('is-printed');
        paper.setAttribute('aria-hidden', 'false');
      };
      nextButton.addEventListener('click', () => {
        const activePlayButton = radio.querySelector('[data-missing-clicks-play]');
        if (activePlayButton?.getAttribute('aria-pressed') === 'true') activePlayButton.click();
        const activeIndex = Number(fax.dataset.activeTaskIndex || taskIndex || 0);
        if (activeIndex < taskData.length - 1) {
          showTask(activeIndex + 1);
          solutionButton.textContent = 'Lösung';
          solutionButton.setAttribute('aria-expanded', 'false');
          solutionButton.setAttribute('aria-label', 'Fehlermarkierungen und Zählzeiten anzeigen');
          return;
        }
        const nextSection = [...lesson.querySelectorAll('h3')].find(heading => new RegExp(`^Aufgabe ${isK3 ? 4 : 3}\\b`).test(text(heading)));
        if (nextSection) nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      solutionButton.addEventListener('click', () => {
        taskIndex = Number(fax.dataset.activeTaskIndex || taskIndex || 0);
        const task = taskData[taskIndex];
        if (!task) return;
        const taskPaper = fax.querySelector(`[data-task-number="${task.number}"]`);
        const solutionOpen = fax.classList.contains('is-error-visible');
        fax.classList.toggle('is-error-collapsed', !solutionOpen);
        if (solutionOpen) {
          if (!taskPaper?.querySelector('[data-corrected-score]')) {
            const correctGroup = makeCorrectNotation(task);
            if (correctGroup) taskPaper?.prepend(correctGroup);
          }
          radio.setAttribute('data-switch-prompt', '');
        } else {
          taskPaper?.querySelector('[data-corrected-score]')?.remove();
          radio.removeAttribute('data-switch-prompt');
        }
        if (taskIndex === taskData.length - 1 && fax.classList.contains('is-error-visible')) {
          nextButton.textContent = 'Weiter geht’s!';
          nextButton.setAttribute('aria-label', `Weiter zu Aufgabe ${isK3 ? 4 : 3}`);
          nextButton.classList.add('is-next-lesson');
        }
      });
      let movingCountTimer = 0;
      const movingCounters = () => [...fax.querySelectorAll('.rhythm-error-play-counter')];
      const clearMovingCounters = () => {
        window.clearInterval(movingCountTimer);
        movingCountTimer = 0;
        movingCounters().forEach(overlay => overlay.replaceChildren());
        fax.classList.remove('is-solution-counting');
      };
      const showMovingCount = (value, x) => movingCounters().forEach(overlay => {
        overlay.replaceChildren();
        const badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badge.setAttribute('x', String(x - 13));
        badge.setAttribute('y', '5');
        badge.setAttribute('width', '26');
        badge.setAttribute('height', '26');
        badge.setAttribute('rx', '5');
        badge.setAttribute('class', 'clap-score-counter-badge');
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(x));
        label.setAttribute('y', '24');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'clap-score-counter-number');
        label.textContent = String(value);
        overlay.append(badge, label);
      });
      radio.addEventListener('rhythmradio:playback', event => {
        clearMovingCounters();
        const detail = event.detail || {};
        const corrected = fax.querySelector('[data-corrected-score]:not([hidden])');
        if (!detail.playing || !fax.classList.contains('is-error-visible') || !corrected) return;
        const beatMs = 60000 / (Number(detail.bpm) || 50);
        const countInMs = (Number(detail.countInBeats) || 0) * beatMs;
        const durationMs = (Number(detail.durationBeats) || 0) * beatMs;
        const startedAt = Number(detail.startedAt) || performance.now();
        const beatPositions = [96, 303, 510, 717];
        fax.classList.add('is-solution-counting');
        const update = () => {
          const elapsed = performance.now() - startedAt;
          if (elapsed >= countInMs + durationMs) {
            clearMovingCounters();
            return;
          }
          if (elapsed < countInMs) {
            const count = Math.min(4, Math.floor(Math.max(0, elapsed) / beatMs) + 1);
            showMovingCount(count, 68);
            return;
          }
          const beatElapsed = (elapsed - countInMs) / beatMs;
          const beatInMeasure = beatElapsed % 4;
          const eighthStep = Math.floor(beatInMeasure * 2);
          const beat = Math.floor(eighthStep / 2);
          const x = eighthStep % 2 === 0
            ? beatPositions[beat]
            : (beatPositions[beat] + (beatPositions[beat + 1] ?? beatPositions[beat] + 207)) / 2;
          showMovingCount(eighthStep % 2 === 0 ? beat + 1 : '&', x);
        };
        update();
        movingCountTimer = window.setInterval(update, 35);
      });
      solutionButton.addEventListener('click', () => {
        if (!fax.classList.contains('is-error-visible')) clearMovingCounters();
      });
    }
    slot.replaceWith(radio);
    if (isK3) {
      k3SourceFigures.forEach(figure => {
        const solution = figure?.nextElementSibling;
        if (solution?.matches('details.solution')) solution.remove();
        figure?.remove();
      });
      [...lesson.querySelectorAll('h4')].find(heading => /^Aufgabe 3\.1\b/.test(text(heading)))?.remove();
    }
    if (document.querySelector('[data-error-finding-radio]')) addErrorFindingRadio();
  }

  function addReadingCheckers() {
    const template = document.getElementById('k2l2-rhythminator');
    if (!template) return;
    const createChecker = (node, id) => {
      const caption = text(node.querySelector('figcaption'));
      if (!/Leseübung/i.test(caption)) return null;
      const image = node.querySelector('img');
      const parsed = notationEvents(image?.alt);
      if (!image || !parsed || !parsed.noteEvents.length) return null;

      const clone = template.cloneNode(true);
      const heading = clone.querySelector('.clap-checker-heading h4');
      clone.id = id;
      clone.dataset.clapFixedScore = 'false';
      clone.dataset.clapGuidedScore = 'true';
      clone.dataset.clapCustomScore = JSON.stringify({
        id, title: caption, image: image.getAttribute('src'),
        width: Number(image.getAttribute('width')) || 960,
        height: Number(image.getAttribute('height')) || 135,
        noteEvents: parsed.noteEvents,
        clapEvents: parsed.noteEvents.map(note => note.beat),
        durationBeats: parsed.durationBeats
      });
      clone.removeAttribute('data-switch-prompt');
      clone.setAttribute('aria-labelledby', `${id}-title`);
      heading.id = `${id}-title`;
      heading.textContent = 'THE RHYTHMINATOR';
      clone.querySelector('.clap-bar-scope')?.remove();
      clone.querySelector('[data-clap-status]').textContent = 'Lies die Notation und bereite dich vor. Dann Mikrofon einschalten.';
      clone.querySelector('[data-clap-display]').dataset.state = 'idle';
      const patterns = clone.querySelector('[data-clap-patterns]');
      patterns.replaceChildren();

      const lesson = node.closest('.lesson-section');
      if (lesson?.id === 'k3-lektion-4' && /Leseübung 1/i.test(caption)) {
        const readingFigures = [...lesson.querySelectorAll('figure.score-figure')]
          .filter(figure => !figure.closest('details.solution') && /Leseübung/i.test(text(figure.querySelector('figcaption'))));
        const nextScores = readingFigures.slice(1).map((figure, index) => {
          const nextImage = figure.querySelector('img');
          const parsedNext = notationEvents(nextImage?.alt);
          if (!nextImage || !parsedNext?.noteEvents.length) return null;
          const headingNode = figure.previousElementSibling;
          const title = /^H[234]$/.test(headingNode?.tagName || '')
            ? text(headingNode)
            : text(figure.querySelector('figcaption'));
          const solution = figure.nextElementSibling;
          if (solution?.matches('details.solution')) solution.remove();
          if (/^H[234]$/.test(headingNode?.tagName || '')) headingNode.remove();
          figure.remove();
          return {
            id: `rhythminator-k3l4-reading-${index + 2}`,
            title,
            image: nextImage.getAttribute('src'),
            width: Number(nextImage.getAttribute('width')) || 960,
            height: Number(nextImage.getAttribute('height')) || 135,
            noteEvents: parsedNext.noteEvents,
            clapEvents: parsedNext.noteEvents.map(note => note.beat),
            durationBeats: parsedNext.durationBeats
          };
        }).filter(Boolean);
        clone.dataset.clapNextScoreQueue = JSON.stringify(nextScores);
        const firstHeading = node.previousElementSibling;
        if (/^H[234]$/.test(firstHeading?.tagName || '')) firstHeading.remove();
        if (nextScores.length) {
          const nextButton = document.createElement('button');
          nextButton.type = 'button';
          nextButton.className = 'clap-help-button clap-next-task-button';
          nextButton.dataset.clapNextTask = '';
          nextButton.textContent = 'Nächste Aufgabe';
          nextButton.setAttribute('aria-label', 'Nächste Leseübung anzeigen');
          clone.querySelector('.clap-help-row')?.append(nextButton);
        }
      }
      if (['k3-lektion-1', 'k3-lektion-2'].includes(lesson?.id)) {
        const wholeRests = lesson.id === 'k3-lektion-1';
        const scorePath = image.getAttribute('src').replace(/\.svg$/, '');
        const splitScore = (startBeat, endBeat, title, scoreImage) => {
          const events = parsed.noteEvents
            .filter(note => note.beat >= startBeat && note.beat < endBeat)
            .map(note => ({ ...note, beat: note.beat - startBeat }));
          return {
            id: `rhythminator-${wholeRests ? 'k3l1' : 'k3l2'}-${startBeat ? 'reading-2' : 'reading-1'}`,
            title,
            image: scoreImage,
            width: 960,
            height: 135,
            noteEvents: events,
            clapEvents: events.map(note => note.beat),
            durationBeats: endBeat - startBeat
          };
        };
        const firstScore = splitScore(0, 16, wholeRests ? 'Aufgabe 1 · Takte 1–4' : 'Leseübung 4 · Takte 1–4', `${scorePath}-takte-1-4.svg`);
        const secondScore = splitScore(16, 32, wholeRests ? 'Aufgabe 2 · Takte 5–8' : 'Leseübung 4 · Takte 5–8', `${scorePath}-takte-5-8.svg`);
        clone.dataset.clapCustomScore = JSON.stringify(firstScore);
        clone.dataset.clapNextScore = JSON.stringify(secondScore);
        const nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.className = 'clap-help-button clap-next-task-button';
        nextButton.dataset.clapNextTask = '';
        nextButton.textContent = 'Nächste Aufgabe';
        nextButton.setAttribute('aria-label', 'Takte 5–8 anzeigen');
        nextButton.hidden = true;
        nextButton.dataset.clapUnlockOnSuccess = '';
        if (!wholeRests) nextButton.dataset.clapFinishTarget = 'halbe-pause-hoeraufgaben';
        clone.querySelector('.clap-help-row')?.classList.add('clap-help-row--guided');
        clone.querySelector('.clap-help-row')?.append(nextButton);
      }
      if ((lesson?.id === 'k2-lektion-4' || lesson?.id === 'k3-lektion-3') && /Leseübung 1/i.test(caption)) {
        const nextFigure = [...lesson.querySelectorAll('figure.score-figure')]
          .find(figure => /Leseübung 2/i.test(text(figure.querySelector('figcaption'))));
        const nextImage = nextFigure?.querySelector('img');
        if (nextImage) {
          const nextParsed = notationEvents(nextImage.alt);
          const nextHeading = nextFigure.previousElementSibling;
          const nextScore = {
            id: lesson.id === 'k3-lektion-3' ? 'rhythminator-k3l3-reading-2' : 'rhythminator-k2l4-reading-2',
            title: lesson.id === 'k3-lektion-3' && /^H[234]$/.test(nextHeading?.tagName || '')
              ? text(nextHeading)
              : 'Leseübung 2 · Gemischte Notenwerte',
            image: nextImage.getAttribute('src'),
            width: Number(nextImage.getAttribute('width')) || 960,
            height: Number(nextImage.getAttribute('height')) || 135,
            noteEvents: nextParsed?.noteEvents || [],
            clapEvents: nextParsed?.noteEvents.map(note => note.beat) || [],
            durationBeats: nextParsed?.durationBeats || 16
          };
          clone.dataset.clapNextScore = JSON.stringify(nextScore);
          const helpRow = clone.querySelector('.clap-help-row');
          const nextButton = document.createElement('button');
          nextButton.type = 'button';
          nextButton.className = 'clap-help-button clap-next-task-button';
          nextButton.dataset.clapNextTask = '';
          nextButton.textContent = 'Nächste Aufgabe';
          nextButton.setAttribute('aria-label', 'Nächste Leseübung anzeigen');
          helpRow?.append(nextButton);
          const nextSolution = nextFigure.nextElementSibling;
          if (nextSolution?.matches('details.solution')) nextSolution.remove();
          if (lesson.id === 'k3-lektion-3' && /^H[234]$/.test(nextHeading?.tagName || '')) nextHeading.remove();
          nextFigure.remove();
        }
      }
      return clone;
    };

    document.querySelectorAll('[data-rhythminator-slot]').forEach(slot => {
      const figure = slot.nextElementSibling;
      if (!figure?.matches('figure.score-figure')) return;
      const checker = createChecker(figure, 'rhythminator-k2l1-reading');
      if (checker) {
        slot.replaceWith(checker);
        figure.remove();
      }
    });

    let instance = 0;
    const nodes = [...document.querySelectorAll('h2,h3,h4,section.clap-checker,figure.score-figure')];
    let checkerSinceHeading = false;
    for (const node of nodes) {
      if (!node.isConnected) continue;
      if (/^H[234]$/.test(node.tagName)) {
        checkerSinceHeading = false;
        continue;
      }
      if (node.matches('section.clap-checker')) {
        checkerSinceHeading = true;
        continue;
      }
      if (!node.matches('figure.score-figure') || node.closest('details.solution') || checkerSinceHeading) continue;
      const lesson = node.closest('.lesson-section');
      if (lesson?.id === 'k2-lektion-4' && /Leseübung 2/i.test(text(node.querySelector('figcaption')))) {
        const solution = node.nextElementSibling;
        if (solution?.matches('details.solution')) solution.remove();
        node.remove();
        checkerSinceHeading = true;
        continue;
      }
      const checker = createChecker(node, `rhythminator-reading-${++instance}`);
      if (!checker) continue;
      node.before(checker);
      const removeAfterReadingTool = node.hasAttribute('data-remove-after-rhythminator')
        || node.closest('.lesson-section')?.id === 'k2-lektion-4'
        || node.closest('.lesson-section')?.id === 'k3-lektion-1'
        || node.closest('.lesson-section')?.id === 'k3-lektion-2'
        || node.closest('.lesson-section')?.id === 'k3-lektion-3'
        || node.closest('.lesson-section')?.id === 'k3-lektion-4';
      if (removeAfterReadingTool) {
        const solution = node.nextElementSibling;
        if (solution?.matches('details.solution') && solution.querySelector('aside.drive-audio-card')) solution.remove();
        node.remove();
      }
      checkerSinceHeading = true;
    }
  }

  function addOwnRhythmChecker() {
    const template = document.getElementById('k2l2-rhythminator');
    if (!template) return;
    document.querySelectorAll('[data-own-rhythm-checker]').forEach(slot => {
      const checker = template.cloneNode(true);
      const title = checker.querySelector('.clap-checker-heading h4');
      const patternStorageKey = 'the-tree-of-music-rhythm-k2l5-task3-patterns';
      checker.id = slot.dataset.editorChecker || 'rhythminator-k2l5-own-rhythms';
      if (slot.dataset.editorChecker) {
        checker.hidden = true;
        checker.tabIndex = -1;
        checker.dataset.clapEditorScore = '';
        checker.dataset.clapStartBpm = '70';
        const finish = document.createElement('button');
        finish.type = 'button';
        finish.hidden = true;
        finish.className = 'clap-help-button clap-next-task-button is-finish';
        finish.dataset.clapEditorFinish = slot.dataset.finishTarget;
        finish.textContent = 'Erledigt!';
        const row = checker.querySelector('.clap-help-row');
        row.classList.add('clap-help-row--guided');
        row.append(finish);
      }
      checker.dataset.clapFixedScore = 'false';
      checker.dataset.clapGuidedScore = String(Boolean(slot.dataset.editorChecker));
      checker.dataset.clapStorageKey = patternStorageKey;
      delete checker.dataset.clapCustomScore;
      delete checker.dataset.clapNextScore;
      checker.removeAttribute('data-switch-prompt');
      checker.setAttribute('aria-label', 'The Rhythminator · Eigene Takte');
      checker.setAttribute('aria-labelledby', `${checker.id}-title`);
      title.id = `${checker.id}-title`;
      title.textContent = 'THE RHYTHMINATOR';
      checker.querySelector('.clap-bar-scope')?.remove();
      checker.querySelector('[data-clap-status]').textContent = 'Schreibe deinen Rhythmus im Editor darüber und werte ihn aus. Dann kannst du ihn hier auswählen und klatschen.';
      checker.querySelector('[data-clap-display]').dataset.state = 'idle';
      checker.querySelector('.clap-checker-patterns')?.replaceChildren();
      const gradient = checker.querySelector('linearGradient[id]');
      if (gradient) {
        const previousId = gradient.id;
        const nextId = `${checker.id}-logo`;
        gradient.id = nextId;
        checker.querySelectorAll('[style]').forEach(element => {
          element.setAttribute('style', element.getAttribute('style').replaceAll(`url(#${previousId})`, `url(#${nextId})`));
        });
      }
      slot.replaceWith(checker);
    });
  }

  function replaceMitspielAudios() {
    const template = document.querySelector('[data-missing-clicks-player]');
    if (!template) return;
    document.querySelectorAll('h3,h4').forEach(heading => {
      if (/Mitspiel-MP3/i.test(text(heading))) {
        heading.dataset.rhythmRadioHeading = 'true';
        heading.textContent = heading.textContent.replace(/Mitspiel-MP3/gi, 'Rhythm Radio');
      }
    });
    const headings = [...document.querySelectorAll('h2,h3,h4')];
    const headingFor = (target) => headings.filter(heading => heading.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1);
    const mitspielAsides = [...document.querySelectorAll('aside.drive-audio-card')].filter(aside => {
      if (aside.closest('details.solution')) return false;
      const heading = headingFor(aside);
      return heading?.dataset.rhythmRadioHeading === 'true' || /mitspiel/i.test(text(heading));
    });
    const groupCounts = new Map();
    const mitspielSequences = new Map();
    mitspielAsides.forEach((aside, index) => {
      if (!aside.isConnected) return;
      const heading = headingFor(aside);
      const headingText = text(heading) || 'Mitspielübung';
      const groupIndex = groupCounts.get(headingText) || 0;
      groupCounts.set(headingText, groupIndex + 1);
      const instructionText = `${headingText} ${text(aside.previousElementSibling)}`;
      const lessonId = heading.closest('.lesson-section')?.id || '';
      const isEveryEighthPositions = lessonId === 'k2-lektion-4' && /Mitspielübung\s*1\b|Jede Achtelposition/i.test(headingText);
      const notationFigure = isEveryEighthPositions && aside.nextElementSibling?.matches('figure.score-figure')
        ? aside.nextElementSibling
        : null;
      const candidates = [...document.querySelectorAll('figure.score-figure')]
        .filter(figure => !figure.closest('details.solution'))
        .filter(figure => figure.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING);
      const relatedImage = (notationFigure || candidates[0])?.querySelector('img');
      const parsed = notationEvents(relatedImage?.alt);
      const isQuarterRestSequence = lessonId === 'k3-lektion-3' && heading.dataset.rhythmRadioHeading === 'true';
      const repeatedMitspielSet = groupIndex > 0 && heading.dataset.rhythmRadioHeading === 'true';
      const pattern = isQuarterRestSequence || repeatedMitspielSet
        ? fallbackPattern('Viertelpause', groupIndex)
        : /auf jedem Schlag eine Viertelnote/i.test(instructionText)
        ? fallbackPattern('Viertelnote')
        : parsed?.noteEvents.length
          ? parsed
          : fallbackPattern(instructionText, groupIndex);
      const bars = Math.max(1, Math.round(pattern.durationBeats / 4));
      const clone = cloneRadioTemplate(template);
      clone.removeAttribute('data-switch-prompt');
      clone.setAttribute('aria-label', `The Rhythm Radio begleitet ${headingText}`);
      clone.dataset.pattern = 'score-notation';
      clone.dataset.scoreEvents = pattern.noteEvents.map(note => `${note.beat}:${note.duration}`).join(',');
      clone.dataset.countIn = '4';
      clone.dataset.durationBars = String(bars);
      clone.dataset.durationLabel = `${bars} Takte`;
      clone.dataset.coursePosition = `${Math.min(94, 28 + index * 4)}%`;
      const lessonMatch = lessonId.match(/^k(\d+)-lektion-(\d+)$/);
      const chapterCode = String(lessonMatch?.[1] || 1).padStart(2, '0');
      const lessonCode = String(lessonMatch?.[2] || 1).padStart(2, '0');
      const screen = clone.querySelector('.missing-clicks-screen');
      screen.querySelector('strong').textContent = headingText.replace(/^\d+\.\s*/, '');
      screen.lastElementChild.textContent = isEveryEighthPositions
        ? 'Einzähler · 1 Metronomtakt + 1 Achteltakt · 4 Durchgänge · 50 BPM'
        : `Einzähler · Rhythmus und Metronom · 50 BPM · ${bars} Takte`;
      if (isEveryEighthPositions && relatedImage) {
        const stand = document.createElement('div');
        stand.className = 'rhythm-radio-score-stand';
        stand.setAttribute('role', 'group');
        stand.setAttribute('aria-label', 'Notenblatt auf der Notenablage: ein Metronomtakt, danach acht Achtelnoten; vier Durchgänge');
        const label = document.createElement('span');
        label.textContent = 'RHYTHM SCORE · 4×';
        const paper = document.createElement('div');
        paper.className = 'rhythm-radio-score-paper';
        let scoreImage = relatedImage.cloneNode(true);
        scoreImage.removeAttribute('loading');
        const scoreFrame = document.createElement('div');
        scoreFrame.className = 'rhythm-radio-score-live-frame';
        const scoreOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        scoreOverlay.setAttribute('viewBox', '0 0 960 270');
        scoreOverlay.setAttribute('preserveAspectRatio', 'none');
        scoreOverlay.setAttribute('aria-hidden', 'true');
        scoreOverlay.classList.add('rhythm-radio-score-count-overlay');
        const liveCount = document.createElement('div');
        liveCount.className = 'rhythm-radio-score-live-count';
        liveCount.setAttribute('role', 'status');
        liveCount.setAttribute('aria-live', 'polite');
        liveCount.textContent = 'Visuelle Hilfe: Einzähler 1–2–3–4, danach 1 & 2 & 3 & 4 &';
        scoreFrame.append(scoreImage, scoreOverlay);
        paper.append(liveCount, scoreFrame);
        stand.append(label, paper);
        clone.querySelector('.missing-clicks-radio-face')?.after(stand);

        let visualTimer = 0;
        const clearVisualCount = () => {
          window.clearInterval(visualTimer);
          visualTimer = 0;
          scoreOverlay.replaceChildren();
          liveCount.textContent = 'Visuelle Hilfe: Einzähler 1–2–3–4, danach 1 & 2 & 3 & 4 &';
          stand.classList.remove('is-counting-in', 'is-counting-score');
        };
        const drawCounter = (value, x, y, countingIn = false) => {
          scoreOverlay.replaceChildren();
          const badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badge.setAttribute('x', String(x - 11));
          badge.setAttribute('y', String(y - 17));
          badge.setAttribute('width', '22');
          badge.setAttribute('height', '22');
          badge.setAttribute('rx', '5');
          badge.setAttribute('class', 'rhythm-radio-score-count-badge');
          const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textNode.setAttribute('x', String(x));
          textNode.setAttribute('y', String(y));
          textNode.setAttribute('text-anchor', 'middle');
          textNode.setAttribute('class', 'rhythm-radio-score-count-number');
          textNode.textContent = value;
          scoreOverlay.append(badge, textNode);
          stand.classList.toggle('is-counting-in', countingIn);
          stand.classList.toggle('is-counting-score', !countingIn);
        };
        clone.addEventListener('rhythmradio:playback', event => {
          clearVisualCount();
          const playback = event.detail || {};
          if (!playback.playing) return;
          const beatMs = 60000 / playback.bpm;
          const updateVisualCount = () => {
            const elapsed = performance.now() - playback.startedAt;
            if (elapsed < 0) return;
            if (elapsed < playback.countInBeats * beatMs) {
              const count = Math.min(4, Math.floor(elapsed / beatMs) + 1);
              liveCount.textContent = `EINZÄHLER · ${count}`;
              drawCounter(String(count), 68, 28, true);
              return;
            }
            const scoreBeat = (elapsed - playback.countInBeats * beatMs) / beatMs;
            if (scoreBeat >= playback.durationBeats) {
              clearVisualCount();
              liveCount.textContent = 'Übung beendet · 1 & 2 & 3 & 4 &';
              return;
            }
            const bar = Math.floor(scoreBeat / 4);
            const subdivision = Math.min(7, Math.floor((scoreBeat % 4) * 2));
            const row = Math.floor(bar / 4);
            const barInRow = bar % 4;
            const x = 96 + barInRow * 213.5 + subdivision * 23.4375;
            const y = row === 0 ? 27 : 158;
            const labelText = ['1', '&', '2', '&', '3', '&', '4', '&'][subdivision];
            liveCount.textContent = `TAKT ${bar + 1} · ${labelText}`;
            drawCounter(labelText, x, y);
          };
          updateVisualCount();
          visualTimer = window.setInterval(updateVisualCount, 30);
        });

        const lessonSection = heading.closest('.lesson-section');
        const secondFigure = [...lessonSection.querySelectorAll('figure.score-figure')]
          .find(figure => /Mitspielübung\s*2/i.test(text(headingFor(figure))));
        const secondImage = secondFigure?.querySelector('img');
        const secondAside = mitspielAsides.find(candidate => /Mitspielübung\s*2/i.test(text(headingFor(candidate))));
        if (secondImage && secondAside) {
          const secondHeading = headingFor(secondAside);
          const secondDescription = secondHeading?.nextElementSibling;
          const secondCountLine = secondDescription?.nextElementSibling?.matches('p.count-line')
            ? secondDescription.nextElementSibling
            : null;
          if (secondHeading && secondDescription) {
            aside.before(...[secondHeading, secondDescription, secondCountLine].filter(Boolean));
          }
          const nextTask = document.createElement('button');
          nextTask.type = 'button';
          nextTask.className = 'rhythm-radio-next-task';
          nextTask.textContent = 'Nächste Aufgabe';
          nextTask.setAttribute('aria-label', 'Zur Mitspielübung 2 wechseln');
          clone.append(nextTask);
          secondAside.remove();
          secondFigure.remove();

          nextTask.addEventListener('click', () => {
            const radioButton = clone.querySelector('[data-missing-clicks-play]');
            if (radioButton?.getAttribute('aria-pressed') === 'true') radioButton.click();
            scoreImage.src = secondImage.src;
            scoreImage.alt = secondImage.alt;
            scoreImage.setAttribute('aria-label', 'Mitspielübung 2 · Nur die &-Zählzeiten');
            stand.setAttribute('aria-label', 'Notenblatt auf der Notenablage: ein Metronomtakt, danach Achtelnoten auf den „&“-Zählzeiten; vier Durchgänge');
            label.textContent = 'RHYTHM SCORE · AUFGABE 2 · 4×';
            screen.querySelector('strong').textContent = 'Mitspielübung 2 · Nur die „&“-Zählzeiten';
            screen.lastElementChild.textContent = 'Einzähler · 1 Metronomtakt + 1 Achteltakt · 4 Durchgänge · 50 BPM';
            const secondPattern = notationEvents(secondImage.alt);
            if (secondPattern) {
              clone.dataset.scoreEvents = secondPattern.noteEvents.map(note => `${note.beat}:${note.duration}`).join(',');
              clone.dataset.durationBars = String(Math.max(1, Math.round(secondPattern.durationBeats / 4)));
              clone.dataset.durationLabel = `${clone.dataset.durationBars} Takte`;
            }
            clearVisualCount();
            liveCount.textContent = 'Visuelle Hilfe: Einzähler 1–2–3–4, danach 1 & 2 & 3 & 4 &';
            clone.dispatchEvent(new CustomEvent('rhythmradio:configure'));
            clone.setAttribute('data-switch-prompt', '');
            nextTask.remove();
          });
        }
      }
      const tuning = clone.querySelector('.missing-clicks-tuning-scale');
      const label = `K${chapterCode}L${lessonCode} · Ü${String(groupIndex + 1).padStart(2, '0')}`;
      tuning.setAttribute('aria-label', `Kursfrequenz ${label}`);
      tuning.querySelector('strong').textContent = label;
      tuning.querySelector('.missing-clicks-tuning-track i').style.left = clone.dataset.coursePosition;
      clone.querySelector('[data-missing-clicks-play]').setAttribute('aria-label', 'Rhythm Radio einschalten');
      const logoGradient = clone.querySelector('linearGradient[id]');
      if (logoGradient) {
        const oldId = logoGradient.id;
        const newId = `radio-logo-auto-${index + 1}`;
        logoGradient.id = newId;
        clone.querySelectorAll('[style]').forEach(element => {
          element.setAttribute('style', element.getAttribute('style').replaceAll(`url(#${oldId})`, `url(#${newId})`));
        });
      }
      if (isQuarterRestSequence) {
        const key = `${lessonId}:${headingText}`;
        let sequence = mitspielSequences.get(key);
        if (!sequence) {
          sequence = { radio: clone, tasks: [] };
          mitspielSequences.set(key, sequence);
          aside.replaceWith(clone);
        } else {
          aside.remove();
          clone.remove();
        }
        sequence.tasks.push({
          title: `Mitspielübung ${String(groupIndex + 1).padStart(2, '0')}`,
          events: clone.dataset.scoreEvents,
          bars: clone.dataset.durationBars,
          durationLabel: clone.dataset.durationLabel,
          position: clone.dataset.coursePosition
        });
      } else {
        aside.replaceWith(clone);
      }
      if (isEveryEighthPositions) notationFigure?.remove();

      let preceding = clone.previousElementSibling;
      for (let distance = 0; preceding && distance < 5 && !/^H[234]$/.test(preceding.tagName); distance += 1, preceding = preceding.previousElementSibling) {
        if (preceding.tagName === 'P' && /MP3-Datei|MP3-Dateien|Nutze die Übung|Höre dir die MP3/i.test(text(preceding))) {
          preceding.textContent = /auf jedem Schlag eine Viertelnote/i.test(instructionText)
            ? 'Starte das Rhythm Radio, klatsche auf jedem Schlag eine Viertelnote mit und halte deinen Fußpuls gleichmäßig.'
            : 'Starte das Rhythm Radio, höre den Einzähler und spiele den Rhythmus mit. Wiederhole die Übung, bis du den Puls entspannt halten kannst.';
          break;
        }
      }
    });

    mitspielSequences.forEach(sequence => {
      if (sequence.tasks.length < 2) return;
      const { radio, tasks } = sequence;
      let taskIndex = 0;
      const updateRadioTask = task => {
        const noteBeats = new Set(task.events.split(',').map(event => Number(event.split(':')[0])));
        const beats = [1, 2, 3, 4];
        const lesson = radio.closest('.lesson-section');
        const clap = lesson?.querySelector('[data-quarter-rest-clap]');
        const rest = lesson?.querySelector('[data-quarter-rest-pause]');
        if (clap) clap.textContent = `${beats.filter(beat => noteBeats.has(beat - 1)).join(' und ')} klatschen`;
        if (rest) rest.textContent = `${beats.filter(beat => !noteBeats.has(beat - 1)).join(' und ')} als Pause spüren`;
        radio.dataset.scoreEvents = task.events || '';
        radio.dataset.durationBars = task.bars || '8';
        radio.dataset.durationLabel = task.durationLabel || `${task.bars || 8} Takte`;
        radio.dataset.coursePosition = task.position || '40%';
        const screen = radio.querySelector('.missing-clicks-screen');
        if (screen?.querySelector('strong')) screen.querySelector('strong').textContent = task.title;
        if (screen?.lastElementChild) screen.lastElementChild.textContent = `Einzähler · Rhythmus und Metronom · 50 BPM · ${radio.dataset.durationLabel}`;
        const label = `K03L03 · RHYTHM ${String(taskIndex + 1).padStart(2, '0')}`;
        const tuning = radio.querySelector('.missing-clicks-tuning-scale');
        tuning?.setAttribute('aria-label', `Kursfrequenz ${label}`);
        if (tuning?.querySelector('strong')) tuning.querySelector('strong').textContent = label;
        tuning?.querySelector('.missing-clicks-tuning-track i')?.style.setProperty('left', radio.dataset.coursePosition);
        radio.querySelector('[data-missing-clicks-play]')?.setAttribute('aria-label', `${task.title} abspielen`);
        radio.dispatchEvent(new CustomEvent('rhythmradio:configure'));
      };
      const panel = document.querySelector('#k3-lektion-2 [data-radio-pattern-panel]')?.cloneNode(true);
      if (panel) {
        const pattern = panel.querySelector('[data-radio-click-pattern]');
        pattern.id = 'rhythm-radio-viertelpausen-muster';
        panel.querySelector('[data-radio-shutter-toggle]').setAttribute('aria-controls', pattern.id);
        radio.dataset.radioCountInLamps = '';
        radio.querySelector('.missing-clicks-radio-brand')?.after(panel);
        const nextTask = panel.querySelector('[data-radio-next-exercise]');
        const updateNextButton = () => {
          const finished = taskIndex === tasks.length - 1;
          nextTask.textContent = finished ? 'Fertig!' : 'Nächste Aufgabe';
          nextTask.classList.toggle('is-finish', finished);
        };
        nextTask.addEventListener('click', () => {
          radio.dispatchEvent(new CustomEvent('rhythmradio:stop'));
          if (taskIndex === tasks.length - 1) {
            const reading = document.getElementById('viertelpause-leseuebung');
            reading?.focus({ preventScroll: true });
            reading?.scrollIntoView({ block: 'center' });
          } else {
            taskIndex += 1;
            updateRadioTask(tasks[taskIndex]);
            updateNextButton();
            radio.setAttribute('data-switch-prompt', '');
          }
        });
        updateNextButton();
      }
      updateRadioTask(tasks[0]);
    });
  }

  replaceHearingTasks();
  addErrorFindingRadio();
  replaceMitspielAudios();
  addReadingCheckers();
  addOwnRhythmChecker();
})();
