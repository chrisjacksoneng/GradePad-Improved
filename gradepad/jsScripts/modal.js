import { saveSemester } from './db.js';
import { deleteSemester } from './db.js';
import { saveCourse, clearEvaluations, saveEvaluation } from './db.js';
import { addRow, removeRow, attachEventListeners } from './tableOps.js';
import { setupMoveRowButton } from './dragDrop.js';
import { calculateFinalGrade } from './gradeCalc.js';

let editingSemesterCard = null;

function convertToISO(dateStr) {
  const parsed = new Date(dateStr);
  return isNaN(parsed) ? "" : parsed.toISOString().split("T")[0];
}

function formatAsLocalDate(inputDateStr) {
  const [year, month, day] = inputDateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

export function setupSettingsModal() {
  const settingsModal = document.getElementById("settingsModal");
  const settingsBtn = document.getElementById("settingsIcon");
  const settingsClose = settingsModal?.querySelector(".close");

  if (settingsBtn && settingsModal && settingsClose) {
    settingsBtn.onclick = () => settingsModal.classList.add("active");
    settingsClose.onclick = () => settingsModal.classList.remove("active");
    window.addEventListener("click", (e) => {
      if (e.target === settingsModal) settingsModal.classList.remove("active");
    });
  }
}

export function setupSemesterModal() {
  const semesterModal = document.getElementById("addSemesterModal");
  const semesterBtn = document.getElementById("addSemester");
  const semesterClose = semesterModal?.querySelector(".close");
  const saveBtn = document.getElementById("saveSemester");

  if (semesterBtn && semesterModal && semesterClose) {
    semesterBtn.onclick = () => {
      editingSemesterCard = null;
      document.getElementById("semesterName").value = "";
      document.getElementById("startDate").value = "";
      document.getElementById("endDate").value = "";
      document.querySelector("#addSemesterModal h3").textContent = "Add Semester";
      saveBtn.textContent = "Save Semester";
      semesterModal.style.display = "block";
    };

    semesterClose.onclick = () => (semesterModal.style.display = "none");
    window.addEventListener("click", (e) => {
      if (e.target === semesterModal) semesterModal.style.display = "none";
    });

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const name = document.getElementById("semesterName").value.trim();
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;

        const displayStart = startDate ? formatAsLocalDate(startDate) : "N/A";
        const displayEnd = endDate ? formatAsLocalDate(endDate) : "N/A";

        if (!name) {
          alert("Please enter a semester name.");
          return;
        }

        const existingId = editingSemesterCard?.dataset?.semesterId || null;
        const semesterId = await saveSemester({ name, startDate, endDate, semesterId: existingId });

        if (!semesterId) {
          alert("Failed to save semester.");
          return;
        }

        const semesterContainer = document.querySelector(".semester-container");

        if (editingSemesterCard) {
          editingSemesterCard.querySelector(".semester-name").textContent = name;
          // 🔧 Remove dropdown state after updating
          editingSemesterCard.classList.remove("showing-dropdown");
          editingSemesterCard.querySelector(".dropdown-content")?.classList.remove("show", "fade-out");
          editingSemesterCard.querySelector(".dropbtn")?.classList.remove("active");
          editingSemesterCard.querySelector(".semester-dates").innerHTML = `
            <p>Start: ${displayStart}</p>
            <p>End: ${displayEnd}</p>
          `;
          editingSemesterCard.dataset.semesterId = semesterId;

          const link = editingSemesterCard.querySelector(".semester-link");
          if (link) {
            link.href = `grades.html?semesterId=${semesterId}&semesterName=${encodeURIComponent(name)}&startDate=${encodeURIComponent(displayStart)}&endDate=${encodeURIComponent(displayEnd)}`;
          }

          editingSemesterCard = null;
        } else {
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
              <a class="semester-link" style="display:none;"></a>
            </div>
            <div class="dropdown">
              <button class="dropbtn">...</button>
              <div class="dropdown-content">
                <button class="editSemester" title="Edit Semester">Edit Semester</button>
                <button class="deleteSemester" title="Delete Semester">Delete Semester</button>
              </div>
            </div>
          `;

          semesterCard.dataset.semesterId = semesterId;

          const link = semesterCard.querySelector(".semester-link");
          if (link) {
            link.href = `grades.html?semesterId=${semesterId}&semesterName=${encodeURIComponent(name)}&startDate=${encodeURIComponent(displayStart)}&endDate=${encodeURIComponent(displayEnd)}`;
          }

          semesterCard.addEventListener("click", (e) => {
            if (!e.target.closest(".dropdown")) {
              semesterCard.querySelector(".semester-link")?.click();
            }
          });

          attachSemesterCardListeners(semesterCard);
          semesterContainer.insertBefore(semesterCard, document.getElementById("addSemester"));
        }

        semesterModal.style.display = "none";
        document.getElementById("semesterName").value = "";
        document.getElementById("startDate").value = "";
        document.getElementById("endDate").value = "";
        editingSemesterCard = null;
      });
    }
  }
}

export function attachSyllabusButtonListeners(tableElement) {
  const syllabusModal = tableElement.querySelector(".syllabusModal");
  const syllabusButton = tableElement.querySelector(".syllabusButton");
  const closeModal = tableElement.querySelector(".syllabusModal .close");
  const parseSyllabusButton = tableElement.querySelector(".parseSyllabusButton");
  const syllabusTextbox = tableElement.querySelector(".syllabusTextbox");

  if (!syllabusButton || !syllabusModal || !closeModal || !parseSyllabusButton || !syllabusTextbox) return;

  syllabusButton.addEventListener("click", () => {
    syllabusModal.style.display = "flex";
  });

  closeModal.addEventListener("click", () => {
    syllabusModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === syllabusModal) syllabusModal.style.display = "none";
  });

  parseSyllabusButton.addEventListener("click", async () => {
    const syllabusText = syllabusTextbox.value;
    const table = tableElement.querySelector("table");
    const finalGradeRow = table.querySelector("#finalGradeRow");

    if (!table || !finalGradeRow || !syllabusText) return;

    // Show loading state
    parseSyllabusButton.textContent = 'Parsing...';
    parseSyllabusButton.disabled = true;

    try {
      // Try AI parsing first if available
      if (window.parseSyllabusWithAI) {
        const parsedData = await window.parseSyllabusWithAI(syllabusText);
        
        // Extract course info and assignments
        const courseCode = parsedData.courseCode || "";
        const courseTitle = parsedData.courseTitle || "";
        const assignments = parsedData.assignments || parsedData;
        
        // Fill in course code and title fields
        const courseCodeInput = table.querySelector(".courseCode");
        const courseTitleInput = table.querySelector(".courseTopic");
        
        if (courseCodeInput && courseCode) courseCodeInput.value = courseCode;
        if (courseTitleInput && courseTitle) courseTitleInput.value = courseTitle;
        
        // Clear existing data rows
        const existingRows = table.querySelectorAll("tr:not(:first-child, .columnTitles, #finalGradeRow)");
        existingRows.forEach(row => row.remove());
        
        // Add each assignment (filter out rows that are just course code/title or empty)
        const filtered = (assignments || []).filter(a => {
          const n = (a.name || "").trim();
          const w = a.weight;
          const d = (a.dueDate || a.due || "").trim();
          if (!n) return false;
          if (courseCode && n.toLowerCase() === courseCode.toLowerCase()) return false;
          if (courseTitle && n.toLowerCase() === courseTitle.toLowerCase()) return false;
          // skip lines with no useful fields
          if ((w === undefined || w === null || w === "") && !d) return false;
          return true;
        });

        filtered.forEach(assignment => {
          const newRow = document.createElement("tr");
          newRow.innerHTML = `
            <td><input type="text" value="${assignment.name || 'Assignment'}"></td>
            <td><input type="text" class="dueInput" value="${assignment.dueDate || 'TBD'}"></td>
            <td><input type="number" class="gradeInput"></td>
            <td><input type="number" class="weightInput" value="${assignment.weight || 0}"></td>
            <td><span class="lostOutput">—</span></td>
            <td class="actionsColumn">
              <button class="addRowBtn" title="Add row below">+</button>
              <button class="removeRowBtn" title="Remove selected row">-</button>
              <button class="moveRowBtn" title="Move selected row">&#9776;</button>
            </td>
          `;
          finalGradeRow.before(newRow);
        });
        
        const wrapper = table.closest(".table-wrapper");
        attachEventListeners(wrapper);
        calculateFinalGrade(table);

        // Immediately persist parsed data so it survives reloads
        try {
          const semesterId = new URLSearchParams(window.location.search).get("semesterId");
          if (semesterId) {
            const codeInput = table.querySelector(".courseCode");
            const topicInput = table.querySelector(".courseTopic");
            const unitsDropdown = table.querySelector(".courseUnitsDropdown");
            const code = codeInput?.value?.trim() || "";
            const topic = topicInput?.value?.trim() || "";
            const units = parseFloat(unitsDropdown?.value || "0.50");

            let courseId = wrapper.dataset.courseId || null;
            courseId = await saveCourse({ semesterId, code, topic, units, courseId });
            if (courseId) {
              wrapper.dataset.courseId = courseId;
              await clearEvaluations(semesterId, courseId);

              const evalRows = [...table.querySelectorAll("tr:not(.columnTitles):not(#finalGradeRow)")];
              for (const [index, row] of evalRows.entries()) {
                const name = row.querySelector("td:nth-child(1) input")?.value?.trim() || "";
                const due = row.querySelector(".dueInput")?.value?.trim() || "";
                const grade = row.querySelector(".gradeInput")?.value?.trim() || "";
                const weight = row.querySelector(".weightInput")?.value?.trim() || "";
                if (name || due || grade || weight) {
                  await saveEvaluation({ semesterId, courseId, name, due, grade, weight, index });
                }
              }
            }
          }
        } catch (persistErr) {
          console.error('❌ Failed to persist parsed syllabus (AI path):', persistErr);
        }

        syllabusModal.style.display = "none";
        parseSyllabusButton.textContent = 'Parse Syllabus';
        parseSyllabusButton.disabled = false;
        return;
      }
    } catch (error) {
      console.log('AI parsing failed, falling back to local parsing:', error.message);
    }

    const lines = syllabusText.trim().split("\n");
    const rows = [];

    let courseCode = "";
    let courseTitle = "";
    const saveLocalCopyIndex = lines.findIndex((line) => line.includes("Save a Local Copy"));
    if (saveLocalCopyIndex !== -1) {
      courseCode = lines[saveLocalCopyIndex + 1] || "";
      courseTitle = lines[saveLocalCopyIndex + 3] || "";
    }

    const courseCodeInput = table.querySelector(".courseCode");
    const courseTitleInput = table.querySelector(".courseTopic");

    if (courseCodeInput) courseCodeInput.value = courseCode;
    if (courseTitleInput) courseTitleInput.value = courseTitle;

    for (const line of lines) {
      const parts = line.trim().split(/\s{2,}|\t+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const weight = parseFloat(parts[1]);
        if (!isNaN(weight)) {
          rows.push({ name, weight });
        }
      }
    }

    const existingRows = table.querySelectorAll("tr:not(:first-child, .columnTitles, #finalGradeRow)");
    existingRows.forEach(row => row.remove());

    // Add parsed rows (skip if they match course code/title)
    rows
      .filter(r => {
        const n = (r.name || "").trim();
        if (!n) return false;
        if (courseCode && n.toLowerCase() === courseCode.toLowerCase()) return false;
        if (courseTitle && n.toLowerCase() === courseTitle.toLowerCase()) return false;
        return true;
      })
      .forEach(({ name, weight }) => {
      const newRow = document.createElement("tr");
      newRow.innerHTML = `
        <td><input type="text" value="${name}"></td>
        <td><input type="text" class="dueInput"></td>
        <td><input type="number" class="gradeInput"></td>
        <td><input type="number" class="weightInput" value="${weight}"></td>
        <td><span class="lostOutput">—</span></td>
        <td class="actionsColumn">
          <button class="addRowBtn" title="Add row below">+</button>
          <button class="removeRowBtn" title="Remove selected row">-</button>
          <button class="moveRowBtn" title="Move selected row">&#9776;</button>
        </td>
      `;
      finalGradeRow.before(newRow);
    });

    const wrapper = table.closest(".table-wrapper");
    attachEventListeners(wrapper);
    calculateFinalGrade(table);

    // Immediately persist parsed data so it survives reloads (fallback path)
    try {
      const semesterId = new URLSearchParams(window.location.search).get("semesterId");
      if (semesterId) {
        const codeInput = table.querySelector(".courseCode");
        const topicInput = table.querySelector(".courseTopic");
        const unitsDropdown = table.querySelector(".courseUnitsDropdown");
        const code = codeInput?.value?.trim() || "";
        const topic = topicInput?.value?.trim() || "";
        const units = parseFloat(unitsDropdown?.value || "0.50");

        let courseId = wrapper.dataset.courseId || null;
        courseId = await saveCourse({ semesterId, code, topic, units, courseId });
        if (courseId) {
          wrapper.dataset.courseId = courseId;
          await clearEvaluations(semesterId, courseId);

          const evalRows = [...table.querySelectorAll("tr:not(.columnTitles):not(#finalGradeRow)")];
          for (const [index, row] of evalRows.entries()) {
            const name = row.querySelector("td:nth-child(1) input")?.value?.trim() || "";
            const due = row.querySelector(".dueInput")?.value?.trim() || "";
            const grade = row.querySelector(".gradeInput")?.value?.trim() || "";
            const weight = row.querySelector(".weightInput")?.value?.trim() || "";
            if (name || due || grade || weight) {
              await saveEvaluation({ semesterId, courseId, name, due, grade, weight, index });
            }
          }
        }
      }
    } catch (persistErr) {
      console.error('❌ Failed to persist parsed syllabus (fallback path):', persistErr);
    }

    syllabusModal.style.display = "none";
    
    // Reset button
    parseSyllabusButton.textContent = 'Parse Syllabus';
    parseSyllabusButton.disabled = false;
  });
}

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
    dropdownContent.classList.remove("show");
    dropdownContent.classList.remove("fade-out");
    semesterCard.classList.remove("showing-dropdown");
    dropBtn.classList.remove("active");
    openEditSemesterModal(semesterCard);
  });

  semesterCard.querySelector(".deleteSemester")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this semester?")) {
      const semesterId = semesterCard.dataset.semesterId;
      if (semesterId) deleteSemester(semesterId);
      semesterCard.remove();
    }
  });
}

export function openEditSemesterModal(semesterCard) {
  const name = semesterCard.querySelector(".semester-name").textContent;
  const dateTexts = semesterCard.querySelectorAll(".semester-dates p");
  const startText = dateTexts[0]?.textContent?.replace("Start: ", "") ?? "";
  const endText = dateTexts[1]?.textContent?.replace("End: ", "") ?? "";

  document.getElementById("semesterName").value = name;
  document.getElementById("startDate").value = convertToISO(startText);
  document.getElementById("endDate").value = convertToISO(endText);

  document.querySelector("#addSemesterModal h3").textContent = "Edit Semester";
  document.getElementById("saveSemester").textContent = "Update Semester";

  editingSemesterCard = semesterCard;
  document.getElementById("addSemesterModal").style.display = "block";
}

export { attachSemesterCardListeners };