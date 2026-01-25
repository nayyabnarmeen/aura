/* =========================
   GLOBAL STATE
========================= */

let userName = localStorage.getItem("aura-name") || "";
let userAge = localStorage.getItem("aura-age") || "";
let userPurpose = JSON.parse(localStorage.getItem("aura-purpose") || "[]");

let decks = JSON.parse(localStorage.getItem("aura-decks") || "{}");
let notes = JSON.parse(localStorage.getItem("aura-notes") || "[]");
let todos = JSON.parse(localStorage.getItem("aura-todos") || "[]");

let currentDeck = null;
let currentCardIndex = 0;

let timerInterval = null;
let totalSeconds = 1500;
let remainingSeconds = totalSeconds;

/* Timer ring */

const ring = document.querySelector(".timer-ring-progress");
const radius = 100;
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

const notesList = document.getElementById("notes-list");
const noteEditorOverlay = document.getElementById("note-editor-overlay");
const noteEditorContent = document.getElementById("note-editor-content");
const noteEditorTitle = document.getElementById("note-editor-title-input");

const timerDisplay = document.getElementById("pomodoro-time");
const hourInput = document.getElementById("timer-hours");
const minuteInput = document.getElementById("timer-minutes");

/* =========================
   ONBOARDING
========================= */

let onboardingStep = 1;

function goToOnboardingStep(step) {
  onboardingStep = step;
  const offset = (step - 1) * -100;
  onboardingStepsContainer.style.transform = `translateX(${offset}vw)`;

  onboardingCards.forEach(card => {
    const s = parseInt(card.dataset.step, 10);
    card.classList.toggle("is-active", s === step);
  });
}

function finishOnboarding() {
  onboardingScreen.style.display = "none";
  appRoot.style.display = "flex";

  const greet = document.getElementById("home-greeting");
  if (greet) greet.textContent = `hello, ${userName}`;
}

/* Initial onboarding state */

if (!userName || !userAge || !userPurpose.length) {
  onboardingScreen.style.display = "flex";
  appRoot.style.display = "none";
  goToOnboardingStep(1);
} else {
  onboardingScreen.style.display = "flex";
  appRoot.style.display = "flex";
  onboardingScreen.style.display = "none";
  const greet = document.getElementById("home-greeting");
  if (greet) greet.textContent = `hello, ${userName}`;
}

/* Step 1: name */

document.getElementById("onboarding-next-1")?.addEventListener("click", () => {
  const nameInput = document.getElementById("onboarding-name-input");
  const name = (nameInput?.value || "").trim();
  if (!name) return;

  userName = name;
  localStorage.setItem("aura-name", userName);
  goToOnboardingStep(2);
});

/* Step 2: age */

document.getElementById("onboarding-next-2")?.addEventListener("click", () => {
  const ageInput = document.getElementById("onboarding-age-input");
  const ageValue = (ageInput?.value || "").trim();
  if (!ageValue) return;

  userAge = ageValue;
  localStorage.setItem("aura-age", userAge);
  goToOnboardingStep(3);
});

/* Step 3: purpose */

document.getElementById("onboarding-finish")?.addEventListener("click", () => {
  const checks = document.querySelectorAll('input[name="purpose"]:checked');
  const selected = Array.from(checks).map(c => c.value);
  if (!selected.length) return;

  userPurpose = selected;
  localStorage.setItem("aura-purpose", JSON.stringify(userPurpose));
  finishOnboarding();
});

/* =========================
   SETTINGS
========================= */

document.getElementById("settings-change-name")?.addEventListener("click", () => {
  const newName = prompt("enter your new name:", userName || "");
  if (!newName) return;

  userName = newName.trim();
  localStorage.setItem("aura-name", userName);

  const greet = document.getElementById("home-greeting");
  if (greet) greet.textContent = `hello, ${userName}`;
});

document.getElementById("settings-theme-toggle")?.addEventListener("click", () => {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("aura-theme", next);
});

const savedTheme = localStorage.getItem("aura-theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

/* =========================
   NAVIGATION
========================= */

function showScreen(name) {
  screens.forEach(s => s.classList.remove("is-active"));
  document.querySelector(`[data-screen="${name}"]`)?.classList.add("is-active");
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.screenTarget;

    navButtons.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    showScreen(target);
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
  if (!list) return;

  list.innerHTML = "";
  todos.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.innerHTML = `
      <span>${item}</span>
      <button class="ghost-button small" data-index="${index}">x</button>
    `;

    li.querySelector("button").addEventListener("click", () => {
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
    });

    list.appendChild(li);
  });
}

renderTodos();

document.getElementById("todo-add-button")?.addEventListener("click", () => {
  const text = prompt("new task:");
  if (!text) return;
  todos.push(text.trim());
  saveTodos();
  renderTodos();
});

/* =========================
   FLASHCARDS
========================= */

function saveDecks() {
  localStorage.setItem("aura-decks", JSON.stringify(decks));
}

function renderDecks() {
  if (!deckGrid) return;
  deckGrid.innerHTML = "";

  const names = Object.keys(decks);
  if (!names.length) {
    const empty = document.createElement("p");
    empty.textContent = "no decks yet. create one to get started.";
    empty.style.fontSize = "13px";
    empty.style.color = "#c7c7d9";
    deckGrid.appendChild(empty);
    return;
  }

  names.forEach(deckName => {
    const card = document.createElement("div");
    card.className = "deck-card";
    card.innerHTML = `<div>${deckName}</div>`;

    card.addEventListener("click", () => openDeck(deckName));

    deckGrid.appendChild(card);
  });
}

renderDecks();

