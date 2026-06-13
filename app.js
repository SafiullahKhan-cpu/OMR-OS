const STORAGE_KEY = "mcqMasteryOs.v1";
const ANSWERS = ["A", "B", "C", "D", "E"];
const DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);

const sampleQuestions = [
  {
    id: "BIO-GLY-125",
    source: "Lippincott Biochemistry",
    edition: "8th Edition",
    chapter: "Glycolysis",
    page: 32,
    questionNumber: 125,
    correctAnswer: "D",
    explanation: "Phosphofructokinase-1 is the rate-limiting enzyme of glycolysis.",
    difficulty: "Medium",
    tags: ["Biochemistry", "Metabolism", "Glycolysis"],
    imageUrl: "",
    createdAt: ""
  },
  {
    id: "PHY-CVS-042",
    source: "Guyton Physiology",
    edition: "14th Edition",
    chapter: "Cardiac Output",
    page: 244,
    questionNumber: 42,
    correctAnswer: "B",
    explanation: "Venous return is the primary determinant of cardiac output under steady-state conditions.",
    difficulty: "Hard",
    tags: ["Physiology", "CVS", "Cardiac Output"],
    imageUrl: "",
    createdAt: ""
  }
];

const els = {};
let state = loadState();
let activeProfileId = state.activeProfileId;
let validatedImport = null;
let practiceIndex = 0;
let activeQuiz = null;
let quizTimerHandle = null;

window.MCQ_MASTERY_APP_STARTED = true;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  cacheElements();
  bindEvents();
  ensureProfile();
  applyTheme();
  renderAll();
}

function cacheElements() {
  document.querySelectorAll("[id]").forEach((el) => {
    els[el.id] = el;
  });
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  els.profileSelect.addEventListener("change", () => {
    activeProfileId = els.profileSelect.value;
    state.activeProfileId = activeProfileId;
    saveState();
    renderAll();
  });
  els.addProfileBtn.addEventListener("click", addProfile);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.exportProfileBtn.addEventListener("click", exportProfile);
  els.sampleImportBtn.addEventListener("click", () => {
    els.jsonInput.value = JSON.stringify(sampleQuestions, null, 2);
    els.chunkName.value = "Sample Medical Mastery Chunk";
    els.chunkFolder.value = "Samples/Foundation";
  });
  els.questionPromptBtn.addEventListener("click", () => setImportPrompt("questions"));
  els.keyPromptBtn.addEventListener("click", () => setImportPrompt("key"));
  els.copyImportPromptBtn.addEventListener("click", () => copyPrompt(els.importPromptOutput, "Import prompt copied."));
  els.validateImportBtn.addEventListener("click", validateImport);
  els.saveImportBtn.addEventListener("click", saveImport);
  els.jsonFile.addEventListener("change", readJsonFile);
  els.dropZone.addEventListener("dragover", onDragOver);
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("dragover"));
  els.dropZone.addEventListener("drop", onDrop);
  els.globalSearch.addEventListener("input", renderSearchResults);
  els.practiceChunk.addEventListener("change", () => {
    practiceIndex = 0;
    renderPractice();
  });
  els.startQuizBtn.addEventListener("click", startQuiz);
  els.submitQuizBtn.addEventListener("click", submitQuiz);
  els.buildPlanBtn.addEventListener("click", renderStudyPlan);
  els.backupBtn.addEventListener("click", manualBackup);
  els.restoreBtn.addEventListener("click", restoreLatestBackup);
  els.clearLocalBtn.addEventListener("click", clearLocalData);
  els.refreshProgressPromptBtn.addEventListener("click", renderProgressPrompt);
  els.copyProgressPromptBtn.addEventListener("click", () => copyPrompt(els.progressPromptOutput, "Progress prompt copied."));
  els.exportProgressBtn.addEventListener("click", exportProgress);
  els.progressFromDate.addEventListener("change", renderProgressPrompt);
  els.progressToDate.addEventListener("change", renderProgressPrompt);
  els.newFolderBtn.addEventListener("click", addFolder);
  els.googleSignInBtn.addEventListener("click", () => alert("Deploy Code.gs as a web app and connect Google Identity Services here."));
}

