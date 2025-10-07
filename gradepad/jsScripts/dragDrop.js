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
    if (isDragging && draggedRow) {
      draggedRow.style.transform = "";
      draggedRow.classList.remove("dragging");
    }
    isDragging = false;
    draggedRow = null;
  }
  
  // Global state
  let isDragging = false;
  let draggedRow = null;
  let initialY = 0;
  let originalIndex = -1;
  
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  