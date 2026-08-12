import { calculateFinalGrade, calculateCurrentGPA } from './gradeCalc.js';
import { setupMoveRowButton } from './dragDrop.js';
import { toggleCollapse, showUndoToast, markSaving, markSaved } from './utils.js';
import { attachSyllabusButtonListeners } from './modal.js';
import { saveCourse, saveEvaluation, deleteCourse, deleteEvaluation } from './db.js';

// Client-side stable id for a new evaluation row, stamped synchronously so
// concurrent saves for the same row upsert one record instead of duplicating.
function newEvalId() {
  return (globalThis.crypto?.randomUUID?.() ||
    (Date.now().toString(36) + Math.random().toString(36).slice(2)));
}


export function addRow(event) {
  const clickedButton = event.target;
  const currentRow = clickedButton.closest("tr");
  const table = currentRow.closest("table");

  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td><input type="text"></td>
    <td><input type="text" class="dueInput"></td>
    <td><input type="number" class="gradeInput" step="0.01" min="0"></td>
    <td><input type="number" class="weightInput" step="0.01" min="0" max="100"></td>
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
  // Count only real evaluation rows (those with a grade input), so the
  // column-titles header row does not inflate the count and let the user
  // delete the final evaluation row.
  const evalRowCount = table.querySelectorAll("tr .gradeInput").length;

  if (evalRowCount > 1) {
    // Mark the row removed so an in-flight save cannot recreate it, and persist
    // the deletion (waiting for the course if it is still being created) so the
    // row does not resurrect on reload.
    rowToRemove.dataset.removed = "true";
    const wrapper = table.closest(".table-wrapper");
    const evalId = rowToRemove.dataset.evalId;
    const semesterId = new URLSearchParams(window.location.search).get("semesterId");
    if (evalId && semesterId && wrapper) {
      Promise.resolve(wrapper._coursePromise || wrapper.dataset.courseId).then((cid) => {
        const courseId = wrapper.dataset.courseId || cid;
        if (courseId) deleteEvaluation(semesterId, courseId, evalId);
      });
    }

    rowToRemove.remove();
    calculateFinalGrade({ target: table });
  } else {
    alert("At least one row must remain.");
  }
}

