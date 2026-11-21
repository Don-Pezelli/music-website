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

    if (mode === 'slow' || mode === 'accelerating') {
      const startBpm = mode === 'slow' ? 2 : 70;
      state.animation = circle.animate(keyframes, { duration: 60000 / startBpm, iterations: Infinity, easing: 'ease-in-out' });
      if (mode === 'accelerating') {
        const startTime = performance.now();
        const rampDuration = 7000;
        const ramp = (now) => {
          if (!active.has(circle)) return;
          const progress = Math.min(1, (now - startTime) / rampDuration);
          const eased = progress * progress * (3 - 2 * progress);
          state.animation.playbackRate = (startBpm + (1200 - startBpm) * eased) / startBpm;
          if (progress < 1) {
            state.frame = requestAnimationFrame(ramp);
          } else {
            state.animation.cancel();
            state.animation = null;
            circle.style.transform = 'scale(1)';
          }
        };
        state.frame = requestAnimationFrame(ramp);
      }
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

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => isIntersecting ? start(target) : stop(target));
    }, { threshold: 0.25 });
    circles.forEach((circle) => observer.observe(circle));

    // Once the learner reaches the next concept, the tempo examples above it
    // become still so they no longer compete for attention while reading.
    const innerTimeHeading = document.querySelector('.inner-time-heading');
    if (innerTimeHeading) {
      const readingObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        const heart = innerTimeHeading.querySelector('.inner-time-heart');
        if (heart && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          heart.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
            { duration: 2000, iterations: 1, easing: 'ease-in-out' }
          );
        }
        circles.forEach((circle) => {
          stop(circle);
          observer.unobserve(circle);
        });
        readingObserver.disconnect();
      }, { threshold: 0.25 });
      readingObserver.observe(innerTimeHeading);
    }
  } else {
    circles.forEach(start);
  }
})();
