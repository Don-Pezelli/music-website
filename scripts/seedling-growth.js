(() => {
  const svg = document.querySelector('[data-seed-growth] .seed-growth-art');
  if (!svg) return;

  const growthStages = [
    ['roots', '.growth-roots'],
    ['deep-roots', '.growth-deep-roots'],
    ['shoot', '.growth-shoot'],
    ['sprout', '.growth-sprout'],
    ['wide', '.growth-wide'],
    ['tree', '.growth-tree'],
    ['fruit', '.growth-fruits']
  ];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) {
    svg.dataset.growthStage = 'fruit';
    growthStages.forEach(([, selector]) => svg.querySelector(selector)?.classList.add('is-grown'));
    return;
  }

  const lightLayer = svg.querySelector('.growth-light-flow');
  let stageIndex = 0;
  let started = false;
  let lightTimer = null;
  let lightCleanup = null;

  function sendLightPulse() {
    if (!lightLayer) return;
    clearTimeout(lightCleanup);
    lightLayer.replaceChildren();
    const selectors = growthStages.map(([, selector]) => `${selector}.is-grown path`).join(',');
    const paths = [...svg.querySelectorAll(selectors)];
    paths.forEach((path, index) => {
      const light = path.cloneNode(false);
      light.classList.add('growth-light-path');
      light.style.setProperty('--flow-delay', `${index * 115}ms`);
      lightLayer.append(light);
    });
    svg.querySelectorAll('.growth-fruits.is-grown circle').forEach((fruit, index) => {
      const light = fruit.cloneNode(false);
      light.classList.add('growth-light-fruit');
      light.style.setProperty('--flow-delay', `${(paths.length + index) * 115}ms`);
      lightLayer.append(light);
    });
    const totalDuration = (paths.length + 6) * 115 + 900;
    lightCleanup = window.setTimeout(() => lightLayer.replaceChildren(), totalDuration);
  }

  function growNext() {
    const next = growthStages[stageIndex++];
    if (!next) return;
    const [name, selector] = next;
    svg.dataset.growthStage = name;
    svg.querySelector(selector)?.classList.add('is-grown');
    svg.classList.remove('is-growth-pulsing');
    void svg.getBoundingClientRect().width;
    svg.classList.add('is-growth-pulsing');
    window.setTimeout(() => svg.classList.remove('is-growth-pulsing'), 700);
    window.setTimeout(sendLightPulse, 1150);

    if (stageIndex < growthStages.length) {
      window.setTimeout(growNext, 3600);
    } else {
      window.setTimeout(() => {
        lightTimer = window.setInterval(sendLightPulse, 4600);
      }, 4600);
    }
  }

  function start() {
    if (started) return;
    started = true;
    window.setTimeout(growNext, 450);
  }

  const figure = svg.closest('[data-seed-growth]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        start();
      }
    }, { threshold: 0.2 });
    observer.observe(figure);
  } else start();
})();
