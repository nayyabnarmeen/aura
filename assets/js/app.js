/* =========================
   SUPABASE CLIENT
========================= */

// replace with your real values from Supabase
const SUPABASE_URL = "https://hzybqwfqodfgpggluyur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6eWJxd2Zxb2RmZ3BnZ2x1eXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTIzNjksImV4cCI6MjA4NDkyODM2OX0.1YapJ-rRTblIt_XDCy2i7aZEtMTYtc3lDoR1g9J1mAc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   STATE
========================= */

let user = null;

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

let pomodoroStats = JSON.parse(localStorage.getItem("aura-pomodoro-stats") || '{"sessions":0,"seconds":0}');

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

const loginScreen = document.getElementById("login-screen");
const loginEmailInput = document.getElementById("login-email");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

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

let flashcardModalMode = "add"; // "add" or "edit"

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
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

/* =========================
   AUTH (MAGIC LINKS)
========================= */

loginButton?.addEventListener("click", async () => {
  const email = (loginEmailInput.value || "").trim();
  if (!email) {
    loginMessage.textContent = "enter an email first.";
    return;
  }

  loginMessage.textContent = "sending magic link...";
  const { error } = await supabaseClient.auth.signInWithOtp({ email });

  if (error) {
    loginMessage.textContent = "something went wrong. try again.";
  } else {
    loginMessage.textContent = "magic link sent. check your email.";
  }
});

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    user = session.user;
    loginScreen.style.display = "none";
    appRoot.style.display = "flex";

    const greet = document.getElementById("home-greeting");
    if (greet && userName) greet.textContent = `hello, ${userName}`;

    if (!userName || !userAge || !userPurpose.length) {
      onboardingScreen.style.display = "flex";
      goToOnboardingStep(1);
    }

    renderTodos();
    renderDecks();
    renderNotes();
    renderPomodoroStats();
  } else {
    user = null;
    appRoot.style.display = "none";
    loginScreen.style.display = "flex";
  }
});

(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session && data.session.user) {
    user = data.session.user;
    loginScreen.style.display = "none";
    appRoot.style.display = "flex";

    const greet = document.getElementById("home-greeting");
    if (greet && userName) greet.textContent = `hello, ${userName}`;

    if (!userName || !userAge || !userPurpose.length) {
      onboardingScreen.style.display = "flex";
      goToOnboardingStep(1);
    }

    renderTodos();
    renderDecks();
    renderNotes();
    renderPomodoroStats();
  } else {
    loginScreen.style.display = "flex";
    appRoot.style.display = "none";
  }
})();

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
  const greet = document.getElementById("home-greeting");
  if (greet) greet.textContent = `hello, ${userName}`;
}

/* Step 1 */
document.getElementById("onboarding-next-1")?.addEventListener("click", () => {
  const nameInput = document.getElementById("onboarding-name-input");
  const name = (nameInput?.value || "").trim();
  if (!name) return;

  userName = name;
  localStorage.setItem("aura-name", userName);
  goToOnboardingStep(2);
});

/* Step 2 */
document.getElementById("onboarding-next-2")?.addEventListener("click", () => {
  const ageInput = document.getElementById("onboarding-age-input");
  const ageValue = (ageInput?.value || "").trim();
  if (!ageValue) return;

  userAge = ageValue;
  localStorage.setItem("aura-age", userAge);
  goToOnboardingStep(3);
});

/* Step 3 */
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
  const current = root.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
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
   TODO LIST (local)
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
    li.dataset.index = index;
    li.innerHTML = `
      <span>${item}</span>
      <button class="ghost-button small">x</button>
    `;

    li.querySelector("button").addEventListener("click", () => {
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
      haptic(30);
    });

    addSwipeToDelete(li, index);

    list.appendChild(li);
  });
}

document.getElementById("todo-add-button")?.addEventListener("click", () => {
  const text = prompt("new task:");
  if (!text) return;
  todos.push(text.trim());
  saveTodos();
  renderTodos();
  haptic(20);
});

