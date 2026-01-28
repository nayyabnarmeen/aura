function $(id) {
  return document.getElementById(id);
 }
 
 let userName = localStorage.getItem("aura-username") || "";
 let userAge = localStorage.getItem("aura-age") || "";
 let userPurposes = JSON.parse(localStorage.getItem("aura-purposes") || "[]");
 let todos = JSON.parse(localStorage.getItem("aura-todos") || "[]");
 let decks = JSON.parse(localStorage.getItem("aura-decks") || "{}");
 let notes = JSON.parse(localStorage.getItem("aura-notes") || "[]");
 let pomodoroStats = JSON.parse(
  localStorage.getItem("aura-pomodoro-stats") ||
  '{"sessions":0,"seconds":0}'
 );
 
 let currentDeck = null;
 let currentCardIndex = 0;
 let noteSearchQuery = "";
 let timerInterval = null;
 let totalSeconds = 1500;
 let remainingSeconds = 1500;

 const appRoot = $("app-root");
 const notesList = $("notes-list");
 const notesSearchInput = $("notes-search-input");
 const noteEditorOverlay = $("note-editor-overlay");
 const noteEditorTitle = $("note-editor-title-input");
 const noteEditorContent = $("note-editor-content");
 const noteTagsInput = $("note-tags-input");
 const pinNoteButton = $("pin-note-button");
 
 const flashcard = $("flashcard");
 const flashcardFront = $("flashcard-front");
 const flashcardBack = $("flashcard-back");
 const flashcardProgress = $("flashcard-progress");
 
 const flashcardFrontInput = $("flashcard-front-input");
 const flashcardBackInput = $("flashcard-back-input");
 const flashcardModal = $("flashcard-modal");
 
 const timerDisplay = $("pomodoro-time");
 const hourInput = $("timer-hours");
 const minuteInput = $("timer-minutes");
 
 function on(id, event, handler) {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
 }

 function showScreen(name) {
  document.querySelectorAll(".aura-screen").forEach(screen => {
    screen.classList.remove("is-active");
    if (screen.dataset.screen === name) {
      screen.classList.add("is-active");
    }
  });

  document.querySelectorAll(".bottom-nav-item").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.screenTarget === name);
  });
 }
 
 const onboardingScreen = $("onboarding-screen");
 
 on("onboarding-next-1", "click", () => {
  const name = $("onboarding-name-input").value.trim();
  if (!name) return;
 
  userName = name;
  localStorage.setItem("aura-username", userName);
 
  document.querySelector('[data-step="1"]').style.display = "none";
  document.querySelector('[data-step="2"]').style.display = "block";
 });

 on("onboarding-next-2", "click", () => {
  const age = $("onboarding-age-input").value.trim();
  if (!age) return;
 
  userAge = age;
  localStorage.setItem("aura-age", userAge);

  document.querySelector('[data-step="2"]').style.display = "none";
  document.querySelector('[data-step="3"]').style.display = "block";
 });
 
 on("onboarding-finish", "click", () => {
  const selected = [...document.querySelectorAll('input[name="purpose"]:checked')]
  .map(cb => cb.value);
 
  userPurposes = selected;
  localStorage.setItem("aura-purposes", JSON.stringify(userPurposes));
 
  onboardingScreen.style.display = "none";
  appRoot.style.display = "flex";
 
  $("home-greeting").textContent = `hello, ${userName}`;
 });

 document.querySelectorAll(".onboarding-back-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const backStep = btn.dataset.backStep;
    document.querySelectorAll(".onboarding-card").forEach(card => {
      card.style.display = "none";
    });
    document.querySelector(`[data-step="${backStep}"]`).style.display = "block";
  });
 });

 document.querySelectorAll(".bottom-nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.screenTarget;
    if (target) showScreen(target);
  });
 });

 function saveTodos() {
  localStorage.setItem("aura-todos", JSON.stringify(todos));
 }
 
 function renderTodos() {
  const list = $("todo-list");
  list.innerHTML = "";
 
  todos.forEach((todo, index) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.innerHTML = `
      <span>${todo}</span>
      <button class="todo-delete" data-index="${index}">×</button>
    `;
    list.appendChild(li);
  });

  document.querySelectorAll(".todo-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = btn.dataset.index;
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
    });
  });
 }
 
 on("todo-add-button", "click", () => {
  const text = prompt("new task:");
  if (!text) return;
 
  todos.push(text.trim());
  saveTodos();
  renderTodos();
 });

 function saveDecks() {
  localStorage.setItem("aura-decks", JSON.stringify(decks));
 }
 
 function renderDecks() {
  const grid = $("deck-grid");
  grid.innerHTML = "";
 
  const names = Object.keys(decks);
  if (!names.length) {
    grid.innerHTML = `<p class="hint-text">no decks yet. create one to begin.</p>`;
    return;
  }
 
  names.forEach(name => {
    const card = document.createElement("div");
    card.className = "deck-card";
    card.textContent = name;
 
    card.addEventListener("click", () => openDeck(name));
    grid.appendChild(card);
  });
 }
 
 on("add-deck-button", "click", () => {
  const name = prompt("deck name:");
  if (!name) return;
 
  const trimmed = name.trim();
  if (!trimmed) return;
 
  if (decks[trimmed]) {
    alert("a deck with that name already exists.");
    return;
  }
 
  decks[trimmed] = [];
  saveDecks();
  renderDecks();
 });

 function openDeck(name) {
  currentDeck = name;
  currentCardIndex = 0;
 
  $("deck-viewer-title").textContent = name;
 
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
 
  showScreen("flashcard-viewer");
 }
 
 on("back-to-decks", "click", () => {
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
 
 on("flashcard-flip", "click", () => {
  flashcard.classList.toggle("is-flipped");
 });

 on("flashcard-next", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;
 
  currentCardIndex = (currentCardIndex + 1) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
 });

 on("flashcard-prev", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;
 
  currentCardIndex = (currentCardIndex - 1 + deck.length) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
 });

 on("add-card-button", "click", () => {
  $("flashcard-modal-title").textContent = "add card";
 
  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";
 
  flashcardModal.dataset.mode = "add";
  flashcardModal.classList.add("is-visible");
 });

 on("edit-card-button", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;

  $("flashcard-modal-title").textContent = "edit card";
 
  const card = deck[currentCardIndex];
  flashcardFrontInput.value = card.front;
  flashcardBackInput.value = card.back;
 
  flashcardModal.dataset.mode = "edit";
  flashcardModal.classList.add("is-visible");
 });

 on("flashcard-modal-save", "click", () => {
  const front = flashcardFrontInput.value.trim();
  const back = flashcardBackInput.value.trim();
 
  if (!front || !back) return;
 
  const deck = decks[currentDeck];
 
  if (flashcardModal.dataset.mode === "add") {
    deck.push({ front, back });
  } else {
    deck[currentCardIndex] = { front, back };
  }
 
  saveDecks();
  flashcardModal.classList.remove("is-visible");
 
  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";
 
  renderFlashcard();
 });

 on("flashcard-modal-cancel", "click", () => {
  flashcardModal.classList.remove("is-visible");
 });
 
 on("delete-card-button", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;
 
  deck.splice(currentCardIndex, 1);
  currentCardIndex = 0;
 
  saveDecks();
  renderFlashcard();
 });

 on("rename-deck-button", "click", () => {
  const newName = prompt("new deck name:");
  if (!newName) return;
 
  const trimmed = newName.trim();
  if (!trimmed) return;
 
  if (decks[trimmed]) {
    alert("a deck with that name already exists.");
    return;
  }
 
  decks[trimmed] = decks[currentDeck];
  delete decks[currentDeck];
 
  currentDeck = trimmed;
 
  saveDecks();
  renderDecks();
 
  $("deck-viewer-title").textContent = trimmed;
 });

 on("delete-deck-button", "click", () => {
  if (!confirm("delete this deck?")) return;
 
  delete decks[currentDeck];
  saveDecks();
  renderDecks();
 
  showScreen("flashcards");
 });
 
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
    card.className = "glass-card note-card";
 
    const preview = n.content.replace(/<[^>]*>/g, "").slice(0, 80);
 
    card.innerHTML = `
      <h3>${n.title || "untitled"}</h3>
      <p>${preview}${preview.length === 80 ? "..." : ""}</p>
      ${n.tags ? `<p class="hint-text">${n.tags}</p>` : ""}
    `;
 
    card.addEventListener("click", () => openNoteEditor(n.index));
    notesList.appendChild(card);
  });
 }

 function openNoteEditor(index = null) {
  noteEditorOverlay.classList.add("is-visible");
  noteEditorOverlay.style.display = "flex";

  if (index === null) {
    noteEditorOverlay.dataset.editing = "new";
    noteEditorTitle.value = "";
    noteEditorContent.innerHTML = "";
    noteTagsInput.value = "";
    pinNoteButton.dataset.pinned = "false";
    pinNoteButton.textContent = "pin";
  } else {
    const note = notes[index];
    noteEditorOverlay.dataset.editing = index;
 
    noteEditorTitle.value = note.title;
    noteEditorContent.innerHTML = note.content;
    noteTagsInput.value = note.tags;
 
    pinNoteButton.dataset.pinned = note.pinned ? "true" : "false";
    pinNoteButton.textContent = note.pinned ? "unpin" : "pin";
  }
 }
 
 on("add-note-button", "click", () => {
  openNoteEditor(null);
 });

 on("quick-note-button", "click", () => {
  openNoteEditor(null);
 });
 
 on("close-note-editor", "click", () => {
  noteEditorOverlay.classList.remove("is-visible");
  noteEditorOverlay.style.display = "none";
 });

 on("save-note-button", "click", () => {
  const title = noteEditorTitle.value.trim();
  const content = noteEditorContent.innerHTML.trim();
  const tags = noteTagsInput.value.trim();
  const pinned = pinNoteButton.dataset.pinned === "true";
 
  if (!content && !title) {
    alert("note is empty.");
    return;
  }
 
  const editing = noteEditorOverlay.dataset.editing;
 
  if (editing === "new") {
    notes.push({
      title,
      content,
      tags,
      pinned,
      updatedAt: Date.now()
    });
  } else {
    const index = Number(editing);
    notes[index] = {
      ...notes[index],
      title,
      content,
      tags,
      pinned,
      updatedAt: Date.now()
    };
  }
 
  saveNotes();
  renderNotes();
 
  noteEditorOverlay.classList.remove("is-visible");
  noteEditorOverlay.style.display = "none";
 });

 on("delete-note-button", "click", () => {
  const editing = noteEditorOverlay.dataset.editing;
  if (editing === "new") {
    noteEditorOverlay.classList.remove("is-visible");
    noteEditorOverlay.style.display = "none";
    return;
  }
 
  const index = Number(editing);
  notes.splice(index, 1);
 
  saveNotes();
  renderNotes();
 
  noteEditorOverlay.classList.remove("is-visible");
  noteEditorOverlay.style.display = "none";
 });

 on("pin-note-button", "click", () => {
  const pinned = pinNoteButton.dataset.pinned === "true";
  pinNoteButton.dataset.pinned = pinned ? "false" : "true";
  pinNoteButton.textContent = pinned ? "pin" : "unpin";
 });

 notesSearchInput.addEventListener("input", () => {
  noteSearchQuery = notesSearchInput.value.trim();
  renderNotes();
 });

 document.querySelectorAll(".toolbar-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const command = btn.dataset.command;
    const value = btn.dataset.value || null;
 
    if (btn.dataset.checklist) {
      document.execCommand("insertUnorderedList");
      return;
    }
 
    document.execCommand(command, false, value);
  });
 });

 
 on("settings-theme-toggle", "click", () => {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  localStorage.setItem("aura-theme", next);
 });

 on("settings-change-name", "click", () => {
  const newName = prompt("What should I call you instead?", userName);
  
  if (newName && newName.trim() !== "") {
    userName = newName.trim();
    localStorage.setItem("aura-username", userName);
    
    const greeting = $("home-greeting");
    if (greeting) {
      greeting.textContent = `hello, ${userName}`;
    }
  }
 });

 function savePomodoroStats() {
  localStorage.setItem("aura-pomodoro-stats", JSON.stringify(pomodoroStats));
 }
 
 function renderPomodoroStats() {
  $("pomodoro-stats-sessions").textContent = `sessions: ${pomodoroStats.sessions}`;
  $("pomodoro-stats-time").textContent = `focused time: ${Math.floor(pomodoroStats.seconds / 60)} min`;
 }
 
 const ring = document.querySelector(".timer-ring-progress");
 const radius = 90;
 const circumference = 2 * Math.PI * radius;
 ring.style.strokeDasharray = circumference;
 ring.style.strokeDashoffset = 0;
 
 function updateRing() {
  if (totalSeconds <= 0) {
    ring.style.strokeDashoffset = 0;
    return;
  }
  const progress = remainingSeconds / totalSeconds;
  const offset = circumference * (1 - progress);
  ring.style.strokeDashoffset = offset;
 }

 function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
 }

 on("pomodoro-toggle", "click", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    $("pomodoro-toggle").textContent = "start";
    return;
  }
  if (remainingSeconds === totalSeconds) {
    const hours = Number(hourInput.value) || 0;
    const minutes = Number(minuteInput.value) || 0;
    totalSeconds = hours * 3600 + minutes * 60;
    remainingSeconds = totalSeconds;
    if (totalSeconds <= 0) {
      alert("set a valid time.");
      return;
    }
    timerDisplay.textContent = formatTime(remainingSeconds);
    updateRing();
  }
  timerInterval = setInterval(() => {
    remainingSeconds--;
    timerDisplay.textContent = formatTime(remainingSeconds);
    updateRing();
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      pomodoroStats.sessions++;
      pomodoroStats.seconds += totalSeconds;
      savePomodoroStats();
      renderPomodoroStats();
      $("pomodoro-toggle").textContent = "start";
      remainingSeconds = totalSeconds;
      updateRing();
    }
  }, 1000);
 });

 on("pomodoro-reset", "click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  const hours = Number(hourInput.value) || 0;
  const minutes = Number(minuteInput.value) || 0;
  totalSeconds = hours * 3600 + minutes * 60;
  remainingSeconds = totalSeconds;
  timerDisplay.textContent = formatTime(remainingSeconds);
  updateRing();
  $("pomodoro-toggle").textContent = "start";
 });

 function init() {
  renderTodos();
  renderDecks();
  renderNotes();
  renderPomodoroStats();

  const savedTheme = localStorage.getItem("aura-theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  if (userName) {
    onboardingScreen.style.display = "none";
    appRoot.style.display = "flex";
    $("home-greeting").textContent = `hello, ${userName}`;
  } else {
    onboardingScreen.style.display = "block";
    appRoot.style.display = "none";
    document.querySelector('[data-step="1"]').style.display = "block";
    document.querySelector('[data-step="2"]').style.display = "none";
    document.querySelector('[data-step="3"]').style.display = "none";
  }

  timerDisplay.textContent = formatTime(remainingSeconds);
  updateRing();
 }

 init();