import { attachAllEventListeners, createNewTable } from './tableOps.js';
import { setupThemeSelector } from './theme.js';
import { setupSettingsModal, setupSemesterModal } from './modal.js';
import { toggleNav } from './utils.js';

// 📦 Setup everything once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setupSettingsModal();
  setupSemesterModal();
  setupThemeSelector();
  attachAllEventListeners();

  const menuIcon = document.getElementById("menuIcon");
  if (menuIcon) {
    menuIcon.addEventListener("click", toggleNav);
  }

  // The first table's delete button is wired by createNewTable (which also
  // deletes the course from storage), so it is intentionally not handled here.

  const addTableBtn = document.getElementById("addTable");
  if (addTableBtn) {
    addTableBtn.addEventListener("click", () => {
      createNewTable(); // this function handles all the logic internally
    });
  }

  // Input auto-width for page title
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    function resizeInput() {
      const span = document.createElement("span");
      span.style.visibility = "hidden";
      span.style.position = "absolute";
      span.style.whiteSpace = "nowrap";
      span.style.font = getComputedStyle(pageTitle).font;
      span.style.padding = getComputedStyle(pageTitle).padding;
      span.textContent = pageTitle.value || pageTitle.placeholder || "";
      document.body.appendChild(span);

      const width = span.offsetWidth + 20;
      pageTitle.style.width = `${width}px`;

      document.body.removeChild(span);
    }

    pageTitle.addEventListener("input", resizeInput);
    resizeInput();
  }
});