/* Swipe to delete for todos */
function addSwipeToDelete(element, index) {
  let startX = 0;
  let currentX = 0;
  let swiping = false;

  element.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    swiping = true;
  });

  element.addEventListener("touchmove", e => {
    if (!swiping) return;
    currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    if (deltaX < 0) {
      element.style.transform = `translateX(${deltaX}px)`;
    }
  });

  element.addEventListener("touchend", () => {
    if (!swiping) return;
    swiping = false;
    const deltaX = currentX - startX;
    if (deltaX < -80) {
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
      haptic(40);
    } else {
      element.style.transform = "translateX(0)";
    }
  });
}

/* =========================
   FLASHCARDS (local)
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
    empty.style.color = "#666";
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

function openDeck(name) {
  currentDeck = name;
  currentCardIndex = 0;

  document.getElementById("deck-viewer-title").textContent = name;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();

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
  haptic(20);
});

document.getElementById("flashcard-next")?.addEventListener("click", () => {
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;
  currentCardIndex = (currentCardIndex + 1) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
  haptic(15);
});

document.getElementById("flashcard-prev")?.addEventListener("click", () => {
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;
  currentCardIndex = (currentCardIndex - 1 + deck.length) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
  haptic(15);
});

/* Swipe gestures for flashcard */
if (flashcard) {
  let startX = 0;
  let endX = 0;

  flashcard.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  flashcard.addEventListener("touchend", e => {
    endX = e.changedTouches[0].clientX;
    const deltaX = endX - startX;
    if (deltaX > 60) {
      document.getElementById("flashcard-prev").click();
    } else if (deltaX < -60) {
      document.getElementById("flashcard-next").click();
    } else {
      document.getElementById("flashcard-flip").click();
    }
  });
}

