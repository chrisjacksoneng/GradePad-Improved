import { reorderEvaluations } from './db.js';

  function isAllowedRow(row) {
    return !(row.querySelector(".courseCode") || row.classList.contains("columnTitles") || row.id === "finalGradeRow");
  }
  
  function getAllowedSibling(row, direction) {
    let sibling = direction === "prev" ? row.previousElementSibling : row.nextElementSibling;
    while (sibling) {
      if (isAllowedRow(sibling)) return sibling;
      sibling = direction === "prev" ? sibling.previousElementSibling : sibling.nextElementSibling;
    }
    return null;
  }
  
  // Pointer events rather than mouse events, so reordering works with a finger
  // or a stylus as well as a mouse. Touch reordering was impossible before.
  export function setupMoveRowButton(button) {
    if (button.dataset.moveWired === "true") return;
    button.dataset.moveWired = "true";
    button.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return; // ignore right/middle click
      e.preventDefault();
      const row = e.target.closest("tr");
      if (!row) return;
      isDragging = true;
      draggedRow = row;
      initialY = e.clientY;

      const tbody = draggedRow.parentNode;
      const allowedRows = Array.from(tbody.querySelectorAll("tr")).filter(isAllowedRow);
      originalIndex = allowedRows.indexOf(draggedRow);
      didReorder = false;
      draggedRow.classList.add("dragging");
    });
  }

  function handlePointerMove(e) {
    if (!isDragging || !draggedRow) return;
    // Reordering a row moves it in the DOM, which drops the implicit touch
    // capture, so keep suppressing the browser's own scroll for the whole drag.
    e.preventDefault();
    const deltaY = e.clientY - initialY;
    draggedRow.style.transform = `translateY(${deltaY}px)`;
  
    const tbody = draggedRow.parentNode;
    const prevRow = getAllowedSibling(draggedRow, "prev");
    const nextRow = getAllowedSibling(draggedRow, "next");
  
    if (prevRow) {
      const rect = prevRow.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        draggedRow.style.transform = "";
        requestAnimationFrame(() => tbody.insertBefore(draggedRow, prevRow));
        didReorder = true;
        initialY = e.clientY;
      }
    }
  
    if (nextRow) {
      const rect = nextRow.getBoundingClientRect();
      if (e.clientY > rect.top + rect.height / 2) {
        draggedRow.style.transform = "";
        requestAnimationFrame(() => tbody.insertBefore(draggedRow, nextRow.nextElementSibling));
        didReorder = true;
        initialY = e.clientY;
      }
    }
  }
  
  function handlePointerUp() {
    const releasedRow = draggedRow;
    const wasDragging = isDragging;
    if (isDragging && draggedRow) {
      draggedRow.style.transform = "";
      draggedRow.classList.remove("dragging");
    }
    isDragging = false;
    draggedRow = null;

    if (wasDragging && releasedRow && didReorder) persistRowOrder(releasedRow);
  }

  // Persist the new evaluation order after a drag so it survives reload.
  function persistRowOrder(row) {
    const wrapper = row.closest(".table-wrapper");
    if (!wrapper) return;
    const courseId = wrapper.dataset.courseId;
    const semesterId = new URLSearchParams(window.location.search).get("semesterId");
    if (!courseId || !semesterId) return;

    const table = wrapper.querySelector("table");
    if (!table) return;

    const orderedIds = [...table.querySelectorAll("tr")]
      .filter(isAllowedRow)
      .map((r) => r.dataset.evalId)
      .filter(Boolean);

    if (orderedIds.length) reorderEvaluations(semesterId, courseId, orderedIds);
  }
  
  // Global state
  let isDragging = false;
  let draggedRow = null;
  let initialY = 0;
  let originalIndex = -1;
  let didReorder = false;
  
  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);
  // A touch drag interrupted by the system (an incoming call, a gesture the
  // browser takes over) ends with pointercancel and no pointerup.
  document.addEventListener("pointercancel", handlePointerUp);
  