function loadState() {
  const fallback = {
    activeProfileId: "guest",
    theme: "light",
    profiles: {
      guest: createProfile("guest", "Guest")
    },
    chunks: [],
    folders: [],
    questions: {},
    backups: []
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createProfile(id, name) {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    attempts: [],
    notes: {},
    bookmarks: {},
    srs: {},
    history: [],
    settings: {}
  };
}

function ensureProfile() {
  if (!state.profiles || !state.profiles[activeProfileId]) {
    state.profiles = { guest: createProfile("guest", "Guest") };
    activeProfileId = "guest";
    state.activeProfileId = "guest";
    saveState();
  }
}

function profile() {
  return state.profiles[activeProfileId];
}

function showView(viewId) {
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  if (viewId === "practice") renderPractice();
  if (viewId === "review") renderReview();
}

function renderAll() {
  renderProfiles();
  renderDashboard();
  renderLibrary();
  renderSearchResults();
  renderPracticeOptions();
  renderPractice();
  renderReview();
  renderHistory();
  renderProgressPrompt();
}

function renderProfiles() {
  els.profileSelect.innerHTML = Object.values(state.profiles)
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
    .join("");
  els.profileSelect.value = activeProfileId;
}

function addProfile() {
  const name = prompt("Profile name");
  if (!name) return;
  const id = `profile-${Date.now()}`;
  state.profiles[id] = createProfile(id, name.trim());
  activeProfileId = id;
  state.activeProfileId = id;
  addHistory("profile.created", name.trim());
  saveState();
  renderAll();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  addHistory("settings.theme", state.theme);
  saveState();
  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle("dark", state.theme === "dark");
}

function readJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    els.jsonInput.value = reader.result;
  };
  reader.readAsText(file);
}

function onDragOver(event) {
  event.preventDefault();
  els.dropZone.classList.add("dragover");
}

function onDrop(event) {
  event.preventDefault();
  els.dropZone.classList.remove("dragover");
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    els.jsonInput.value = reader.result;
  };
  reader.readAsText(file);
}

function setImportPrompt(kind) {
  const rawInput = els.jsonInput.value.trim();
  const sharedSchema = `Return only valid JSON. Use this exact shape:
{
  "questions": [
    {
      "id": "SOURCE-CHAPTER-001",
      "source": "Book or exam source",
      "edition": "",
      "chapter": "Chapter or topic",
      "page": "",
      "questionNumber": "1",
      "correctAnswer": "A",
      "explanation": "Concise explanation in 1-3 sentences.",
      "difficulty": "Easy",
      "tags": ["Subject", "System", "Topic"],
      "imageUrl": ""
    }
  ]
}

Rules:
- Do not include question stems or answer options in the JSON.
- correctAnswer must be one of A, B, C, D, or E.
- Generate concise, high-yield explanations.
- Add useful tags for subject, system, chapter, and tested concept.
- If a field is unknown, use an empty string except difficulty, which must be Easy, Medium, or Hard.
- Keep ids unique and stable.`;

  const questionsPrompt = `I will provide MCQ question stems with options. Create an import-ready answer key for MCQ Mastery OS.

Task:
- Determine the correct answer for each question.
- Write a concise explanation for why the answer is correct.
- Add clinically/usefully searchable tags.
- Preserve source, chapter, page, and question number when present.

${sharedSchema}

Input questions:
${rawInput || "[Paste the questions here]"}`;

  const keyPrompt = `I will provide an answer key, with or without explanations. Convert it into import-ready JSON for MCQ Mastery OS.

Task:
- Use the provided correct answer directly.
- If explanations are missing, write concise high-yield explanations.
- If explanations are present, improve them only for clarity and brevity.
- Add clinically/usefully searchable tags.
- Preserve source, chapter, page, and question number when present.

${sharedSchema}

Input key:
${rawInput || "[Paste the answer key here]"}`;

  els.importPromptOutput.value = kind === "questions" ? questionsPrompt : keyPrompt;
}

function parseImportPayload() {
  const raw = els.jsonInput.value.trim();
  if (!raw) throw new Error("Paste or upload JSON first.");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.questions)) return parsed.questions;
  throw new Error("JSON must be an array or an object with a questions array.");
}

