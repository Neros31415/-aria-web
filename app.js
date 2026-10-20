const $ = (id) => document.getElementById(id);
const KEYS = {
  messages: "aria.v07.messages",
  memory: "aria.v07.memory",
  profile: "aria.voice.profile.v1",
  onboarded: "aria.voice.onboarded.v1",
  reset: "aria.voice.reset.20261020"
};

// The user explicitly requested a fresh personal start. Remove legacy ARIA
// profile/history keys on this build's first launch; keep unrelated site data.
let remoteResetPromise = Promise.resolve(false);
if (!localStorage.getItem(KEYS.reset)) {
  // Capture the old profile credentials before clearing this device. The Worker
  // branch in this PR adds DELETE /memory; until that Worker is deployed, the
  // request will fail safely and the UI must not claim remote deletion.
  const oldClientId = localStorage.getItem("aria.v07.memoryClientId");
  const oldToken = sessionStorage.getItem("aria.session.accessToken");
  if (oldClientId && oldToken) {
    remoteResetPromise = fetch("https://aria-brain-staging.quentineros-sevesi.workers.dev/memory?clientId=" + encodeURIComponent(oldClientId), {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + oldToken }
    }).then(response => response.ok).catch(() => false);
  }
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("aria.")) localStorage.removeItem(key);
  }
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith("aria.")) sessionStorage.removeItem(key);
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
  if (id === "memoryPanel") renderMemory();
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
  if (/mont.?blanc|alpes/.test(lower)) return {text:"Je peux afficher une scène de démonstration du Mont-Blanc. Pour le moment, ce visuel n'est pas relié à une carte ou à des données de relief réelles.", scene:"mountain"};
  if (/moteur|ferrari|objet 3d/.test(lower)) return {text:"Je peux ouvrir l'aperçu mécanique. Le modèle 3D interactif reste à intégrer.", scene:"engine"};
  if (/globe|carte|monde/.test(lower)) return {text:"Le globe central est une maquette visuelle. Les données géographiques réelles restent à connecter.", scene:"globe"};
  if (/mémoire|souviens|retiens/.test(lower)) {
    openPanel("memoryPanel");
    return {text: memories.length ? "Votre panneau mémoire est ouvert. Je peux vous montrer les notes présentes sur cet appareil." : "Votre mémoire personnelle est actuellement vierge."};
  }
  return {text:"Je vous ai entendue. Le parcours vocal et l'interface sont actifs, mais le moteur conversationnel distant n'est pas encore relié à cette version. Je ne vais pas faire semblant d'avoir compris ou exécuté une tâche que je ne peux pas encore traiter."};
}
async function handleUtterance(text) {
  if (!text.trim()) return;
  updateTranscript(text, "VOUS");
  setState("thinking", "Je réfléchis.", "Je traite votre demande.");
  if (onboarding) {
    await handleOnboardingAnswer(text.trim());
    return;
  }
  const result = localDemoReply(text);
  if (result.scene) {
    document.querySelector(".core-stage").dataset.scene = result.scene;
    document.body.classList.add("scene-active");
  }
  window.setTimeout(() => speak(result.text, {resume: true}), 250);
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
  if (q.key === "proactivity") profile.proactivity = normalizeChoice(text, {
    discrete:["discrète","discret","seulement si","uniquement si"],
    balanced:["équilibrée","équilibré","parfois","de temps en temps"],
    proactive:["proactive","initiative","spontanément","souvent"]
  }) || profile.proactivity;
  if (q.key === "verbosity") profile.verbosity = normalizeChoice(text, {
    short:["courte","court","bref","brève"],
    balanced:["équilibrée","équilibré","normal"],
    detailed:["détaillée","détaillé","longue","long"]
  }) || profile.verbosity;
  if (q.key === "humor") profile.humor = normalizeChoice(text, {
    low:["discret","discrète","peu"],
    balanced:["naturel","naturelle","équilibré"],
    high:["fréquent","souvent","beaucoup"]
  }) || profile.humor;
  if (q.key === "memoryConsent") profile.memoryConsent = !/(non|pas du tout|jamais|aucune)/i.test(text);
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
  profile.proactivity = $("proactivitySetting").value;
  profile.verbosity = $("verbositySetting").value;
  profile.humor = $("humorSetting").value;
  saveProfile();
  $("settingsDialog").close();
  speak("Vos préférences sont enregistrées.", {resume:true});
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
  const oldToken = sessionStorage.getItem("aria.session.accessToken");
  let remoteDeleted = false;
  if (oldClientId && oldToken) {
    try {
      const response = await fetch("https://aria-brain-staging.quentineros-sevesi.workers.dev/memory?clientId=" + encodeURIComponent(oldClientId), {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + oldToken }
      });
      remoteDeleted = response.ok;
    } catch {}
  }
  memories = [];
  profile = {proactivity:"balanced",verbosity:"balanced",humor:"balanced",memoryConsent:false};
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("aria.")) localStorage.removeItem(key);
  }
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith("aria.")) sessionStorage.removeItem(key);
  }
  localStorage.setItem(KEYS.reset, "done");
  localStorage.setItem(KEYS.memory, "[]");
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
  renderMemory();
  $("memoryStatus").textContent = remoteDeleted
    ? "Mémoire locale effacée et suppression serveur confirmée."
    : "Mémoire locale effacée. Suppression serveur non confirmée : le Worker peut ne pas encore prendre en charge cette opération ou l'identifiant de session peut manquer.";
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
  if (localStorage.getItem(KEYS.reset) === "done" && !localStorage.getItem(KEYS.onboarded)) {
    $("memoryStatus").textContent = deleted
      ? "Les anciennes données locales et la mémoire serveur ont été effacées."
      : "Les anciennes données locales ont été effacées. La suppression distante n'a pas pu être confirmée.";
  }
});
finishSetupIfReturning();
