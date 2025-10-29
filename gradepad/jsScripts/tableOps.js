import { calculateFinalGrade, calculateCurrentGPA } from './gradeCalc.js';
import { setupMoveRowButton } from './dragDrop.js';
import { toggleCollapse } from './utils.js';
import { attachSyllabusButtonListeners } from './modal.js';
import { saveCourse, saveEvaluation, deleteCourse, clearEvaluations } from './db.js';


export function addRow(event) {
  const clickedButton = event.target;
  const currentRow = clickedButton.closest("tr");
  const table = currentRow.closest("table");

  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td><input type="text"></td>
    <td><input type="text" class="dueInput"></td>
    <td><input type="number" class="gradeInput"></td>
    <td><input type="number" class="weightInput"></td>
    <td><span class="lostOutput">—</span></td>
    <td class="actionsColumn">
      <button class="addRowBtn" title="Add row below">+</button>
      <button class="removeRowBtn" title="Remove selected row">-</button>
      <button class="moveRowBtn" title="Move selected row">&#9776;</button>
    </td>
  `;
  currentRow.insertAdjacentElement("afterend", newRow);
  attachEventListeners(table.closest(".table-wrapper"));
  calculateFinalGrade({ target: table });
}

export function removeRow(event) {
  const rowToRemove = event.target.closest("tr");
  const table = rowToRemove.closest("table");
  const totalRows = table.querySelectorAll("tr:not(:first-child, #finalGradeRow)").length;

  if (totalRows > 1) {
    rowToRemove.remove();
    calculateFinalGrade({ target: table });
  } else {
    alert("At least one row must remain.");
  }
}

export function attachEventListeners(wrapper) {
  if (wrapper.dataset.inputListenersAttached !== "true") {
    wrapper.dataset.inputListenersAttached = "true";
  
    const table = wrapper.querySelector("table");
    if (!table) return;
  
    table.querySelectorAll(".gradeInput, .weightInput").forEach((input) =>
      input.addEventListener("input", calculateFinalGrade)
    );
  
    table.querySelectorAll(".addRowBtn").forEach((btn) =>
      btn.addEventListener("click", addRow)
    );
  
    table.querySelectorAll(".removeRowBtn").forEach((btn) =>
      btn.addEventListener("click", removeRow)
    );
  
    table.querySelectorAll(".moveRowBtn").forEach((btn) =>
      setupMoveRowButton(btn)
    );
  
    const collapseBtn = wrapper.querySelector(".fullScreen");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", toggleCollapse);
    }
  
    attachSyllabusButtonListeners(wrapper);
  }
  

  const table = wrapper.querySelector("table");
  if (!table) return;

  table.querySelectorAll(".gradeInput, .weightInput").forEach((input) =>
    input.addEventListener("input", calculateFinalGrade)
  );

  table.querySelectorAll(".addRowBtn").forEach((btn) =>
    btn.addEventListener("click", addRow)
  );

  table.querySelectorAll(".removeRowBtn").forEach((btn) =>
    btn.addEventListener("click", removeRow)
  );

  table.querySelectorAll(".moveRowBtn").forEach((btn) =>
    setupMoveRowButton(btn)
  );

  // 👇 All this moved inside the same listener gate
  const semesterId = new URLSearchParams(window.location.search).get("semesterId");

  if (semesterId) {
    const courseId = wrapper.dataset.courseId;
    if (courseId) {
      const saveEval = (input) => {
        const row = input.closest("tr");
        const name = row.querySelector("td:nth-child(1) input")?.value.trim();
        const due = row.querySelector(".dueInput")?.value.trim();
        const grade = row.querySelector(".gradeInput")?.value.trim();
        const weight = row.querySelector(".weightInput")?.value.trim();

        // Only evaluate real evaluation rows
        const evalRows = [...wrapper.querySelectorAll("tr")].filter(r =>
          r.querySelector('.dueInput') || r.querySelector('.gradeInput') || r.querySelector('.weightInput')
        );
        const index = evalRows.indexOf(row);

        console.log("💾 Auto-saving evaluation:", { name, due, grade, weight, index });
        saveEvaluation({ semesterId, courseId, name, due, grade, weight, index });
        
      };

      // Attach listeners ONLY to real evaluation rows
      const evalRows = [...wrapper.querySelectorAll("tr")].filter(r =>
        r.querySelector('.dueInput') || r.querySelector('.gradeInput') || r.querySelector('.weightInput')
      );
      evalRows.forEach(r => {
        r.querySelectorAll(".dueInput, .gradeInput, .weightInput, td:nth-child(1) input").forEach((input) => {
          input.addEventListener("blur", () => saveEval(input));
        });
      });
    } else {
      // Wait for courseId to appear, then attach once
      const observer = new MutationObserver(() => {
        if (wrapper.dataset.courseId) {
          observer.disconnect();
          attachEventListeners(wrapper); // try again, safely
        }
      });
      observer.observe(wrapper, { attributes: true, attributeFilter: ["data-course-id"] });
    }
  }

  // Add course save listeners when semesterId is available
  if (semesterId && wrapper.dataset.courseSaveAttached !== "true") {
    const unitsDropdown = wrapper.querySelector(".courseUnitsDropdown");
    const codeInput = wrapper.querySelector(".courseCode");
    const topicInput = wrapper.querySelector(".courseTopic");
    const table = wrapper.querySelector("table");

    if (codeInput && topicInput && unitsDropdown && table) {
      const triggerSaveCourse = async () => {
        const code = codeInput.value.trim();
        const topic = topicInput.value.trim();
        const units = parseFloat(unitsDropdown.value);

        // Guard: only create a course when there is meaningful data
        const hasMeaningfulData = (code.length >= 2 || topic.length >= 2) && !isNaN(units);

        if (hasMeaningfulData) {
          const existingCourseId = wrapper.dataset.courseId;

          if (existingCourseId) {
            await saveCourse({ semesterId, code, topic, units, courseId: existingCourseId });
          } else {
            const newCourseId = await saveCourse({ semesterId, code, topic, units });
            if (!newCourseId) return;

            wrapper.dataset.courseId = newCourseId;

            await clearEvaluations(semesterId, newCourseId);

            // Save existing evaluation rows (filtered)
            const candidateRows = table.querySelectorAll("tr:not(.columnTitles):not(#finalGradeRow)");
            const evalRows = [...candidateRows].filter(r =>
              r.querySelector('.dueInput') || r.querySelector('.gradeInput') || r.querySelector('.weightInput')
            );
            for (const [index, row] of evalRows.entries()) {
              const name = row.querySelector("td:nth-child(1) input")?.value.trim();
              const due = row.querySelector(".dueInput")?.value.trim();
              const grade = row.querySelector(".gradeInput")?.value.trim();
              const weight = row.querySelector(".weightInput")?.value.trim();

              if (name || due || grade || weight) {
                await saveEvaluation({ semesterId, courseId: newCourseId, name, due, grade, weight, index });
              }
            }
          }
        }
      };

      [codeInput, topicInput, unitsDropdown].forEach((el) => el.addEventListener("blur", triggerSaveCourse));
      wrapper.dataset.courseSaveAttached = "true";
    }
  }

  const collapseBtn = wrapper.querySelector(".fullScreen");
  if (collapseBtn) {
    collapseBtn.addEventListener("click", toggleCollapse);
  }

  attachSyllabusButtonListeners(wrapper);
}


export function attachAllEventListeners() {
  document.querySelectorAll(".table-wrapper").forEach((wrapper) => {
    attachEventListeners(wrapper);
  });
}

export function createNewTable(evaluations = [], useExistingTable = false) {
  let newTable;

  if (useExistingTable) {
    // ✅ Reuse the existing table from HTML
    newTable = document.querySelector(".table-wrapper");
  } else {
    // ✅ Create a new table wrapper
    const lastTable = document.querySelector(".table-wrapper:last-of-type");
    newTable = document.createElement("div");
    newTable.classList.add("table-wrapper");
    

    newTable.innerHTML = `
      <table>
        <tr>
          <td colspan="6" class="courseHeader">
            <div class="courseContainer">
              <div class="titleBox">
                <input type="text" placeholder="Insert Course Code" class="courseCode">
                <button class="deleteButton" title="Delete Table"><i data-lucide="trash-2" style="width: 20px; height: 20px;"></i></button>
                <button class="fullScreen" title="Collapse Table">←</button>
                <input type="text" placeholder="Insert Course Topic" class="courseTopic">
                <button class="syllabusButton" title="Parse Syllabus"><i data-lucide="file-text" style="width: 20px; height: 20px;"></i></button>
                <div class="syllabusModal modal">
                  <div class="modal-content">
                    <span class="close">&times;</span>
                    <textarea class="syllabusTextbox" placeholder="Paste the course syllabus here..."></textarea>
                    <button class="parseSyllabusButton">Parse Syllabus</button>
                    <p class="syllabusNote">Note: Syllabus parsing is not always 100% accurate. Please double check all values match the syllabus.</p>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr class="columnTitles">
          <th>Evaluation</th>
          <th class="collapse-hide">Due</th>
          <th>Mark</th>
          <th class="collapse-hide">Weight</th>
          <th class="collapse-hide">Lost</th>
          <th class="collapse-hide">Actions</th>
        </tr>
        <tr id="finalGradeRow">
          <td colspan="2" style="font-weight: bold; text-align: left; background-color: var(--final-grade-bg); color: black; padding: 14px;">
            Current Mark:
          </td>
          <td colspan="2" class="finalGrade" style="font-weight: bold; text-align: left; background-color: var(--final-grade-bg); color: black; padding: 14px;">
            0.00%
          </td>
          <td colspan="2" style="text-align: right; background-color: var(--final-grade-bg); padding: 14px;">
            [<select class="courseUnitsDropdown">
              <option value="0.25">0.25 units</option>
              <option value="0.50" selected>0.50 units</option>
              <option value="0.75">0.75 units</option>
              <option value="1.00">1.00 units</option>
              <option value="1.50">1.50 units</option>
              <option value="2.00">2.00 units</option>
            </select>]
          </td>
        </tr>
      </table>
    `;

    if (lastTable) {
      lastTable.insertAdjacentElement("afterend", newTable);
    } else {
      const container = document.querySelector(".table-container");
      const firstRow = container?.querySelector(".table-row");
      if (container && firstRow) {
        const addBtn = firstRow.querySelector('#addTable');
        const existingTopTable = firstRow.querySelector('.table-wrapper');
        if (!existingTopTable && addBtn) {
          // Put the very first real table to the left of the + Course button
          firstRow.insertBefore(newTable, addBtn);
        } else {
          // Additional tables go below the first row
          container.insertBefore(newTable, firstRow.nextSibling);
        }
      } else if (container) {
        container.appendChild(newTable);
      }
    }
  }

  const table = newTable.querySelector("table");
  const finalRow = table.querySelector("#finalGradeRow");

  // 🔄 Remove any existing rows before #finalGradeRow
  const staticRows = table.querySelectorAll("tr:not(.columnTitles):not(:first-child):not(#finalGradeRow)");
  staticRows.forEach((row) => {
    if (row !== finalRow) row.remove();
  });

  if (evaluations.length > 0) {
    evaluations.forEach((evalData, index) => {
      const { name = "", due = "", grade = "", weight = "" } = evalData;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="text" value="${name}" placeholder="Evaluation ${index + 1}"></td>
        <td><input type="text" class="dueInput" value="${due}"></td>
        <td><input type="text" class="gradeInput" value="${grade}"></td>
        <td><input type="text" class="weightInput" value="${weight}"></td>
        <td><span class="lostOutput">—</span></td>
        <td class="actionsColumn">
          <button class="addRowBtn" title="Add row below">+</button>
          <button class="removeRowBtn" title="Remove selected row">-</button>
          <button class="moveRowBtn" title="Move selected row">&#9776;</button>
        </td>
      `;
      finalRow.before(row);
    });
    // Pad with blank rows up to minimum of 3
    const minRows = 3;
    const toAdd = Math.max(0, minRows - evaluations.length);
    for (let i = 0; i < toAdd; i++) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="text" placeholder="Evaluation ${evaluations.length + i + 1}"></td>
        <td><input type="text" class="dueInput"></td>
        <td><input type="text" class="gradeInput"></td>
        <td><input type="text" class="weightInput"></td>
        <td><span class="lostOutput">—</span></td>
        <td class="actionsColumn">
          <button class="addRowBtn" title="Add row below">+</button>
          <button class="removeRowBtn" title="Remove selected row">-</button>
          <button class="moveRowBtn" title="Move selected row">&#9776;</button>
        </td>
      `;
      finalRow.before(row);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="text" placeholder="Evaluation ${i + 1}"></td>
        <td><input type="text" class="dueInput"></td>
        <td><input type="text" class="gradeInput"></td>
        <td><input type="text" class="weightInput"></td>
        <td><span class="lostOutput">—</span></td>
        <td class="actionsColumn">
          <button class="addRowBtn" title="Add row below">+</button>
          <button class="removeRowBtn" title="Remove selected row">-</button>
          <button class="moveRowBtn" title="Move selected row">&#9776;</button>
        </td>
      `;
      finalRow.before(row);
    }
  }

  // ✅ Delete button
  const deleteBtn = newTable.querySelector(".deleteButton");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this table?")) {
        const semesterId = new URLSearchParams(window.location.search).get("semesterId");
        const courseId = newTable.dataset.courseId;

        if (semesterId && courseId) {
          deleteCourse(semesterId, courseId);
        }
        newTable.remove();
      }
    });
  }

  // Initialize Lucide icons if available
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  attachEventListeners(newTable);

  // Recalculate lost/current mark/GPA after rendering saved values
  try {
    calculateFinalGrade(table);
  } catch (_) {}

  return newTable;
}


