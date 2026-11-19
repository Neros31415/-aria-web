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
  } catch { setStatus("STOCKAGE INDISPONIBLE"); }
}
function setStatus(text) { $("statusText").textContent = text; }
function addMessage(role, text, save = true) {
  const item = {role, text, time: Date.now()};
  if (save) { messages.push(item); persist(); }
  renderMessage(item);
  if ($("chatPanel").hidden) openPanel("chatPanel");
}
function renderMessage(item) {
  const article = document.createElement("article");
  article.className = "message " + (item.role === "user" ? "user-message" : "aria-message");
  const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = item.role === "user" ? "Q" : "A";
  const bubble = document.createElement("div"); bubble.className = "bubble";
  const label = document.createElement("div"); label.className = "message-label"; label.textContent = item.role === "user" ? "VOUS" : "ARIA";
  const tag = document.createElement("span"); tag.textContent = item.role === "user" ? "COMMANDE" : "MODE DÉMO"; label.appendChild(tag);
  const p = document.createElement("p"); p.textContent = item.text;
  bubble.append(label, p); article.append(avatar, bubble); messagesEl.appendChild(article);
  const panel = $("chatPanel"); if (!panel.hidden) panel.scrollTop = panel.scrollHeight;
}
function renderAllMessages() {
  messagesEl.replaceChildren();
  if (!messages.length) {
    renderMessage({role:"assistant", text:"Je suis prête. Le HUD est interactif ; le moteur IA distant doit encore être validé avant de traiter vos demandes comme des actions réelles."});
    return;
  }
  messages.forEach(renderMessage);
}
function setScene(scene) {
  const root = document.querySelector(".core-stage");
  const scenes = {
    presence: {title:"À votre écoute.", subtitle:"Un espace vivant. Une seule interface. Votre intention donne le mouvement.", mode:"PRÉSENCE", description:"En attente de commande", visual:"Aucune scène active", hint:"Choisissez une démonstration ou demandez à ARIA.", state:"PRÊTE À RECEVOIR"},
    globe: {title:"Le monde, au centre.", subtitle:"Une scène holographique de démonstration — prête à accueillir une vraie carte interactive.", mode:"GLOBE", description:"Scène d'interface activée", visual:"Globe holographique", hint:"Le globe animé est une maquette visuelle, pas une carte géographique réelle.", state:"SCÈNE DE DÉMONSTRATION"},
    mountain: {title:"Cap sur le Mont-Blanc.", subtitle:"La transition vers une scène géographique est simulée ici ; le relief réel reste à connecter.", mode:"EXPLORATION", description:"Cible : Alpes françaises", visual:"Mont-Blanc · aperçu", hint:"Le zoom géographique réel nécessite l'intégration de données cartographiques et du moteur 3D.", state:"CIBLE SÉLECTIONNÉE"},
    engine: {title:"Explorer la mécanique.", subtitle:"Une scène technique sera rendue dans cet espace central, sans ouvrir une page annexe.", mode:"OBJET 3D", description:"Exploration technique", visual:"Moteur · aperçu", hint:"Cette prévisualisation n'est pas encore un modèle 3D manipulable.", state:"SCÈNE DE DÉMONSTRATION"}
  };
  const item = scenes[scene] || scenes.presence;
  root.dataset.scene = scene;
  $("sceneTitle").textContent = item.title;
  $("sceneSubtitle").textContent = item.subtitle;
  $("modeLabel").textContent = item.mode;
  $("modeDescription").textContent = item.description;
  $("visualMode").textContent = item.visual;
  $("visualHint").textContent = item.hint;
  $("coreState").textContent = item.state;
  document.querySelectorAll("[data-scene]").forEach(button => {
    const active = button.dataset.scene === scene;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.body.classList.toggle("scene-active", scene !== "presence");
  setStatus(scene === "presence" ? "HUD ACTIF · IA À VALIDER" : "SCÈNE DÉMO · DONNÉES RÉELLES À CONNECTER");
}
function openPanel(id) {
  const panel = $(id);
  const other = id === "chatPanel" ? $("memoryPanel") : $("chatPanel");
  other.hidden = true;
  panel.hidden = false;
}
function closePanel(id) { $(id).hidden = true; }
function localReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("mont-blanc") || lower.includes("mont blanc") || lower.includes("alpes")) {
    setScene("mountain");
    return "J'ai activé l'aperçu visuel du Mont-Blanc dans l'interface centrale. Transparence : le zoom géographique, le relief réel et les données cartographiques ne sont pas encore connectés.";
  }
  if (lower.includes("moteur") || lower.includes("ferrari") || lower.includes("objet 3d") || lower.includes("objet 3d")) {
    setScene("engine");
    return "J'ai activé l'espace de prévisualisation technique. Transparence : le modèle 3D du moteur, son démontage et ses animations physiques restent à intégrer.";
  }
  if (lower.includes("globe") || lower.includes("carte") || lower.includes("monde")) {
    setScene("globe");
    return "Le globe holographique est activé au centre. Il s'agit actuellement d'une maquette visuelle : les cartes et les données réelles ne sont pas encore reliées.";
  }
  if (lower.includes("mémoire") || lower.includes("souviens")) {
    openPanel("memoryPanel");
    return memories.length
      ? "Voici les notes conservées localement :\n" + memories.map((m,i) => `${i+1}. ${m}`).join("\n") + "\n\nElles restent sur cet appareil et ne sont pas encore transmises à un modèle distant."
      : "Votre mémoire locale est vide. Le panneau mémoire est ouvert : vous pouvez y ajouter ou supprimer vos notes.";
  }
  if (lower.includes("état") || lower.includes("fonctionne") || lower.includes("capable")) {
    return "État honnête du prototype : HUD interactif, animations CSS/SVG, scènes de démonstration et stockage local disponibles. Le modèle IA distant, les cartes réelles, les objets 3D manipulables et les actions système doivent encore être validés ou intégrés.";
  }
  return "Commande reçue et conservée dans l'historique local. Le HUD peut déjà ouvrir des scènes de démonstration ; sans backend IA connecté et validé, je ne peux pas encore interpréter librement cette demande ni exécuter une action réelle.";
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
function resizeInput() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 120) + "px"; }
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
    remove.addEventListener("click", () => { memories.splice(index, 1); persist(); renderMemory(); updateMemoryCount(); });
    li.append(span, remove); list.appendChild(li);
  });
  if (!memories.length) {
    const li = document.createElement("li"); li.textContent = "Aucune note enregistrée."; li.style.color = "#66778e"; list.appendChild(li);
  }
  updateMemoryCount();
}
function updateMemoryCount() { $("memoryCount").textContent = String(memories.length).padStart(2, "0") + (memories.length === 1 ? " NOTE" : " NOTES"); }
$("memoryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const field = $("memoryInput");
  const value = field.value.trim();
  if (!value) return;
  memories.push(value); persist(); field.value = ""; renderMemory();
});
$("settingsBtn").addEventListener("click", () => $("settingsDialog").showModal());
$("chatToggle").addEventListener("click", () => openPanel("chatPanel"));
$("chatClose").addEventListener("click", () => closePanel("chatPanel"));
$("memoryToggle").addEventListener("click", () => openPanel("memoryPanel"));
$("memoryClose").addEventListener("click", () => closePanel("memoryPanel"));
document.querySelectorAll("[data-scene]").forEach(button => button.addEventListener("click", () => setScene(button.dataset.scene)));
$("coreTrigger").addEventListener("click", () => setScene(document.querySelector(".core-stage").dataset.scene === "presence" ? "globe" : "presence"));
$("coreTrigger").addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("coreTrigger").click(); }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") { closePanel("chatPanel"); closePanel("memoryPanel"); }
});
function updateClock() {
  const now = new Date();
  $("clockLabel").textContent = now.toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
setScene("presence"); renderAllMessages(); renderMemory(); updateClock(); window.setInterval(updateClock, 1000);
