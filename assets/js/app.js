/* =========================
   SUPABASE CLIENT (disabled for now)
========================= */

// Supabase is kept for future cloud sync, but fully disabled so no errors occur.
let supabaseClient = null;
// Do NOT initialize Supabase until you add a real URL + key.
if (false) {
  try {
    supabaseClient = window.supabase.createClient(
      "YOUR_SUPABASE_URL",
      "YOUR_SUPABASE_ANON_KEY"
    );
  } catch (e) {
    console.warn("Supabase not initialised (and that's okay for now).");
  }
}

/* =========================
   STATE
========================= */

let userName = "";
let userAge = "";
let userPurpose = [];

let decks = JSON.parse(localStorage.getItem("aura-decks") || "{}");
let notes = JSON.parse(localStorage.getItem("aura-notes") || "[]");
let todos = JSON.parse(localStorage.getItem("aura-todos") || "[]");

let currentDeck = null;
let currentCardIndex = 0;

let timerInterval = null;
let totalSeconds = 1500;
let remainingSeconds = totalSeconds;

let pomodoroStats = JSON.parse(
  localStorage.getItem("aura-pomodoro-stats") || '{"sessions":0,"seconds":0}'
);

let noteSearchQuery = "";

/* Timer ring */
const ring = document.querySelector(".timer-ring-progress");
const radius = 70;
const circumference = 2 * Math.PI * radius;

if (ring) {
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = 0;
}

/* =========================
   ELEMENTS
========================= */

const onboardingScreen = document.getElementById("onboarding-screen");
const onboardingStepsContainer = document.querySelector(".onboarding-steps");
const onboardingCards = document.querySelectorAll(".onboarding-card");

const appRoot = document.getElementById("app-root");

const screens = document.querySelectorAll(".aura-screen");
const navButtons = document.querySelectorAll(".bottom-nav-item");

const deckGrid = document.getElementById("deck-grid");

const flashcard = document.getElementById("flashcard");
const flashcardFront = document.getElementById("flashcard-front");
const flashcardBack = document.getElementById("flashcard-back");
const flashcardProgress = document.getElementById("flashcard-progress");

const flashcardModal = document.getElementById("flashcard-modal");
const flashcardModalTitle = document.getElementById("flashcard-modal-title");
const flashcardFrontInput = document.getElementById("flashcard-front-input");
const flashcardBackInput = document.getElementById("flashcard-back-input");
const flashcardModalSave = document.getElementById("flashcard-modal-save");
const flashcardModalCancel = document.getElementById("flashcard-modal-cancel");

let flashcardModalMode = "add";

const notesList = document.getElementById("notes-list");
const notesSearchInput = document.getElementById("notes-search-input");

const noteEditorOverlay = document.getElementById("note-editor-overlay");
const noteEditorContent = document.getElementById("note-editor-content");
const noteEditorTitle = document.getElementById("note-editor-title-input");
const noteTagsInput = document.getElementById("note-tags-input");
const pinNoteButton = document.getElementById("pin-note-button");

const timerDisplay = document.getElementById("pomodoro-time");
const hourInput = document.getElementById("timer-hours");
const minuteInput = document.getElementById("timer-minutes");

const pomodoroStatsSessions = document.getElementById("pomodoro-stats-sessions");
const pomodoroStatsTime = document.getElementById("pomodoro-stats-time");

/* =========================
   HAPTICS
========================= */

function haptic(ms = 20) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

/* =========================
   ONBOARDING (every time)
========================= */

let onboardingStep = 1;

function goToOnboardingStep(step) {
  onboardingStep = step;
  onboardingStepsContainer.style.transform = `translateX(${(step - 1) * -100}vw)`;
}

function finishOnboarding() {
  onboardingScreen.style.display = "none";
  appRoot.style.display = "flex";

  const greet = document.getElementById("home-greeting");
  if (greet && userName) greet.textContent = `hello, ${userName}`;

  renderTodos();
  renderDecks();
  renderNotes();
  renderPomodoroStats();
}

/* Step 1 */
document.getElementById("onboarding-next-1").addEventListener("click", () => {
  const nameInput = document.getElementById("onboarding-name-input");
  const name = nameInput.value.trim();
  if (!name) return;

  userName = name;
  goToOnboardingStep(2);
});

