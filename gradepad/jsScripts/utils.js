export function toggleCollapse(event) {
    const tableWrapper = event.target.closest(".table-wrapper");
    const table = tableWrapper?.querySelector("table");
    if (!table) return;

    const finalGradeRow = table.querySelector("#finalGradeRow");
    if (!finalGradeRow) return;

    const finalMarkLabel = finalGradeRow.children[0];
    const finalMarkValue = finalGradeRow.children[1];
    const unitsCell = finalGradeRow.children[2];

    // The chevron icon rotates via CSS on table.collapsed, so no text swap here.
    const isCollapsed = table.classList.toggle("collapsed");

    const deleteButton = table.querySelector(".deleteButton");
    if (deleteButton) deleteButton.style.display = isCollapsed ? "none" : "inline-block";

    const syllabusButton = table.querySelector(".syllabusButton");
    if (syllabusButton) {
      syllabusButton.style.display = isCollapsed ? "none" : "inline-block";
    }

    const courseUnitsDropdown = table.querySelector(".courseUnitsDropdown");
    if (courseUnitsDropdown) {
      courseUnitsDropdown.style.display = isCollapsed ? "none" : "inline-block";
    }

    finalMarkLabel.setAttribute("colspan", isCollapsed ? "1" : "2");
    finalMarkValue.setAttribute("colspan", isCollapsed ? "1" : "2");
    if (unitsCell) unitsCell.style.display = isCollapsed ? "none" : "table-cell";
  }

// --- Undo toast -------------------------------------------------------------
// Shows a transient toast with an Undo button. onUndo runs if the user clicks
// Undo within `ms`; otherwise onCommit runs (the real, irreversible action).
export function showUndoToast(message, onUndo, onCommit, ms = 5000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  const msg = document.createElement("span");
  msg.textContent = message;
  const btn = document.createElement("button");
  btn.className = "toast-undo";
  btn.textContent = "Undo";
  toast.append(msg, btn);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  let done = false;
  const dismiss = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  };
  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    if (onCommit) onCommit();
    dismiss();
  }, ms);
  btn.addEventListener("click", () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (onUndo) onUndo();
    dismiss();
  });
}

// --- Save status indicator --------------------------------------------------
// Every save ends in exactly one of markSaved() or markSaveFailed(). A failure
// anywhere in a batch makes the whole batch report failure, because the point
// of the indicator is to tell the user whether their work is safe.
let saveStatusEl = null;
let saveHideTimer = null;
let savingCount = 0;
let pendingFailure = null;

function ensureSaveStatusEl() {
  if (!saveStatusEl) {
    saveStatusEl = document.createElement("div");
    saveStatusEl.className = "save-status";
    saveStatusEl.setAttribute("role", "status");
    saveStatusEl.setAttribute("aria-live", "polite");
    document.body.appendChild(saveStatusEl);
  }
  return saveStatusEl;
}

export function markSaving() {
  savingCount++;
  const el = ensureSaveStatusEl();
  clearTimeout(saveHideTimer);
  el.textContent = "Saving…";
  el.classList.remove("saved", "failed");
  el.classList.add("show");
}

export function markSaved() {
  finishSave(null);
}

// Report a save that did not reach storage. The message stays on screen far
// longer than a success, since it is asking the user to do something.
export function markSaveFailed(message) {
  finishSave(message || "Not saved - check your connection");
}

function finishSave(failure) {
  savingCount = Math.max(0, savingCount - 1);
  if (failure) pendingFailure = failure;
  if (savingCount > 0) return; // still other saves in flight

  const el = ensureSaveStatusEl();
  clearTimeout(saveHideTimer);

  if (pendingFailure) {
    el.textContent = pendingFailure;
    el.classList.remove("saved");
    el.classList.add("show", "failed");
    pendingFailure = null;
    saveHideTimer = setTimeout(() => el.classList.remove("show"), 8000);
    return;
  }

  el.textContent = "Saved ✓";
  el.classList.remove("failed");
  el.classList.add("show", "saved");
  saveHideTimer = setTimeout(() => el.classList.remove("show"), 1500);
}
