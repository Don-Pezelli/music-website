document.querySelectorAll('[data-cockpit-dial]').forEach(dial => {
  const input = dial.querySelector('input');
  const update = () => dial.style.setProperty('--knob-angle', `${input.valueAsNumber * 2.7 - 135}deg`);
  const knob = dial.querySelector('.cockpit-knob');
  let drag;

  knob.addEventListener('pointerdown', event => {
    if (input.disabled || event.button !== 0 || drag) return;
    event.preventDefault();
    drag = { id: event.pointerId, y: event.clientY, value: input.valueAsNumber };
    input.focus({ preventScroll: true });
    knob.setPointerCapture(event.pointerId);
  });

  knob.addEventListener('pointermove', event => {
    if (input.disabled || !drag || drag.id !== event.pointerId) return;
    const change = (drag.y - event.clientY) / 1.5;
    drag.y = event.clientY;
    drag.value = Math.min(100, Math.max(0, drag.value + change));
    const nextValue = Math.round(drag.value);
    if (input.valueAsNumber === nextValue) return;
    input.valueAsNumber = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  knob.addEventListener('lostpointercapture', () => { drag = undefined; });
  input.addEventListener('input', update);
  update();
});

document.querySelectorAll('[data-volume-ramp]').forEach(ramp => {
  const input = ramp.closest('[data-cockpit-dial]').querySelector('input');
  const updateVolume = () => ramp.style.setProperty('--volume-position', `${input.valueAsNumber}%`);
  input.addEventListener('input', updateVolume);
  updateVolume();
});

document.querySelectorAll('.cockpit-scale--resonance').forEach(scale => {
  const input = scale.closest('[data-cockpit-dial]').querySelector('input');

  function updateIcons() {
    const position = (input.valueAsNumber - 50) / 50;
    scale.style.setProperty('--nasal-size', 1 + .9 * Math.max(0, -position));
    scale.style.setProperty('--oral-size', 1 + .9 * Math.max(0, position));
  }

  input.addEventListener('input', updateIcons);
  updateIcons();
});

document.querySelectorAll('[data-pressure-meter]').forEach(meter => {
  const dial = meter.closest('[data-cockpit-dial]');
  const input = dial.querySelector('input');
  const left = dial.querySelector('[data-pressure-fold="left"]');
  const right = dial.querySelector('[data-pressure-fold="right"]');
  const lamps = Array.from(meter.children);

  function updatePressure() {
    const pressure = input.valueAsNumber;
    const litCount = Math.ceil(pressure / 100 * lamps.length);
    lamps.forEach((lamp, index) => lamp.classList.toggle('is-lit', index < litCount));

    const opening = 13 * (1 - pressure / 100);
    left.setAttribute('d', `M40 9Q29 13 23 31Q22 38 ${40 - opening} 39L40 9Z`);
    right.setAttribute('d', `M40 9Q51 13 57 31Q58 38 ${40 + opening} 39L40 9Z`);
    input.setAttribute('aria-valuetext', `${100 - pressure} % Luftstrom, ${pressure} % Luftdruck`);
  }

  input.addEventListener('input', updatePressure);
  updatePressure();
});

document.querySelectorAll('[data-cockpit-pitch]').forEach(pitch => {
  pitch.addEventListener('input', () => {
    const value = pitch.valueAsNumber;
    const amount = Math.round(Math.abs(value) * 100);
    const direction = value < 0 ? 'tiefer' : 'höher';
    const label = amount === 0 ? 'Ausgangston'
      : amount === 100 ? `Ein Ganzton ${direction}`
      : `${amount} % eines Ganztons ${direction}`;
    pitch.setAttribute('aria-valuetext', label);
  });
});

document.querySelectorAll('[data-cockpit-power]').forEach(power => {
  const cockpit = power.closest('.voice-cockpit');
  const inputs = cockpit.querySelectorAll('.cockpit-controls input:not(:disabled)');
  const label = power.querySelector('[data-cockpit-power-label]');
  const breathPower = cockpit.querySelector('[data-cockpit-breath-power]');
  const mode = cockpit.querySelector('[data-cockpit-mode]');

  function setPowered(on) {
    cockpit.classList.toggle('is-powered', on);
    power.setAttribute('aria-checked', String(on));
    label.textContent = on ? 'An' : 'Aus';
    inputs.forEach(input => { input.disabled = !on; });
    if (breathPower) breathPower.disabled = !on;
    if (mode) mode.disabled = !on;
  }

  mode?.addEventListener('click', () => {
    const automatic = mode.getAttribute('aria-checked') !== 'true';
    mode.setAttribute('aria-checked', String(automatic));
  });

  setPowered(power.getAttribute('aria-checked') === 'true');
  power.addEventListener('click', () => setPowered(power.getAttribute('aria-checked') !== 'true'));
});

document.querySelectorAll('[data-cockpit-breath-power]').forEach(power => {
  const breath = power.closest('.cockpit-breath');
  const label = power.querySelector('[data-cockpit-power-label]');
  const bar = breath.querySelector('.cockpit-breath-track span');
  let centering;

  function horizontalInsets(clipPath) {
    const values = clipPath.match(/^inset\((.*?) round/)?.[1].split(/\s+/) ?? ['0'];
    const right = values[1] ?? values[0];
    const left = values[3] ?? right;
    return [left, right].map(value => value.endsWith('%')
      ? parseFloat(value)
      : parseFloat(value) / bar.clientWidth * 100);
  }

  power.addEventListener('click', () => {
    const on = power.getAttribute('aria-checked') !== 'true';
    centering?.cancel();
    const sweep = on ? null : bar.getAnimations().find(animation => animation.animationName === 'cockpit-breath-sweep');
    const from = sweep ? getComputedStyle(bar).clipPath : null;

    power.setAttribute('aria-checked', String(on));
    label.textContent = on ? 'An' : 'Aus';
    breath.classList.toggle('is-stopped', !on);

    if (from && bar.clientWidth) {
      const to = getComputedStyle(bar).clipPath;
      const start = horizontalInsets(from);
      const end = horizontalInsets(to);
      const distance = Math.max(...start.map((value, index) => Math.abs(value - end[index])));
      const duration = sweep.effect.getTiming().duration * distance / 400;
      centering = bar.animate([{ clipPath: from }, { clipPath: to }], {
        duration,
        easing: 'ease-in-out'
      });
    }
  });
});

document.querySelectorAll('[data-cockpit-airflow-task]').forEach(cockpit => {
  const volume = cockpit.querySelector('[data-airflow-answer="volume"]');
  const flow = cockpit.querySelector('[data-airflow-answer="flow"]');
  const feedback = cockpit.querySelector('[data-cockpit-feedback]');
  const help = cockpit.querySelector('[data-cockpit-help]');
  const hint = document.getElementById(help.getAttribute('aria-controls'));

  function checkSettings() {
    const correct = volume.valueAsNumber === 0 && flow.valueAsNumber === 0;
    cockpit.classList.toggle('is-correct', correct);
    const message = correct ? 'Wir atmen!' : 'Noch nicht richtig. Was hast du beim Ausatmen gespürt und gehört?';
    if (feedback.textContent !== message) feedback.textContent = message;
  }

  volume.addEventListener('input', checkSettings);
  flow.addEventListener('input', checkSettings);
  help.addEventListener('click', () => {
    hint.hidden = !hint.hidden;
    help.setAttribute('aria-expanded', String(!hint.hidden));
  });
});

document.querySelectorAll('[data-cockpit-live-display]').forEach(screen => {
  const cockpit = screen.closest('.voice-cockpit');
  const status = screen.querySelector('[role="status"]');

  cockpit.querySelector('.cockpit-controls').addEventListener('input', ({ target: input }) => {
    let message;
    let meter;

    if (input.hasAttribute('data-display-on')) {
      message = input.checked ? input.dataset.displayOn : input.dataset.displayOff;
    } else if (input.hasAttribute('data-display-pressure')) {
      meter = 'pressure';
      const pressure = input.valueAsNumber;
      message = `Luftstrom ${100 - pressure} % · Luftdruck ${pressure} %`;
    } else if (input.closest('[data-cockpit-dial]')?.querySelector('[data-volume-ramp]')) {
      meter = 'volume';
      message = `Lautstärke ${input.valueAsNumber} %`;
    } else if (input.closest('[data-cockpit-dial]')?.querySelector('.cockpit-scale--resonance')) {
      message = 'Stimme wird platziert.';
    } else if (input.hasAttribute('data-cockpit-pitch')) {
      message = 'Tonhöhe wird ausgewählt.';
    }

    if (!message) return;
    if (meter) {
      screen.dataset.meter = meter;
      screen.style.setProperty('--screen-level', `${input.valueAsNumber}%`);
    } else {
      delete screen.dataset.meter;
    }
    if (status.textContent !== message) status.textContent = message;
  });
});

document.querySelectorAll('[data-cockpit-info-toggle]').forEach(button => {
  const cockpit = button.closest('.voice-cockpit');
  const points = cockpit.querySelectorAll('[data-cockpit-info-point]');
  const card = cockpit.querySelector('.cockpit-info-card');
  const sweep = cockpit.querySelector('.cockpit-info-sweep');
  let activePoint = null;

  function closeCard() {
    activePoint?.setAttribute('aria-expanded', 'false');
    activePoint = null;
    card.hidden = true;
  }

  button.addEventListener('click', () => {
    const show = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(show));
    closeCard();
    sweep.hidden = !show;
    if (!show) {
      points.forEach(point => { point.parentElement.hidden = true; });
      return;
    }

    const buttonBounds = button.getBoundingClientRect();
    const originX = buttonBounds.left + buttonBounds.width / 2;
    const originY = buttonBounds.top + buttonBounds.height / 2;
    const panel = sweep.getBoundingClientRect();
    const x = originX - panel.left;
    const y = originY - panel.top;
    const radius = Math.hypot(Math.max(x, panel.width - x), Math.max(y, panel.height - y));
    const millisecondsPerPixel = 1.15;
    sweep.style.setProperty('--sweep-x', `${x}px`);
    sweep.style.setProperty('--sweep-y', `${y}px`);
    sweep.style.setProperty('--sweep-diameter', `${2 * radius}px`);
    sweep.style.setProperty('--sweep-time', `${radius * millisecondsPerPixel}ms`);

    points.forEach(point => {
      const marker = point.parentElement;
      marker.hidden = false;
      const target = point.getBoundingClientRect();
      const distance = Math.hypot(target.left - 15 - originX, target.top + 29 - originY);
      marker.style.setProperty('--cockpit-info-delay', `${distance * millisecondsPerPixel}ms`);
    });
  });

  points.forEach(point => point.addEventListener('click', () => {
    const show = activePoint !== point;
    closeCard();
    if (!show) return;
    activePoint = point;
    point.setAttribute('aria-expanded', 'true');
    card.replaceChildren(point.nextElementSibling.content.cloneNode(true));
    card.hidden = false;
    const panel = cockpit.getBoundingClientRect();
    const marker = point.getBoundingClientRect();
    const x = marker.left + marker.width / 2 - panel.left - cockpit.clientLeft;
    const y = marker.top + marker.height / 2 - panel.top - cockpit.clientTop;
    const gap = 7;
    const maxLeft = cockpit.clientWidth - card.offsetWidth - gap;
    const right = x + gap;
    const left = x - card.offsetWidth - gap;
    const beside = right <= maxLeft || left >= gap;
    const cardLeft = right <= maxLeft ? right : Math.max(gap, Math.min(left, maxLeft));
    const cardTop = beside ? y - 12 : y + gap;
    card.style.setProperty('--cockpit-info-left', `${cardLeft}px`);
    card.style.setProperty('--cockpit-info-top', `${cardTop}px`);
    card.focus({ preventScroll: true });
  }));

  cockpit.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !activePoint) return;
    activePoint.focus();
    closeCard();
    event.stopPropagation();
  });

  card.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    closeCard();
  });
});