/* Step 2 */
document.getElementById("onboarding-next-2").addEventListener("click", () => {
  const ageInput = document.getElementById("onboarding-age-input");
  const ageValue = ageInput.value.trim();
  if (!ageValue) return;

  userAge = ageValue;
  goToOnboardingStep(3);
});

/* Step 3 */
document.getElementById("onboarding-finish").addEventListener("click", () => {
  const checks = document.querySelectorAll('input[name="purpose"]:checked');
  const selected = Array.from(checks).map(c => c.value);
  if (!selected.length) return;

  userPurpose = selected;
  finishOnboarding();
});

/* Skip button (mode B: save whatever is typed) */
document.getElementById("onboarding-skip")?.addEventListener("click", () => {
  finishOnboarding();
});

/* Back buttons */
document.querySelectorAll(".onboarding-back-button").forEach(btn => {
  btn.addEventListener("click", () => {
    goToOnboardingStep(parseInt(btn.dataset.backStep, 10));
  });
});

/* Initial onboarding state */
onboardingScreen.style.display = "flex";
appRoot.style.display = "none";
goToOnboardingStep(1);

/* =========================
   SETTINGS
========================= */

document.getElementById("settings-change-name").addEventListener("click", () => {
  const newName = prompt("enter your new name:", userName || "");
  if (!newName) return;

  userName = newName.trim();

  const greet = document.getElementById("home-greeting");
  if (greet) greet.textContent = `hello, ${userName}`;
});

document.getElementById("settings-theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
});

/* =========================
   NAVIGATION
========================= */

function showScreen(name) {
  screens.forEach(s => s.classList.remove("is-active"));
  document.querySelector(`[data-screen="${name}"]`).classList.add("is-active");
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    navButtons.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    showScreen(btn.dataset.screenTarget);
  });
});

/* =========================
   TODO LIST
========================= */

function saveTodos() {
  localStorage.setItem("aura-todos", JSON.stringify(todos));
}

function renderTodos() {
  const list = document.getElementById("todo-list");
  list.innerHTML = "";

  todos.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.innerHTML = `<span>${item}</span><button class="ghost-button small">x</button>`;

    li.querySelector("button").addEventListener("click", () => {
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
      haptic(30);
    });

    list.appendChild(li);
  });
}

document.getElementById("todo-add-button").addEventListener("click", () => {
  const text = prompt("new task:");
  if (!text) return;
  todos.push(text.trim());
  saveTodos();
  renderTodos();
  haptic(20);
});

/* =========================
   FLASHCARDS
========================= */

function saveDecks() {
  localStorage.setItem("aura-decks", JSON.stringify(decks));
}

function renderDecks() {
  deckGrid.innerHTML = "";

  const names = Object.keys(decks);
  if (!names.length) {
    deckGrid.innerHTML = `<p style="font-size:13px;color:#666;">no decks yet. create one to get started.</p>`;
    return;
  }

  names.forEach(deckName => {
    const card = document.createElement("div");
    card.className = "deck-card";
    card.textContent = deckName;
    card.addEventListener("click", () => openDeck(deckName));
    deckGrid.appendChild(card);
  });
}

function openDeck(name) {
  currentDeck = name;
  currentCardIndex = 0;

  document.getElementById("deck-viewer-title").textContent = name;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();

  showScreen("flashcard-viewer");
}

document.getElementById("back-to-decks").addEventListener("click", () => {
  showScreen("flashcards");
});

function renderFlashcard() {
  const deck = decks[currentDeck];
  if (!deck || !deck.length) {
    flashcardFront.textContent = "no cards yet";
    flashcardBack.textContent = "";
    flashcardProgress.textContent = "";
    return;
  }

  const card = deck[currentCardIndex];
  flashcardFront.textContent = card.front;
  flashcardBack.textContent = card.back;
  flashcardProgress.textContent = `${currentCardIndex + 1} / ${deck.length}`;
}
/* =========================
   FLASHCARD CONTROLS
========================= */

document.getElementById("flashcard-flip").addEventListener("click", () => {
  flashcard.classList.toggle("is-flipped");
  haptic(20);
});

