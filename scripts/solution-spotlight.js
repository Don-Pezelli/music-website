(() => {
  const overlays = new Map();
  const makeOverlay = kind => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 960 135');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'notation-error-overlay');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = kind === 'rest-mismatch'
      ? '<ellipse cx="311" cy="79" rx="25" ry="27" fill="none" stroke="#d52e25" stroke-width="5"/><ellipse cx="518" cy="80" rx="25" ry="25" fill="none" stroke="#d52e25" stroke-width="5"/>'
      : kind === 'eighth-extra'
        ? '<ellipse cx="831" cy="80" rx="24" ry="25" fill="none" stroke="#d52e25" stroke-width="5"/>'
      : '<rect x="47" y="50" width="38" height="55" fill="white"/><path d="M47 80H85" stroke="#111" stroke-width="1"/><text x="51" y="74" fill="#d52e25" font-family="Georgia,serif" font-size="23" font-weight="bold">5</text><text x="51" y="94" fill="#111" font-family="Georgia,serif" font-size="23" font-weight="bold">4</text><g fill="#d52e25" font-family="Arial,sans-serif" font-size="18" font-weight="700" text-anchor="middle"><text x="105" y="28">1</text><text x="270" y="28">2</text><text x="435" y="28">3</text><text x="600" y="28">4</text><text x="683" y="28">&amp;</text><text x="766" y="28">5</text></g>';
    return svg;
  };

  document.querySelectorAll('details.solution[data-error-spotlight]').forEach(details => {
    const target = document.getElementById(details.dataset.errorSpotlight);
    const scoreWrapper = target?.querySelector('.score-scroll > .score-image-wrap');
    if (!target || !scoreWrapper) return;

    details.addEventListener('toggle', () => {
      if (details.open) {
        if (!overlays.has(details)) {
          const overlay = makeOverlay(details.dataset.spotlightKind);
          scoreWrapper.append(overlay);
          overlays.set(details, overlay);
        }
        target.classList.add('solution-error-highlight');
        window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      } else {
        overlays.get(details)?.remove();
        overlays.delete(details);
        target.classList.remove('solution-error-highlight');
      }
    });
  });
})();
