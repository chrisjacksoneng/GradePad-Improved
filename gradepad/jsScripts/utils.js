export function toggleNav() {
    const sidenav = document.getElementById("mySidenav");
    const menuIcon = document.getElementById("menuIcon");

    if (window.getComputedStyle(sidenav).width === "250px") {
      sidenav.style.width = "0px";
      menuIcon.innerHTML = "&#9776;";
      menuIcon.classList.remove("open");
    } else {
      sidenav.style.width = "250px";
      menuIcon.innerHTML = "&times;";
      menuIcon.classList.add("open");
    }
  }

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
let saveStatusEl = null;
let saveHideTimer = null;
let savingCount = 0;

function ensureSaveStatusEl() {
  if (!saveStatusEl) {
    saveStatusEl = document.createElement("div");
    saveStatusEl.className = "save-status";
    document.body.appendChild(saveStatusEl);
  }
  return saveStatusEl;
}

export function markSaving() {
  savingCount++;
  const el = ensureSaveStatusEl();
  clearTimeout(saveHideTimer);
  el.textContent = "Saving…";
  el.classList.remove("saved");
  el.classList.add("show");
}

export function markSaved() {
  savingCount = Math.max(0, savingCount - 1);
  if (savingCount > 0) return; // still other saves in flight
  const el = ensureSaveStatusEl();
  el.textContent = "Saved ✓";
  el.classList.add("show", "saved");
  clearTimeout(saveHideTimer);
  saveHideTimer = setTimeout(() => el.classList.remove("show"), 1500);
}
