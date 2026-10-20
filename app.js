const $ = (id) => document.getElementById(id);
const KEYS = {
  messages: "aria.v07.messages",
  memory: "aria.v07.memory",
  profile: "aria.voice.profile.v1",
  onboarded: "aria.voice.onboarded.v1",
  reset: "aria.voice.reset.20261020",
  clientId: "aria.voice.clientId.v1"
};
const API_BASE = "https://aria-brain-staging.quentineros-sevesi.workers.dev";
const SESSION_TOKEN_KEY = "aria.voice.alphaToken";
let conversation = [];
let requestInFlight = false;
function getClientId() {
  let id = localStorage.getItem(KEYS.clientId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEYS.clientId, id);
  }
  return id;
}
function getApiToken() {
  return sessionStorage.getItem(SESSION_TOKEN_KEY) || "";
}
function setApiToken(value) {
  const token = value.trim();
  if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  else sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

// The user explicitly requested a fresh personal start. Remove legacy ARIA
// profile/history keys on this build's first launch; keep unrelated site data.
let remoteResetPromise = Promise.resolve(false);
if (!localStorage.getItem(KEYS.reset)) {
  // Capture old profile credentials before clearing this device. The staging
  // Worker supports authenticated DELETE; report failure instead of claiming success.
  const oldClientId = localStorage.getItem("aria.v07.memoryClientId");
  const oldToken = sessionStorage.getItem("aria.session.accessToken") || sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (oldClientId && oldToken) {
    remoteResetPromise = fetch("https://aria-brain-staging.quentineros-sevesi.workers.dev/memory?clientId=" + encodeURIComponent(oldClientId), {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + oldToken }
    }).then(response => response.ok).catch(() => false);
  }
  for (const key of Object.keys(localStorage)) {
    // Keep only the old profile ID temporarily so a failed remote purge can be retried.
    if (key.startsWith("aria.") && key !== "aria.v07.memoryClientId") localStorage.removeItem(key);
  }
  for (const key of Object.keys(sessionStorage)) {
    // The old access token is retained only long enough to request deletion of the matching server record.
    if (key.startsWith("aria.") && key !== "aria.session.accessToken") sessionStorage.removeItem(key);
  }
  localStorage.setItem(KEYS.reset, "done");
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;
let speaking = false;
let shouldResumeListening = false;
let onboarding = false;
let onboardingStep = 0;
let profile = safeRead(KEYS.profile, {
  proactivity: "balanced",
  verbosity: "balanced",
  humor: "balanced",
  memoryConsent: false
});
let memories = safeRead(KEYS.memory, []);
let transcriptVisible = false;

function safeRead(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
function saveProfile() {
  try { localStorage.setItem(KEYS.profile, JSON.stringify(profile)); }
  catch { announceVisual("Le navigateur ne permet pas de sauvegarder les préférences."); }
}
function setState(state, title, subtitle, spokenText = "") {
  const root = $("coreStage");
  root.dataset.state = state;
  $("coreState").textContent = ({
    presence: "PRÉSENTE",
    listening: "À L'ÉCOUTE",
    thinking: "JE RÉFLÉCHIS",
    speaking: "JE VOUS RÉPONDS",
    initiative: "JE PRENDS LA PAROLE",
    attention: "VOTRE ATTENTION",
    unavailable: "VOIX INDISPONIBLE"
  })[state] || "PRÉSENTE";
  $("sceneTitle").textContent = title || ({
    presence: "Je suis là.",
    listening: "Je vous écoute.",
    thinking: "Laissez-moi un instant.",
    speaking: "Je vous réponds.",
    initiative: "Si je peux me permettre…",
    attention: "Un point important.",
    unavailable: "Je ne peux pas écouter ici."
  })[state];
  if (subtitle) $("sceneSubtitle").textContent = subtitle;
  $("statusText").textContent = ({
    presence: "PRÉSENCE",
    listening: "ÉCOUTE",
    thinking: "RÉFLEXION",
    speaking: "PAROLE",
    initiative: "INTERVENTION",
    attention: "ATTENTION",
    unavailable: "VOIX INDISPONIBLE"
  })[state] || "PRÉSENCE";
  $("statusDot").dataset.state = state;
  if (spokenText) speak(spokenText, {resume: true});
}
function announceVisual(text) {
  $("voiceNote").textContent = text;
}
function updateTranscript(text, role = "ARIA") {
  $("transcriptText").textContent = role + " : " + text;
  if (transcriptVisible) $("transcriptWidget").hidden = false;
}
function speak(text, options = {}) {
  if (options.resume === true && recognition) shouldResumeListening = true;
  if (!("speechSynthesis" in window)) {
    announceVisual("La synthèse vocale n'est pas disponible dans ce navigateur.");
    return;
  }
  window.speechSynthesis.cancel();
  speaking = true;
  if (recognition && listening) {
    shouldResumeListening = options.resume !== false;
    try { recognition.stop(); } catch {}
  }
  setState(options.initiative ? "initiative" : "speaking", options.initiative ? "Si je peux me permettre…" : "Je vous réponds.", text);
  updateTranscript(text, "ARIA");
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.lang.toLowerCase().startsWith("fr") && /female|amélie|audrey|marie|hortense/i.test(v.name)) ||
    voices.find(v => v.lang.toLowerCase().startsWith("fr")) || null;
  utterance.onend = () => {
    speaking = false;
    if (typeof options.onEnd === "function") {
      options.onEnd();
      return;
    }
    if (shouldResumeListening) {
      shouldResumeListening = false;
      window.setTimeout(startListening, 300);
    } else setState("presence");
  };
  utterance.onerror = () => {
    speaking = false;
    if (typeof options.onEnd === "function") {
      options.onEnd();
      return;
    }
    if (shouldResumeListening) { shouldResumeListening = false; startListening(); }
    else setState("presence");
  };
  window.speechSynthesis.speak(utterance);
}
function startListening() {
  if (!recognition) {
    announceVisual("La reconnaissance vocale n'est pas prise en charge par ce navigateur. Essayez Safari ou un navigateur compatible, ou utilisez les commandes système.");
    setState("unavailable");
    return;
  }
  if (listening || speaking) return;
  shouldResumeListening = false;
  try {
    recognition.start();
    listening = true;
    $("voiceStart").hidden = true;
    $("voiceStop").hidden = false;
    setState("listening", "Je vous écoute.", "Parlez naturellement. Vous pouvez m'interrompre à tout moment.");
    announceVisual("Écoute active au premier plan. Le navigateur peut interrompre l'écoute en arrière-plan.");
  } catch (error) {
    announceVisual("Impossible de démarrer l'écoute. Vérifiez l'autorisation du microphone et réessayez.");
  }
}
function stopListening() {
  shouldResumeListening = false;
  listening = false;
  if (recognition) { try { recognition.stop(); } catch {} }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  speaking = false;
  setState("presence", "Je suis là.", "L'écoute est en pause. Vous pouvez la reprendre quand vous le souhaitez.");
  $("voiceStart").hidden = false;
  $("voiceStop").hidden = true;
  $("voiceStart").textContent = "Reprendre l'écoute";
}
function openPanel(id) {
  $(id).hidden = false;
  if (id === "memoryPanel") {
    renderMemory();
    syncRemoteMemory();
  }
}
async function syncRemoteMemory() {
  const token = getApiToken();
  if (!token) {
    $("memoryStatus").textContent = "Mémoire locale affichée. Configurez le jeton alpha pour synchroniser la mémoire distante.";
    return;
  }
  try {
    const response = await fetch(API_BASE + "/memory?clientId=" + encodeURIComponent(getClientId()), {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!response.ok) {
      $("memoryStatus").textContent = response.status === 401
        ? "Jeton refusé : la mémoire distante n'a pas été synchronisée."
        : "Mémoire distante indisponible; les données affichées restent locales.";
      return;
    }
    const data = await response.json();
    if (!Array.isArray(data.memories)) throw new Error("invalid memory response");
    memories = data.memories;
    localStorage.setItem(KEYS.memory, JSON.stringify(memories));
    renderMemory();
    $("memoryStatus").textContent = "Mémoire synchronisée avec le serveur.";
  } catch {
    $("memoryStatus").textContent = "Synchronisation impossible. Les données affichées restent locales.";
  }
}
async function saveRemoteMemory() {
  const token = getApiToken();
  if (!token) return false;
  try {
    const response = await fetch(API_BASE + "/memory", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: getClientId(),
        memories: memories.map(item => typeof item === "string" ? {text:item} : item)
      })
    });
    if (!response.ok) return false;
    const data = await response.json();
    if (Array.isArray(data.memories)) memories = data.memories;
    localStorage.setItem(KEYS.memory, JSON.stringify(memories));
    $("memoryStatus").textContent = "Mémoire locale et distante mises à jour.";
    return true;
  } catch {
    $("memoryStatus").textContent = "La mémoire locale est mise à jour, mais la synchronisation distante a échoué.";
    return false;
  }
}
function closePanel(id) { $(id).hidden = true; }
function renderMemory() {
  const list = $("memoryList");
  list.replaceChildren();
  memories.forEach((item) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = typeof item === "string" ? item : item.text;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Supprimer ce souvenir");
    remove.addEventListener("click", () => {
      memories = memories.filter(entry => entry !== item);
      localStorage.setItem(KEYS.memory, JSON.stringify(memories));
      renderMemory();
      saveRemoteMemory();
    });
    li.append(span, remove);
    list.appendChild(li);
  });
  if (!memories.length) {
    const li = document.createElement("li");
    li.textContent = "Mémoire personnelle vierge.";
    list.appendChild(li);
  }
}
function localDemoReply(text) {
  const lower = text.toLocaleLowerCase("fr");
  if (/mémoire|souviens|retiens/.test(lower)) {
    openPanel("memoryPanel");
    return {text: memories.length ? "Votre panneau mémoire est ouvert. Je peux vous montrer les notes présentes sur cet appareil." : "Votre mémoire personnelle est actuellement vierge."};
  }
  return null;
}
async function requestAriaReply(text) {
  const token = getApiToken();
  if (!token) {
    $("settingsDialog").showModal();
    announceVisual("Le moteur distant n'est pas encore connecté. Saisissez votre jeton d'accès alpha dans les paramètres.");
    return "Je suis prête, mais il me manque le jeton d'accès alpha pour joindre mon moteur conversationnel. Ouvrons les paramètres pour le configurer.";
  }
  if (requestInFlight) return "Je termine déjà votre demande précédente. Un instant, s'il vous plaît.";
  requestInFlight = true;
  try {
    conversation.push({role:"user", content:text});
    const payload = {
      clientId: getClientId(),
      messages: conversation.slice(-20)
    };
    const response = await fetch(API_BASE + "/chat", {
      method:"POST",
      headers: {
        "Authorization":"Bearer " + token,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(payload)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (response.status === 401) {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      conversation.pop();
      $("settingsDialog").showModal();
      announceVisual("Le jeton d'accès a été refusé. Vérifiez-le ou demandez-en un nouveau à l'administrateur.");
      return "Le serveur a refusé le jeton d'accès. Je l'ai retiré de cette session. Vérifiez-le dans les paramètres.";
    }
    if (!response.ok || typeof data.reply !== "string" || !data.reply.trim()) {
      conversation.pop();
      const reason = data.error === "provider_unavailable" ? "Le fournisseur IA ne répond pas pour le moment."
        : data.error === "provider_error" ? "Le fournisseur IA a renvoyé une erreur."
        : data.error === "service_not_configured" ? "Le moteur distant n'est pas entièrement configuré."
        : "La connexion au moteur distant a échoué.";
      announceVisual(reason + " Votre demande n'a pas été confirmée comme exécutée.");
      return reason + " Je n'ai donc pas de réponse fiable à vous donner pour l'instant.";
    }
    conversation.push({role:"assistant",content:data.reply});
    conversation = conversation.slice(-20);
    return data.reply;
  } catch (error) {
    conversation.pop();
    announceVisual("Impossible de joindre le moteur distant. Vérifiez votre connexion réseau.");
    return "Je n'arrive pas à joindre mon moteur conversationnel. Vérifiez votre connexion, puis réessayez.";
  } finally {
    requestInFlight = false;
  }
}
async function handleUtterance(text) {
  if (!text.trim()) return;
  updateTranscript(text, "VOUS");
  setState("thinking", "Je réfléchis.", "Je traite votre demande.");
  if (onboarding) {
    await handleOnboardingAnswer(text.trim());
    return;
  }
  const local = localDemoReply(text);
  const reply = local ? local.text : await requestAriaReply(text.trim());
  window.setTimeout(() => speak(reply, {resume: true}), 100);
}
const onboardingQuestions = [
  {key:"proactivity", prompt:"Pour commencer, préférez-vous que je sois discrète, que je vous signale parfois les choses utiles, ou que je prenne davantage l'initiative ?"},
  {key:"verbosity", prompt:"Et pour mes réponses : plutôt courtes, équilibrées, ou détaillées quand le sujet le mérite ?"},
  {key:"humor", prompt:"Concernant l'humour, préférez-vous quelque chose de discret, naturel, ou plus fréquent ?"},
  {key:"memoryConsent", prompt:"Dernière question : souhaitez-vous que je puisse vous proposer de mémoriser certaines informations, en vous laissant toujours le contrôle ?"}
];
function normalizeChoice(text, choices) {
  const value = text.toLocaleLowerCase("fr");
  for (const [key, terms] of Object.entries(choices)) if (terms.some(term => value.includes(term))) return key;
  return null;
}
async function handleOnboardingAnswer(text) {
  const q = onboardingQuestions[onboardingStep];
  if (!q) return finishOnboarding();

  // A skipped question must not silently grant a permission or overwrite a preference.
  if (/^(passer|je passe|skip|je ne sais pas|je préfère ne pas répondre)$/i.test(text.trim())) {
    if (q.key === "memoryConsent") profile.memoryConsent = false;
    saveProfile();
    onboardingStep += 1;
    if (onboardingStep < onboardingQuestions.length) {
      speak(onboardingQuestions[onboardingStep].prompt, {resume:true});
    } else finishOnboarding();
    return;
  }

  if (q.key === "proactivity") {
    const choice = normalizeChoice(text, {
      discrete:["discrète","discret","seulement si","uniquement si"],
      balanced:["équilibrée","équilibré","parfois","de temps en temps"],
      proactive:["proactive","initiative","spontanément","souvent"]
    });
    if (!choice) return speak("Je n'ai pas bien compris. Vous pouvez choisir discrète, équilibrée, proactive, ou dire « passer ».", {resume:true});
    profile.proactivity = choice;
  }
  if (q.key === "verbosity") {
    const choice = normalizeChoice(text, {
      short:["courte","court","bref","brève"],
      balanced:["équilibrée","équilibré","normal"],
      detailed:["détaillée","détaillé","longue","long"]
    });
    if (!choice) return speak("Vous préférez des réponses courtes, équilibrées ou détaillées ? Vous pouvez aussi dire « passer ».", {resume:true});
    profile.verbosity = choice;
  }
  if (q.key === "humor") {
    const choice = normalizeChoice(text, {
      low:["discret","discrète","peu"],
      balanced:["naturel","naturelle","équilibré"],
      high:["fréquent","souvent","beaucoup"]
    });
    if (!choice) return speak("Vous préférez un humour discret, naturel ou fréquent ? Vous pouvez aussi dire « passer ».", {resume:true});
    profile.humor = choice;
  }
  if (q.key === "memoryConsent") {
    const answer = text.toLocaleLowerCase("fr").trim();
    const affirmative = /^(oui|oui bien sûr|d'accord|je veux bien|tu peux|vous pouvez|autorise|j'accepte|accepte|volontiers)([.! ]|$)/i.test(answer);
    const negative = /^(non|non merci|pas maintenant|je refuse|je préfère pas|je ne veux pas|n'enregistre rien)([.! ]|$)/i.test(answer);
    if (!affirmative && !negative) {
      return speak("Je veux être certaine de respecter votre choix. Souhaitez-vous autoriser la mémoire : oui ou non ? Vous pouvez aussi dire « passer »; dans ce cas, elle restera désactivée.", {resume:true});
    }
    profile.memoryConsent = affirmative;
  }
  saveProfile();
  onboardingStep += 1;
  if (onboardingStep < onboardingQuestions.length) {
    speak(onboardingQuestions[onboardingStep].prompt, {resume:true});
  } else {
    finishOnboarding();
  }
}
function beginOnboarding() {
  onboarding = true;
  onboardingStep = 0;
  $("onboardingDialog").close();
  speak("Bonjour. Je suis Aria. Je suis conçue pour vous aider à réfléchir, découvrir, organiser et accomplir des tâches. Nous allons régler ensemble la manière dont je vous parle, le degré d'initiative que vous souhaitez me laisser et la façon dont je peux utiliser la mémoire. Vous pourrez modifier ces choix plus tard. Commençons.", {
    resume: true,
    onEnd: () => speak(onboardingQuestions[0].prompt, {resume:true})
  });
}
function finishOnboarding() {
  onboarding = false;
  saveProfile();
  localStorage.setItem(KEYS.onboarded, "done");
  speak("Parfait. Vous pourrez modifier ces préférences à tout moment. Je vais maintenant vous expliquer les états de mon orbe.", {
    resume: false,
    onEnd: () => {
      const states = [
        ["presence","Quand je suis calme, je suis présente et disponible."],
        ["listening","Quand l'orbe s'anime doucement, je vous écoute."],
        ["thinking","Quand sa lumière se concentre, je réfléchis à votre demande."],
        ["speaking","Quand elle pulse avec ma voix, je vous réponds."],
        ["initiative","Quand l'animation change avant que vous me sollicitiez, c'est que je prends la parole pour signaler un point pertinent."]
      ];
      let i = 0;
      const next = () => {
        if (i >= states.length) {
          speak("Voilà pour mes états essentiels. Je vous laisse découvrir la suite. Vous pouvez me parler naturellement.", {resume:true});
          return;
        }
        const [state, text] = states[i++];
        setState(state);
        speak(text, {resume:false, onEnd: next});
      };
      next();
    }
  });
}
function finishSetupIfReturning() {
  if (!localStorage.getItem(KEYS.onboarded)) {
    $("onboardingDialog").showModal();
  } else {
    setState("presence");
    $("voiceStart").textContent = "Commencer à parler";
  }
}
function saveSettingsFromDialog() {
  setApiToken($("apiTokenSetting").value);
  profile.proactivity = $("proactivitySetting").value;
  profile.verbosity = $("verbositySetting").value;
  profile.humor = $("humorSetting").value;
  saveProfile();
  $("settingsDialog").close();
  speak(getApiToken() ? "Vos préférences sont enregistrées. Le jeton alpha est disponible pour cette session." : "Vos préférences sont enregistrées. Le moteur distant restera indisponible tant que le jeton alpha n'est pas configuré.", {resume:true});
}
function updateClock() {
  $("clockLabel").textContent = new Date().toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"});
}
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (result.isFinal && result[0]?.transcript) handleUtterance(result[0].transcript);
  };
  recognition.onerror = (event) => {
    listening = false;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      announceVisual("L'accès au microphone a été refusé. Autorisez-le dans les réglages du navigateur.");
      setState("unavailable");
      $("voiceStart").hidden = false;
      $("voiceStop").hidden = true;
    }
  };
  recognition.onend = () => {
    listening = false;
    if (shouldResumeListening && !speaking) {
      shouldResumeListening = false;
      window.setTimeout(startListening, 350);
    } else if (!speaking && $("voiceStop").hidden === false) {
      // Best-effort continuous listening while foregrounded; browsers may stop it.
      window.setTimeout(startListening, 500);
    }
  };
}
$("voiceStart").addEventListener("click", () => {
  if (!localStorage.getItem(KEYS.onboarded)) beginOnboarding();
  else startListening();
});
$("voiceStop").addEventListener("click", stopListening);
$("pauseToggle").addEventListener("click", () => listening || speaking ? stopListening() : startListening());
$("transcriptToggle").addEventListener("click", () => {
  transcriptVisible = !transcriptVisible;
  $("transcriptWidget").hidden = !transcriptVisible;
});
$("transcriptClose").addEventListener("click", () => {
  transcriptVisible = false;
  $("transcriptWidget").hidden = true;
});
$("memoryToggle").addEventListener("click", () => openPanel("memoryPanel"));
$("memoryClose").addEventListener("click", () => closePanel("memoryPanel"));
$("settingsBtn").addEventListener("click", () => {
  $("apiTokenSetting").value = getApiToken();
  $("proactivitySetting").value = profile.proactivity;
  $("verbositySetting").value = profile.verbosity;
  $("humorSetting").value = profile.humor;
  $("settingsDialog").showModal();
});
$("saveSettings").addEventListener("click", saveSettingsFromDialog);
$("restartOnboarding").addEventListener("click", () => {
  $("settingsDialog").close();
  localStorage.removeItem(KEYS.onboarded);
  $("onboardingDialog").showModal();
});
$("settingsMemory").addEventListener("click", () => {
  $("settingsDialog").close();
  openPanel("memoryPanel");
});
$("onboardingBegin").addEventListener("click", (event) => {
  event.preventDefault();
  beginOnboarding();
});
$("onboardingSkip").addEventListener("click", () => {
  onboarding = false;
  localStorage.setItem(KEYS.onboarded, "skipped");
});
$("resetMemoryBtn").addEventListener("click", async () => {
  if (!confirm("Effacer les données personnelles conservées localement par cette version d'ARIA ? Cette opération est irréversible sur cet appareil.")) return;
  const oldClientId = localStorage.getItem("aria.v07.memoryClientId");
  const currentClientId = localStorage.getItem(KEYS.clientId);
  const clientIdsToDelete = [...new Set([currentClientId, oldClientId].filter(Boolean))];
  const oldToken = sessionStorage.getItem("aria.session.accessToken") || sessionStorage.getItem(SESSION_TOKEN_KEY);
  let remoteDeleted = clientIdsToDelete.length > 0 && Boolean(oldToken);
  if (remoteDeleted) {
    for (const clientId of clientIdsToDelete) {
      try {
        const response = await fetch(API_BASE + "/memory?clientId=" + encodeURIComponent(clientId), {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + oldToken }
        });
        if (!response.ok) remoteDeleted = false;
      } catch { remoteDeleted = false; }
    }
  }
  memories = [];
  profile = {proactivity:"balanced",verbosity:"balanced",humor:"balanced",memoryConsent:false};
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("aria.") && key !== "aria.v07.memoryClientId") localStorage.removeItem(key);
  }
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith("aria.") && key !== "aria.session.accessToken" && key !== SESSION_TOKEN_KEY) sessionStorage.removeItem(key);
  }
  localStorage.setItem(KEYS.reset, "done");
  localStorage.setItem(KEYS.memory, "[]");
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
  renderMemory();
  if (remoteDeleted) {
    localStorage.removeItem("aria.v07.memoryClientId");
    localStorage.removeItem(KEYS.clientId);
    sessionStorage.removeItem("aria.session.accessToken");
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }
  conversation = [];
  $("memoryStatus").textContent = remoteDeleted
    ? "Mémoire locale effacée et suppression serveur confirmée."
    : "Mémoire locale effacée. Suppression serveur non confirmée : l'identifiant et la session sont conservés temporairement pour permettre une nouvelle tentative.";
  speak(remoteDeleted
    ? "La mémoire personnelle de cet appareil a été effacée et le serveur a confirmé la suppression."
    : "La mémoire personnelle locale a été effacée. Je ne peux pas confirmer la suppression serveur, qui nécessite une session autorisée et un Worker compatible.", {resume:true});
});
$("settingsDialog").addEventListener("close", () => {});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closePanel("memoryPanel"); }
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
updateClock();
window.setInterval(updateClock, 1000);
renderMemory();
remoteResetPromise.then(deleted => {
  if (deleted) {
    localStorage.removeItem("aria.v07.memoryClientId");
    sessionStorage.removeItem("aria.session.accessToken");
  }
  if (localStorage.getItem(KEYS.reset) === "done" && !localStorage.getItem(KEYS.onboarded)) {
    $("memoryStatus").textContent = deleted
      ? "Les anciennes données locales et la mémoire serveur ont été effacées."
      : "Les anciennes données locales ont été effacées. La suppression distante n'a pas pu être confirmée; l'identifiant et la session sont conservés temporairement pour permettre une nouvelle tentative.";
  }
});
finishSetupIfReturning();
