document.querySelectorAll('[data-anatomy-interactive]').forEach(figure => {
  let selectedButton;

  function setHighlighted(button, highlighted) {
    const region = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-pressed', String(highlighted));
    region.classList.toggle('is-highlighted', highlighted);
  }

  figure.querySelectorAll('button[aria-controls]').forEach(button => {
    button.addEventListener('click', () => {
      const nextButton = selectedButton === button ? undefined : button;
      if (selectedButton) setHighlighted(selectedButton, false);
      if (nextButton) setHighlighted(nextButton, true);
      selectedButton = nextButton;
    });
  });
});

document.querySelectorAll('.anatomy-diagram').forEach(diagram => {
  const illustration = diagram.querySelector('svg');
  const overlay = diagram.querySelector('.anatomy-diagram-leaders');
  const buttons = diagram.querySelectorAll('[data-anchor]');
  const namespace = 'http://www.w3.org/2000/svg';
  const leaders = Array.from(buttons, button => {
    const group = document.createElementNS(namespace, 'g');
    const line = document.createElementNS(namespace, 'line');
    const dot = document.createElementNS(namespace, 'circle');
    dot.setAttribute('r', '3');
    group.append(line, dot);
    overlay.append(group);
    return { button, group, line, dot, anchor: button.dataset.anchor.split(' ').map(Number) };
  });

  function positionLeaders() {
    const matrix = illustration.getScreenCTM();
    if (!matrix) return;
    const { left, top, width, height } = overlay.getBoundingClientRect();
    if (!width || !height) return;
    overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);

    leaders.forEach(({ button, line, dot, anchor }) => {
      const point = new DOMPoint(...anchor).matrixTransform(matrix);
      const target = button.getBoundingClientRect();
      const x = point.x - left;
      const y = point.y - top;
      line.setAttribute('x1', x);
      line.setAttribute('y1', y);
      line.setAttribute('x2', target.left - left);
      line.setAttribute('y2', target.top + target.height / 2 - top);
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
    });
  }

  const resize = new ResizeObserver(positionLeaders);
  resize.observe(diagram);
  resize.observe(illustration);
  diagram.addEventListener('click', () => {
    leaders.forEach(({ button, group }) => {
      group.classList.toggle('is-highlighted', button.getAttribute('aria-pressed') === 'true');
    });
  });
});

const larynxDialog = document.querySelector('#larynx-preview-dialog');
if (larynxDialog) {
  const content = larynxDialog.querySelector('[data-anatomy-dialog-content]');
  let currentFigure;
  let placeholder;
  let opener;

  document.querySelectorAll('[data-anatomy-preview]').forEach(button => {
    button.addEventListener('click', () => {
      if (currentFigure) return;
      currentFigure = document.getElementById(button.dataset.anatomyPreview);
      opener = button;
      placeholder = document.createElement('div');
      placeholder.className = 'anatomy-interactive';
      placeholder.style.height = `${currentFigure.getBoundingClientRect().height}px`;
      placeholder.setAttribute('aria-hidden', 'true');
      currentFigure.replaceWith(placeholder);
      content.append(currentFigure);
      larynxDialog.showModal();
    });
  });

  larynxDialog.addEventListener('close', () => {
    if (!currentFigure) return;
    placeholder.replaceWith(currentFigure);
    currentFigure = undefined;
    opener.focus({ preventScroll: true });
  });
}
