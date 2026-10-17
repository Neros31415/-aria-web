const $ = (id) => document.getElementById(id);
const STORAGE_MESSAGES = "aria.v07.messages";
const STORAGE_MEMORY = "aria.v07.memory";
const SESSION_TOKEN = "aria.session.accessToken";
const API_BASE = "https://aria-brain-staging.quentineros-sevesi.workers.dev";
const messagesEl = $("messages");
const input = $("messageInput");
let messages = safeRead(STORAGE_MESSAGES, []);
let memories = safeRead(STORAGE_MEMORY, []);
let isSending = false;

function safeRead(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}
function persist() {
  try {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages.slice(-50)));
    localStorage.setItem(STORAGE_MEMORY, JSON.stringify(memories.slice(-100)));
  } catch { setStatus("Stockage indisponible dans ce navigateur"); }
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
  const p = document.createElement("p"); p.textContent = item.text;
  bubble.append(label, p); article.append(avatar, bubble); messagesEl.appendChild(article);
  article.scrollIntoView({behavior:"smooth", block:"nearest"});
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
    const response = await fetch(API_BASE + "/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json", "Authorization":"Bearer " + token},
      body: JSON.stringify({messages: messages.slice(-20).map(({role,text}) => ({role,content:text}))})
    });
    let data;
    try { data = await response.json(); } catch { throw new Error("Réponse illisible du backend."); }
    if (response.status === 401) {
      setSessionToken("");
      throw new Error("Jeton refusé. Il a été effacé de cette session ; vérifiez-le dans les paramètres.");
    }
    if (!response.ok) {
      const errors = {403:"Origine refusée par le backend.", 429:"Limite de requêtes atteinte.", 502:"Le fournisseur IA est temporairement indisponible.", 503:"Le backend n’est pas configuré."};
      throw new Error(errors[response.status] || data.error || "Erreur backend (" + response.status + ").");
    }
    if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Le backend n’a pas renvoyé de réponse.");
    addMessage("assistant", data.reply.trim());
    setStatus("Connectée · " + (data.model || "IA distante"));
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
    const span = document.createElement("span"); span.textContent = memory;
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", "Supprimer cette note");
    remove.addEventListener("click", () => { memories.splice(index, 1); persist(); renderMemory(); });
    li.append(span, remove); list.appendChild(li);
  });
  if (!memories.length) {
    const li = document.createElement("li"); li.textContent = "Aucune note enregistrée."; li.style.color = "#66778e"; list.appendChild(li);
  }
}
$("memoryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = $("memoryInput").value.trim();
  if (!value) return;
  memories.push(value); persist(); $("memoryInput").value = ""; renderMemory();
});
$("closeSettingsBtn").addEventListener("click", () => $("settingsDialog").close());
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
    setStatus("Jeton supprimé de la session");
    $("tokenStatus").textContent = "Jeton supprimé de cet onglet.";
    return;
  }
  if (!setSessionToken(token)) {
    $("tokenStatus").textContent = "Stockage de session indisponible dans ce navigateur.";
    return;
  }
  $("tokenStatus").textContent = "Jeton conservé uniquement dans la session de cet onglet.";
  setStatus("Jeton configuré · connexion au premier message");
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
renderAllMessages(); renderMemory();
setStatus(getSessionToken() ? "Jeton présent · backend prêt à tester" : "IA distante · jeton à configurer");
