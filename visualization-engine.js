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
  let lastGeocodeAt = 0;
  let sceneEpoch = 0;

  function updateContextStatus(status, source) {
    const statusNode = document.getElementById("contextStatus");
    const sourceNode = document.getElementById("sceneSourceStatus");
    if (statusNode && status) statusNode.textContent = status;
    if (sourceNode && source) sourceNode.textContent = source;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function resetSceneContent() {
    sceneRoot.replaceChildren();
    sceneRoot.hidden = false;
    canvas.hidden = true;
    viewport.querySelectorAll(".visualization-rings,.visualization-center,.visualization-grid").forEach(node => { node.hidden = true; });
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
      script.onerror = () => { script.remove(); reject(new Error("Le service cartographique n’a pas pu être chargé.")); };
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
    const sceneId = ++sceneEpoch;
    resetSceneContent();
    const toolbar = element("form", "aria-scene-toolbar");
    const from = element("input");
    from.placeholder = "Départ (ville ou adresse)";
    from.setAttribute("aria-label", "Lieu de départ");
    const to = element("input");
    to.placeholder = "Destination (facultatif)";
    to.setAttribute("aria-label", "Destination");
    const mode = element("select");
    mode.setAttribute("aria-label", "Mode de déplacement");
    [["car","Voiture"],["foot","À pied"],["bike","Vélo"]].forEach(([value,label]) => {
      const option = element("option", "", label); option.value = value; mode.appendChild(option);
    });
    const search = element("button", "", "Rechercher");
    search.type = "submit";
    toolbar.append(from, to, mode, search);
    const status = element("p", "aria-scene-status", "Carte réelle OpenStreetMap. Saisissez un lieu ; aucune géolocalisation automatique n’est activée.");
    status.setAttribute("role", "status");
    const mapBox = element("div", "aria-map-canvas");
    mapBox.setAttribute("aria-label", "Carte interactive OpenStreetMap");
    sceneRoot.append(toolbar, status, mapBox);
    const disclosure = element("p", "aria-scene-disclosure", "Les recherches de lieux sont transmises à OpenStreetMap/Nominatim et les itinéraires à un service public OSRM (voiture, marche ou vélo). Ces services sont soumis à des quotas et à une disponibilité sans garantie ; un fournisseur contractuel sera nécessaire pour une exploitation commerciale robuste.");
    sceneRoot.append(disclosure);

    try {
      loadStylesheet("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "aria-leaflet-css");
      await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "aria-leaflet-js");
      if (sceneId !== sceneEpoch || !active || viewport.dataset.scene !== "map") return;
      if (!window.L) throw new Error("La bibliothèque cartographique est indisponible.");
      activeMap?.remove();
      activeMap = window.L.map(mapBox, { zoomControl: true }).setView([46.6, 2.4], 5);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(activeMap);
      activeMapLayer = null;
      const mapInstance = activeMap;
      setTimeout(() => { if (sceneId === sceneEpoch && activeMap === mapInstance) mapInstance.invalidateSize(); }, 50);
      status.textContent = "Carte chargée. Entrez un départ et, si souhaité, une destination pour tracer un itinéraire.";
      updateContextStatus("CARTE ACTIVE", "OPENSTREETMAP / OSRM");
    } catch (error) {
      if (sceneId === sceneEpoch && viewport.dataset.scene === "map") {
        status.textContent = error.message || "Impossible de charger la carte. Vérifiez votre connexion.";
        updateContextStatus("CARTE INDISPONIBLE", "SERVICE EXTERNE HORS LIGNE");
      }
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
          const wait = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
          if (wait) await new Promise(resolve => setTimeout(resolve, wait));
          lastGeocodeAt = Date.now();
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
          destination = await geocode(destinationQuery);
        }
        if (sceneId !== sceneEpoch || !activeMap || viewport.dataset.scene !== "map") return;
        activeMapLayer?.remove();
        activeMapLayer = window.L.featureGroup().addTo(activeMap);
        window.L.marker([origin.lat, origin.lon]).bindPopup("Départ : " + origin.label).addTo(activeMapLayer);
        if (destination) {
          window.L.marker([destination.lat, destination.lon]).bindPopup("Destination : " + destination.label).addTo(activeMapLayer);
          const routeProfile = mode.value === "foot" ? "routed-foot" : mode.value === "bike" ? "routed-bike" : "routed-car";
          const routeUrl = "https://routing.openstreetmap.de/" + routeProfile + "/route/v1/driving/" +
            origin.lon + "," + origin.lat + ";" + destination.lon + "," + destination.lat +
            "?overview=full&geometries=geojson&steps=false";
          const routeResponse = await fetch(routeUrl, { headers: { Accept: "application/json" } });
          if (!routeResponse.ok) throw new Error("Le calcul d’itinéraire est indisponible pour le moment.");
          const routeData = await routeResponse.json();
          if (sceneId !== sceneEpoch || !activeMap || viewport.dataset.scene !== "map") return;
          const route = routeData.routes?.[0];
          if (!route) throw new Error("Aucun itinéraire routier n’a été trouvé.");
          window.L.geoJSON(route.geometry, { style: { color: "#79e4ff", weight: 5, opacity: .9 } }).addTo(activeMapLayer);
          const km = (route.distance / 1000).toFixed(1);
          const mins = Math.round(route.duration / 60);
          const modeLabel = mode.value === "foot" ? "à pied" : mode.value === "bike" ? "à vélo" : "en voiture";
          status.textContent = origin.label + " → " + destination.label + " · " + km + " km · environ " + mins + " min " + modeLabel + " (OSRM).";
        } else {
          status.textContent = "Lieu trouvé : " + origin.label;
        }
        activeMap.fitBounds(activeMapLayer.getBounds().pad(.18), { maxZoom: 13 });
      } catch (error) {
        if (sceneId === sceneEpoch && viewport.dataset.scene === "map") status.textContent = error.message || "Une erreur est survenue lors de la recherche.";
      } finally {
        if (sceneId === sceneEpoch) search.disabled = false;
      }
    });
  }

  function openFinance() {
    const sceneId = ++sceneEpoch;
    resetSceneContent();
    const tabs = element("div", "aria-scene-tabs");
    const chartTab = element("button", "", "Graphique de marché");
    chartTab.type = "button";
    chartTab.setAttribute("aria-pressed", "true");
    const portfolioTab = element("button", "", "Portefeuille");
    portfolioTab.type = "button";
    portfolioTab.setAttribute("aria-pressed", "false");
    tabs.append(chartTab, portfolioTab);

    const chartPanel = element("section", "aria-finance-panel");
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
    const chartStatus = element("p", "aria-scene-status", "Graphique de marché fourni par TradingView. Les cotations et délais dépendent du fournisseur.");
    chartStatus.setAttribute("role", "status");
    const frame = element("iframe", "aria-finance-frame");
    frame.title = "Graphique financier TradingView";
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    const chartDisclosure = element("p", "aria-scene-disclosure", "Graphique externe, pas un conseil financier. Les cotations, délais et droits dépendent du fournisseur et de la place. Aucune transaction n’est effectuée par ARIA.");
    chartPanel.append(toolbar, chartStatus, frame, chartDisclosure);

    const portfolioPanel = element("section", "aria-portfolio-panel");
    portfolioPanel.hidden = true;
    const portfolioIntro = element("p", "aria-scene-status", "Suivi manuel uniquement : aucune connexion à un courtier, aucun ordre et aucun cours automatiquement récupéré. Les données sont conservées dans le stockage local de ce navigateur, pas envoyées au serveur ARIA.");
    const summary = element("div", "aria-portfolio-summary");
    const investedSummary = element("article", "aria-portfolio-metric");
    const investedLabel = element("span", "", "Capital investi");
    const investedValue = element("strong", "", "0,00 €");
    investedSummary.append(investedLabel, investedValue);
    const valueSummary = element("article", "aria-portfolio-metric");
    const valueLabel = element("span", "", "Valeur estimée");
    const valueValue = element("strong", "", "0,00 €");
    valueSummary.append(valueLabel, valueValue);
    const pnlSummary = element("article", "aria-portfolio-metric");
    const pnlLabel = element("span", "", "Gain / perte latent(e)");
    const pnlValue = element("strong", "", "0,00 €");
    pnlSummary.append(pnlLabel, pnlValue);
    summary.append(investedSummary, valueSummary, pnlSummary);

    const holdingForm = element("form", "aria-portfolio-form");
    const field = (labelText, type, name, placeholder, min = null) => {
      const label = element("label", "aria-portfolio-field", labelText);
      const input = element("input");
      input.type = type;
      input.name = name;
      input.placeholder = placeholder || "";
      input.setAttribute("aria-label", labelText);
      if (type === "number") { input.step = "any"; if (min !== null) input.min = String(min); }
      if (name === "name" || name === "quantity" || name === "purchasePrice" || name === "currentPrice") input.required = true;
      label.appendChild(input);
      return {label, input};
    };
    const nameField = field("Actif", "text", "name", "Ex. Fonds indiciel");
    const tickerField = field("Symbole (facultatif)", "text", "symbol", "Ex. CW8");
    const quantityField = field("Quantité", "number", "quantity", "0", 0.00000001);
    const purchaseField = field("Prix d’achat (€)", "number", "purchasePrice", "0,00", 0);
    const currentField = field("Prix actuel manuel (€)", "number", "currentPrice", "0,00", 0);
    const addHolding = element("button", "", "Ajouter l’actif");
    addHolding.type = "submit";
    holdingForm.append(nameField.label, tickerField.label, quantityField.label, purchaseField.label, currentField.label, addHolding);
    const portfolioStatus = element("p", "aria-scene-status", "Aucune position enregistrée.");
    portfolioStatus.setAttribute("role", "status");
    const holdings = element("div", "aria-portfolio-holdings");
    const clearPortfolio = element("button", "", "Effacer le portefeuille");
    clearPortfolio.type = "button";
    const portfolioDisclosure = element("p", "aria-scene-disclosure", "Tous les montants doivent être saisis en euros ; aucune conversion de devise n’est appliquée. Les gains/pertes sont calculés à partir des prix saisis et ne tiennent pas compte des frais, impôts, dividendes ou écarts de change. Ce suivi est informatif, non un conseil financier.");
    portfolioPanel.append(portfolioIntro, summary, holdingForm, portfolioStatus, holdings, clearPortfolio, portfolioDisclosure);

    sceneRoot.append(tabs, chartPanel, portfolioPanel);
    const storageKey = "aria.finance.portfolio.v1";
    let portfolio = [];
    let loadWarning = false;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          portfolio = parsed.filter(item => item && typeof item.name === "string" &&
            Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 1e12 &&
            Number.isFinite(item.purchasePrice) && item.purchasePrice >= 0 && item.purchasePrice <= 1e12 &&
            Number.isFinite(item.currentPrice) && item.currentPrice >= 0 && item.currentPrice <= 1e12)
            .slice(0, 100)
            .map(item => ({
              id: typeof item.id === "string" && item.id ? item.id : (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
              name: item.name.slice(0, 80),
              symbol: typeof item.symbol === "string" ? item.symbol.slice(0, 40) : "",
              quantity: item.quantity,
              purchasePrice: item.purchasePrice,
              currentPrice: item.currentPrice
            }));
        } else loadWarning = true;
      }
    } catch { loadWarning = true; }

    const euro = value => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
    const number = value => value.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
    const persistPortfolio = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(portfolio));
        return true;
      } catch {
        portfolioStatus.textContent = "Stockage local indisponible : les modifications ne seront pas conservées après fermeture.";
        return false;
      }
    };
    const renderPortfolio = () => {
      holdings.replaceChildren();
      let invested = 0;
      let marketValue = 0;
      portfolio.forEach(item => {
        const cost = item.quantity * item.purchasePrice;
        const value = item.quantity * item.currentPrice;
        const pnl = value - cost;
        invested += cost;
        marketValue += value;
        const card = element("article", "aria-portfolio-holding");
        const heading = element("div", "aria-portfolio-holding-heading");
        heading.appendChild(element("strong", "", item.name + (item.symbol ? " · " + item.symbol : "")));
        const remove = element("button", "aria-portfolio-remove", "Supprimer");
        remove.type = "button";
        remove.setAttribute("aria-label", "Supprimer " + item.name + " du portefeuille");
        remove.addEventListener("click", () => {
          portfolio = portfolio.filter(entry => entry.id !== item.id);
          const saved = persistPortfolio();
          renderPortfolio();
          portfolioStatus.textContent = saved
            ? "Position supprimée et changement enregistré localement."
            : "Position retirée de cette session, mais le stockage local est indisponible.";
        });
        heading.appendChild(remove);
        const metrics = element("div", "aria-portfolio-holding-metrics");
        metrics.append(
          element("span", "", "Quantité : " + number(item.quantity)),
          element("span", "", "Investi : " + euro(cost)),
          element("span", "", "Valeur : " + euro(value))
        );
        const result = element("p", "aria-portfolio-pnl " + (pnl > 0 ? "is-positive" : pnl < 0 ? "is-negative" : ""), "Gain / perte : " + euro(pnl) + (cost > 0 ? " (" + ((pnl / cost) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " %)" : " (base de coût nulle)"));
        const priceForm = element("form", "aria-portfolio-price-form");
        const price = element("input");
        price.type = "number";
        price.min = "0";
        price.step = "any";
        price.required = true;
        price.value = String(item.currentPrice);
        price.setAttribute("aria-label", "Nouveau prix actuel manuel pour " + item.name + " en euros");
        const update = element("button", "", "Mettre à jour le prix");
        update.type = "submit";
        priceForm.append(price, update);
        priceForm.addEventListener("submit", event => {
          event.preventDefault();
          const nextPrice = Number(price.value);
          if (!Number.isFinite(nextPrice) || nextPrice < 0 || nextPrice > 1e12) {
            portfolioStatus.textContent = "Saisissez un prix actuel valide, positif ou nul.";
            return;
          }
          item.currentPrice = nextPrice;
          const saved = persistPortfolio();
          renderPortfolio();
          portfolioStatus.textContent = saved ? "Prix actualisé et enregistré localement." : "Prix actualisé pour cette session, mais non enregistré sur l’appareil.";
        });
        card.append(heading, metrics, result, priceForm);
        holdings.appendChild(card);
      });
      const pnl = marketValue - invested;
      investedValue.textContent = euro(invested);
      valueValue.textContent = euro(marketValue);
      pnlValue.textContent = euro(pnl);
      pnlValue.className = pnl > 0 ? "is-positive" : pnl < 0 ? "is-negative" : "";
      if (!portfolio.length) {
        holdings.appendChild(element("p", "aria-scene-status", "Votre portefeuille est vide. Ajoutez une position pour commencer ; aucune donnée fictive n’est préremplie."));
      }
      if (loadWarning) portfolioStatus.textContent = "Les données locales sont illisibles ou ont un format inattendu ; vérifiez avant de les remplacer.";
      else if (!portfolio.length && !portfolioStatus.textContent.startsWith("Stockage local indisponible")) portfolioStatus.textContent = "Portefeuille local vide.";
      else if (portfolio.length && portfolioStatus.textContent === "Aucune position enregistrée.") portfolioStatus.textContent = "Positions chargées depuis le stockage local du navigateur.";
    };

    const loadChart = () => {
      const ticker = symbol.value.trim();
      if (!/^[A-Za-z0-9._:-]{1,40}$/.test(ticker)) {
        chartStatus.textContent = "Symbole invalide. Utilisez des lettres, chiffres, points, deux-points, tirets ou tirets bas.";
        return;
      }
      const url = new URL("https://s.tradingview.com/widgetembed/");
      url.search = new URLSearchParams({
        symbol: ticker, interval: interval.value, theme: "dark", style: "1", locale: "fr",
        hide_top_toolbar: "0", hide_side_toolbar: "0", allow_symbol_change: "1",
        save_image: "0", withdateranges: "1", details: "1", calendar: "0", hideideas: "1"
      });
      frame.src = url.toString();
      chartStatus.textContent = "Chargement du graphique pour " + ticker + "…";
    };
    const setFinanceView = view => {
      const showChart = view === "chart";
      chartPanel.hidden = !showChart;
      portfolioPanel.hidden = showChart;
      chartTab.setAttribute("aria-pressed", String(showChart));
      portfolioTab.setAttribute("aria-pressed", String(!showChart));
      updateContextStatus(showChart ? "GRAPHIQUE DE MARCHÉ" : "PORTEFEUILLE LOCAL", showChart ? "TRADINGVIEW" : "STOCKAGE LOCAL DU NAVIGATEUR");
    };
    toolbar.addEventListener("submit", event => { event.preventDefault(); loadChart(); });
    frame.addEventListener("load", () => {
      if (sceneId === sceneEpoch && viewport.dataset.scene === "finance" && !chartPanel.hidden) {
        chartStatus.textContent = "Le contenu TradingView a été chargé. Vérifiez le symbole, la place et l’éventuel délai des cotations.";
      }
    });
    chartTab.addEventListener("click", () => setFinanceView("chart"));
    portfolioTab.addEventListener("click", () => setFinanceView("portfolio"));
    holdingForm.addEventListener("submit", event => {
      event.preventDefault();
      const name = nameField.input.value.trim();
      const symbolValue = tickerField.input.value.trim().slice(0, 40);
      const quantity = Number(quantityField.input.value);
      const purchasePrice = Number(purchaseField.input.value);
      const currentPrice = Number(currentField.input.value);
      if (!name || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1e12 ||
          !Number.isFinite(purchasePrice) || purchasePrice < 0 || purchasePrice > 1e12 ||
          !Number.isFinite(currentPrice) || currentPrice < 0 || currentPrice > 1e12) {
        portfolioStatus.textContent = "Vérifiez le nom, la quantité et les prix : la quantité doit être positive et les prix positifs ou nuls et les montants inférieurs à 1 000 milliards.";
        return;
      }
      if (portfolio.length >= 100) {
        portfolioStatus.textContent = "Limite de 100 positions atteinte.";
        return;
      }
      portfolio.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: name.slice(0, 80),
        symbol: symbolValue,
        quantity,
        purchasePrice,
        currentPrice
      });
      const saved = persistPortfolio();
      holdingForm.reset();
      renderPortfolio();
      portfolioStatus.textContent = saved ? "Position ajoutée et enregistrée localement." : "Position ajoutée pour cette session, mais non enregistrée sur l’appareil.";
    });
    clearPortfolio.addEventListener("click", () => {
      if (!portfolio.length) { portfolioStatus.textContent = "Le portefeuille est déjà vide."; return; }
      if (!window.confirm("Effacer toutes les positions enregistrées localement dans ce navigateur ?")) return;
      portfolio = [];
      const saved = persistPortfolio();
      renderPortfolio();
      portfolioStatus.textContent = saved ? "Portefeuille effacé du stockage local." : "Portefeuille vidé pour cette session, mais l’effacement local n’a pas pu être confirmé.";
    });

    renderPortfolio();
    loadChart();
  }

  function openScience() {
    const sceneId = ++sceneEpoch;
    resetSceneContent();

    const tabs = element("div", "aria-scene-tabs");
    const nasaTab = element("button", "", "Catalogue NASA");
    nasaTab.type = "button";
    nasaTab.setAttribute("aria-pressed", "true");
    const solarTab = element("button", "", "Système solaire");
    solarTab.type = "button";
    solarTab.setAttribute("aria-pressed", "false");
    tabs.append(nasaTab, solarTab);

    const nasaPanel = element("section", "aria-science-panel");
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
    nasaPanel.append(toolbar, status, results, disclosure);

    const solarPanel = element("section", "aria-solar-panel");
    solarPanel.hidden = true;
    const solarIntro = element("p", "aria-scene-status", "Simulation orbitale pédagogique exécutée localement dans votre navigateur. Les orbites sont stylisées ; les tailles et distances ne sont pas à l’échelle et les positions ne sont pas des éphémérides astronomiques.");
    const solarControls = element("div", "aria-scene-toolbar aria-solar-controls");
    const pauseButton = element("button", "", "Pause");
    pauseButton.type = "button";
    const resetButton = element("button", "", "Réinitialiser");
    resetButton.type = "button";
    const speedLabel = element("label", "aria-solar-speed-label", "Vitesse");
    const speed = element("select");
    speed.setAttribute("aria-label", "Vitesse de simulation");
    [["1", "1 jour/s"], ["10", "10 jours/s"], ["100", "100 jours/s"], ["1000", "1 000 jours/s"]].forEach(([value, label]) => {
      const option = element("option", "", label);
      option.value = value;
      speed.appendChild(option);
    });
    speedLabel.appendChild(speed);
    const dayCount = element("p", "aria-scene-status", "Jour simulé : 0");
    dayCount.setAttribute("aria-live", "polite");
    const solarCanvas = element("canvas", "aria-solar-canvas");
    solarCanvas.setAttribute("role", "img");
    solarCanvas.setAttribute("aria-label", "Simulation animée des orbites du Soleil et des huit planètes");
    solarPanel.append(solarIntro, solarControls, dayCount, solarCanvas,
      element("p", "aria-scene-disclosure", "Les périodes orbitales sont utilisées à titre illustratif. Ce modèle n’est ni une représentation à l’échelle ni un outil de navigation ou de calcul astronomique."));
    solarControls.append(pauseButton, resetButton, speedLabel);

    sceneRoot.append(tabs, nasaPanel, solarPanel);
    let activeScienceView = "nasa";
    let elapsedDays = 0;
    let lastTimestamp = 0;
    let paused = false;
    const context = solarCanvas.getContext("2d");
    const planets = [
      { name: "Mercure", period: 88, orbit: 0.14, radius: 3, label: "Mercure" },
      { name: "Vénus", period: 225, orbit: 0.22, radius: 4, label: "Vénus" },
      { name: "Terre", period: 365.256, orbit: 0.30, radius: 4.5, label: "Terre" },
      { name: "Mars", period: 687, orbit: 0.38, radius: 3.8, label: "Mars" },
      { name: "Jupiter", period: 4333, orbit: 0.53, radius: 8, label: "Jupiter" },
      { name: "Saturne", period: 10759, orbit: 0.67, radius: 7, label: "Saturne" },
      { name: "Uranus", period: 30687, orbit: 0.80, radius: 5.5, label: "Uranus" },
      { name: "Neptune", period: 60190, orbit: 0.92, radius: 5.5, label: "Neptune" }
    ];
    const planetColors = ["#b9a18c", "#e6c58f", "#76c8ff", "#e47b62", "#e5bd8a", "#e8d5a8", "#8de4e6", "#779bff"];

    function drawSolarSystem(timestamp = 0) {
      if (sceneId !== sceneEpoch || viewport.dataset.scene !== "scientific_model" || activeScienceView !== "solar") {
        frame = 0;
        return;
      }
      if (!context) {
        dayCount.textContent = "Le canvas 2D n’est pas disponible dans ce navigateur.";
        frame = 0;
        return;
      }
      if (lastTimestamp && !paused) elapsedDays += Math.min(64, timestamp - lastTimestamp) / 1000 * Number(speed.value);
      lastTimestamp = timestamp;
      const rect = solarCanvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (solarCanvas.width !== width || solarCanvas.height !== height) {
        solarCanvas.width = width;
        solarCanvas.height = height;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxOrbit = Math.max(80, Math.min(w * 0.47, h * 0.44));
      context.clearRect(0, 0, w, h);
      context.fillStyle = "#050b14";
      context.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const x = ((i * 97 + 23) % 997) / 997 * w;
        const y = ((i * 193 + 61) % 991) / 991 * h;
        context.fillStyle = i % 5 === 0 ? "rgba(192,226,255,.8)" : "rgba(145,177,210,.38)";
        context.fillRect(x, y, i % 7 === 0 ? 1.6 : 1, i % 7 === 0 ? 1.6 : 1);
      }
      context.save();
      context.translate(cx, cy);
      planets.forEach((planet, index) => {
        const orbitRadius = maxOrbit * planet.orbit;
        context.beginPath();
        context.ellipse(0, 0, orbitRadius, orbitRadius * 0.72, -0.12, 0, Math.PI * 2);
        context.strokeStyle = "rgba(130,177,212,.23)";
        context.lineWidth = 1;
        context.stroke();
        const angle = elapsedDays / planet.period * Math.PI * 2 + index * 0.53;
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius * 0.72;
        context.beginPath();
        context.arc(x, y, planet.radius, 0, Math.PI * 2);
        context.fillStyle = planetColors[index];
        context.shadowColor = planetColors[index];
        context.shadowBlur = 10;
        context.fill();
        context.shadowBlur = 0;
        if (w > 420) {
          context.font = "11px system-ui, sans-serif";
          context.fillStyle = "rgba(220,235,249,.86)";
          context.fillText(planet.label, x + planet.radius + 5, y + 4);
        }
      });
      const sunGlow = context.createRadialGradient(0, 0, 2, 0, 0, 27);
      sunGlow.addColorStop(0, "rgba(255,239,168,.95)");
      sunGlow.addColorStop(.45, "rgba(255,172,72,.45)");
      sunGlow.addColorStop(1, "rgba(255,153,61,0)");
      context.fillStyle = sunGlow;
      context.beginPath();
      context.arc(0, 0, 27, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(0, 0, 8, 0, Math.PI * 2);
      context.fillStyle = "#fff1b4";
      context.fill();
      context.restore();
      dayCount.textContent = "Jour simulé : " + Math.floor(elapsedDays).toLocaleString("fr-FR") + " · " + (paused ? "en pause" : "simulation active");
      frame = paused ? 0 : window.requestAnimationFrame(drawSolarSystem);
    }

    function stopSolarSystem() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastTimestamp = 0;
    }
    function startSolarSystem() {
      stopSolarSystem();
      if (activeScienceView === "solar" && !solarPanel.hidden && !paused) frame = window.requestAnimationFrame(drawSolarSystem);
    }
    function setScienceView(view) {
      activeScienceView = view;
      const showSolar = view === "solar";
      nasaPanel.hidden = showSolar;
      solarPanel.hidden = !showSolar;
      nasaTab.setAttribute("aria-pressed", String(!showSolar));
      solarTab.setAttribute("aria-pressed", String(showSolar));
      updateContextStatus(showSolar ? "SIMULATION ORBITALE ACTIVE" : "CATALOGUE NASA", showSolar ? "MODÈLE LOCAL APPROXIMATIF" : "NASA IMAGES API");
      if (showSolar) startSolarSystem();
      else stopSolarSystem();
    }
    nasaTab.addEventListener("click", () => setScienceView("nasa"));
    solarTab.addEventListener("click", () => setScienceView("solar"));
    pauseButton.addEventListener("click", () => {
      paused = !paused;
      pauseButton.textContent = paused ? "Reprendre" : "Pause";
      if (paused) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        lastTimestamp = 0;
        if (activeScienceView === "solar") drawSolarSystem(0);
      } else if (activeScienceView === "solar") {
        startSolarSystem();
      }
    });
    resetButton.addEventListener("click", () => {
      elapsedDays = 0;
      lastTimestamp = 0;
      if (activeScienceView === "solar") {
        if (paused) drawSolarSystem(0);
        else startSolarSystem();
      }
    });

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
        if (sceneId !== sceneEpoch || viewport.dataset.scene !== "scientific_model" || activeScienceView !== "nasa") return;
        const items = (data.collection?.items || []).slice(0, 12);
        if (!items.length) { status.textContent = "Aucun média trouvé pour cette recherche."; updateContextStatus("AUCUN RÉSULTAT", "CATALOGUE NASA"); return; }
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
        updateContextStatus("CATALOGUE DISPONIBLE", "NASA IMAGES API");
      } catch (error) {
        if (sceneId === sceneEpoch && viewport.dataset.scene === "scientific_model" && activeScienceView === "nasa") {
          status.textContent = error.message || "Impossible de joindre le catalogue NASA.";
          updateContextStatus("NASA INDISPONIBLE", "SERVICE EXTERNE HORS LIGNE");
        }
      } finally {
        if (sceneId === sceneEpoch) search.disabled = false;
      }
    };
    toolbar.addEventListener("submit", event => { event.preventDefault(); runSearch(); });
    runSearch();
  }

  function open(options = {}) {
    const type = options.type || "placeholder";
    sceneEpoch++;
    active = true;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    viewport.dataset.scene = type;
    sceneRoot.hidden = true;
    canvas.hidden = true;
    if (type !== "map") {
      activeMap?.remove();
      activeMap = null;
      activeMapLayer = null;
    }
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
    sceneEpoch++;
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
