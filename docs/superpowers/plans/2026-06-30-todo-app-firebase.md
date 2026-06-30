# Todo App (HTML/CSS/JS + Firebase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user todo web app in vanilla HTML/CSS/JS that stores todos in Firebase Firestore with real-time sync, due dates, categories, filtering, and a light/dark theme toggle.

**Architecture:** No build tools. ES modules load the Firebase modular SDK (v12.15.0) from the gstatic CDN. The UI subscribes to the `todos` Firestore collection via `onSnapshot` — Firestore is the single source of truth and the DOM re-renders on every change. Pure list logic (filter/sort/overdue) lives in its own module so it can be unit-tested in the browser; everything else (DOM, Firestore I/O) lives in `app.js`.

**Tech Stack:** HTML5, CSS (custom properties for theming), vanilla ES-module JavaScript, Firebase Firestore (modular SDK v12.15.0 via CDN). Served over a local static server (`npx serve`) or Firebase Hosting — never `file://` (ES-module CORS).

## Global Constraints

- Firebase modular SDK version: **12.15.0**, imported from `https://www.gstatic.com/firebasejs/12.15.0/...` (exact, matches user's existing setup).
- Firebase project: **sw-todo-backend** (config provided by user).
- No npm dependencies, no bundler, no framework. Plain `.html` / `.css` / `.js`.
- Must run over a local HTTP server, not `file://`.
- Firestore collection name: **`todos`**.
- Fixed categories: **`업무`**, **`개인`**, **`기타`** (no custom categories).
- Analytics: **not used**.
- Todo document shape in Firestore: `{ title: string, done: boolean, dueDate: string|null ("YYYY-MM-DD"), category: string, createdAt: serverTimestamp }`.
- TDD note: this stack has no test runner. Pure logic (Task 2) is covered by a browser test page with a real fail→pass cycle. UI/Firestore tasks end with an explicit manual verification step (per the spec's manual-test decision).

---

## File Structure

```
To-Do/
├── index.html              # Static markup: header, form, filter bar, list, toast
├── style.css               # Theme variables (:root + [data-theme="dark"]) + layout
├── firebase-config.js      # Exports firebaseConfig object only
├── todo-logic.js           # Pure functions: filterTodos, sortTodos, isOverdue
├── app.js                  # Firebase init, CRUD, onSnapshot, render, events, theme
├── README.md               # How to run + Firestore rules note
└── tests/
    ├── index.html          # Loads the logic test runner in a browser
    └── todo-logic.test.js  # Assertions against todo-logic.js
```

**Responsibilities:**
- `firebase-config.js` — config only; isolated so the value is easy to swap/rotate.
- `todo-logic.js` — pure, dependency-free, deterministic; the only unit-tested unit.
- `app.js` — all side effects (DOM + Firestore). Imports config + logic.
- `index.html` — all markup is static; JS only wires behavior to existing elements.

---

## Task 1: Scaffold — markup, theme, Firebase connection

**Files:**
- Create: `firebase-config.js`
- Create: `index.html`
- Create: `style.css`
- Create: `app.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `firebase-config.js` exports `firebaseConfig` (object).
  - `app.js` initializes `const db = getFirestore(app)` (used by later tasks) and defines `showToast(msg: string): void`.
  - `index.html` provides these element IDs for later tasks: `theme-toggle`, `todo-form`, `title-input`, `due-input`, `category-select`, `status-filter`, `category-filter`, `sort-toggle`, `todo-list`, `empty-state`, `toast`.

- [ ] **Step 1: Create `firebase-config.js`**

```js
// Firebase project: sw-todo-backend. The web apiKey is not a secret;
// access is controlled by Firestore security rules (see README.md).
export const firebaseConfig = {
  apiKey: "AIzaSyB5AfOk1m3yzSg_YzhfmYuocPP_CJ8XzcU",
  authDomain: "sw-todo-backend.firebaseapp.com",
  projectId: "sw-todo-backend",
  storageBucket: "sw-todo-backend.firebasestorage.app",
  messagingSenderId: "355937337100",
  appId: "1:355937337100:web:a1da05f184a000e0145329",
  measurementId: "G-X4R78DLYBD"
};
```

- [ ] **Step 2: Create `index.html`** (full static skeleton — all later tasks wire to these elements)

```html
<!DOCTYPE html>
<html lang="ko" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>To-Do</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main id="app">
    <header class="app-header">
      <h1>할 일</h1>
      <button id="theme-toggle" type="button" aria-label="테마 전환">🌙</button>
    </header>

    <form id="todo-form" class="todo-form">
      <input id="title-input" type="text" placeholder="할 일을 입력하세요" autocomplete="off" />
      <input id="due-input" type="date" />
      <select id="category-select">
        <option value="업무">업무</option>
        <option value="개인">개인</option>
        <option value="기타" selected>기타</option>
      </select>
      <button type="submit">추가</button>
    </form>

    <div class="filter-bar">
      <select id="status-filter">
        <option value="all">전체</option>
        <option value="active">미완료</option>
        <option value="done">완료</option>
      </select>
      <select id="category-filter">
        <option value="all">모든 카테고리</option>
        <option value="업무">업무</option>
        <option value="개인">개인</option>
        <option value="기타">기타</option>
      </select>
      <button id="sort-toggle" type="button">정렬: 최신순</button>
    </div>

    <ul id="todo-list" class="todo-list"></ul>
    <div id="empty-state" class="empty-state" hidden>할 일이 없어요 🎉</div>
  </main>

  <div id="toast" class="toast" role="status" aria-live="polite"></div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `style.css`** (theme variables + layout)

```css
:root {
  --bg: #f5f6f8;
  --surface: #ffffff;
  --text: #1c1e21;
  --muted: #6b7280;
  --border: #e3e6ea;
  --accent: #3b82f6;
  --danger: #ef4444;
  --badge-bg: #eef2ff;
}
[data-theme="dark"] {
  --bg: #16181d;
  --surface: #21242b;
  --text: #e8eaed;
  --muted: #9aa0a6;
  --border: #353941;
  --accent: #60a5fa;
  --danger: #f87171;
  --badge-bg: #2b3242;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
}
#app { max-width: 640px; margin: 0 auto; padding: 24px 16px 80px; }

.app-header { display: flex; align-items: center; justify-content: space-between; }
.app-header h1 { font-size: 1.6rem; margin: 0; }
#theme-toggle {
  font-size: 1.2rem; background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 6px 10px; cursor: pointer; color: var(--text);
}

.todo-form { display: flex; gap: 8px; flex-wrap: wrap; margin: 20px 0; }
.todo-form input[type="text"] { flex: 1 1 200px; }
.todo-form input, .todo-form select, .filter-bar select, .filter-bar button {
  padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--surface); color: var(--text); font-size: 0.95rem;
}
.todo-form button[type="submit"] {
  background: var(--accent); color: #fff; border: none; border-radius: 8px;
  padding: 8px 16px; cursor: pointer;
}

.filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.filter-bar button { cursor: pointer; }

.todo-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.todo-item {
  display: flex; align-items: center; gap: 10px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px;
}
.todo-item .title { flex: 1; }
.todo-item.done .title { text-decoration: line-through; color: var(--muted); }
.todo-item .badge {
  font-size: 0.75rem; background: var(--badge-bg); color: var(--accent);
  padding: 2px 8px; border-radius: 999px;
}
.todo-item .due { font-size: 0.8rem; color: var(--muted); }
.todo-item.overdue .due { color: var(--danger); font-weight: 600; }
.todo-item .edit, .todo-item .delete {
  border: none; background: transparent; color: var(--muted); cursor: pointer; font-size: 0.85rem;
}
.todo-item .delete:hover { color: var(--danger); }
.todo-item .edit:hover { color: var(--accent); }

.empty-state { text-align: center; color: var(--muted); padding: 40px 0; }

.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--text); color: var(--bg); padding: 10px 18px; border-radius: 8px;
  opacity: 0; pointer-events: none; transition: opacity 0.2s; font-size: 0.9rem;
}
.toast.show { opacity: 1; }
```

- [ ] **Step 4: Create `app.js`** (Firebase init + theme + toast only)

```js
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase connected:", app.name);

// --- Toast ---
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

// --- Theme ---
const THEME_KEY = "todo-theme";
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀️" : "🌙";
}
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
}
document.getElementById("theme-toggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});
initTheme();
```

- [ ] **Step 5: Run a local server and verify in browser**

Run (from the `To-Do` directory):
```bash
npx serve -l 3000 .
```
Open `http://localhost:3000`. Expected:
- Page renders header, form, filter bar, empty list, no errors in console.
- Console logs `Firebase connected: [DEFAULT]`.
- Clicking 🌙/☀️ toggles dark/light. Reloading the page keeps the chosen theme.

- [ ] **Step 6: Commit**

```bash
git add firebase-config.js index.html style.css app.js
git commit -m "feat: scaffold todo app shell with Firebase init and theme toggle"
```

---

## Task 2: Pure list logic + browser tests (TDD)

**Files:**
- Create: `todo-logic.js`
- Create: `tests/todo-logic.test.js`
- Create: `tests/index.html`

**Interfaces:**
- Consumes: nothing.
- Produces (used by `app.js` in Task 3 & 6):
  - `filterTodos(todos, { status, category }) -> Todo[]` where `status ∈ {"all","active","done"}`, `category ∈ {"all","업무","개인","기타"}`.
  - `sortTodos(todos, mode) -> Todo[]` (new array) where `mode ∈ {"created","due"}`. `"created"` = newest first by numeric `createdAt`; `"due"` = earliest `dueDate` first, `null` due dates last.
  - `isOverdue(todo, todayStr) -> boolean` — true only when `dueDate` exists, todo is not done, and `dueDate < todayStr`.
  - `Todo` shape used by logic: `{ id, title, done:boolean, dueDate:string|null, category:string, createdAt:number }`.

- [ ] **Step 1: Write the failing test runner `tests/todo-logic.test.js`**

```js
import { filterTodos, sortTodos, isOverdue } from "../todo-logic.js";

const results = [];
function check(name, cond) {
  results.push({ name, pass: !!cond });
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const sample = [
  { id: "a", title: "A", done: false, dueDate: "2026-07-10", category: "업무", createdAt: 100 },
  { id: "b", title: "B", done: true,  dueDate: null,         category: "개인", createdAt: 200 },
  { id: "c", title: "C", done: false, dueDate: "2026-07-01", category: "업무", createdAt: 150 },
];

// filterTodos
check("filter all returns everything",
  filterTodos(sample, { status: "all", category: "all" }).length === 3);
check("filter active excludes done",
  eq(filterTodos(sample, { status: "active", category: "all" }).map(t => t.id), ["a", "c"]));
check("filter done keeps only done",
  eq(filterTodos(sample, { status: "done", category: "all" }).map(t => t.id), ["b"]));
check("filter by category 업무",
  eq(filterTodos(sample, { status: "all", category: "업무" }).map(t => t.id), ["a", "c"]));
check("filter combines status + category",
  eq(filterTodos(sample, { status: "active", category: "업무" }).map(t => t.id), ["a", "c"]));

// sortTodos
check("sort created = newest first",
  eq(sortTodos(sample, "created").map(t => t.id), ["b", "c", "a"]));
check("sort due = earliest first, null last",
  eq(sortTodos(sample, "due").map(t => t.id), ["c", "a", "b"]));
check("sort does not mutate input",
  (() => { const before = sample.map(t => t.id); sortTodos(sample, "due"); return eq(sample.map(t => t.id), before); })());

// isOverdue
check("overdue true when past and not done",
  isOverdue({ dueDate: "2026-06-01", done: false }, "2026-06-30") === true);
check("overdue false when done",
  isOverdue({ dueDate: "2026-06-01", done: true }, "2026-06-30") === false);
check("overdue false when no dueDate",
  isOverdue({ dueDate: null, done: false }, "2026-06-30") === false);
check("overdue false when due today",
  isOverdue({ dueDate: "2026-06-30", done: false }, "2026-06-30") === false);

// Render results to page + console
const root = document.getElementById("results");
let allPass = true;
for (const r of results) {
  if (!r.pass) allPass = false;
  const li = document.createElement("li");
  li.textContent = `${r.pass ? "PASS" : "FAIL"} — ${r.name}`;
  li.style.color = r.pass ? "green" : "red";
  root.appendChild(li);
  console.log(`${r.pass ? "PASS" : "FAIL"} — ${r.name}`);
}
const summary = document.getElementById("summary");
summary.textContent = allPass
  ? `All ${results.length} tests passed`
  : `${results.filter(r => !r.pass).length} of ${results.length} tests FAILED`;
summary.style.color = allPass ? "green" : "red";
```

- [ ] **Step 2: Create `tests/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>todo-logic tests</title></head>
<body>
  <h1 id="summary">Running…</h1>
  <ul id="results"></ul>
  <script type="module" src="todo-logic.test.js"></script>
</body>
</html>
```

- [ ] **Step 3: Run tests to verify they FAIL**

With the local server running (Task 1, Step 5), open `http://localhost:3000/tests/`.
Expected: the page fails to load the module — console shows an error like
`Failed to resolve module specifier` / 404 for `../todo-logic.js` (file does not exist yet),
and the summary stays `Running…`. This confirms the tests run against missing code.

- [ ] **Step 4: Create `todo-logic.js` (minimal implementation)**

```js
export function filterTodos(todos, { status = "all", category = "all" } = {}) {
  return todos.filter((t) => {
    if (status === "active" && t.done) return false;
    if (status === "done" && !t.done) return false;
    if (category !== "all" && t.category !== category) return false;
    return true;
  });
}

export function sortTodos(todos, mode = "created") {
  const copy = [...todos];
  if (mode === "due") {
    copy.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;   // nulls last
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate); // earliest first
    });
  } else {
    copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // newest first
  }
  return copy;
}

export function isOverdue(todo, todayStr) {
  if (!todo.dueDate || todo.done) return false;
  return todo.dueDate < todayStr;
}
```

- [ ] **Step 5: Run tests to verify they PASS**

Reload `http://localhost:3000/tests/`.
Expected: summary reads `All 13 tests passed` (green); every list item shows `PASS`.

- [ ] **Step 6: Commit**

```bash
git add todo-logic.js tests/
git commit -m "feat: add pure todo list logic (filter/sort/overdue) with browser tests"
```

---

## Task 3: Read & render todos in real time

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `db` (Task 1); `filterTodos`, `sortTodos`, `isOverdue` (Task 2).
- Produces (used by Tasks 4–6):
  - module-level state `allTodos: Todo[]`, `filters: {status, category}`, `sortMode: string`.
  - `render(): void` — draws `allTodos` through filter+sort into `#todo-list`, toggles `#empty-state`.
  - `todayStr(): string` — local date `"YYYY-MM-DD"`.
  - `escapeHtml(s): string`.
  - Each rendered `<li>` has class `todo-item` (+ `done`/`overdue`), `dataset.id`, and children `.toggle` (checkbox), `.title`, `.badge`, `.due`, `.edit`, `.delete`.

- [ ] **Step 1: Extend the import lines at the top of `app.js`**

Replace the existing Firestore import line with the following two lines (adds the logic import and the Firestore functions used now and in later tasks):

```js
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { filterTodos, sortTodos, isOverdue } from "./todo-logic.js";
```

- [ ] **Step 2: Add state, helpers, and render() to `app.js`** (append after the theme code)

```js
// --- State ---
let allTodos = [];
let filters = { status: "all", category: "all" };
let sortMode = "created";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function render() {
  const list = document.getElementById("todo-list");
  const emptyState = document.getElementById("empty-state");
  const visible = sortTodos(filterTodos(allTodos, filters), sortMode);
  const today = todayStr();

  list.innerHTML = "";
  emptyState.hidden = visible.length > 0;

  for (const t of visible) {
    const li = document.createElement("li");
    li.className = "todo-item" + (t.done ? " done" : "") + (isOverdue(t, today) ? " overdue" : "");
    li.dataset.id = t.id;
    li.innerHTML = `
      <input type="checkbox" class="toggle" ${t.done ? "checked" : ""} />
      <span class="title">${escapeHtml(t.title)}</span>
      <span class="badge">${escapeHtml(t.category)}</span>
      <span class="due">${t.dueDate ? escapeHtml(t.dueDate) : ""}</span>
      <button type="button" class="edit">수정</button>
      <button type="button" class="delete">삭제</button>
    `;
    list.appendChild(li);
  }
}
```

- [ ] **Step 3: Add the Firestore subscription to `app.js`** (append after render())

```js
// --- Realtime subscription ---
function subscribe() {
  onSnapshot(
    collection(db, "todos"),
    (snap) => {
      allTodos = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "",
          done: !!data.done,
          dueDate: data.dueDate ?? null,
          category: data.category ?? "기타",
          createdAt: data.createdAt?.toMillis?.() ?? 0,
        };
      });
      render();
    },
    (err) => {
      console.error(err);
      showToast("데이터를 불러오지 못했습니다");
    }
  );
}
subscribe();
```

- [ ] **Step 4: Verify rendering against a real document**

Ensure Firestore rules allow access first — if you have not yet done Task 7, temporarily set test-mode rules in the Firebase console (Firestore → Rules):
`allow read, write: if true;` then Publish. (Task 7 replaces these with the time-limited rules.)

In the Firebase console → Firestore → `todos` collection, add a document with fields:
`title="첫 할 일"` (string), `done=false` (boolean), `dueDate="2026-07-15"` (string), `category="업무"` (string), `createdAt` (timestamp = now).
Reload `http://localhost:3000`. Expected: the item appears in the list with its category badge and due date. Editing the document's `title` in the console updates the page live without reload.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: render todos from Firestore with realtime onSnapshot subscription"
```

---

## Task 4: Add todos from the form

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `db`, `showToast` (Task 1); `addDoc`, `collection`, `serverTimestamp` (imported in Task 3).
- Produces: a submit handler on `#todo-form` that writes a new `todos` document.

- [ ] **Step 1: Add the form submit handler to `app.js`** (append at end of file)

```js
// --- Add todo ---
document.getElementById("todo-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const titleEl = document.getElementById("title-input");
  const title = titleEl.value.trim();
  if (!title) return; // ignore empty titles
  const dueDate = document.getElementById("due-input").value || null;
  const category = document.getElementById("category-select").value;
  try {
    await addDoc(collection(db, "todos"), {
      title,
      done: false,
      dueDate,
      category,
      createdAt: serverTimestamp(),
    });
    e.target.reset();
    document.getElementById("category-select").value = "기타";
    titleEl.focus();
  } catch (err) {
    console.error(err);
    showToast("추가에 실패했습니다");
  }
});
```

- [ ] **Step 2: Verify adding works**

Reload `http://localhost:3000`. Type a title, optionally pick a date and category, click 추가.
Expected: the form clears, the new item appears at the top of the list immediately (newest-first), and it persists in the Firebase console. Submitting an empty title does nothing.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add todos via the form"
```

---

## Task 5: Complete, edit, and delete todos

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `db`, `showToast`; `updateDoc`, `deleteDoc`, `doc` (imported in Task 3); the `.toggle`/`.edit`/`.delete` elements and `dataset.id` produced by `render()` (Task 3).
- Produces: a delegated click handler on `#todo-list` handling toggle/edit/delete.

- [ ] **Step 1: Add the delegated list handler to `app.js`** (append at end of file)

```js
// --- Toggle / edit / delete (event delegation) ---
document.getElementById("todo-list").addEventListener("click", async (e) => {
  const li = e.target.closest(".todo-item");
  if (!li) return;
  const id = li.dataset.id;
  try {
    if (e.target.classList.contains("toggle")) {
      await updateDoc(doc(db, "todos", id), { done: e.target.checked });
    } else if (e.target.classList.contains("delete")) {
      await deleteDoc(doc(db, "todos", id));
    } else if (e.target.classList.contains("edit")) {
      const current = li.querySelector(".title").textContent;
      const next = prompt("할 일 수정", current);
      if (next !== null && next.trim()) {
        await updateDoc(doc(db, "todos", id), { title: next.trim() });
      }
    }
  } catch (err) {
    console.error(err);
    showToast("변경에 실패했습니다");
  }
});
```

- [ ] **Step 2: Verify toggle/edit/delete**

Reload `http://localhost:3000`. Expected:
- Checking an item's checkbox adds the strike-through `done` style and persists (reload keeps it checked).
- Clicking 수정 opens a prompt; entering new text updates the title live.
- Clicking 삭제 removes the item immediately and from Firestore.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: toggle complete, edit, and delete todos"
```

---

## Task 6: Filter bar, sort toggle, overdue styling

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `filters`, `sortMode`, `render()` (Task 3); the `#status-filter`, `#category-filter`, `#sort-toggle` elements (Task 1).
- Produces: change/click handlers that update `filters`/`sortMode` then call `render()`.

- [ ] **Step 1: Add filter and sort handlers to `app.js`** (append at end of file)

```js
// --- Filters & sort ---
document.getElementById("status-filter").addEventListener("change", (e) => {
  filters.status = e.target.value;
  render();
});
document.getElementById("category-filter").addEventListener("change", (e) => {
  filters.category = e.target.value;
  render();
});
document.getElementById("sort-toggle").addEventListener("click", () => {
  sortMode = sortMode === "created" ? "due" : "created";
  document.getElementById("sort-toggle").textContent =
    sortMode === "created" ? "정렬: 최신순" : "정렬: 마감일순";
  render();
});
```

- [ ] **Step 2: Verify filters, sort, and overdue highlight**

Have at least: one done item, one active item, items in different categories, one active item with a past `dueDate` (e.g. yesterday), and one with no due date. Reload `http://localhost:3000`. Expected:
- Status filter (전체/미완료/완료) shows the correct subset.
- Category filter shows only that category.
- 정렬 button toggles between 최신순 and 마감일순; due-date sort puts earliest first and no-due-date items last.
- The past-due active item shows its date in red (`overdue`). Marking it done removes the red.
- Filtering everything out shows the "할 일이 없어요 🎉" empty state.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add status/category filters, sort toggle, and overdue highlighting"
```

---

## Task 7: Firestore security rules, README, full manual test pass

**Files:**
- Create: `README.md`
- Create: `firestore.rules` (reference copy of the deployed rules)

**Interfaces:**
- Consumes: the whole app.
- Produces: documented run instructions and the security rules of record.

- [ ] **Step 1: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{doc} {
      // Single-user app, no auth. Time-limited open access.
      // Tighten with Firebase Anonymous Auth (request.auth != null) to make private.
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

- [ ] **Step 2: Publish the rules in the Firebase console**

Firebase console → project `sw-todo-backend` → Firestore Database → Rules.
Paste the contents of `firestore.rules`, click **Publish**. This replaces any temporary
`if true` test rules used during development. Reload the app and confirm read/write still works.

- [ ] **Step 3: Create `README.md`**

```markdown
# To-Do (HTML/CSS/JS + Firebase)

Single-user todo app. Data lives in Firebase Firestore (project `sw-todo-backend`).

## Run

This app uses ES modules, so it must be served over HTTP (not opened as `file://`):

```bash
npx serve -l 3000 .
```

Then open http://localhost:3000

## Tests (pure logic)

Open http://localhost:3000/tests/ — all assertions should report PASS.

## Firestore security rules

See `firestore.rules`. Access is time-limited and open (no login).
Anyone with the web config can read/write. To make it private, add Firebase
Anonymous Auth and change the rule to `allow read, write: if request.auth != null;`.
The web `apiKey` in `firebase-config.js` is not a secret; security is enforced by these rules.
```

- [ ] **Step 4: Run the full manual test checklist**

With `npx serve` running, on `http://localhost:3000` confirm each item:
- [ ] Add a todo with title, due date, and category.
- [ ] Toggle complete on/off (strike-through appears/disappears, persists on reload).
- [ ] Edit a todo's title.
- [ ] Delete a todo.
- [ ] Status filter: 전체 / 미완료 / 완료.
- [ ] Category filter shows only the chosen category.
- [ ] Sort toggle switches 최신순 ↔ 마감일순 correctly.
- [ ] Light/dark toggle works and survives reload.
- [ ] Data persists after reload.
- [ ] Open a second browser tab — a change in one tab appears in the other live.
- [ ] A past-due, not-done item is highlighted in red.

- [ ] **Step 5: Commit**

```bash
git add README.md firestore.rules
git commit -m "docs: add README and Firestore security rules; complete manual test pass"
```

---

## Self-Review

**Spec coverage:**
- Single user / no login → Task 1 (no auth code) + Task 7 rules. ✓
- Complete check → Task 5. ✓
- Edit/delete → Task 5. ✓
- Due date (input + storage + overdue highlight) → Task 1 (input), Task 4 (store), Task 6 (overdue). ✓
- Category + filter → Task 1 (select), Task 4 (store), Task 6 (filter). ✓
- Sort (created/due) → Task 2 (logic) + Task 6 (toggle). ✓
- Light/dark toggle with persistence → Task 1. ✓
- Firestore single source of truth via onSnapshot → Task 3. ✓
- Data model fields → Task 4 write + Task 3 read mapping. ✓
- Error handling (try/catch + toast, empty-title guard) → Tasks 3–5 + Task 4. ✓
- Manual test checklist → Task 7. ✓
- Analytics excluded → no Analytics import anywhere. ✓
- Empty state → Task 1 markup + Task 3 render toggle. ✓

**Placeholder scan:** No TBD/TODO/"add appropriate handling" — all steps contain concrete code or exact actions. ✓

**Type/name consistency:** `filterTodos`/`sortTodos`/`isOverdue` signatures match between Task 2 (definition + tests) and Task 3/6 (usage). Element IDs declared in Task 1 are the exact IDs referenced in Tasks 3–6. `createdAt` stored as `serverTimestamp` (Task 4) and read via `.toMillis()` to the numeric `createdAt` that `sortTodos` expects (Task 3). ✓