function validateImport() {
  let questions = [];
  const report = { errors: [], warnings: [], valid: [] };
  try {
    questions = parseImportPayload();
  } catch (error) {
    report.errors.push(error.message);
  }

  const seen = new Set();
  questions.forEach((question, index) => {
    const label = question.id || `Row ${index + 1}`;
    const required = ["id", "source", "chapter", "questionNumber", "correctAnswer", "explanation", "tags"];
    required.forEach((field) => {
      if (question[field] === undefined || question[field] === "" || question[field] === null) {
        report.errors.push(`${label}: missing ${field}`);
      }
    });
    if (question.id && (seen.has(question.id) || state.questions[question.id])) {
      report.errors.push(`${label}: duplicate ID`);
    }
    seen.add(question.id);
    if (question.correctAnswer && !ANSWERS.includes(String(question.correctAnswer).toUpperCase())) {
      report.errors.push(`${label}: correctAnswer must be A-E`);
    }
    if (!Array.isArray(question.tags) || !question.tags.length) {
      report.errors.push(`${label}: tags must be a non-empty array`);
    }
    if (question.difficulty && !DIFFICULTIES.has(question.difficulty)) {
      report.errors.push(`${label}: invalid difficulty`);
    }
    if (!String(question.explanation || "").trim()) {
      report.warnings.push(`${label}: empty explanation`);
    }
  });

  if (!questions.length && !report.errors.length) report.errors.push("No questions found.");
  if (!report.errors.length) report.valid.push(`${questions.length} questions ready to import.`);

  validatedImport = report.errors.length ? null : questions.map(normalizeQuestion);
  els.saveImportBtn.disabled = !validatedImport;
  renderImportReport(report);
}

function normalizeQuestion(question) {
  return {
    id: String(question.id).trim(),
    source: String(question.source).trim(),
    edition: question.edition || "",
    chapter: String(question.chapter).trim(),
    page: question.page || "",
    questionNumber: question.questionNumber,
    correctAnswer: String(question.correctAnswer).toUpperCase(),
    explanation: String(question.explanation || "").trim(),
    difficulty: question.difficulty || "Medium",
    tags: question.tags.map((tag) => String(tag).trim()).filter(Boolean),
    imageUrl: question.imageUrl || "",
    createdAt: question.createdAt || new Date().toISOString()
  };
}

function renderImportReport(report) {
  const rows = [
    ...report.valid.map((text) => `<div class="report-item ok">${escapeHtml(text)}</div>`),
    ...report.warnings.map((text) => `<div class="report-item warn">${escapeHtml(text)}</div>`),
    ...report.errors.map((text) => `<div class="report-item bad">${escapeHtml(text)}</div>`)
  ];
  els.importReport.innerHTML = rows.join("") || "";
}

function saveImport() {
  if (!validatedImport) return;
  const chunkId = `chunk-${Date.now()}`;
  const folderPath = els.chunkFolder.value.trim() || "Unfiled";
  const chunk = {
    id: chunkId,
    name: els.chunkName.value.trim() || `Chunk ${state.chunks.length + 1}`,
    description: els.chunkDescription.value.trim(),
    folderPath,
    tags: [...new Set(validatedImport.flatMap((question) => question.tags))],
    source: validatedImport[0]?.source || "",
    version: els.chunkVersion.value.trim() || "1.0.0",
    questionIds: validatedImport.map((question) => question.id),
    archived: false,
    createdAt: new Date().toISOString(),
    versions: []
  };
  validatedImport.forEach((question) => {
    state.questions[question.id] = { ...question, chunkId };
  });
  state.chunks.push(chunk);
  upsertFolderPath(folderPath);
  addHistory("import.chunk", `${chunk.name}: ${validatedImport.length} questions`);
  validatedImport = null;
  els.saveImportBtn.disabled = true;
  els.jsonInput.value = "";
  saveState();
  renderAll();
  showView("library");
}

function upsertFolderPath(path) {
  const parts = path.split("/").map((part) => part.trim()).filter(Boolean);
  let current = "";
  parts.forEach((part) => {
    current = current ? `${current}/${part}` : part;
    if (!state.folders.some((folder) => folder.path === current)) {
      state.folders.push({ id: `folder-${Date.now()}-${current}`, path: current, name: part, icon: "[]", archived: false });
    }
  });
}

function addFolder() {
  const path = prompt("Folder path, for example Biochemistry/Glycolysis");
  if (!path) return;
  upsertFolderPath(path);
  addHistory("folder.created", path);
  saveState();
  renderLibrary();
}

function renderDashboard() {
  const attempts = profile().attempts;
  const solved = attempts.length;
  const correct = attempts.filter((attempt) => attempt.correct).length;
  els.questionsSolved.textContent = solved;
  els.accuracyMetric.textContent = solved ? `${Math.round((correct / solved) * 100)}%` : "0%";
  els.dailyStreak.textContent = calculateStreak();
  els.dueReviews.textContent = getDueReviews().length;
  els.studyHours.textContent = `${Math.round((attempts.reduce((sum, item) => sum + (item.timeSpent || 0), 0) / 3600) * 10) / 10}h study`;
  renderHeatmap();
  renderTopicAnalytics();
  renderKnowledgeGraph();
  renderStudyPlan();
}