export function attachEventListeners(wrapper) {
  const table = wrapper.querySelector("table");
  if (!table) return;

  // Every attachment below is guarded per element, so this can be called again
  // after rows are added (or on re-render) and it wires only the new elements
  // instead of stacking duplicate listeners that fire calculations and saves
  // multiple times.
  table.querySelectorAll('.gradeInput').forEach((input) => {
    if (input.dataset.calcWired === "true") return;
    input.dataset.calcWired = "true";
    input.setAttribute('step','0.01');
    input.setAttribute('min','0');

    // Store previous value to track changes
    let previousValue = input.value;
    
    input.addEventListener('input', (e) => {
      const cursorPos = input.selectionStart;
      const currentValue = input.value;
      
      // Remove invalid characters
      let v = currentValue.replace(/[^0-9.]/g, '');
      
      // Remove extra decimal points (keep only the first one)
      const firstDot = v.indexOf('.');
      if (firstDot !== -1) {
        v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
      }
      
      // Only update if sanitized value is different from what user typed
      if (v !== currentValue) {
        // Calculate new cursor position based on how many valid chars were before cursor
        let validCharsBefore = 0;
        let hasSeenDot = false;
        for (let i = 0; i < cursorPos && i < currentValue.length; i++) {
          const char = currentValue[i];
          if (char >= '0' && char <= '9') {
            validCharsBefore++;
          } else if (char === '.' && !hasSeenDot) {
            validCharsBefore++;
            hasSeenDot = true;
          }
        }
        
        input.value = v;
        previousValue = v;
        
        // Set cursor position, ensuring it doesn't exceed the new value length
        const newCursorPos = Math.min(validCharsBefore, v.length);
        setTimeout(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        previousValue = v;
      }
    });
    input.addEventListener('input', calculateFinalGrade);
  });
  table.querySelectorAll('.weightInput').forEach((input) => {
    if (input.dataset.calcWired === "true") return;
    input.dataset.calcWired = "true";
    input.setAttribute('step','0.01');
    input.setAttribute('min','0');
    input.setAttribute('max','100');

    // Store previous value to track changes
    let previousValue = input.value;
    
    input.addEventListener('input', (e) => {
      const cursorPos = input.selectionStart;
      const currentValue = input.value;
      
      // Remove invalid characters
      let v = currentValue.replace(/[^0-9.]/g, '');
      
      // Remove extra decimal points (keep only the first one)
      const firstDot = v.indexOf('.');
      if (firstDot !== -1) {
        v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
      }
      
      // Only update if sanitized value is different from what user typed
      if (v !== currentValue) {
        // Calculate new cursor position based on how many valid chars were before cursor
        let validCharsBefore = 0;
        let hasSeenDot = false;
        for (let i = 0; i < cursorPos && i < currentValue.length; i++) {
          const char = currentValue[i];
          if (char >= '0' && char <= '9') {
            validCharsBefore++;
          } else if (char === '.' && !hasSeenDot) {
            validCharsBefore++;
            hasSeenDot = true;
          }
        }
        
        input.value = v;
        previousValue = v;
        
        // Set cursor position, ensuring it doesn't exceed the new value length
        const newCursorPos = Math.min(validCharsBefore, v.length);
        setTimeout(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        previousValue = v;
      }
    });
    input.addEventListener('input', calculateFinalGrade);
  });

  // Add change listener to units dropdown to immediately recalculate GPA when units change
  table.querySelectorAll('.courseUnitsDropdown').forEach((dropdown) => {
    dropdown.removeEventListener("change", calculateCurrentGPA); // avoid duplicates
    dropdown.addEventListener("change", calculateCurrentGPA);
  });

  table.querySelectorAll(".addRowBtn").forEach((btn) => {
    if (btn.dataset.wired === "true") return;
    btn.dataset.wired = "true";
    btn.addEventListener("click", addRow);
  });

  table.querySelectorAll(".removeRowBtn").forEach((btn) => {
    if (btn.dataset.wired === "true") return;
    btn.dataset.wired = "true";
    btn.addEventListener("click", removeRow);
  });

  // setupMoveRowButton is idempotent per button.
  table.querySelectorAll(".moveRowBtn").forEach((btn) =>
    setupMoveRowButton(btn)
  );

  const semesterId = new URLSearchParams(window.location.search).get("semesterId");

  // Wire up persistence once per wrapper. A single delegated focusout listener
  // covers every current and future evaluation row (so added rows are saved
  // without re-attaching), and the course record is created lazily on the first
  // edit so a table filled with only grades is never silently lost.
  if (semesterId && wrapper.dataset.saveWiringAttached !== "true") {
    wrapper.dataset.saveWiringAttached = "true";

    const codeInput = wrapper.querySelector(".courseCode");
    const topicInput = wrapper.querySelector(".courseTopic");
    const unitsDropdown = wrapper.querySelector(".courseUnitsDropdown");

    // Create the course exactly once, even under rapid concurrent blurs, so two
    // quick edits cannot each create a duplicate course.
    const ensureCourse = () => {
      if (wrapper.dataset.courseId) return Promise.resolve(wrapper.dataset.courseId);
      if (!wrapper._coursePromise) {
        const code = codeInput?.value.trim() || "";
        const topic = topicInput?.value.trim() || "";
        const units = parseFloat(unitsDropdown?.value || "0.50");
        wrapper._coursePromise = Promise.resolve(saveCourse({ semesterId, code, topic, units }))
          .then((newId) => {
            if (newId) wrapper.dataset.courseId = newId;
            wrapper._coursePromise = null;
            return newId || null;
          })
          .catch(() => { wrapper._coursePromise = null; return null; });
      }
      return wrapper._coursePromise;
    };

    // Persist course-header edits. Creates the course if needed; no longer
    // requires a 2+ character code before anything is saved.
    const saveCourseHeader = async () => {
      const code = codeInput?.value.trim() || "";
      const topic = topicInput?.value.trim() || "";
      const units = parseFloat(unitsDropdown?.value || "0.50");
      markSaving();
      try {
        const courseId = await ensureCourse();
        if (courseId) await saveCourse({ semesterId, code, topic, units, courseId });
      } finally {
        markSaved();
      }
    };
    // Text fields save when focus leaves them. The units dropdown saves on
    // change instead: picking an option leaves focus on the select, so a blur
    // may never come and the new unit value (and the GPA it feeds) was lost on
    // reload.
    [codeInput, topicInput].forEach((el) => el && el.addEventListener("blur", saveCourseHeader));
    if (unitsDropdown) unitsDropdown.addEventListener("change", saveCourseHeader);

    // Persist one evaluation row, creating the course on first edit.
    const saveEvalRow = async (row) => {
      if (row.dataset.removed === "true") return;
      const name = row.querySelector("td:nth-child(1) input")?.value.trim();
      const due = row.querySelector(".dueInput")?.value.trim();
      const grade = row.querySelector(".gradeInput")?.value.trim();
      const weight = row.querySelector(".weightInput")?.value.trim();
      const isEmpty = !name && !due && !grade && !weight;

      // Skip only a brand-new empty row. A row that was already saved and then
      // cleared must persist the blank values, otherwise the old values come
      // back on reload.
      if (isEmpty && !row.dataset.evalId) return;

      // Stamp a stable id synchronously (before any await) so two quick
      // blur-saves on the same new row upsert one record instead of each
      // inserting a duplicate.
      if (!row.dataset.evalId) row.dataset.evalId = newEvalId();
      const evalId = row.dataset.evalId;

      markSaving();
      try {
        const courseId = await ensureCourse();
        if (!courseId) return;

        // If the row was removed while its course was still being created,
        // delete it rather than resurrecting it.
        if (row.dataset.removed === "true") {
          deleteEvaluation(semesterId, courseId, evalId);
          return;
        }

        const evalRows = [...wrapper.querySelectorAll("tr")].filter(r =>
          r.querySelector('.dueInput') || r.querySelector('.gradeInput') || r.querySelector('.weightInput')
        );
        const index = evalRows.indexOf(row);
        // Send the whole on-screen order alongside the row. Saving only this
        // row's index would leave a row inserted between two existing rows
        // sharing an index with its neighbour, which reshuffles it on reload.
        const orderedIds = evalRows.map((r) => r.dataset.evalId).filter(Boolean);
        const savedId = await saveEvaluation({ semesterId, courseId, evalId, name, due, grade, weight, index, orderedIds });
        if (savedId) row.dataset.evalId = savedId;
      } finally {
        markSaved();
      }
    };

    wrapper.addEventListener("focusout", (e) => {
      const input = e.target;
      if (!input.matches?.("input")) return;
      const row = input.closest("tr");
      if (!row) return;
      const rowHasEvalInput = row.querySelector('.dueInput') || row.querySelector('.gradeInput') || row.querySelector('.weightInput');
      const isEvalInput = input.classList.contains("dueInput") ||
        input.classList.contains("gradeInput") ||
        input.classList.contains("weightInput") ||
        (rowHasEvalInput && input.closest("td")?.cellIndex === 0);
      if (isEvalInput) saveEvalRow(row);
    });
  }

  const collapseBtn = wrapper.querySelector(".fullScreen");
  if (collapseBtn && collapseBtn.dataset.wired !== "true") {
    collapseBtn.dataset.wired = "true";
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
                <button class="deleteButton"><i data-lucide="trash-2" style="width: 20px; height: 20px;"></i></button>
                <button class="fullScreen"><i data-lucide="chevron-left" style="width: 20px; height: 20px;"></i></button>
                <input type="text" placeholder="Insert Course Topic" class="courseTopic">
                <button class="syllabusButton"><i data-lucide="file-text" style="width: 20px; height: 20px;"></i></button>
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
      const { id = "", name = "", due = "", grade = "", weight = "" } = evalData;
      const row = document.createElement("tr");
      // Remember the stable evaluation id so edits/deletes/reorders target the
      // correct stored record rather than a positional index.
      if (id) row.dataset.evalId = id;
      row.innerHTML = `
        <td><input type="text" placeholder="Evaluation ${index + 1}"></td>
        <td><input type="text" class="dueInput"></td>
        <td><input type="number" class="gradeInput" step="0.01" min="0"></td>
        <td><input type="number" class="weightInput" step="0.01" min="0" max="100"></td>
        <td><span class="lostOutput">—</span></td>
        <td class="actionsColumn">
          <button class="addRowBtn" title="Add row below">+</button>
          <button class="removeRowBtn" title="Remove selected row">-</button>
          <button class="moveRowBtn" title="Move selected row">&#9776;</button>
        </td>
      `;
      // Set saved values as properties, never interpolated into HTML, so a
      // stored value like `"><img onerror=...>` cannot execute on load.
      row.querySelector("td:nth-child(1) input").value = name;
      row.querySelector(".dueInput").value = due;
      row.querySelector(".gradeInput").value = grade;
      row.querySelector(".weightInput").value = weight;
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
        <td><input type="number" class="gradeInput" step="0.01" min="0"></td>
        <td><input type="number" class="weightInput" step="0.01" min="0" max="100"></td>
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
        <td><input type="number" class="gradeInput" step="0.01" min="0"></td>
        <td><input type="number" class="weightInput" step="0.01" min="0" max="100"></td>
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
      const semesterId = new URLSearchParams(window.location.search).get("semesterId");
      const courseId = newTable.dataset.courseId;
      const parent = newTable.parentNode;
      const anchor = newTable.nextSibling;

      // Remove immediately and offer an Undo instead of a blocking confirm().
      // The course is only deleted from storage once the grace period passes.
      newTable.remove();
      calculateCurrentGPA();
      showUndoToast(
        "Course deleted",
        () => {
          if (parent) parent.insertBefore(newTable, anchor);
          calculateCurrentGPA();
        },
        () => {
          if (semesterId && courseId) deleteCourse(semesterId, courseId);
        }
      );
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