/* Deck CRUD */
document.getElementById("add-deck-button")?.addEventListener("click", () => {
  const name = prompt("deck name:");
  if (!name) return;
  if (decks[name]) return alert("deck already exists.");

  decks[name] = [];
  saveDecks();
  renderDecks();
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

/* Card modal */
function openFlashcardModal(mode) {
  flashcardModalMode = mode;
  flashcardModal.classList.add("is-visible");
}

function closeFlashcardModal() {
  flashcardModal.classList.remove("is-visible");
  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";
}

document.getElementById("add-card-button")?.addEventListener("click", () => {
  if (!currentDeck) return;
  flashcardModalTitle.textContent = "add card";
  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";
  openFlashcardModal("add");
});

document.getElementById("edit-card-button")?.addEventListener("click", () => {
  if (!currentDeck) return;
  const deck = decks[currentDeck];
  if (!deck || !deck.length) return;

  const card = deck[currentCardIndex];
  flashcardModalTitle.textContent = "edit card";
  flashcardFrontInput.value = card.front;
  flashcardBackInput.value = card.back;
  openFlashcardModal("edit");
});

flashcardModalCancel?.addEventListener("click", () => {
  closeFlashcardModal();
});

flashcardModalSave?.addEventListener("click", () => {
  const front = flashcardFrontInput.value.trim();
  const back = flashcardBackInput.value.trim();
  if (!front || !back) return;

  if (!currentDeck) return;
  const deck = decks[currentDeck] || [];

  if (flashcardModalMode === "add") {
    deck.push({ front, back });
    decks[currentDeck] = deck;
    currentCardIndex = deck.length - 1;
  } else {
    if (!deck.length) return;
    deck[currentCardIndex] = { front, back };
  }

  saveDecks();
  renderFlashcard();
  closeFlashcardModal();
  haptic(25);
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

/* =========================
   NOTES (local)
========================= */

function saveNotes() {
  localStorage.setItem("aura-notes", JSON.stringify(notes));
}

function renderNotes() {
  if (!notesList) return;
  notesList.innerHTML = "";

  const filtered = notes
    .map((note, index) => ({ ...note, index }))
    .filter(n => {
      if (!noteSearchQuery) return true;
      const q = noteSearchQuery.toLowerCase();
      return (
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q) ||
        (n.tags || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  filtered.forEach(n => {
    const note = n;
    const card = document.createElement("div");
    card.className = "glass-card";

    const plain = (note.content || "").replace(/<[^>]*>/g, "");
    const preview = plain.slice(0, 80);

    card.innerHTML = `
      <div class="note-card-header">
        <h3>${note.title || "untitled"}</h3>
        ${note.pinned ? '<span class="note-pin">pinned</span>' : ""}
      </div>
      <p>${preview}${plain.length > 80 ? "..." : ""}</p>
      ${note.tags ? `<p class="hint-text">${note.tags}</p>` : ""}
    `;

    card.addEventListener("click", () => openNoteEditor(note.index));
    notesList.appendChild(card);
  });
}

notesSearchInput?.addEventListener("input", e => {
  noteSearchQuery = e.target.value || "";
  renderNotes();
});

/* Full-screen editor */
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
    noteEditorTitle.value = note.title || "";
    noteEditorContent.innerHTML = note.content || "";
    noteTagsInput.value = note.tags || "";
    noteEditorOverlay.dataset.editing = index;
    const pinned = !!note.pinned;
    pinNoteButton.dataset.pinned = pinned ? "true" : "false";
    pinNoteButton.textContent = pinned ? "unpin" : "pin";
  }
}

document.getElementById("add-note-button")?.addEventListener("click", () => {
  openNoteEditor(null);
});

document.getElementById("quick-note-button")?.addEventListener("click", () => {
  openNoteEditor(null);
});

function closeNoteEditor() {
  noteEditorOverlay.classList.remove("is-visible");
  appRoot.style.display = "flex";
}

document.getElementById("close-note-editor")?.addEventListener("click", () => {
  closeNoteEditor();
});

/* Swipe down to close editor */
let noteStartY = 0;
noteEditorOverlay.addEventListener("touchstart", e => {
  noteStartY = e.touches[0].clientY;
});

noteEditorOverlay.addEventListener("touchend", e => {
  const endY = e.changedTouches[0].clientY;
  const deltaY = endY - noteStartY;
  if (deltaY > 80) {
    closeNoteEditor();
  }
});

document.getElementById("save-note-button")?.addEventListener("click", () => {
  const title = noteEditorTitle.value.trim();
  const content = noteEditorContent.innerHTML.trim();
  const tags = noteTagsInput.value.trim();
  const pinned = pinNoteButton.dataset.pinned === "true";
  if (!content && !title) return;

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

document.getElementById("delete-note-button")?.addEventListener("click", () => {
  const editing = noteEditorOverlay.dataset.editing;
  if (editing === "new") {
    closeNoteEditor();
    return;
  }

  notes.splice(editing, 1);
  saveNotes();
  renderNotes();
  closeNoteEditor();
  haptic(40);
});

pinNoteButton?.addEventListener("click", () => {
  const current = pinNoteButton.dataset.pinned === "true";
  const next = !current;
  pinNoteButton.dataset.pinned = next ? "true" : "false";
  pinNoteButton.textContent = next ? "unpin" : "pin";
});

/* Toolbar */
document.querySelectorAll(".toolbar-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.command;
    const value = btn.dataset.value || null;

    if (btn.dataset.checklist === "true") {
      document.execCommand("insertUnorderedList", false, null);
    } else {
      document.execCommand(cmd, false, value);
    }

    noteEditorContent.focus();
  });
});

/* =========================
   POMODORO + STATS
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

function savePomodoroStats() {
  localStorage.setItem("aura-pomodoro-stats", JSON.stringify(pomodoroStats));
}

function renderPomodoroStats() {
  if (!pomodoroStatsSessions || !pomodoroStatsTime) return;
  pomodoroStatsSessions.textContent = `sessions: ${pomodoroStats.sessions}`;
  const minutes = Math.round(pomodoroStats.seconds / 60);
  pomodoroStatsTime.textContent = `focused time: ${minutes} min`;
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

updateTimerDisplay();
updateRing();
renderPomodoroStats();
renderTodos();
renderDecks();
renderNotes();