function renderHeatmap() {
  const counts = new Map();
  profile().attempts.forEach((attempt) => {
    const day = attempt.createdAt.slice(0, 10);
    counts.set(day, (counts.get(day) || 0) + 1);
  });
  const today = new Date();
  const cells = [];
  for (let i = 181; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const count = counts.get(key) || 0;
    const level = count >= 20 ? 3 : count >= 8 ? 2 : count > 0 ? 1 : 0;
    cells.push(`<span class="heat-cell" data-level="${level}" title="${key}: ${count} attempts"></span>`);
  }
  els.heatmap.innerHTML = cells.join("");
}

function renderTopicAnalytics() {
  const stats = topicStats();
  els.topicAnalytics.innerHTML = stats.length
    ? stats.map((item) => `<div class="topic-row"><strong>${escapeHtml(item.tag)}</strong><span>${item.correct}/${item.total} correct · ${item.accuracy}% accuracy</span></div>`).join("")
    : `<p class="muted">Import and solve questions to build topic analytics.</p>`;
}

function renderKnowledgeGraph() {
  const chapters = {};
  Object.values(state.questions).forEach((question) => {
    const root = question.tags[0] || "General";
    chapters[root] ||= new Set();
    chapters[root].add(question.chapter);
  });
  els.knowledgeGraph.innerHTML = Object.entries(chapters).map(([root, items]) => {
    return `<div class="graph-node"><strong>${escapeHtml(root)}</strong><span>${[...items].map(escapeHtml).join(" · ")}</span></div>`;
  }).join("") || `<p class="muted">No graph nodes yet.</p>`;
}

function renderStudyPlan() {
  const weak = topicStats().filter((item) => item.total >= 1).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  const due = getDueReviews().slice(0, 5);
  const plans = [];
  if (due.length) plans.push(`Review ${due.length} due spaced-repetition questions before new practice.`);
  weak.forEach((item) => plans.push(`Target ${item.tag}: attempt 15 questions and revisit explanations for missed items.`));
  if (!plans.length) plans.push("Import a chunk, solve a short quiz, then this planner will use your weak topics and due reviews.");
  els.studyPlan.innerHTML = plans.map((plan) => `<div class="plan-row">${escapeHtml(plan)}</div>`).join("");
}

function topicStats() {
  const byTag = {};
  profile().attempts.forEach((attempt) => {
    const question = state.questions[attempt.questionId];
    if (!question) return;
    question.tags.forEach((tag) => {
      byTag[tag] ||= { tag, total: 0, correct: 0 };
      byTag[tag].total += 1;
      if (attempt.correct) byTag[tag].correct += 1;
    });
  });
  return Object.values(byTag).map((item) => ({
    ...item,
    accuracy: Math.round((item.correct / item.total) * 100)
  }));
}

function renderLibrary() {
  const chunksByFolder = state.chunks.reduce((acc, chunk) => {
    if (chunk.archived) return acc;
    acc[chunk.folderPath] ||= [];
    acc[chunk.folderPath].push(chunk);
    return acc;
  }, {});
  els.libraryTree.innerHTML = Object.keys(chunksByFolder).length
    ? Object.entries(chunksByFolder).map(([folder, chunks]) => {
      const chunkRows = chunks.map((chunk) => `<div class="question-row"><strong>${escapeHtml(chunk.name)}</strong><span>${chunk.questionIds.length} questions · ${escapeHtml(chunk.source)} · v${escapeHtml(chunk.version)}</span><div class="tag-list">${chunk.tags.map(tagPill).join("")}</div></div>`).join("");
      return `<section class="folder-node"><strong>${escapeHtml(folder)}</strong>${chunkRows}</section>`;
    }).join("")
    : `<p class="muted">No chunks imported yet.</p>`;
}

function renderSearchResults() {
  const query = (els.globalSearch?.value || "").trim().toLowerCase();
  const rows = Object.values(state.questions).filter((question) => matchesQuestion(question, query)).slice(0, 200);
  els.questionResults.innerHTML = rows.length
    ? rows.map(questionRow).join("")
    : `<p class="muted">No matching questions.</p>`;
}

