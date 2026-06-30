import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { filterTodos, sortTodos, isOverdue } from "./todo-logic.js";

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
