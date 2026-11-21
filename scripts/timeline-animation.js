(() => {
  const animatedElements = document.querySelectorAll('.rhythm-timeline-animated, .count-line-animated, .count-line-reveal');
  if (!animatedElements.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  animatedElements.forEach((element) => {
    if (element.matches('.count-line-animated, .count-line-reveal')) element.classList.add('wait-for-animation');
  });

  const prepareCountSequence = (line) => {
    const sequence = line.querySelector('.count-sequence');
    const ellipsis = line.querySelector('.count-ellipsis');
    if (!sequence || !ellipsis) return;

    const lineStyle = window.getComputedStyle(line);
    const availableWidth = line.clientWidth - parseFloat(lineStyle.paddingLeft) - parseFloat(lineStyle.paddingRight);
    const ellipsisWidth = ellipsis.getBoundingClientRect().width;
    const measureNode = document.createElement('span');
    measureNode.className = 'count-sequence';
    measureNode.style.cssText = 'position:fixed;left:-10000px;top:0;display:inline-block;width:max-content;white-space:nowrap;visibility:hidden;flex:none';
    line.append(measureNode);
    let count = 1;

    for (let candidate = 1; candidate <= 16; candidate += 1) {
      measureNode.textContent = Array.from({ length: candidate }, (_, index) => index + 1).join(' – ');
      if (measureNode.getBoundingClientRect().width + ellipsisWidth > availableWidth) break;
      count = candidate;
    }
    measureNode.remove();

    sequence.textContent = '';
    for (let value = 1; value <= count; value += 1) {
      const beat = document.createElement('span');
      beat.className = 'count-beat';
      beat.style.setProperty('--beat-delay', `${value - 1}s`);
      beat.textContent = `${value > 1 ? ' – ' : ''}${value}`;
      sequence.append(beat);
    }
    line.setAttribute('aria-label', `Die Zählreihe zählt gleichmäßig von eins bis ${count} und so weiter.`);
    const dots = ellipsis.querySelectorAll('.count-ellipsis-dot');
    dots.forEach((dot, index) => dot.style.setProperty('--beat-delay', `${count + index * 0.25}s`));
    listenForCountRestart(line, dots[dots.length - 1] || ellipsis);
  };

  const restartCountAnimation = (line) => {
    window.setTimeout(() => {
      if (!line.isConnected) return;
      line.classList.remove('is-animated');
      line.classList.add('wait-for-animation');
      void line.offsetWidth;
      window.requestAnimationFrame(() => {
        line.classList.remove('wait-for-animation');
        line.classList.add('is-animated');
      });
    }, 3000);
  };

  const listenForCountRestart = (line, lastBeat) => {
    lastBeat.addEventListener('animationend', (event) => {
      if (event.animationName !== 'count-line-appear') return;
      restartCountAnimation(line);
    });
  };

  const start = (element) => {
    if (element.classList.contains('is-animated')) return;
    if (element.matches('.count-line-animated')) prepareCountSequence(element);
    if (element.matches('.count-line-reveal')) {
      const beats = element.querySelectorAll('.count-beat');
      const dots = element.querySelectorAll('.count-ellipsis-dot');
      const finalMarker = dots[dots.length - 1] || beats[beats.length - 1];
      if (finalMarker) listenForCountRestart(element, finalMarker);
    }
    element.classList.remove('wait-for-animation');
    element.classList.add('is-animated');
  };
  let observer;
  let userHasScrolled = false;
  const startVisibleOnScroll = () => {
    userHasScrolled = true;
    animatedElements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top >= window.innerHeight || bounds.bottom <= 0) return;
      start(element);
      observer?.unobserve(element);
    });
    if ([...animatedElements].every((element) => element.classList.contains('is-animated'))) {
      window.removeEventListener('scroll', startVisibleOnScroll);
    }
  };
  window.addEventListener('scroll', startVisibleOnScroll, { passive: true });

  if (!('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || !userHasScrolled) return;
      start(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.25 });

  animatedElements.forEach((element) => observer.observe(element));
})();
