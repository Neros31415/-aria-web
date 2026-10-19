const $ = (id) => document.getElementById(id);
const STORAGE_MESSAGES = "aria.v07.messages";
const STORAGE_MEMORY = "aria.v07.memory";
const STORAGE_CLIENT_ID = "aria.v07.memoryClientId";
const STORAGE_MIGRATED = "aria.v07.memoryMigrated";
const SESSION_TOKEN = "aria.session.accessToken";
const API_BASE = "https://aria-brain-staging.quentineros-sevesi.workers.dev";
const messagesEl = $("messages");
const input = $("messageInput");
let messages = safeRead(STORAGE_MESSAGES, []);
let memories = normalizeMemories(safeRead(STORAGE_MEMORY, []));
let isSending = false;
let memoryMode = "local";
let memorySyncing = false;

function safeRead(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
function normalizeMemories(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return {id: crypto.randomUUID(), text: item.slice(0, 300), createdAt: Date.now()};
    if (item && typeof item.text === "string") return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      text: item.text.slice(0, 300),
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now()
    };
    return null;
  }).filter((item) => item && item.text.trim()).slice(0, 100);
}
function persist() {
  try {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages.slice(-50)));
    localStorage.setItem(STORAGE_MEMORY, JSON.stringify(memories.slice(-100)));
  } catch { setStatus("Stockage local indisponible"); }
}
function setStatus(text) { $("statusText").textContent = text; }
function addMessage(role, text, save = true) {
  const item = {role, text, time: Date.now()};
  if (save) { messages.push(item); persist(); }
  renderMessage(item);
}
function renderMessage(item) {
  const article = document.createElement("article");
  article.className = "message " + (item.role === "user" ? "user-message" : "aria-message");
  const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = item.role === "user" ? "Q" : "A";
  const bubble = document.createElement("div"); bubble.className = "bubble";
  const label = document.createElement("div"); label.className = "message-label"; label.textContent = item.role === "user" ? "VOUS" : "ARIA";
  const tag = document.createElement("span"); tag.textContent = item.role === "user" ? "MESSAGE" : "IA DISTANTE"; label.appendChild(tag);
  const p = document.createElement("p");
  if (item.role === "user") p.textContent = item.text;
  else renderFormattedText(p, item.text);
  bubble.append(label, p); article.append(avatar, bubble); messagesEl.appendChild(article);
  article.scrollIntoView({behavior:"smooth", block:"nearest"});
}
// Render a deliberately small, safe subset of Markdown without injecting HTML.
function renderFormattedText(container, text) {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) container.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    if (match[2]) {
      const link = document.createElement("a");
      link.href = match[2];
      link.textContent = match[1];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "message-link";
      container.appendChild(link);
    } else if (match[3]) {
      const rawUrl = match[3].replace(/[.,!?;:]+$/, "");
      const trailing = match[3].slice(rawUrl.length);
      const link = document.createElement("a");
      link.href = rawUrl;
      link.textContent = rawUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "message-link";
      container.appendChild(link);
      if (trailing) container.appendChild(document.createTextNode(trailing));
    } else if (match[4]) {
      const strong = document.createElement("strong");
      strong.textContent = match[4];
      container.appendChild(strong);
    } else if (match[5]) {
      const code = document.createElement("code");
      code.textContent = match[5];
      container.appendChild(code);
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) container.appendChild(document.createTextNode(text.slice(cursor)));
}
function renderAllMessages() {
  messagesEl.replaceChildren();
  if (!messages.length) {
    renderMessage({role:"assistant", text:"Bonjour. Je suis prête à tester le moteur IA distant. Configurez votre jeton d’accès dans les paramètres pour commencer."});
  }
  messages.forEach(renderMessage);
}
function getSessionToken() {
  try { return sessionStorage.getItem(SESSION_TOKEN) || ""; } catch { return ""; }
}
function setSessionToken(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_TOKEN, value);
    else sessionStorage.removeItem(SESSION_TOKEN);
    return true;
  } catch { return false; }
}
function getClientId() {
  try {
    let id = localStorage.getItem(STORAGE_CLIENT_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_CLIENT_ID, id);
    }
    return id;
  } catch { return ""; }
}
async function memoryRequest(method) {
  const token = getSessionToken();
  const clientId = getClientId();
  if (!token || !clientId) throw new Error("Jeton ou identifiant local indisponible.");
  const response = await fetch(API_BASE + "/memory?clientId=" + encodeURIComponent(clientId), {
    method,
    headers: {"Authorization":"Bearer " + token, "Content-Type":"application/json"},
    ...(method === "PUT" ? {body: JSON.stringify({clientId, memories})} : {})
  });
  let data;
  try { data = await response.json(); } catch { throw new Error("Réponse mémoire illisible."); }
  if (!response.ok) throw new Error(data.error || "Erreur mémoire (" + response.status + ").");
  return data;
}
async function syncMemories() {
  if (memorySyncing || !getSessionToken()) return;
  memorySyncing = true;
  try {
    const data = await memoryRequest("GET");
    const remote = normalizeMemories(data.memories);
    // Never discard device-only notes merely because a previous sync was attempted.
    // If the server is empty but this device has notes, seed the remote store from this device.
    if (!remote.length && memories.length) {
      const saved = await memoryRequest("PUT");
      memories = normalizeMemories(saved.memories);
    } else {
      memories = remote;
    }
    localStorage.setItem(STORAGE_MIGRATED, "true");
    memoryMode = "remote";
    persist();
    renderMemory();
    setStatus("Connectée · mémoire persistante active");
  } catch (error) {
    memoryMode = "local";
    renderMemory();
    setStatus("Chat connecté · mémoire locale uniquement");
    $("memoryStatus").textContent = "Serveur indisponible : notes conservées sur cet appareil. " + error.message;
  } finally {
    memorySyncing = false;
  }
}
async function saveMemoriesToServer() {
  if (!getSessionToken()) {
    memoryMode = "local";
    renderMemory();
    return;
  }
  try {
    const data = await memoryRequest("PUT");
    memories = normalizeMemories(data.memories);
    memoryMode = "remote";
    persist();
    renderMemory();
    $("memoryStatus").textContent = "Enregistrée sur le serveur ARIA.";
  } catch (error) {
    memoryMode = "local";
    renderMemory();
    $("memoryStatus").textContent = "Non synchronisée : " + error.message + " Les notes restent sur cet appareil.";
  }
}
async function sendToAria(text) {
  const token = getSessionToken();
  if (!token) {
    setStatus("Jeton d’accès requis");
    addMessage("assistant", "Pour protéger votre backend, aucun jeton n’est intégré au code public. Ouvrez les paramètres et saisissez votre jeton d’accès ARIA. Il restera uniquement dans la session de cet onglet.");
    return;
  }
  isSending = true;
  const sendButton = $("chatForm").querySelector('button[type="submit"]');
  sendButton.disabled = true;
  setStatus("ARIA réfléchit…");
  try {
    await syncMemories();
    const response = await fetch(API_BASE + "/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json", "Authorization":"Bearer " + token},
      body: JSON.stringify({
        clientId: getClientId(),
        messages: messages.slice(-20).map(({role,text}) => ({role,content:text}))
      })
    });
    let data;
    try { data = await response.json(); } catch { throw new Error("Réponse illisible du backend."); }
    if (response.status === 401) {
      setSessionToken("");
      throw new Error("Jeton refusé. Il a été effacé de cette session ; vérifiez-le dans les paramètres.");
    }
    if (!response.ok) {
      const errors = {403:"Origine refusée par le backend.", 429:"Limite de requêtes atteinte.", 502:"Le fournisseur IA est temporairement indisponible.", 503:"Le backend ou le stockage mémoire n’est pas configuré."};
      throw new Error(errors[response.status] || data.error || "Erreur backend (" + response.status + ").");
    }
    if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Le backend n’a pas renvoyé de réponse.");
    try {
      const savedMemory = await memoryRequest("GET");
      memories = normalizeMemories(savedMemory.memories);
      memoryMode = "remote";
      persist();
      renderMemory();
    } catch { /* A memory refresh failure must not discard a successful chat reply. */ }
    addMessage("assistant", data.reply.trim());
    setStatus("Connectée · " + (data.model || "IA distante") + (memoryMode === "remote" ? " · mémoire persistante" : ""));
  } catch (error) {
    addMessage("assistant", "Je n’ai pas pu répondre : " + (error && error.message ? error.message : "erreur réseau") + " Vérifiez la connexion et l’état du backend.");
    if (error instanceof TypeError) setStatus("Backend inaccessible ou CORS");
    else setStatus("Erreur de connexion");
  } finally {
    isSending = false;
    sendButton.disabled = false;
    input.focus();
  }
}
$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || isSending) return;
  addMessage("user", text);
  input.value = ""; resizeInput(); $("charCount").textContent = "0/2000";
  void sendToAria(text);
});
input.addEventListener("input", () => {
  resizeInput(); $("charCount").textContent = `${input.value.length}/2000`;
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("chatForm").requestSubmit(); }
});
function resizeInput() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; }
$("clearBtn").addEventListener("click", () => {
  if (!confirm("Effacer l’historique local de conversation ?")) return;
  messages = []; persist(); renderAllMessages();
});
function renderMemory() {
  const list = $("memoryList"); list.replaceChildren();
  memories.forEach((memory, index) => {
    const li = document.createElement("li");
    const span = document.createElement("span"); span.textContent = memory.text;
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", "Supprimer cette note");
    remove.addEventListener("click", () => {
      memories.splice(index, 1); persist(); renderMemory(); void saveMemoriesToServer();
    });
    li.append(span, remove); list.appendChild(li);
  });
  if (!memories.length) {
    const li = document.createElement("li"); li.textContent = "Aucune note enregistrée."; li.style.color = "#66778e"; list.appendChild(li);
  }
  const status = $("memoryStatus");
  if (status) status.textContent = memoryMode === "remote"
    ? "Synchronisée avec le serveur ARIA."
    : "Stockée sur cet appareil uniquement. Configurez le jeton pour synchroniser.";
}
$("memoryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = $("memoryInput").value.trim();
  if (!value) return;
  memories.push({id: crypto.randomUUID(), text: value.slice(0, 300), createdAt: Date.now()});
  memories = memories.slice(-100);
  persist(); $("memoryInput").value = ""; renderMemory(); void saveMemoriesToServer();
});
$("closeSettingsBtn").addEventListener("click", () => $("settingsDialog").close());
$("closeSettingsTopBtn").addEventListener("click", () => $("settingsDialog").close());
$("settingsBtn").addEventListener("click", () => {
  const tokenInput = $("apiTokenInput");
  if (tokenInput) tokenInput.value = getSessionToken();
  $("settingsDialog").showModal();
});
$("apiTokenForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const token = $("apiTokenInput").value.trim();
  if (!token) {
    setSessionToken("");
    memoryMode = "local";
    setStatus("Jeton supprimé de la session");
    $("tokenStatus").textContent = "Jeton supprimé de cet onglet.";
    renderMemory();
    return;
  }
  if (!setSessionToken(token)) {
    $("tokenStatus").textContent = "Stockage de session indisponible dans ce navigateur.";
    return;
  }
  $("tokenStatus").textContent = "Jeton conservé uniquement dans la session de cet onglet.";
  setStatus("Jeton configuré · synchronisation de la mémoire…");
  void syncMemories();
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
renderAllMessages();
renderMemory();
setStatus(getSessionToken() ? "Jeton présent · synchronisation mémoire…" : "IA distante · jeton à configurer");
if (getSessionToken()) void syncMemories();
