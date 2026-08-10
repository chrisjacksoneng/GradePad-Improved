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
  
  export function setupMoveRowButton(button) {
    button.addEventListener("mousedown", function (e) {
      e.preventDefault();
      isDragging = true;
      draggedRow = e.target.closest("tr");
      initialY = e.clientY;
  
      const tbody = draggedRow.parentNode;
      const allowedRows = Array.from(tbody.querySelectorAll("tr")).filter(isAllowedRow);
      originalIndex = allowedRows.indexOf(draggedRow);
      draggedRow.classList.add("dragging");
    });
  }
  
  function handleMouseMove(e) {
    if (!isDragging || !draggedRow) return;
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
        initialY = e.clientY;
      }
    }
  
    if (nextRow) {
      const rect = nextRow.getBoundingClientRect();
      if (e.clientY > rect.top + rect.height / 2) {
        draggedRow.style.transform = "";
        requestAnimationFrame(() => tbody.insertBefore(draggedRow, nextRow.nextElementSibling));
        initialY = e.clientY;
      }
    }
  }
  
  function handleMouseUp() {
    const releasedRow = draggedRow;
    const wasDragging = isDragging;
    if (isDragging && draggedRow) {
      draggedRow.style.transform = "";
      draggedRow.classList.remove("dragging");
    }
    isDragging = false;
    draggedRow = null;

    if (wasDragging && releasedRow) persistRowOrder(releasedRow);
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
  
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  