document.getElementById("flashcard-next").addEventListener("click", () => {
  const deck = decks[currentDeck];
  currentCardIndex = (currentCardIndex + 1) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
  haptic(15);
});

document.getElementById("flashcard-prev").addEventListener("click", () => {
  const deck = decks[currentDeck];
  currentCardIndex = (currentCardIndex - 1 + deck.length) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
  haptic(15);
});

/* =========================
   FLASHCARD MODAL
========================= */

function openFlashcardModal(mode) {
  flashcardModalMode = mode;
  flashcardModal.classList.add("is-visible");
}

function closeFlashcardModal() {
  flashcardModal.classList.remove("is-visible");
  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";
}

flashcardModalCancel.addEventListener("click", closeFlashcardModal);

flashcardModalSave.addEventListener("click", () => {
  const front = flashcardFrontInput.value.trim();
  const back = flashcardBackInput.value.trim();
  if (!front || !back) return;

  const deck = decks[currentDeck];

  if (flashcardModalMode === "add") {
    deck.push({ front, back });
    currentCardIndex = deck.length - 1;
  } else {
    deck[currentCardIndex] = { front, back };
  }

  saveDecks();
  renderFlashcard();
  closeFlashcardModal();
  haptic(25);
});

document.getElementById("delete-card-button").addEventListener("click", () => {
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;

  deck.splice(currentCardIndex, 1);
  currentCardIndex = 0;
  saveDecks();
  renderFlashcard();
});

/* =========================
   ADD DECK BUTTON (FIXED)
========================= */

document.getElementById("add-deck-button").addEventListener("click", () => {
  const name = prompt("deck name:");
  if (!name) return;

  if (decks[name]) {
    alert("deck already exists.");
    return;
  }

  decks[name] = [];
  saveDecks();
  renderDecks();
});

/* =========================
   NOTES
========================= */

function saveNotes() {
  localStorage.setItem("aura-notes", JSON.stringify(notes));
}

function renderNotes() {
  notesList.innerHTML = "";

  const filtered = notes
    .map((note, index) => ({ ...note, index }))
    .filter(n => {
      const q = noteSearchQuery.toLowerCase();
      return (
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return b.updatedAt - a.updatedAt;
    });

  filtered.forEach(n => {
    const card = document.createElement("div");
    card.className = "glass-card";

    const preview = n.content.replace(/<[^>]*>/g, "").slice(0, 80);

    card.innerHTML = `
      <div class="note-card-header">
        <h3>${n.title || "untitled"}</h3>
        ${n.pinned ? '<span class="note-pin">pinned</span>' : ""}
      </div>
      <p>${preview}${preview.length === 80 ? "..." : ""}</p>
      ${n.tags ? `<p class="hint-text">${n.tags}</p>` : ""}
    `;

    card.addEventListener("click", () => openNoteEditor(n.index));
    notesList.appendChild(card);
  });
}

notesSearchInput.addEventListener("input", e => {
  noteSearchQuery = e.target.value;
  renderNotes();
});

/* =========================
   NOTE EDITOR
========================= */

function openNoteEditor(index = null) {
  noteEditorOverlay.classList.add("is-visible");
  appRoot.style.display = "none";

  if (index === null) {
    noteEditorTitle.value = "";
    noteEditorContent.innerHTML = "";
    noteTagsInput.value = "";
    noteEditorOverlay.dataset.editing = "new";
    pinNoteButton.dataset.pinned = "false";
    pinNoteButton.textContent = "pin";
  } else {
    const note = notes[index];
    noteEditorTitle.value = note.title;
    noteEditorContent.innerHTML = note.content;
    noteTagsInput.value = note.tags;
    noteEditorOverlay.dataset.editing = index;
    pinNoteButton.dataset.pinned = note.pinned ? "true" : "false";
    pinNoteButton.textContent = note.pinned ? "unpin" : "pin";
  }
}

document.getElementById("add-note-button").addEventListener("click", () => {
  openNoteEditor(null);
});

document.getElementById("quick-note-button").addEventListener("click", () => {
  openNoteEditor(null);
});

document.getElementById("close-note-editor").addEventListener("click", closeNoteEditor);

function closeNoteEditor() {
  noteEditorOverlay.classList.remove("is-visible");
  appRoot.style.display = "flex";
}

/* Swipe down to close */
let noteStartY = 0;
noteEditorOverlay.addEventListener("touchstart", e => {
  noteStartY = e.touches[0].clientY;
});
noteEditorOverlay.addEventListener("touchend", e => {
  if (e.changedTouches[0].clientY - noteStartY > 80) closeNoteEditor();
});

document.getElementById("save-note-button").addEventListener("click", () => {
  const title = noteEditorTitle.value.trim();
  const content = noteEditorContent.innerHTML.trim();
  const tags = noteTagsInput.value.trim();
  const pinned = pinNoteButton.dataset.pinned === "true";

  if (!title && !content) return;

  const now = Date.now();
  const editing = noteEditorOverlay.dataset.editing;

  if (editing === "new") {
    notes.push({ title, content, tags, pinned, updatedAt: now });
  } else {
    notes[editing] = { title, content, tags, pinned, updatedAt: now };
  }

  saveNotes();
  renderNotes();
  closeNoteEditor();
  haptic(25);
});

document.getElementById("delete-note-button").addEventListener("click", () => {
  const editing = noteEditorOverlay.dataset.editing;
  if (editing !== "new") notes.splice(editing, 1);

  saveNotes();
  renderNotes();
  closeNoteEditor();
  haptic(40);
});

pinNoteButton.addEventListener("click", () => {
  const next = pinNoteButton.dataset.pinned !== "true";
  pinNoteButton.dataset.pinned = next ? "true" : "false";
  pinNoteButton.textContent = next ? "unpin" : "pin";
});

/* Toolbar */
document.querySelectorAll(".toolbar-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.command;
    const value = btn.dataset.value || null;

    if (btn.dataset.checklist === "true") {
      document.execCommand("insertUnorderedList");
    } else {
      document.execCommand(cmd, false, value);
    }

    noteEditorContent.focus();
  });
});

