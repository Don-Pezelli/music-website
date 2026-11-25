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
    input.valueAsNumber = Math.round(drag.value);
    update();
  });

  knob.addEventListener('lostpointercapture', () => { drag = undefined; });
  input.addEventListener('input', update);
  update();
});

document.querySelectorAll('[data-cockpit-pitch]').forEach(pitch => {
  pitch.addEventListener('input', () => {
    pitch.setAttribute('aria-valuetext', ['Ein Ton tiefer', 'Ausgangston', 'Ein Ton höher'][pitch.valueAsNumber + 1]);
  });
});

document.querySelectorAll('[data-cockpit-power]').forEach(power => {
  const cockpit = power.closest('.voice-cockpit');
  const inputs = cockpit.querySelectorAll('.cockpit-controls input:not(:disabled)');
  const label = power.querySelector('[data-cockpit-power-label]');

  function setPowered(on) {
    cockpit.classList.toggle('is-powered', on);
    power.setAttribute('aria-checked', String(on));
    label.textContent = on ? 'An' : 'Aus';
    inputs.forEach(input => { input.disabled = !on; });
  }

  setPowered(power.getAttribute('aria-checked') === 'true');
  power.addEventListener('click', () => setPowered(power.getAttribute('aria-checked') !== 'true'));
});
