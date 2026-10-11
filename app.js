const $ = (id) => document.getElementById(id);
const STORAGE_MESSAGES = "aria.v07.messages";
const STORAGE_MEMORY = "aria.v07.memory";
const messagesEl = $("messages");
const input = $("messageInput");
let messages = safeRead(STORAGE_MESSAGES, []);
let memories = safeRead(STORAGE_MEMORY, []);

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
  const tag = document.createElement("span"); tag.textContent = item.role === "user" ? "MESSAGE" : "MODE LOCAL"; label.appendChild(tag);
  const p = document.createElement("p"); p.textContent = item.text;
  bubble.append(label, p); article.append(avatar, bubble); messagesEl.appendChild(article);
}
function renderAllMessages() {
  messagesEl.replaceChildren();
  if (!messages.length) {
    renderMessage({role:"assistant", text:"Bonjour. Mon interface est prête, mais mon moteur IA distant n’est pas encore connecté. Vous pouvez tester la conversation locale et la mémoire de ce prototype."});
  }
  messages.forEach(renderMessage);
}
function localReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("mémoire") || lower.includes("souviens")) {
    return memories.length
      ? "Voici les notes enregistrées localement :\n" + memories.map((m,i) => `${i+1}. ${m}`).join("\n") + "\n\nJe ne peux pas encore les utiliser avec un modèle IA distant."
      : "Votre mémoire locale est vide. Ajoutez une note dans le panneau « Mémoire locale » ci-dessous. Le moteur IA distant n’est pas connecté.";
  }
  if (lower.includes("état") || lower.includes("fonctionne") || lower.includes("capable")) {
    return "État honnête du prototype : interface mobile et stockage local opérationnels. Modèle IA, recherche Web, compte utilisateur, synchronisation iPhone-PC et actions système ne sont pas encore connectés.";
  }
  return "Message reçu et conservé dans l’historique local. Je suis actuellement en mode prototype : sans backend connecté, je ne peux pas générer une véritable réponse par IA ni exécuter cette demande. Prochaine étape : déployer un backend sécurisé et connecter un modèle réel.";
}
$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage("user", text);
  input.value = ""; resizeInput(); $("charCount").textContent = "0/2000";
  window.setTimeout(() => addMessage("assistant", localReply(text)), 180);
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
$("settingsBtn").addEventListener("click", () => $("settingsDialog").showModal());
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
renderAllMessages(); renderMemory();
