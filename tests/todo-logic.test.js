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
