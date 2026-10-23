(() => {
  const canvas = document.getElementById("visualizationCanvas");
  const viewport = document.getElementById("visualizationViewport");
  if (!canvas || !viewport) return;

  let gl = null;
  let program = null;
  let vertexBuffer = null;
  let indexBuffer = null;
  let indexCount = 0;
  let frame = 0;
  let active = false;
  let rotationX = 0.18;
  let rotationY = -0.45;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastFrameTime = 0;
  let positionLocation;
  let rotationLocation;

  const vertexSource = `
    attribute vec3 aPosition;
    uniform vec2 uRotation;
    varying vec3 vSurface;
    varying vec3 vRotated;
    void main() {
      float cx = cos(uRotation.x);
      float sx = sin(uRotation.x);
      float cy = cos(uRotation.y);
      float sy = sin(uRotation.y);
      vec3 p = vec3(
        aPosition.x,
        aPosition.y * cx - aPosition.z * sx,
        aPosition.y * sx + aPosition.z * cx
      );
      vec3 r = vec3(
        p.x * cy + p.z * sy,
        p.y,
        -p.x * sy + p.z * cy
      );
      vSurface = aPosition;
      vRotated = r;
      float perspective = 2.65 / (3.65 - r.z);
      gl_Position = vec4(r.xy * perspective, -r.z * perspective * 0.45, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;
    varying vec3 vSurface;
    varying vec3 vRotated;
    void main() {
      vec3 p = normalize(vSurface);
      vec3 n = normalize(vRotated);
      float latitude = asin(clamp(p.y, -1.0, 1.0));
      float longitude = atan(p.z, p.x);
      float latLine = 1.0 - smoothstep(0.018, 0.055, abs(sin(latitude * 18.0)));
      float lonDistance = abs(sin(longitude * 32.0)) * max(0.18, cos(latitude));
      float lonLine = 1.0 - smoothstep(0.012, 0.045, lonDistance);
      float grid = max(latLine, lonLine);
      float light = 0.32 + 0.68 * max(dot(n, normalize(vec3(-0.45, 0.6, 1.0))), 0.0);
      float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 2.4);
      vec3 base = vec3(0.012, 0.035, 0.052) * light;
      vec3 lines = vec3(0.22, 0.67, 0.82) * grid * (0.42 + 0.58 * light);
      vec3 glow = vec3(0.05, 0.28, 0.38) * rim * 0.8;
      gl_FragColor = vec4(base + lines + glow, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader) || "Shader compilation failed";
      gl.deleteShader(shader);
      throw new Error(error);
    }
    return shader;
  }

  function createSphere(latBands = 48, lonBands = 72) {
    const vertices = [];
    const indices = [];
    for (let lat = 0; lat <= latBands; lat += 1) {
      const theta = lat * Math.PI / latBands;
      const y = Math.cos(theta);
      const radius = Math.sin(theta);
      for (let lon = 0; lon <= lonBands; lon += 1) {
        const phi = lon * 2 * Math.PI / lonBands;
        vertices.push(radius * Math.cos(phi), y, radius * Math.sin(phi));
      }
    }
    for (let lat = 0; lat < latBands; lat += 1) {
      for (let lon = 0; lon < lonBands; lon += 1) {
        const a = lat * (lonBands + 1) + lon;
        const b = a + lonBands + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices)
    };
  }

  function initialize() {
    if (gl && program) return true;
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" });
      if (!gl) return false;
      const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Program linking failed");

      const sphere = createSphere();
      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
      indexCount = sphere.indices.length;
      positionLocation = gl.getAttribLocation(program, "aPosition");
      rotationLocation = gl.getUniformLocation(program, "uRotation");
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      return true;
    } catch (error) {
      console.warn("ARIA 3D scene unavailable:", error);
      gl = null;
      program = null;
      return false;
    }
  }

  function resize() {
    if (!gl) return;
    const rect = viewport.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  function render(time = 0) {
    if (!active || !gl || !program) return;
    const delta = Math.min(40, time - (lastFrameTime || time));
    lastFrameTime = time;
    if (!dragging) rotationY += delta * 0.00022;
    resize();
    gl.clearColor(0.015, 0.025, 0.035, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.uniform2f(rotationLocation, rotationX, rotationY);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    frame = window.requestAnimationFrame(render);
  }

  function open(options = {}) {
    const type = options.type || "placeholder";
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    viewport.dataset.scene = type;
    canvas.hidden = true;
    if (type !== "globe") return false;
    if (!initialize()) {
      viewport.dataset.scene = "fallback";
      return false;
    }
    canvas.hidden = false;
    active = true;
    lastFrameTime = 0;
    render();
    return true;
  }

  function close() {
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    canvas.hidden = true;
    viewport.dataset.scene = "placeholder";
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!active) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    rotationY += dx * 0.008;
    rotationX = Math.max(-1.35, Math.min(1.35, rotationX + dy * 0.008));
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("resize", resize);

  window.AriaVisualization = { open, close };
})();