/* =========================
   POMODORO
========================= */

function getCustomTime() {
  const h = parseInt(hourInput.value || "0", 10);
  const m = parseInt(minuteInput.value || "0", 10);
  const seconds = h * 3600 + m * 60;
  return seconds > 0 ? seconds : 1500;
}

function updateTimerDisplay() {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  timerDisplay.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateRing() {
  if (!ring) return;
  ring.style.strokeDashoffset = circumference * (1 - remainingSeconds / totalSeconds);
}

function savePomodoroStats() {
  localStorage.setItem("aura-pomodoro-stats", JSON.stringify(pomodoroStats));
}

function renderPomodoroStats() {
  pomodoroStatsSessions.textContent = `sessions: ${pomodoroStats.sessions}`;
  const minutes = Math.round(pomodoroStats.seconds / 60);
  pomodoroStatsTime.textContent = `focused time: ${minutes} min`;
}

document.getElementById("pomodoro-toggle").addEventListener("click", () => {
  const btn = document.getElementById("pomodoro-toggle");

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    btn.textContent = "start";
    return;
  }

  totalSeconds = getCustomTime();
  remainingSeconds = totalSeconds;
  updateTimerDisplay();
  updateRing();

  timerInterval = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateTimerDisplay();
      updateRing();
      clearInterval(timerInterval);
      timerInterval = null;
      btn.textContent = "start";

      pomodoroStats.sessions += 1;
      pomodoroStats.seconds += totalSeconds;
      savePomodoroStats();
      renderPomodoroStats();
      haptic(60);

      return;
    }

    updateTimerDisplay();
    updateRing();
  }, 1000);

  btn.textContent = "pause";
});

document.getElementById("pomodoro-reset").addEventListener("click", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  totalSeconds = getCustomTime();
  remainingSeconds = totalSeconds;
  updateTimerDisplay();
  updateRing();

  document.getElementById("pomodoro-toggle").textContent = "start";
});

/* =========================
   INITIAL RENDER
========================= */

updateTimerDisplay();
updateRing();
renderTodos();
renderDecks();
renderNotes();
renderPomodoroStats();
