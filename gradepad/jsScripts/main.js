import { attachAllEventListeners, createNewTable } from './tableOps.js';

// 📦 Setup everything once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  attachAllEventListeners();

  // The first table's delete button is wired by createNewTable (which also
  // deletes the course from storage), so it is intentionally not handled here.

  const addTableBtn = document.getElementById("addTable");
  if (addTableBtn) {
    addTableBtn.addEventListener("click", () => {
      createNewTable(); // this function handles all the logic internally
    });
  }
});
