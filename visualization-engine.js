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

  const sceneRoot = document.createElement("div");
  sceneRoot.className = "aria-scene-root";
  sceneRoot.hidden = true;
  viewport.appendChild(sceneRoot);
  let activeMap = null;
  let activeMapLayer = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function addSceneStyles() {
    if (document.getElementById("aria-scene-styles")) return;
    const style = element("style");
    style.id = "aria-scene-styles";
    style.textContent = `
      .aria-scene-root{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;gap:12px;padding:clamp(12px,2.5vw,24px);overflow:auto;text-align:left;background:linear-gradient(145deg,rgba(5,12,20,.96),rgba(8,17,28,.92));color:#edf4ff}
      .aria-scene-root[hidden]{display:none}
      .aria-scene-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .aria-scene-root input,.aria-scene-root select,.aria-scene-root button{font:inherit;color:inherit;background:#101d2b;border:1px solid #30465c;border-radius:10px;padding:10px 12px;min-width:0}
      .aria-scene-root input{flex:1 1 150px}
      .aria-scene-root button{cursor:pointer;border-color:#5a9db6}
      .aria-scene-root button:focus-visible,.aria-scene-root input:focus-visible,.aria-scene-root select:focus-visible{outline:2px solid #8fe8ff;outline-offset:2px}
      .aria-scene-status{color:#a8bacd;font-size:.85rem;line-height:1.5}
      .aria-map-canvas{min-height:260px;flex:1 1 320px;border:1px solid #24394b;border-radius:14px;overflow:hidden;background:#0a1520}
      .aria-map-canvas .leaflet-container{height:100%;min-height:260px;background:#0a1520;font:inherit}
      .aria-map-canvas .leaflet-control-attribution{font-size:10px}
      .aria-scene-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}
      .aria-science-card{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid #25384b;border-radius:12px;background:#0d1724}
      .aria-science-card img{width:100%;height:145px;object-fit:cover;border-radius:8px;background:#14202d}
      .aria-science-card a{color:#9be8ff;overflow-wrap:anywhere}
      .aria-finance-frame{width:100%;min-height:420px;flex:1 1 420px;border:1px solid #263a4c;border-radius:12px;background:#0a1018}
      .aria-scene-disclosure{font-size:.78rem;color:#879bb0;line-height:1.45}
      @media(max-width:600px){.aria-scene-root{padding:10px}.aria-finance-frame{min-height:380px}.aria-map-canvas{min-height:300px}}
    `;
    document.head.appendChild(style);
  }

  function resetSceneContent() {
    sceneRoot.replaceChildren();
    sceneRoot.hidden = false;
    canvas.hidden = true;
    viewport.querySelectorAll(".visualization-rings,.visualization-center,.visualization-grid").forEach(node => { node.hidden = true; });
    addSceneStyles();
  }

  function loadScript(src, id) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing?.dataset.loaded === "true") { resolve(); return; }
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Le service cartographique n’a pas pu être chargé.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => { script.dataset.loaded = "true"; resolve(); };
      script.onerror = () => reject(new Error("Le service cartographique n’a pas pu être chargé."));
      document.head.appendChild(script);
    });
  }

  function loadStylesheet(href, id) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  async function openMap() {
    resetSceneContent();
    const toolbar = element("form", "aria-scene-toolbar");
    const from = element("input");
    from.placeholder = "Départ (ville ou adresse)";
    from.setAttribute("aria-label", "Lieu de départ");
    const to = element("input");
    to.placeholder = "Destination (facultatif)";
    to.setAttribute("aria-label", "Destination");
    const search = element("button", "", "Rechercher");
    search.type = "submit";
    toolbar.append(from, to, search);
    const status = element("p", "aria-scene-status", "Carte réelle OpenStreetMap. Saisissez un lieu ; aucune géolocalisation automatique n’est activée.");
    status.setAttribute("role", "status");
    const mapBox = element("div", "aria-map-canvas");
    mapBox.setAttribute("aria-label", "Carte interactive OpenStreetMap");
    sceneRoot.append(toolbar, status, mapBox);
    const disclosure = element("p", "aria-scene-disclosure", "Les recherches de lieux sont transmises au service public de géocodage OpenStreetMap/Nominatim et les itinéraires à OSRM. Pour un usage commercial à grande échelle, ces services devront être remplacés ou configurés via un fournisseur contractuel.");
    sceneRoot.append(disclosure);

    try {
      loadStylesheet("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "aria-leaflet-css");
      await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "aria-leaflet-js");
      if (!active || viewport.dataset.scene !== "map") return;
      if (!window.L) throw new Error("La bibliothèque cartographique est indisponible.");
      activeMap?.remove();
      activeMap = window.L.map(mapBox, { zoomControl: true }).setView([46.6, 2.4], 5);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(activeMap);
      activeMapLayer = null;
      setTimeout(() => activeMap?.invalidateSize(), 50);
      status.textContent = "Carte chargée. Entrez un départ et, si souhaité, une destination pour tracer un itinéraire.";
    } catch (error) {
      status.textContent = error.message || "Impossible de charger la carte. Vérifiez votre connexion.";
      return;
    }

    toolbar.addEventListener("submit", async event => {
      event.preventDefault();
      const originQuery = from.value.trim();
      const destinationQuery = to.value.trim();
      if (!originQuery) { status.textContent = "Saisissez au moins un lieu à rechercher."; from.focus(); return; }
      search.disabled = true;
      try {
        const geocode = async query => {
          const url = new URL("https://nominatim.openstreetmap.org/search");
          url.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "1" });
          const response = await fetch(url, { headers: { Accept: "application/json" } });
          if (!response.ok) throw new Error("Le service de recherche de lieux est temporairement indisponible.");
          const rows = await response.json();
          if (!Array.isArray(rows) || !rows[0]) throw new Error("Aucun résultat trouvé pour : " + query);
          return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: rows[0].display_name };
        };
        const origin = await geocode(originQuery);
        let destination = null;
        if (destinationQuery) {
          await new Promise(resolve => setTimeout(resolve, 1100));
          destination = await geocode(destinationQuery);
        }
        if (!activeMap || viewport.dataset.scene !== "map") return;
        activeMapLayer?.remove();
        activeMapLayer = window.L.featureGroup().addTo(activeMap);
        window.L.marker([origin.lat, origin.lon]).bindPopup("Départ : " + origin.label).addTo(activeMapLayer);
        if (destination) {
          window.L.marker([destination.lat, destination.lon]).bindPopup("Destination : " + destination.label).addTo(activeMapLayer);
          const routeUrl = "https://router.project-osrm.org/route/v1/driving/" +
            origin.lon + "," + origin.lat + ";" + destination.lon + "," + destination.lat +
            "?overview=full&geometries=geojson&steps=false";
          const routeResponse = await fetch(routeUrl, { headers: { Accept: "application/json" } });
          if (!routeResponse.ok) throw new Error("Le calcul d’itinéraire est indisponible pour le moment.");
          const routeData = await routeResponse.json();
          const route = routeData.routes?.[0];
          if (!route) throw new Error("Aucun itinéraire routier n’a été trouvé.");
          window.L.geoJSON(route.geometry, { style: { color: "#79e4ff", weight: 5, opacity: .9 } }).addTo(activeMapLayer);
          const km = (route.distance / 1000).toFixed(1);
          const mins = Math.round(route.duration / 60);
          status.textContent = origin.label + " → " + destination.label + " · " + km + " km · environ " + mins + " min en voiture (OSRM).";
        } else {
          status.textContent = "Lieu trouvé : " + origin.label;
        }
        activeMap.fitBounds(activeMapLayer.getBounds().pad(.18), { maxZoom: 13 });
      } catch (error) {
        status.textContent = error.message || "Une erreur est survenue lors de la recherche.";
      } finally {
        search.disabled = false;
      }
    });
  }

  function openFinance() {
    resetSceneContent();
    const toolbar = element("form", "aria-scene-toolbar");
    const symbol = element("input");
    symbol.value = "NASDAQ:AAPL";
    symbol.placeholder = "Symbole, ex. NASDAQ:AAPL";
    symbol.setAttribute("aria-label", "Symbole financier");
    const interval = element("select");
    interval.setAttribute("aria-label", "Période du graphique");
    [["D","1 jour"],["60","1 heure"],["W","1 semaine"],["M","1 mois"]].forEach(([value,label]) => {
      const option = element("option", "", label); option.value = value; interval.appendChild(option);
    });
    const open = element("button", "", "Afficher le graphique");
    open.type = "submit";
    toolbar.append(symbol, interval, open);
    const status = element("p", "aria-scene-status", "Graphique de marché fourni par TradingView. Les cotations et délais dépendent de la place et du fournisseur.");
    status.setAttribute("role", "status");
    const frame = element("iframe", "aria-finance-frame");
    frame.title = "Graphique financier TradingView";
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    const disclosure = element("p", "aria-scene-disclosure", "Cette vue fournit des données et graphiques de marché, pas un conseil financier. Vérifiez les cotations, les délais, les frais et les risques avant toute décision.");
    const loadChart = () => {
      const ticker = symbol.value.trim();
      if (!/^[A-Za-z0-9._:-]{1,40}$/.test(ticker)) { status.textContent = "Symbole invalide. Utilisez des lettres, chiffres, points, deux-points, tirets ou tirets bas."; return; }
      const url = new URL("https://s.tradingview.com/widgetembed/");
      url.search = new URLSearchParams({
        symbol: ticker,
        interval: interval.value,
        theme: "dark",
        style: "1",
        locale: "fr",
        hide_top_toolbar: "0",
        hide_side_toolbar: "0",
        allow_symbol_change: "1",
        save_image: "0",
        withdateranges: "1",
        details: "1",
        calendar: "0",
        hideideas: "1"
      });
      frame.src = url.toString();
      status.textContent = "Chargement du graphique pour " + ticker + "…";
    };
    toolbar.addEventListener("submit", event => { event.preventDefault(); loadChart(); });
    frame.addEventListener("load", () => { status.textContent = "Graphique chargé depuis TradingView. Vérifiez la place et l’éventuel délai des cotations."; });
    sceneRoot.append(toolbar, status, frame, disclosure);
    loadChart();
  }

  function openScience() {
    resetSceneContent();
    const toolbar = element("form", "aria-scene-toolbar");
    const query = element("input");
    query.value = "Mars";
    query.placeholder = "Rechercher dans les médias scientifiques NASA";
    query.setAttribute("aria-label", "Recherche scientifique NASA");
    const search = element("button", "", "Explorer");
    search.type = "submit";
    toolbar.append(query, search);
    const status = element("p", "aria-scene-status", "Recherche dans le catalogue public d’images et de médias NASA ; ce module n’est pas un simulateur scientifique.");
    status.setAttribute("role", "status");
    const results = element("div", "aria-scene-results");
    const disclosure = element("p", "aria-scene-disclosure", "Les résultats proviennent de NASA Image and Video Library. Les médias et descriptions sont fournis par leur source ; ils ne remplacent pas des données instrumentales ni une simulation validée.");
    sceneRoot.append(toolbar, status, results, disclosure);
    const runSearch = async () => {
      const term = query.value.trim();
      if (!term) { status.textContent = "Saisissez un sujet scientifique."; return; }
      search.disabled = true;
      status.textContent = "Recherche des médias NASA…";
      results.replaceChildren();
      try {
        const url = new URL("https://images-api.nasa.gov/search");
        url.search = new URLSearchParams({ q: term, media_type: "image", page_size: "12" });
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Le catalogue NASA est temporairement indisponible.");
        const data = await response.json();
        const items = (data.collection?.items || []).slice(0, 12);
        if (!items.length) { status.textContent = "Aucun média trouvé pour cette recherche."; return; }
        for (const item of items) {
          const metadata = item.data?.[0] || {};
          const imageUrl = item.links?.find(link => link.render === "image" && link.href)?.href;
          const card = element("article", "aria-science-card");
          if (imageUrl) {
            const image = element("img");
            image.src = imageUrl;
            image.alt = metadata.title || "Média NASA";
            image.loading = "lazy";
            card.appendChild(image);
          }
          card.appendChild(element("strong", "", metadata.title || "Média NASA sans titre"));
          if (metadata.description) card.appendChild(element("p", "aria-scene-status", metadata.description.slice(0, 240)));
          if (metadata.date_created) card.appendChild(element("small", "aria-scene-status", metadata.date_created.slice(0, 10)));
          const link = element("a", "", "Ouvrir la source NASA");
          link.href = item.href || "https://images.nasa.gov/";
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          card.appendChild(link);
          results.appendChild(card);
        }
        status.textContent = items.length + " média(s) trouvé(s) dans le catalogue NASA.";
      } catch (error) {
        status.textContent = error.message || "Impossible de joindre le catalogue NASA.";
      } finally {
        search.disabled = false;
      }
    };
    toolbar.addEventListener("submit", event => { event.preventDefault(); runSearch(); });
    runSearch();
  }

  function open(options = {}) {
    const type = options.type || "placeholder";
    active = true;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    viewport.dataset.scene = type;
    sceneRoot.hidden = true;
    canvas.hidden = true;
    viewport.querySelectorAll(".visualization-rings,.visualization-center,.visualization-grid").forEach(node => { node.hidden = false; });
    if (type === "map") { void openMap(); return true; }
    if (type === "finance") { openFinance(); return true; }
    if (type === "scientific_model") { void openScience(); return true; }
    if (type !== "globe") { active = false; return false; }
    if (!initialize()) {
      viewport.dataset.scene = "fallback";
      active = false;
      return false;
    }
    sceneRoot.hidden = true;
    canvas.hidden = false;
    lastFrameTime = 0;
    render();
    return true;
  }

  function close() {
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    activeMap?.remove();
    activeMap = null;
    activeMapLayer = null;
    sceneRoot.replaceChildren();
    sceneRoot.hidden = true;
    canvas.hidden = true;
    viewport.querySelectorAll(".visualization-rings,.visualization-center,.visualization-grid").forEach(node => { node.hidden = false; });
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