function openDeck(name) {
  currentDeck = name;
  currentCardIndex = 0;

  document.getElementById("deck-viewer-title").textContent = name;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();

  // switch to flashcard viewer screen
  showScreen("flashcard-viewer");
  navButtons.forEach(b => b.classList.remove("is-active"));
  document
    .querySelector('.bottom-nav-item[data-screen-target="flashcards"]')
    ?.classList.add("is-active");
}

document.getElementById("back-to-decks")?.addEventListener("click", () => {
  showScreen("flashcards");
});

function renderFlashcard() {
  const deck = decks[currentDeck];
  if (!deck || deck.length === 0) {
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

document.getElementById("flashcard-flip")?.addEventListener("click", () => {
  flashcard.classList.toggle("is-flipped");
});

document.getElementById("flashcard-next")?.addEventListener("click", () => {
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;
  currentCardIndex = (currentCardIndex + 1) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
});

document.getElementById("flashcard-prev")?.addEventListener("click", () => {
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;
  currentCardIndex = (currentCardIndex - 1 + deck.length) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
});

document.getElementById("add-card-button")?.addEventListener("click", () => {
  if (!currentDeck) return;
  const front = prompt("front:");
  const back = prompt("back:");
  if (!front || !back) return;

  decks[currentDeck].push({ front, back });
  saveDecks();
  renderFlashcard();
});

document.getElementById("edit-card-button")?.addEventListener("click", () => {
  if (!currentDeck) return;
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;

  const card = deck[currentCardIndex];
  const newFront = prompt("edit front:", card.front);
  const newBack = prompt("edit back:", card.back);
  if (!newFront || !newBack) return;

  card.front = newFront;
  card.back = newBack;
  saveDecks();
  renderFlashcard();
});

document.getElementById("delete-card-button")?.addEventListener("click", () => {
  if (!currentDeck) return;
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;

  deck.splice(currentCardIndex, 1);
  if (currentCardIndex >= deck.length) currentCardIndex = 0;
  saveDecks();
  renderFlashcard();
});

document.getElementById("rename-deck-button")?.addEventListener("click", () => {
  if (!currentDeck) return;
  const newName = prompt("rename deck:", currentDeck);
  if (!newName || newName === currentDeck) return;

  decks[newName] = decks[currentDeck];
  delete decks[currentDeck];
  currentDeck = newName;

  saveDecks();
  renderDecks();
  document.getElementById("deck-viewer-title").textContent = newName;
});

document.getElementById("delete-deck-button")?.addEventListener("click", () => {
  if (!currentDeck) return;
  if (!confirm(`delete deck "${currentDeck}"?`)) return;

  delete decks[currentDeck];
  saveDecks();
  renderDecks();
  showScreen("flashcards");
});

document.getElementById("add-deck-button")?.addEventListener("click", () => {
  const name = prompt("deck name:");
  if (!name) return;
  if (decks[name]) return alert("deck already exists.");

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
  if (!notesList) return;
  notesList.innerHTML = "";

  notes.forEach((note, index) => {
    const card = document.createElement("div");
    card.className = "glass-card";
    card.innerHTML = `
      <h3>${note.title || "untitled"}</h3>
      <p>${(note.content || "").replace(/<[^>]*>/g, "").slice(0, 80)}...</p>
    `;
    card.addEventListener("click", () => openNoteEditor(index));
    notesList.appendChild(card);
  });
}

renderNotes();

function openNoteEditor(index = null) {
  noteEditorOverlay.classList.add("is-visible");

  if (index === null) {
    noteEditorTitle.value = "";
    noteEditorContent.innerHTML = "";
    noteEditorOverlay.dataset.editing = "new";
  } else {
    const note = notes[index];
    noteEditorTitle.value = note.title;
    noteEditorContent.innerHTML = note.content;
    noteEditorOverlay.dataset.editing = index;
  }
}

document.getElementById("add-note-button")?.addEventListener("click", () => {
  openNoteEditor(null);
});

document.getElementById("close-note-editor")?.addEventListener("click", () => {
  noteEditorOverlay.classList.remove("is-visible");
});

document.getElementById("save-note-button")?.addEventListener("click", () => {
  const title = noteEditorTitle.value.trim();
  const content = noteEditorContent.innerHTML.trim();
  if (!content) return;

  const editing = noteEditorOverlay.dataset.editing;
  if (editing === "new") {
    notes.push({ title, content });
  } else {
    notes[editing] = { title, content };
  }

  saveNotes();
  renderNotes();
  noteEditorOverlay.classList.remove("is-visible");
});

document.getElementById("delete-note-button")?.addEventListener("click", () => {
  const editing = noteEditorOverlay.dataset.editing;
  if (editing === "new") return;

  notes.splice(editing, 1);
  saveNotes();
  renderNotes();
  noteEditorOverlay.classList.remove("is-visible");
});

/* Simple toolbar */

document.querySelectorAll(".toolbar-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.command;
    document.execCommand(cmd, false, null);
    noteEditorContent.focus();
  });
});

/* =========================
   TIMER
========================= */

function getCustomTime() {
  const h = parseInt(hourInput?.value || "0", 10) || 0;
  const m = parseInt(minuteInput?.value || "0", 10) || 0;
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
  const percent = remainingSeconds / totalSeconds;
  ring.style.strokeDashoffset = circumference * (1 - percent);
}

document.getElementById("pomodoro-toggle")?.addEventListener("click", () => {
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
      return;
    }
    updateTimerDisplay();
    updateRing();
  }, 1000);

  btn.textContent = "pause";
});

document.getElementById("pomodoro-reset")?.addEventListener("click", () => {
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

/* Initial timer display */

updateTimerDisplay();
updateRing();