function matchesQuestion(question, query) {
  if (!query) return true;
  const userNote = profile().notes[question.id] || "";
  const bookmark = profile().bookmarks[question.id] ? "bookmarked starred flagged revisit" : "";
  const haystack = [question.id, question.source, question.chapter, question.questionNumber, question.difficulty, question.tags.join(" "), userNote, bookmark, getStatus(question.id)].join(" ").toLowerCase();
  return haystack.includes(query);
}

function questionRow(question) {
  return `<div class="question-row">
    <strong>${escapeHtml(question.id)} · Q${escapeHtml(question.questionNumber)}</strong>
    <span>${escapeHtml(question.source)} · ${escapeHtml(question.chapter)} · ${escapeHtml(question.difficulty)} · ${escapeHtml(getStatus(question.id))}</span>
    <div class="tag-list">${question.tags.map(tagPill).join("")}</div>
  </div>`;
}

function renderPracticeOptions() {
  els.practiceChunk.innerHTML = state.chunks.map((chunk) => `<option value="${escapeHtml(chunk.id)}">${escapeHtml(chunk.name)}</option>`).join("");
}

function renderPractice() {
  const chunk = state.chunks.find((item) => item.id === els.practiceChunk.value) || state.chunks[0];
  if (!chunk) {
    els.practiceCard.innerHTML = `<p class="muted">Import a chunk to start OMR practice.</p>`;
    return;
  }
  els.practiceChunk.value = chunk.id;
  const question = state.questions[chunk.questionIds[practiceIndex % chunk.questionIds.length]];
  els.practiceCard.innerHTML = `
    <div>
      <h3>Question ${escapeHtml(question.questionNumber)}</h3>
      <div class="source-line">
        <span>${escapeHtml(question.source)}</span>
        <span>${escapeHtml(question.chapter)}</span>
        <span>Page ${escapeHtml(question.page || "N/A")}</span>
        <span>${escapeHtml(getStatus(question.id))}</span>
      </div>
    </div>
    <div class="choices">${ANSWERS.map((answer) => `<button class="choice" data-answer="${answer}">${answer}</button>`).join("")}</div>
    <div id="practiceFeedback"></div>
    <div class="notes-box">
      <label>Personal Notes<textarea id="practiceNote">${escapeHtml(profile().notes[question.id] || "")}</textarea></label>
      <div class="actions-row">
        <button id="saveNoteBtn" class="secondary">Save Note</button>
        <button id="bookmarkBtn" class="secondary">${profile().bookmarks[question.id] ? "Remove Bookmark" : "Bookmark"}</button>
        <button id="nextPracticeBtn">Next</button>
      </div>
    </div>`;
  els.practiceCard.querySelectorAll(".choice").forEach((button) => button.addEventListener("click", () => answerPractice(question, button.dataset.answer)));
  els.practiceCard.querySelector("#saveNoteBtn").addEventListener("click", () => saveNote(question.id, els.practiceCard.querySelector("#practiceNote").value));
  els.practiceCard.querySelector("#bookmarkBtn").addEventListener("click", () => toggleBookmark(question.id));
  els.practiceCard.querySelector("#nextPracticeBtn").addEventListener("click", () => {
    practiceIndex += 1;
    renderPractice();
  });
}

function answerPractice(question, answer) {
  const correct = answer === question.correctAnswer;
  recordAttempt(question, answer, correct, 30);
  els.practiceCard.querySelectorAll(".choice").forEach((button) => {
    button.classList.toggle("correct", button.dataset.answer === question.correctAnswer);
    button.classList.toggle("incorrect", button.dataset.answer === answer && !correct);
  });
  els.practiceCard.querySelector("#practiceFeedback").innerHTML = `
    <div class="explanation">
      <strong class="${correct ? "ok" : "bad"}">${correct ? "Correct" : "Incorrect"}</strong>
      <p>Correct Answer: ${escapeHtml(question.correctAnswer)}</p>
      <p>${escapeHtml(question.explanation)}</p>
      ${question.imageUrl ? `<img src="${escapeHtml(question.imageUrl)}" alt="Explanation image">` : ""}
      <p class="muted">Previous attempts: ${profile().attempts.filter((attempt) => attempt.questionId === question.id).length}</p>
    </div>`;
  renderDashboard();
}

