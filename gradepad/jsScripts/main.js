import { attachAllEventListeners, createNewTable } from './tableOps.js';
import { setupThemeSelector } from './theme.js';
import { setupSettingsModal, setupSemesterModal } from './modal.js';
import { toggleNav } from './utils.js';
import { loadSemesters } from "./db.js";
import { deleteSemester } from './db.js'; // Add this at the top of the file
import { openEditSemesterModal } from './modal.js';

// 🔧 Attach dropdown/edit/delete functionality to a semester card
function attachSemesterCardListeners(semesterCard) {
  const dropBtn = semesterCard.querySelector(".dropbtn");
  const dropdownContent = semesterCard.querySelector(".dropdown-content");

  dropBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdownContent.classList.contains("show");
    dropdownContent.classList.toggle("show", !isOpen);
    dropdownContent.classList.toggle("fade-out", isOpen);
    semesterCard.classList.toggle("showing-dropdown", !isOpen);
    dropBtn.classList.toggle("active", !isOpen);
  });

  semesterCard.querySelector(".editSemester")?.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditSemesterModal(semesterCard);
  });
  

  semesterCard.querySelector(".deleteSemester")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const semesterId = semesterCard.dataset.semesterId;
  
    if (confirm("Are you sure you want to delete this semester?")) {
      if (semesterId) deleteSemester(semesterId); // ✅ Firestore delete
      semesterCard.remove(); // 👋 remove from DOM
    }
  });
}

// 🔁 Recreate saved semesters from Firestore
export async function initializeSavedSemesters() {
  const semesters = await loadSemesters();
  const semesterContainer = document.querySelector(".semester-container");
  const addSemesterBtn = document.getElementById("addSemester");

  semesters.forEach((semester) => {
    const { id: semesterId, name, startDate, endDate } = semester;

    const displayStart = startDate ? new Date(startDate).toLocaleDateString() : "N/A";
    const displayEnd = endDate ? new Date(endDate).toLocaleDateString() : "N/A";
    const queryString = `?semesterId=${semesterId}&semesterName=${encodeURIComponent(name)}&startDate=${encodeURIComponent(displayStart)}&endDate=${encodeURIComponent(displayEnd)}`;

    const semesterCard = document.createElement("div");
    semesterCard.className = "semester-card";
    semesterCard.innerHTML = `
      <div class="card-content">
        <h2 class="semester-name">${name}</h2>
        <div class="semester-dates">
          <p>Start: ${displayStart}</p>
          <p>End: ${displayEnd}</p>
        </div>
        <div class="semester-gpa">GPA: -</div>
        <a href="grades.html?semesterId=${semesterId}&semesterName=${encodeURIComponent(name)}&startDate=${encodeURIComponent(displayStart)}&endDate=${encodeURIComponent(displayEnd)}" class="semester-link" style="display:none;"></a>
      </div>
      <div class="dropdown">
        <button class="dropbtn">...</button>
        <div class="dropdown-content">
          <button class="editSemester" title="Edit Semester">Edit Semester</button>
          <button class="deleteSemester" title="Delete Semester">Delete Semester</button>
        </div>
      </div>
    `;
    semesterCard.dataset.semesterId = semester.id;


        if (semesterContainer && addSemesterBtn) {
      semesterContainer.insertBefore(semesterCard, addSemesterBtn);
    } else {
      console.warn("🚨 Missing container or button:", { semesterContainer, addSemesterBtn });
    }

    semesterCard.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown")) {
        semesterCard.querySelector(".semester-link")?.click();
      }
    });

    attachSemesterCardListeners(semesterCard); // ✅ attach dropdown/edit/delete logic
    semesterContainer.insertBefore(semesterCard, addSemesterBtn);
  });
}

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

  const originalDeleteBtn = document.querySelector(".table-wrapper .deleteButton");
  if (originalDeleteBtn) {
    originalDeleteBtn.addEventListener("click", () => {
      const wrapper = originalDeleteBtn.closest(".table-wrapper");
      if (wrapper && confirm("Are you sure you want to delete this table?")) {
        wrapper.remove();
      }
    });
  }

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
