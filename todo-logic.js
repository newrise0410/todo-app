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
