(() => {
  const add = (a, b) => a.map((value, i) => value + b[i]);
  const subtract = (a, b) => a.map((value, i) => value - b[i]);
  const scale = (a, factor) => a.map(value => value * factor);
  const length = vector => Math.hypot(...vector);
  const normalize = vector => scale(vector, 1 / length(vector));
  const cross = ([x, y, z], [a, b, c]) => [y * c - z * b, z * a - x * c, x * b - y * a];
  const mix = (a, b, t) => a + (b - a) * t;

  function kneePosition(hip, ankle) {
    const distance = subtract(ankle, hip);
    const axis = normalize(distance);
    const forward = normalize([0, -axis[2], axis[1]]);
    const half = length(distance) / 2;
    return add(add(hip, scale(axis, half)), scale(forward, Math.sqrt(Math.max(0, 65 ** 2 - half ** 2))));
  }

  function pose({ feet, pelvis, chest, shoulders, head, celebration = 0 }) {
    const hips = [mix(-9, 0, feet), mix(165, 159, feet), mix(-13, 0, pelvis)];
    const waist = [hips[0], 145, mix(9, 1, pelvis)];
    const solar = [hips[0], mix(128, 117, chest), mix(15, 8, chest)];
    const breast = [hips[0], solar[1] - 22, solar[2] - mix(4, 8, chest)];
    const neck = [breast[0], breast[1] - 17, breast[2] - 2];
    const pitch = mix(.76, .07, head);
    const crown = add(neck, [0, -Math.cos(pitch) * 29, Math.sin(pitch) * 29]);
    const limbs = [-1, 1].map(sign => {
      const near = sign < 0;
      const hip = add(hips, [sign * 15, (near ? -2 : 3) * (1 - feet), 0]);
      const ankle = [
        mix(near ? -19 : 1, sign * 28, feet),
        mix(near ? 287 : 274, 287, feet),
        mix(near ? -1 : 26, 0, feet)
      ];
      const knee = kneePosition(hip, ankle);
      const toe = add(ankle, [sign * 2, mix(near ? 3 : 16, 3, feet), 14]);
      const shoulder = add(breast, [sign * 30, mix(near ? -6 : 7, 1, shoulders), mix(near ? 10 : 13, -3, shoulders)]);
      const pump = near ? 0 : celebration;
      let elbow = add(shoulder, [sign * 5, 40, 1]);
      let wrist = add(elbow, [sign, 35, 5]);
      if (pump > 0) {
        const raise = Math.min(1, pump / .6);
        wrist = add(shoulder, [mix(6, 24, raise), mix(75, -69, pump), mix(6, 12, raise)]);
        const reach = subtract(wrist, shoulder);
        const distance = length(reach);
        const axis = normalize(reach);
        const outward = normalize(subtract([1, 0, 0], scale(axis, axis[0])));
        const upper = Math.hypot(5, 40, 1);
        const lower = Math.hypot(1, 35, 5);
        const along = (upper ** 2 - lower ** 2 + distance ** 2) / (2 * distance);
        const bend = Math.sqrt(Math.max(0, upper ** 2 - along ** 2));
        elbow = add(add(shoulder, scale(axis, along)), scale(outward, bend));
      }
      return { hip, knee, ankle, toe, shoulder, elbow, wrist, pump };
    });
    return { hips, waist, solar, breast, neck, crown, pitch, limbs, pelvis };
  }

  function sphere() {
    const vertices = [];
    const point = (row, column) => {
      const p = Math.PI * row / 24;
      const t = Math.PI * 2 * column / 32;
      return [Math.sin(p) * Math.cos(t), Math.cos(p), Math.sin(p) * Math.sin(t)];
    };
    for (let row = 0; row < 24; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        const a = point(row, column), b = point(row + 1, column);
        const c = point(row, column + 1), d = point(row + 1, column + 1);
        vertices.push(...a, ...b, ...c, ...b, ...d, ...c);
      }
    }
    return new Float32Array(vertices);
  }

  const vertex = `
    attribute vec3 position;
    uniform vec3 center;
    uniform mat3 axes;
    uniform vec3 radii;
    uniform mediump vec2 camera;
    uniform vec2 viewport;
    uniform bool surface;
    varying mediump vec3 normal;
    varying mediump vec3 world;
    void main() {
      world = surface ? position : center + axes * (position * radii);
      normal = surface ? vec3(0.0) : axes * (position / radii);
      vec3 p = world - vec3(0.0, 157.0, 0.0);
      gl_Position = vec4((p.x * camera.x + p.z * camera.y) / viewport.x, -p.y / viewport.y,
        -(p.z * camera.x - p.x * camera.y) / 300.0, 1.0);
    }
  `;
  const fragment = `
    #extension GL_OES_standard_derivatives : enable
    precision mediump float;
    varying mediump vec3 normal;
    varying mediump vec3 world;
    uniform bool surface;
    uniform vec3 tint;
    uniform bool highlightFace;
    uniform mediump vec2 camera;
    void main() {
      vec3 n = surface ? normalize(cross(dFdx(world), dFdy(world))) : normalize(normal);
      vec3 eye = vec3(-camera.y, 0., camera.x);
      if (surface && dot(n, eye) < 0.) n = -n;
      vec3 light = normalize(vec3(-.48, -.72, .65));
      float shade = .63 + .32 * max(0., dot(light, n)) + .09 * max(0., dot(eye, n));
      vec3 material = highlightFace ? mix(tint, vec3(.37, .53, .82), smoothstep(.54, .60, n.z)) : tint;
      gl_FragColor = vec4(material * shade, 1.);
    }
  `;

  function makeProgram(gl) {
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
  }

  function torsoMesh(body) {
    const ringCount = 40;
    const rings = [
      [add(body.hips, [0, 12, 0]), 13, 10],
      [body.hips, 22, 16],
      [body.waist, 18, 12],
      [body.solar, 23, 15],
      [body.breast, 28, 17],
      [add(body.neck, [0, 4, 0]), 13, 9],
      [body.neck, 6, 6]
    ];
    const geometry = [];
    const at = (r, i) => {
      const [[x, y, z], rx, rz] = rings[r];
      const angle = Math.PI * 2 * i / ringCount;
      return [x + Math.cos(angle) * rx, y, z + Math.sin(angle) * rz];
    };
    for (let r = 0; r < rings.length - 1; r += 1) {
      for (let i = 0; i < ringCount; i += 1) {
        const a = at(r, i), b = at(r + 1, i), c = at(r, i + 1), d = at(r + 1, i + 1);
        geometry.push(...a, ...b, ...c, ...b, ...d, ...c);
      }
    }
    return new Float32Array(geometry);
  }

  window.createPostureRig = canvas => {
    const surface = document.createElement('canvas');
    surface.width = canvas.width;
    surface.height = canvas.height;
    const gl = surface.getContext('webgl', { alpha: true, antialias: true });
    if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
    const program = makeProgram(gl);
    if (!program) return null;
    const display = canvas.getContext('2d');
    if (!display) return null;
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const uniform = Object.fromEntries(['center', 'axes', 'radii', 'camera', 'viewport', 'surface', 'tint', 'highlightFace'].map(key => [key, gl.getUniformLocation(program, key)]));
    const location = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(location);
    const dome = sphere();
    const domeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, domeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, dome, gl.STATIC_DRAW);
    const torsoBuffer = gl.createBuffer();
    const angle = canvas.dataset.postureView === 'front' ? 0 : 1.13;
    const camera = [Math.cos(angle), Math.sin(angle)];
    gl.uniform2f(uniform.camera, ...camera);
    gl.uniform2f(uniform.viewport, 171 * canvas.width / canvas.height, 171);

    const clay = [.72, .55, .60];
    const region = canvas.dataset.anatomyModel;
    const overview = region === 'overview';
    const torsoTint = overview || region === 'torso' ? [.37, .70, .64] : clay;
    const neckTint = overview || region === 'neck' ? [1, .91, .19] : clay;
    const jointClay = [.60, .44, .50];
    const bind = buffer => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    };

    function piece(center, radii, direction, tint = clay) {
      const y = normalize(direction);
      const x = normalize(cross(y, [0, 0, 1]));
      const z = cross(x, y);
      gl.uniform3fv(uniform.center, center);
      gl.uniform3fv(uniform.radii, radii);
      gl.uniformMatrix3fv(uniform.axes, false, [...x, ...y, ...z]);
      gl.uniform3fv(uniform.tint, tint);
      gl.drawArrays(gl.TRIANGLES, 0, dome.length / 3);
    }

    function segment(a, b, width, depth = width, tint = clay) {
      const direction = subtract(b, a);
      piece(scale(add(a, b), .5), [width, length(direction) / 2 + 4, depth], direction, tint);
    }

    function draw(progress) {
      const body = pose(progress);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const geometry = torsoMesh(body);
      bind(torsoBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.DYNAMIC_DRAW);
      gl.uniform1i(uniform.surface, true);
      gl.uniform3fv(uniform.tint, torsoTint);
      gl.drawArrays(gl.TRIANGLES, 0, geometry.length / 3);
      gl.uniform1i(uniform.surface, false);
      bind(domeBuffer);
      piece(body.hips, [23, 16, 16], [0, 1, mix(.34, 0, body.pelvis)], torsoTint);
      segment(body.neck, body.crown, 7, 7, neckTint);
      gl.uniform1i(uniform.highlightFace, overview || region === 'face');
      piece(body.crown, [14.7, 20, 13], [0, -1, Math.sin(body.pitch) * .38]);

      gl.uniform1i(uniform.highlightFace, false);

      for (const side of body.limbs) {
        segment(side.hip, side.knee, 13, 13);
        piece(side.knee, [8.5, 9, 9], [0, 1, 0], jointClay);
        segment(side.knee, side.ankle, 8.5, 8);
        const shoe = scale(add(side.ankle, side.toe), .5);
        piece(shoe, [7.5, length(subtract(side.toe, side.ankle)) / 2 + 5, 5],
          subtract(side.toe, side.ankle));
        piece(side.shoulder, [11.5, 13, 11.5], [0, 1, 0]);
        segment(side.shoulder, side.elbow, 8.5, 8);
        piece(side.elbow, [6, 7, 6], [0, 1, 0], jointClay);
        segment(side.elbow, side.wrist, 6.4, 6);
        const handAngle = Math.PI * Math.min(1, side.pump / .6);
        const handDirection = [Math.sin(handAngle), Math.cos(handAngle), .1];
        piece(add(side.wrist, scale(handDirection, 6)),
          [mix(5, 7, side.pump), mix(9, 7, side.pump), mix(4, 6, side.pump)], handDirection);
      }

      display.clearRect(0, 0, canvas.width, canvas.height);
      display.drawImage(surface, 0, 0);
    }

    function project([x, y, z]) {
      const projectedX = x * camera[0] + z * camera[1];
      return [.5 + projectedX / (342 * canvas.width / canvas.height), .5 + (y - 157) / 342];
    }

    draw.chestAnchor = progress => project(add(pose(progress).solar, [0, 0, 15]));
    draw.headAnchor = progress => project(add(pose(progress).crown, [0, -19, 0]));
    return draw;
  };

  document.querySelectorAll('[data-anatomy-model]').forEach(canvas => {
    const draw = window.createPostureRig(canvas);
    if (!draw) return;
    draw({ feet: 1, pelvis: 1, chest: 1, shoulders: 1, head: 1 });
    canvas.parentElement.querySelector('[data-anatomy-fallback]').hidden = true;
    canvas.hidden = false;
  });
})();
