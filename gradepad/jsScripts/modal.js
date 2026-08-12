import { saveCourse, clearEvaluations, saveEvaluation } from './db.js';
import { attachEventListeners } from './tableOps.js';
import { calculateFinalGrade } from './gradeCalc.js';

export function attachSyllabusButtonListeners(tableElement) {
  if (tableElement.dataset.syllabusWired === "true") return;

  const syllabusModal = tableElement.querySelector(".syllabusModal");
  const syllabusButton = tableElement.querySelector(".syllabusButton");
  const closeModal = tableElement.querySelector(".syllabusModal .close");
  const parseSyllabusButton = tableElement.querySelector(".parseSyllabusButton");
  const syllabusTextbox = tableElement.querySelector(".syllabusTextbox");

  if (!syllabusButton || !syllabusModal || !closeModal || !parseSyllabusButton || !syllabusTextbox) return;

  // Only mark as wired once the elements exist, so an early call before the
  // modal is rendered does not permanently block wiring.
  tableElement.dataset.syllabusWired = "true";

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
          // Parser output is attacker-influenceable (a malicious syllabus); set
          // values as properties so they can never execute as HTML.
          newRow.querySelector("td:nth-child(1) input").value = assignment.name || 'Assignment';
          newRow.querySelector(".dueInput").value = assignment.dueDate || 'TBD';
          newRow.querySelector(".weightInput").value = (assignment.weight ?? 0);
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

              const evalRows = [...table.querySelectorAll("tr")].filter(r =>
                r.querySelector('.dueInput') || r.querySelector('.gradeInput') || r.querySelector('.weightInput')
              );
              for (const [index, row] of evalRows.entries()) {
                const name = row.querySelector("td:nth-child(1) input")?.value?.trim() || "";
                const due = row.querySelector(".dueInput")?.value?.trim() || "";
                const grade = row.querySelector(".gradeInput")?.value?.trim() || "";
                const weight = row.querySelector(".weightInput")?.value?.trim() || "";
                if (name || due || grade || weight) {
                  const savedId = await saveEvaluation({ semesterId, courseId, evalId: row.dataset.evalId || null, name, due, grade, weight, index });
                  if (savedId) row.dataset.evalId = savedId;
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
      newRow.querySelector("td:nth-child(1) input").value = name;
      newRow.querySelector(".weightInput").value = weight;
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

          const evalRows = [...table.querySelectorAll("tr")].filter(r =>
            r.querySelector('.dueInput') || r.querySelector('.gradeInput') || r.querySelector('.weightInput')
          );
          for (const [index, row] of evalRows.entries()) {
            const name = row.querySelector("td:nth-child(1) input")?.value?.trim() || "";
            const due = row.querySelector(".dueInput")?.value?.trim() || "";
            const grade = row.querySelector(".gradeInput")?.value?.trim() || "";
            const weight = row.querySelector(".weightInput")?.value?.trim() || "";
            if (name || due || grade || weight) {
              const savedId = await saveEvaluation({ semesterId, courseId, evalId: row.dataset.evalId || null, name, due, grade, weight, index });
              if (savedId) row.dataset.evalId = savedId;
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