function startQuiz() {
  const questions = Object.values(state.questions).filter((question) => {
    return (!els.quizSource.value || question.source.toLowerCase().includes(els.quizSource.value.toLowerCase()))
      && (!els.quizChapter.value || question.chapter.toLowerCase().includes(els.quizChapter.value.toLowerCase()))
      && (!els.quizTag.value || question.tags.some((tag) => tag.toLowerCase().includes(els.quizTag.value.toLowerCase())))
      && (!els.quizDifficulty.value || question.difficulty === els.quizDifficulty.value);
  });
  const pool = els.quizRandom.checked ? shuffle(questions) : questions;
  const selected = pool.slice(0, Number(els.quizCount.value || 10));
  if (!selected.length) {
    alert("No questions match this quiz.");
    return;
  }
  activeQuiz = {
    startedAt: Date.now(),
    endsAt: Number(els.quizMinutes.value) > 0 ? Date.now() + Number(els.quizMinutes.value) * 60000 : null,
    questions: selected,
    answers: {}
  };
  els.submitQuizBtn.disabled = false;
  els.quizResult.classList.add("hidden");
  renderQuizSurface();
  startQuizTimer();
}

function renderQuizSurface() {
  els.quizSurface.innerHTML = activeQuiz.questions.map((question, index) => `
    <article class="quiz-question">
      <strong>Question ${index + 1}</strong>
      <div class="source-line"><span>${escapeHtml(question.source)}</span><span>${escapeHtml(question.chapter)}</span><span>Q${escapeHtml(question.questionNumber)}</span></div>
      <div class="quiz-options">${ANSWERS.map((answer) => `
        <label><input type="radio" name="${escapeHtml(question.id)}" value="${answer}"> ${answer}</label>
      `).join("")}</div>
    </article>`).join("");
  els.quizSurface.querySelectorAll("input[type=radio]").forEach((input) => {
    input.addEventListener("change", () => {
      activeQuiz.answers[input.name] = input.value;
      localStorage.setItem(`${STORAGE_KEY}.activeQuiz`, JSON.stringify(activeQuiz));
    });
  });
}

