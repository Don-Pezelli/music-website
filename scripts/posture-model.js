(() => {
  // Each join gives its vertical position, the alignment offset, and the width of its blend.
  const regions = ['head', 'shoulders', 'chest', 'pelvis', 'feet'];
  const joins = {
    front: [[.144, -.003, 7], [.282, -.023, 9], [.408, -.023, 12], [.460, -.023, 10]],
    side: [[.190, -.013, 8], [.291, -.003, 9], [.394, -.010, 9], [.442, -.033, 10]]
  };

  const hipOutline = {
    front: [.32, .37, .58, .64],
    side: [.32, .38, .51, .58]
  };

  function createView(canvas, original, aligned) {
    const context = canvas.getContext('2d');
    if (!context) return null;
    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    const scratch = layer.getContext('2d');
    const maskLayer = document.createElement('canvas');
    maskLayer.width = canvas.width;
    maskLayer.height = canvas.height;
    const maskContext = maskLayer.getContext('2d');
    if (!scratch || !maskContext) return null;
    const { width, height } = canvas;
    const inset = 12;
    const imageHeight = Math.min(height - inset * 2, (width - inset * 2) * original.naturalHeight / original.naturalWidth);
    const imageY = (height - imageHeight) / 2;
    const view = canvas.dataset.postureView;
    const seams = joins[view];
    const edges = [0, ...seams.map(([position]) => imageY + position * imageHeight), height];
    const blendWidths = [0, ...seams.map(([, , blend]) => blend), 0];

    function draw(context, image, offset = 0) {
      const scale = Math.min((width - 2 * inset) / image.naturalWidth, (height - 2 * inset) / image.naturalHeight);
      const drawnWidth = image.naturalWidth * scale;
      const drawnHeight = image.naturalHeight * scale;
      const room = (width - drawnWidth) / 2;
      const left = room + Math.min(room, Math.max(-room, offset));
      context.drawImage(image, left, (height - drawnHeight) / 2, drawnWidth, drawnHeight);
    }

    const [leftOuter, leftInner, rightInner, rightOuter] = hipOutline[view];
    const imageWidth = imageHeight * original.naturalWidth / original.naturalHeight;
    const imageX = (width - imageWidth) / 2;
    const unit = value => Math.max(0, Math.min(1, value));
    const curve = value => value * value * (3 - 2 * value);
    function cutAt(edge, x, offset) {
      if (edge !== 4) return edges[edge];
      const position = (x - imageX - offset) / imageWidth;
      const inside = Math.min(unit((position - leftOuter) / (leftInner - leftOuter)),
        unit((rightOuter - position) / (rightOuter - rightInner)));
      // The cut crosses the hips but stays below the hands at the outer edges.
      return edges[edge] + (1 - curve(inside)) * (imageY + .68 * imageHeight - edges[edge]);
    }

    function layerFor(image, values, offsets, alignedLayer) {
      scratch.globalCompositeOperation = 'source-over';
      scratch.clearRect(0, 0, width, height);
      for (let first = 0; first < values.length;) {
        let end = first + 1;
        while (end < values.length && values[end] === values[first]) end += 1;
        if (Boolean(values[first]) === alignedLayer) {
          scratch.save();
          scratch.beginPath();
          scratch.moveTo(0, Math.max(0, cutAt(first, 0, offsets[3]) - blendWidths[first]));
          for (let x = 4; x <= width; x += 4) {
            scratch.lineTo(x, Math.max(0, cutAt(first, x, offsets[3]) - blendWidths[first]));
          }
          for (let x = width; x >= 0; x -= 4) {
            scratch.lineTo(x, Math.min(height, cutAt(end, x, offsets[3]) + blendWidths[end]));
          }
          scratch.closePath();
          scratch.clip();
          draw(scratch, image, offsets[first]);
          scratch.restore();
        }
        first = end;
      }
      const opacity = value => `rgba(0, 0, 0, ${alignedLayer ? value : 1 - value})`;
      maskContext.clearRect(0, 0, width, height);
      for (let x = 0; x < width; x += 4) {
        const mask = maskContext.createLinearGradient(0, 0, 0, height);
        mask.addColorStop(0, opacity(values[0]));
        seams.forEach((_, i) => {
          const position = cutAt(i + 1, x + 2, offsets[3]);
          const blend = blendWidths[i + 1];
          mask.addColorStop((position - blend) / height, opacity(values[i]));
          mask.addColorStop((position + blend) / height, opacity(values[i + 1]));
        });
        mask.addColorStop(1, opacity(values.at(-1)));
        maskContext.fillStyle = mask;
        maskContext.fillRect(x, 0, 4, height);
      }
      scratch.globalCompositeOperation = 'destination-in';
      scratch.drawImage(maskLayer, 0, 0);
      context.drawImage(layer, 0, 0);
    }

    return progress => {
      const values = regions.map(part => progress[part]);
      context.globalCompositeOperation = 'source-over';
      context.clearRect(0, 0, width, height);
      if (values.every(value => value === 0)) {
        draw(context, original);
      } else if (values.every(value => value === 1)) {
        draw(context, aligned);
      } else {
        // Keep the feet anchored, and register each higher strip to the one below.
        const offsets = values.map(() => 0);
        for (let i = seams.length - 1; i >= 0; i -= 1) {
          offsets[i] = offsets[i + 1] + Math.round((values[i] - values[i + 1]) * seams[i][1] * width);
        }
        layerFor(original, values, offsets, false);
        context.globalCompositeOperation = 'lighter';
        layerFor(aligned, values, offsets, true);
      }
    };
  }

  function fireChestLaser(canvas, anchor) {
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + rect.width * anchor[0];
    const y = rect.top + rect.height * anchor[1];
    const dx = document.documentElement.clientWidth + 24 - x;
    const dy = -18 - y;
    const beam = document.createElement('span');
    beam.className = 'posture-chest-laser';
    beam.setAttribute('aria-hidden', 'true');
    Object.assign(beam.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${Math.hypot(dx, dy)}px`,
      transform: `rotate(${Math.atan2(dy, dx)}rad)`
    });
    document.body.append(beam);
    const shot = beam.animate([
      { clipPath: 'inset(-16px 100% -16px -8px)', offset: 0 },
      { clipPath: 'inset(-16px -8px -16px -8px)', offset: .45 },
      { clipPath: 'inset(-16px -8px -16px 100%)', offset: 1 }
    ], { duration: 560 });
    shot.finished.then(() => beam.remove(), () => beam.remove());
  }

  document.querySelectorAll('[data-posture-model]').forEach(model => {
    const pair = model.querySelector('.posture-model-pair');
    const fallback = model.querySelector('.posture-fallback');
    const controls = [...model.querySelectorAll('[data-posture-part]')];
    const images = {
      front: [model.querySelector('[data-posture-front]'), model.querySelector('[data-posture-aligned="front"]')],
      side: [fallback, model.querySelector('[data-posture-aligned="side"]')]
    };
    const values = Object.fromEntries(regions.map(part => [part, 0]));
    let views;
    let rigs;
    let animateIn3D = false;
    let frame = 0;
    let lastFrame;
    let laserDelay;
    let headStrings = [];
    let celebrationQueued = false;
    let celebrationStart;
    const displayed = { ...values, celebration: 0 };
    const pumpKeyframes = [
      [0, 0], [260, .62], [500, .88], [680, .58], [790, 1], [1200, 1], [1580, 0]
    ];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function positionHeadString({ canvas, string, rig }) {
      const [x, y] = rig ? rig.headAnchor(displayed)
        : canvas.dataset.postureView === 'front' ? [.5, .04] : [.51, .05];
      string.style.left = `${x * 100}%`;
      string.style.top = `${y * canvas.clientHeight}px`;
    }

    function animateHeadStrings(canvases, active) {
      headStrings.forEach(({ string }) => string.remove());
      headStrings = [];
      if (!active) return;

      headStrings = canvases.map((canvas, i) => {
        const string = document.createElement('span');
        string.className = 'posture-head-string';
        string.setAttribute('aria-hidden', 'true');
        const entry = { canvas, string, rig: animateIn3D ? rigs[i] : null };
        positionHeadString(entry);
        canvas.parentElement.append(string);
        if (!reducedMotion.matches) {
          string.animate([
            { opacity: 0, transform: 'translate(-50%, -100%) scaleY(.12)' },
            { opacity: 1, transform: 'translate(-50%, -100%) scaleY(1)' }
          ], { duration: 260, easing: 'ease-out' });
        }
        return entry;
      });
    }

    function render() {
      views.forEach(draw => draw(animateIn3D ? displayed : values));
      headStrings.forEach(positionHeadString);
    }

    function fistPumpAt(elapsed) {
      const next = pumpKeyframes.findIndex(([time]) => time > elapsed);
      if (next < 1) return 0;
      const [fromTime, fromValue] = pumpKeyframes[next - 1];
      const [toTime, toValue] = pumpKeyframes[next];
      const t = (elapsed - fromTime) / (toTime - fromTime);
      return fromValue + (toValue - fromValue) * t * t * (3 - 2 * t);
    }

    function animate(now) {
      const step = 1 - Math.exp(-(lastFrame === undefined ? 16 : Math.min(now - lastFrame, 50)) / 90);
      lastFrame = now;
      let moving = false;
      for (const part of regions) {
        const delta = values[part] - displayed[part];
        displayed[part] = Math.abs(delta) < .005 ? values[part] : displayed[part] + delta * step;
        moving ||= displayed[part] !== values[part];
      }
      if (celebrationQueued && !moving) {
        celebrationStart = now;
        celebrationQueued = false;
      }
      if (celebrationStart !== undefined) {
        const elapsed = now - celebrationStart;
        displayed.celebration = fistPumpAt(elapsed);
        if (elapsed >= pumpKeyframes.at(-1)[0]) celebrationStart = undefined;
      } else {
        displayed.celebration = displayed.celebration < .005 ? 0 : displayed.celebration * (1 - step);
      }
      moving ||= celebrationStart !== undefined || displayed.celebration > 0;
      render();
      frame = moving ? requestAnimationFrame(animate) : 0;
      if (!moving) lastFrame = undefined;
    }

    function initialize() {
      if (views) return;
      const canvases = [...pair.querySelectorAll('canvas')];
      rigs ??= canvases.map(canvas => window.createPostureRig?.(canvas));
      animateIn3D = rigs.every(Boolean);
      if (!animateIn3D && Object.values(images).flat().some(image => !image.naturalWidth)) return;
      const readyViews = animateIn3D ? rigs : canvases.map(canvas =>
        createView(canvas, ...images[canvas.dataset.postureView])
      );
      if (readyViews.some(view => !view)) return;
      views = readyViews;
      render();
      pair.hidden = false;
      fallback.hidden = true;
      controls.forEach(button => {
        const part = button.dataset.posturePart;
        button.disabled = false;
        button.addEventListener('click', () => {
          values[part] = 1 - values[part];
          button.setAttribute('aria-pressed', String(Boolean(values[part])));
          button.textContent = values[part] ? 'Ausgerichtet' : 'Ausrichten';
          if (part === 'head') animateHeadStrings(canvases, values.head);
          if (part === 'chest') {
            clearTimeout(laserDelay);
            if (values.chest && !reducedMotion.matches) {
              laserDelay = setTimeout(() => {
                canvases.forEach((canvas, i) => {
                  const anchor = animateIn3D
                    ? rigs[i].chestAnchor(displayed)
                    : canvas.dataset.postureView === 'front' ? [.49, .32] : [.58, .33];
                  fireChestLaser(canvas, anchor);
                });
              }, 180);
            }
          }
          if (animateIn3D && !reducedMotion.matches) {
            celebrationQueued = regions.every(key => values[key] === 1);
            if (!celebrationQueued) celebrationStart = undefined;
            if (!frame) frame = requestAnimationFrame(animate);
          } else {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            lastFrame = undefined;
            celebrationQueued = false;
            celebrationStart = undefined;
            Object.assign(displayed, values, { celebration: 0 });
            render();
          }
        });
      });
    }

    Object.values(images).flat().forEach(image => image.addEventListener('load', initialize, { once: true }));
    initialize();
  });
})();
