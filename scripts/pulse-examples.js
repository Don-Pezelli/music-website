(() => {
  const circles = [...document.querySelectorAll('.pulse-rate-circle[data-pulse-mode]')];
  if (!circles.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const active = new Map();
  const keyframes = [
    { transform: 'scale(1)' },
    { transform: 'scale(1.26)' },
    { transform: 'scale(1)' }
  ];

  function start(circle) {
    if (active.has(circle)) return;
    const state = { animation: null, frame: 0, timer: 0 };
    active.set(circle, state);
    const mode = circle.dataset.pulseMode;

    if (mode === 'accelerating') {
      const startBpm = 70;
      const endBpm = 1200;
      const firstBeat = 60 / startBpm;
      const rampDuration = 7;
      const startedAt = performance.now();
      const tick = (now) => {
        const elapsed = Math.max(0, (now - startedAt) / 1000);
        const rampTime = Math.max(0, elapsed - firstBeat);
        if (rampTime >= rampDuration) {
          stop(circle);
          return;
        }

        // Integrate the rising tempo so the pulse phase stays continuous.
        const phase = (startBpm * elapsed + (endBpm - startBpm) * rampTime ** 2 / (2 * rampDuration)) / 60;
        const fade = Math.min(1, (rampDuration - rampTime) / 0.3);
        const pulse = Math.sin(Math.PI * phase) ** 2;
        circle.style.transform = `scale(${1 + 0.26 * pulse * fade})`;
        state.frame = requestAnimationFrame(tick);
      };
      tick(startedAt);
      return;
    }

    if (mode === 'slow') {
      const frames = [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.26)', offset: 0.015 },
        { transform: 'scale(1)', offset: 0.03 },
        { transform: 'scale(1)', offset: 1 }
      ];
      state.animation = circle.animate(frames, { duration: 30000, iterations: Infinity, easing: 'ease-in-out' });
      return;
    }

    const pulseAtRandomInterval = () => {
      if (!active.has(circle)) return;
      state.animation = circle.animate(keyframes, { duration: 420, easing: 'ease-out' });
      state.timer = window.setTimeout(pulseAtRandomInterval, 550 + Math.random() * 2300);
    };
    state.timer = window.setTimeout(pulseAtRandomInterval, 400 + Math.random() * 1500);
  }

  function stop(circle) {
    const state = active.get(circle);
    if (!state) return;
    cancelAnimationFrame(state.frame);
    clearTimeout(state.timer);
    state.animation?.cancel();
    circle.style.transform = '';
    circle.style.boxShadow = '';
    active.delete(circle);
  }

  const startButtons = [...document.querySelectorAll('[data-pulse-start]')];
  const manualCircles = new Set();
  startButtons.forEach((button) => {
    const circle = document.getElementById(button.getAttribute('aria-controls'));
    if (!circles.includes(circle)) return;
    manualCircles.add(circle);
    button.addEventListener('click', () => {
      stop(circle);
      start(circle);
    });
    button.hidden = false;
  });

  if ('IntersectionObserver' in window) {
    const visibleCircles = new Set();
    let readingInnerTime = false;
    let heartPulsed = false;
    const updateCircles = () => {
      circles.forEach((circle) => {
        if (!visibleCircles.has(circle) || readingInnerTime) stop(circle);
        else if (!manualCircles.has(circle)) start(circle);
      });
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) visibleCircles.add(target);
        else visibleCircles.delete(target);
      });
      updateCircles();
    }, { threshold: 0 });
    circles.forEach((circle) => observer.observe(circle));

    const innerTimeHeading = document.querySelector('.inner-time-heading');
    if (innerTimeHeading) {
      const updateReadingPosition = () => {
        const heading = innerTimeHeading.getBoundingClientRect();
        const isReading = heading.top < window.innerHeight * 0.4 && heading.bottom > 0;
        if (isReading === readingInnerTime) return;
        readingInnerTime = isReading;
        updateCircles();
        const heart = innerTimeHeading.querySelector('.inner-time-heart');
        if (readingInnerTime && heart && !heartPulsed) {
          heartPulsed = true;
          heart.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
            { duration: 2000, iterations: 1, easing: 'ease-in-out' }
          );
        }
      };
      window.addEventListener('scroll', updateReadingPosition, { passive: true });
      window.addEventListener('resize', updateReadingPosition);
      updateReadingPosition();
    }
  } else {
    circles.filter((circle) => !manualCircles.has(circle)).forEach(start);
  }
})();
