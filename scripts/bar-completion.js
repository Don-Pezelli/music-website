(() => {
  'use strict';
  document.querySelectorAll('.bar-completion[data-completion]').forEach(setup);
  function setup(root) {
  const config = window.completionExercises?.[root.dataset.completion];
  if (!config || !window.completionValues) return;
  const values = window.completionValues
    .filter(value => (config.rests || value.id.startsWith('n')) && (config.course > 1 || value.units >= 2))
    .map(value => ({...value, units: value.units * 3, rest: value.id.startsWith('r')}));
  if (config.rests && config.course > 1) values.push({id:'r16', name:'Sechzehntelpause', units:3, rest:true, code:'E4E7'});
  if (config.course === 3) {
    values.push({id:'nt',name:'Triolenachtelnote',units:4,triplet:true,code:'E1D7'});
    if (config.rests) values.push({id:'rt',name:'Triolenachtelpause',units:4,triplet:true,rest:true,code:'E4E6'});
  }
  const bars = config.gaps.map(gap => ({...gap, notes:[]}));
  // Beam short notes within each quarter beat; never across a beat boundary.
  function notation(bar, requestedWidth, editable) {
    let cursor = bar.onset;
    const notes = bar.notes.map(value => {
      const note = {value, onset: cursor, end: cursor + value.units};
      cursor = note.end;
      return note;
    });
    const origin = bar.onset;
    const capacity = bar.duration;
    const length = Math.max(capacity, cursor - origin);
    // The source score uses 94 SVG units per quarter beat. Keep its
    // geometry fixed: a gap starts 3 units before the first note origin.
    // Never shrink or redistribute notes to fit the number of entries.
    const unit = editable ? 12 : config.step;
    const width = editable ? Math.max(requestedWidth, length * unit + 16) : requestedWidth;
    notes.forEach(note => { note.x = 3 + (note.onset - origin) * unit; });
    const groups = [];
    notes.forEach((note, index) => {
      if (note.value.rest || note.value.units > 6 || Math.floor(note.onset / 12) !== Math.floor((note.end - 1) / 12)) return;
      const previous = groups[groups.length - 1];
      if (previous && previous[previous.length - 1] === index - 1 && Math.floor(notes[previous[0]].onset / 12) === Math.floor(note.onset / 12) && !!notes[previous[0]].value.triplet === !!note.value.triplet) previous.push(index);
      else groups.push([index]);
    });
    const beamed = new Set(groups.filter(group => group.length > 1).flat());
    const glyphs = window.completionGlyphs;
    let body = `<path d="M0 44H${width}" stroke="currentColor" stroke-width="1"/>`;
    notes.forEach((note, index) => {
      const code = beamed.has(index) ? 'E0A4' : note.value.code || (note.value.rest ? {48:'E4E3',24:'E4E4',12:'E4E5',6:'E4E6',3:'E4E7'} : {48:'E1D2',24:'E1D3',12:'E1D5',6:'E1D7',3:'E1D9'})[note.value.units];
      body += `<g ${editable ? `data-note="${index}" role="button" tabindex="0" aria-label="${index + 1}. Zeichen: ${note.value.name} entfernen"` : ''}>`;
      if (editable) body += `<rect class="completion-hit" x="${note.x-2}" y="0" width="${Math.max(18,note.value.units*unit)}" height="70" fill="transparent"/>`;
      body += `<path data-onset="${note.onset}" data-smufl="${code}" transform="translate(${note.x} 64.8) scale(.52 -.52)" fill="currentColor" d="${glyphs[code]}"/>`;
      if (beamed.has(index)) body += `<path d="M${note.x+11.3} 44V6" stroke="currentColor" stroke-width="1.5"/>`;
      body += '</g>';
    });
    const beam = (x1, x2, level) => `<path data-beam-level="${level}" d="M${x1} ${level === 1 ? 6 : 15}H${x2}" stroke="currentColor" stroke-width="4.5" pointer-events="none"/>`;
    groups.filter(group => group.length > 1).forEach(group => {
      body += beam(notes[group[0]].x+10.6, notes[group[group.length-1]].x+12, 1);
      for (let i=0; i<group.length; i++) {
        if (notes[group[i]].value.units !== 3) continue;
        let end=i;
        while (end+1<group.length && notes[group[end+1]].value.units===3) end++;
        const x=notes[group[i]].x+11.3;
        if (end>i) body += beam(x-.7, notes[group[end]].x+12, 2);
        else {
          const direction = i===0 ? 1 : i===group.length-1 ? -1 : notes[group[i]].onset%6===0 ? 1 : -1;
          const neighbor=notes[group[i+direction]].x+11.3;
          body += beam(x, x+direction*Math.min(10,Math.abs(neighbor-x)*.45), 2);
        }
        i=end;
      }
    });
    const tripletBeats = [...new Set(notes.filter(n=>n.value.triplet).map(n=>Math.floor(n.onset/12)))];
    tripletBeats.forEach(beat => {
      const members = notes.filter(n=>n.value.triplet && Math.floor(n.onset/12)===beat);
      const left = members[0].x-2, right = members[members.length-1].x+16;
      body += `<path data-triplet-bracket="true" d="M${left} 2V-4H${right}V2" fill="none" stroke="currentColor"/><text x="${(left+right)/2}" y="-7" text-anchor="middle" font-family="Arial" font-size="11">3</text>`;
    });
    const dy = editable ? 18 : bar.baseline-44;
    const height = editable ? 92 : bar.height;
    return `<svg class="completion-notation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ${editable ? `width="${width}" height="${height}" role="group" aria-label="Deine Ergänzung; zum Entfernen anklicken"` : 'aria-hidden="true"'}><g transform="translate(0 ${dy})">${body}</g></svg>`;

  }

  let active = 0;
const figure = root.previousElementSibling;
const link = figure.querySelector('a');
const score = document.createElement('div');
score.className = 'completion-score';
link.replaceWith(score);
score.append(link.querySelector('img'));
const dialog = document.createElement('dialog');
dialog.className = 'completion-dialog bar-completion';
dialog.setAttribute('aria-label', 'Lücke ergänzen');
const close = document.createElement('button');
close.type = 'button'; close.className = 'completion-close'; close.textContent = 'Fertig · Schließen ×';
dialog.append(close, root.querySelector('.completion-palette'), root.querySelector('.completion-bars'));
root.append(dialog);
let opener;
close.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => opener?.focus({preventScroll:true}));
const positions = config.gaps.map(gap => [gap.x,gap.y,gap.width,gap.height]);
const gaps = positions.map(([x,y,w,h], index) => {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'completion-gap';
  button.style.cssText = `left:${x/config.width*100}%;top:${y/config.height*100}%;width:${w/config.width*100}%;height:${h/config.height*100}%;`;
  button.setAttribute('aria-haspopup','dialog');
  button.addEventListener('click', () => {select(index); opener=button; dialog.showModal(); dialog.querySelector('.completion-palette button').focus();});
  score.append(button); return button;
});
function updateGap(index) {
  const bar=bars[index], button=gaps[index];
  button.replaceChildren();
  if (!bar.notes.length) button.textContent='?';
  else button.innerHTML = notation(bar, positions[index][2], false);
  button.setAttribute('aria-label', `Takt ${bar.bar}: Lücke ${bar.notes.length ? 'bearbeiten. '+bar.notes.map(v=>v.name).join(', ') : 'ergänzen'}`);
  button.dataset.result=bar.correct ? 'correct' : '';
}
  const container = root.querySelector('.completion-bars');
  const summary = root.querySelector('.completion-summary');
  const beats = units => {
    const whole=Math.floor(units/12), remainder=units%12;
    if (!remainder) return String(whole);
    const gcd=(a,b)=>b?gcd(b,a%b):a, divisor=gcd(remainder,12);
    const fraction={3:'¼',4:'⅓',6:'½',8:'⅔',9:'¾'}[remainder] || `${remainder/divisor}/${12/divisor}`;
    return `${whole || ''}${fraction}`;
  };
  function select(index) {
    active = index;

    container.querySelectorAll('.completion-bar').forEach((card, i) => card.hidden = i !== index);
  }
  function render(index) {
    const bar = bars[index];
    const card = container.children[index];
    const sequence = card.querySelector('.completion-sequence');
    sequence.replaceChildren();
    if (!bar.notes.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Deine Ergänzung erscheint hier.';
      sequence.append(empty);
    }
if (bar.notes.length) {
  sequence.innerHTML = notation(bar, Math.max(180, bar.notes.length * 40), true);
  sequence.querySelectorAll('[data-note]').forEach(button => {
    const remove = () => {
      const n = Number(button.dataset.note);
      bar.notes.splice(n, 1); render(index);
      const remaining = sequence.querySelectorAll('[data-note]');
      (remaining[Math.min(n, remaining.length - 1)] || card.querySelector('[data-check]')).focus();
    };
    button.addEventListener('click', remove);
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); remove();}
    });
  });
}
    card.querySelector('.completion-feedback').textContent = '';
    card.querySelector('.completion-feedback').removeAttribute('data-result');
    card.querySelector('[data-clear]').disabled = !bar.notes.length;
    bar.correct = false;
    summary.textContent = '';
    updateGap(index);
  }
  bars.forEach((bar, index) => {

    const card = document.createElement('div');
    card.className = 'completion-bar';
    card.innerHTML = `<h6>Takt ${bar.bar} · Lücke ergänzen</h6><div class="completion-sequence" role="group" aria-label="Deine Ergänzung für Takt ${bar.bar}"></div><p class="completion-hint">Klicke auf ein eingesetztes Zeichen, um es zu entfernen.</p><div class="completion-actions"><button type="button" data-check>Lücke prüfen</button><button type="button" data-clear>Ergänzung löschen</button></div><p class="completion-feedback" role="status" aria-live="polite"></p>`;
    container.append(card);
    card.querySelector('[data-clear]').addEventListener('click', () => {bar.notes = []; render(index); card.querySelector('[data-check]').focus();});
    card.querySelector('[data-check]').addEventListener('click', () => {
      const feedback = card.querySelector('.completion-feedback');
      if (!bar.notes.length) {feedback.textContent = 'Füge zuerst Zeichen für die Lücke hinzu.'; return;}
      const total = bar.notes.reduce((sum, value) => sum + value.units, 0);
      const delta = total - bar.duration;
      let onset=bar.onset;
      const timeline=bar.notes.map(value=>{const item={value,onset};onset+=value.units;return item;});
      const triBeats=[...new Set(timeline.filter(n=>n.value.triplet).map(n=>Math.floor(n.onset/12)))];
      const invalid = triBeats.some(beat=>{
        const group=timeline.filter(n=>Math.floor(n.onset/12)===beat);
        return group.length!==3 || group.some((n,i)=>!n.value.triplet || n.onset!==beat*12+i*4);
      }) || timeline.some(n=>!n.value.triplet && n.onset%3!==0);
      if (!delta && invalid) {
        bar.correct=false;updateGap(index);
        feedback.dataset.result='retry';
        feedback.textContent='Die Dauer stimmt. Fasse die Triolen aber zu vollständigen Dreiergruppen innerhalb eines Viertelschlags zusammen.';
        return;
      }
      bar.correct = delta === 0;
      updateGap(index);
      feedback.dataset.result = bar.correct ? 'correct' : 'retry';
      feedback.textContent = bar.correct
        ? 'Richtig! Deine Ergänzung passt genau in diese Lücke.'
        : `Deine Ergänzung hat ${beats(total)} Schläge. ${delta < 0 ? `Es fehlen noch ${beats(-delta)} Schläge.` : `Das sind ${beats(delta)} Schläge zu viel.`} Passe deine Ergänzung an.`;
      if (bars.every(b => b.correct)) summary.textContent = 'Geschafft! Alle Lücken dieser Aufgabe sind richtig ergänzt.';
    });
    render(index);
  });
  values.forEach(value => {
    const button = document.createElement('button'); button.type = 'button';
    const icon = value.svg || `<svg viewBox="-12 -85 78 120" aria-hidden="true"><path transform="scale(.8 -.8)" d="${window.completionGlyphs[value.code]}" fill="currentColor"/>${value.triplet ? '<text x="30" y="-64" text-anchor="middle" font-size="17">3</text>' : ''}</svg>`;
    button.innerHTML = `${icon}<span>${value.name}</span>`;
    button.addEventListener('click', () => {
      if (bars[active].notes.length >= 32) {summary.textContent = 'Entferne erst ein Zeichen, bevor du weitere hinzufügst.'; return;}
      bars[active].notes.push(value); render(active);
    });
    root.querySelector('.completion-palette').append(button);
  });
  select(0);
  }
})();