function startQuizTimer() {
  clearInterval(quizTimerHandle);
  const tick = () => {
    if (!activeQuiz?.endsAt) {
      els.quizTimer.textContent = "Untimed";
      return;
    }
    const remaining = Math.max(0, activeQuiz.endsAt - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    els.quizTimer.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
    if (remaining <= 0) submitQuiz();
  };
  tick();
  quizTimerHandle = setInterval(tick, 1000);
}

function submitQuiz() {
  if (!activeQuiz) return;
  clearInterval(quizTimerHandle);
  const elapsed = Math.max(1, Math.round((Date.now() - activeQuiz.startedAt) / 1000));
  let correct = 0;
  let skipped = 0;
  activeQuiz.questions.forEach((question) => {
    const answer = activeQuiz.answers[question.id] || "";
    if (!answer) skipped += 1;
    const isCorrect = answer === question.correctAnswer;
    if (isCorrect) correct += 1;
    recordAttempt(question, answer, isCorrect, Math.round(elapsed / activeQuiz.questions.length));
  });
  const total = activeQuiz.questions.length;
  const incorrect = total - correct - skipped;
  els.quizResult.classList.remove("hidden");
  els.quizResult.innerHTML = `
    <h2>Result Analytics</h2>
    <div class="metrics-grid">
      <article class="metric"><span>Score</span><strong>${correct}/${total}</strong></article>
      <article class="metric"><span>Percentage</span><strong>${Math.round((correct / total) * 100)}%</strong></article>
      <article class="metric"><span>Incorrect</span><strong>${incorrect}</strong></article>
      <article class="metric"><span>Skipped</span><strong>${skipped}</strong></article>
    </div>
    <p>Average Time Per Question: ${Math.round(elapsed / total)} seconds</p>
    <div class="review-list">${activeQuiz.questions.map((question) => explanationRow(question, activeQuiz.answers[question.id])).join("")}</div>`;
  addHistory("quiz.completed", `${correct}/${total} correct`);
  activeQuiz = null;
  els.submitQuizBtn.disabled = true;
  saveState();
  renderAll();
}

function explanationRow(question, answer) {
  return `<div class="review-row">
    <strong>${escapeHtml(question.id)} · Your answer: ${escapeHtml(answer || "Skipped")} · Correct: ${escapeHtml(question.correctAnswer)}</strong>
    <span>${escapeHtml(question.explanation)}</span>
  </div>`;
}

function recordAttempt(question, answer, correct, timeSpent) {
  profile().attempts.push({
    id: `attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    questionId: question.id,
    answer,
    correct,
    timeSpent,
    createdAt: new Date().toISOString()
  });
  updateSrs(question.id, correct);
  addHistory(correct ? "attempt.correct" : "attempt.incorrect", question.id);
  saveState();
}

function updateSrs(questionId, correct) {
  const item = profile().srs[questionId] || { easeFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString() };
  if (correct) {
    item.repetitions += 1;
    item.interval = item.repetitions === 1 ? 1 : item.repetitions === 2 ? 6 : Math.round(item.interval * item.easeFactor);
    item.easeFactor = Math.max(1.3, item.easeFactor + 0.1);
  } else {
    item.repetitions = 0;
    item.interval = 1;
    item.easeFactor = Math.max(1.3, item.easeFactor - 0.2);
  }
  const next = new Date();
  next.setDate(next.getDate() + item.interval);
  item.nextReviewDate = next.toISOString();
  profile().srs[questionId] = item;
}

function getDueReviews() {
  const now = Date.now();
  return Object.entries(profile().srs)
    .filter(([, item]) => new Date(item.nextReviewDate).getTime() <= now)
    .map(([questionId, item]) => ({ questionId, ...item }));
}

function renderReview() {
  const attempts = profile().attempts;
  const mistakes = {};
  attempts.filter((attempt) => !attempt.correct).forEach((attempt) => {
    const question = state.questions[attempt.questionId];
    if (!question) return;
    mistakes[attempt.questionId] ||= { question, count: 0, lastAttempt: attempt.createdAt };
    mistakes[attempt.questionId].count += 1;
    mistakes[attempt.questionId].lastAttempt = attempt.createdAt;
  });
  els.mistakeDiary.innerHTML = Object.values(mistakes).sort((a, b) => b.count - a.count).map(({ question, count, lastAttempt }) => `
    <div class="review-row"><strong>${escapeHtml(question.id)} · ${count} mistakes</strong><span>${escapeHtml(question.source)} · ${escapeHtml(question.chapter)} · last ${formatDate(lastAttempt)}</span><p>${escapeHtml(question.explanation)}</p></div>
  `).join("") || `<p class="muted">No mistakes recorded.</p>`;
  const due = getDueReviews();
  els.srsQueue.innerHTML = due.map((item) => {
    const question = state.questions[item.questionId];
    return `<div class="review-row"><strong>${escapeHtml(item.questionId)}</strong><span>${escapeHtml(question?.source || "")} · interval ${item.interval}d · ease ${item.easeFactor.toFixed(1)}</span></div>`;
  }).join("") || `<p class="muted">No reviews due today.</p>`;
}

function saveNote(questionId, note) {
  profile().notes[questionId] = note.trim();
  addHistory("note.saved", questionId);
  saveState();
  renderSearchResults();
}

function toggleBookmark(questionId) {
  if (profile().bookmarks[questionId]) delete profile().bookmarks[questionId];
  else profile().bookmarks[questionId] = { createdAt: new Date().toISOString(), kind: "bookmark" };
  addHistory("bookmark.toggled", questionId);
  saveState();
  renderPractice();
}

function getStatus(questionId) {
  const attempts = profile().attempts.filter((attempt) => attempt.questionId === questionId);
  if (!attempts.length) return "Never Seen";
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const accuracy = correct / attempts.length;
  const recentMistake = attempts.slice(-2).some((attempt) => !attempt.correct);
  if (accuracy >= 0.9 && attempts.length >= 3 && !recentMistake) return "Mastered";
  if (accuracy < 0.4 && attempts.length >= 2) return "Critical";
  if (recentMistake) return "Weak";
  if (accuracy >= 0.7) return "Improving";
  return "Learning";
}

function calculateStreak() {
  const days = new Set(profile().attempts.map((attempt) => attempt.createdAt.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderHistory() {
  els.historyList.innerHTML = profile().history.slice().reverse().slice(0, 200).map((item) => `
    <div class="history-row"><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(item.detail)} · ${formatDate(item.createdAt)}</span></div>
  `).join("") || `<p class="muted">No history yet.</p>`;
}

function addHistory(type, detail) {
  profile().history.push({ type, detail: String(detail || ""), createdAt: new Date().toISOString() });
}

function manualBackup() {
  state.backups.push({ id: `backup-${Date.now()}`, createdAt: new Date().toISOString(), data: JSON.stringify(state) });
  addHistory("backup.created", "Manual backup");
  saveState();
  alert("Backup created.");
}

function restoreLatestBackup() {
  const latest = state.backups[state.backups.length - 1];
  if (!latest) {
    alert("No backup found.");
    return;
  }
  state = JSON.parse(latest.data);
  activeProfileId = state.activeProfileId;
  saveState();
  renderAll();
}

function clearLocalData() {
  if (!confirm("Clear all local Guest Mode data?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  activeProfileId = state.activeProfileId;
  renderAll();
}

function getProgressDateRange() {
  const from = els.progressFromDate.value ? new Date(`${els.progressFromDate.value}T00:00:00`) : null;
  const to = els.progressToDate.value ? new Date(`${els.progressToDate.value}T23:59:59`) : null;
  return { from, to };
}

function isWithinProgressRange(value, range) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  if (range.from && time < range.from.getTime()) return false;
  if (range.to && time > range.to.getTime()) return false;
  return true;
}

function buildProgressExportPayload() {
  const range = getProgressDateRange();
  const currentProfile = profile();
  const attempts = currentProfile.attempts.filter((attempt) => isWithinProgressRange(attempt.createdAt, range));
  const history = currentProfile.history.filter((item) => isWithinProgressRange(item.createdAt, range));
  const questionIds = [...new Set(attempts.map((attempt) => attempt.questionId))];
  const questions = questionIds.reduce((acc, id) => {
    const question = state.questions[id];
    if (!question) return acc;
    acc[id] = {
      id: question.id,
      source: question.source,
      chapter: question.chapter,
      questionNumber: question.questionNumber,
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty,
      tags: question.tags,
      status: getStatus(id),
      explanation: question.explanation
    };
    return acc;
  }, {});
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const skipped = attempts.filter((attempt) => !attempt.answer).length;
  const totalTime = attempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: currentProfile.id,
      name: currentProfile.name
    },
    dateRange: {
      from: els.progressFromDate.value || "",
      to: els.progressToDate.value || ""
    },
    summary: {
      attempts: attempts.length,
      correct,
      incorrect: attempts.length - correct - skipped,
      skipped,
      accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
      totalStudySeconds: totalTime,
      averageSecondsPerAttempt: attempts.length ? Math.round(totalTime / attempts.length) : 0,
      dueReviews: getDueReviews().length
    },
    topicStats: topicStatsFromAttempts(attempts),
    attempts,
    history,
    questions
  };
}

function topicStatsFromAttempts(attempts) {
  const byTag = {};
  attempts.forEach((attempt) => {
    const question = state.questions[attempt.questionId];
    if (!question) return;
    question.tags.forEach((tag) => {
      byTag[tag] ||= { tag, total: 0, correct: 0, accuracy: 0 };
      byTag[tag].total += 1;
      if (attempt.correct) byTag[tag].correct += 1;
    });
  });
  return Object.values(byTag)
    .map((item) => ({ ...item, accuracy: Math.round((item.correct / item.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

function buildProgressPrompt() {
  const payload = buildProgressExportPayload();
  return `Analyze this MCQ Mastery OS progress export.

Task:
- Summarize performance for the selected date range.
- Identify strongest and weakest topics.
- Point out repeated mistakes, skipped-question patterns, and slow areas.
- Recommend a focused study plan for the next 7 days.
- Keep the response practical, concise, and exam-oriented.

Progress export JSON:
${JSON.stringify(payload, null, 2)}`;
}

function renderProgressPrompt() {
  if (!els.progressPromptOutput) return;
  els.progressPromptOutput.value = buildProgressPrompt();
}

function exportProgress() {
  const payload = {
    ...buildProgressExportPayload(),
    aiPrompt: buildProgressPrompt()
  };
  downloadJson(payload, `${profile().name.replace(/\W+/g, "-").toLowerCase()}-progress-export.json`);
}

function exportProfile() {
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: profile(),
    analytics: {
      topicStats: topicStats(),
      dueReviews: getDueReviews(),
      questionStatuses: Object.keys(state.questions).reduce((acc, id) => {
        acc[id] = getStatus(id);
        return acc;
      }, {})
    }
  };
  downloadJson(payload, `${profile().name.replace(/\W+/g, "-").toLowerCase()}-mcq-mastery-export.json`);
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function copyPrompt(textarea, message) {
  if (!textarea.value.trim()) return;
  textarea.select();
  const copied = document.execCommand("copy");
  if (copied) alert(message);
  else alert("Select the prompt text and copy it manually.");
}

function tagPill(tag) {
  return `<span class="tag">${escapeHtml(tag)}</span>`;
}

function shuffle(items) {
  return items.map((item) => [Math.random(), item]).sort((a, b) => a[0] - b[0]).map(([, item]) => item);
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
