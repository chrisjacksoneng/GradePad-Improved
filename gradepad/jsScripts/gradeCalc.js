import { parseNumber, lostPoints, courseMark, weightedAverage } from './grading.js';

export function calculateFinalGrade(event) {
  const table = event?.target?.closest?.("table") || event;
  if (!table) return;

  const rows = table.querySelectorAll("tr:not(:first-child, #finalGradeRow)");
  const entries = [];

  rows.forEach((row) => {
    const gradeInput = row.querySelector(".gradeInput");
    const weightInput = row.querySelector(".weightInput");
    const lostOutput = row.querySelector(".lostOutput");

    if (!gradeInput || !weightInput || !lostOutput) return;

    const grade = parseNumber(gradeInput.value);
    const weight = parseNumber(weightInput.value);
    const lost = lostPoints(grade, weight);

    if (lost === null) {
      lostOutput.innerText = "—";
      lostOutput.style.color = "black";
      return;
    }

    entries.push({ grade, weight });
    lostOutput.innerText = `${lost > 0 ? "+" : ""}${lost.toFixed(2)}%`;
    lostOutput.style.color =
      lost > 0 ? "#6aa84f" : lost < 0 ? "#cc0000" : "black";
  });

  const finalGradeCell = table.querySelector(".finalGrade");
  if (!finalGradeCell) return;

  const mark = courseMark(entries);

  if (mark === null) {
    finalGradeCell.innerText = "Pending";
    finalGradeCell.style.color = "black";
  } else {
    finalGradeCell.innerText = `${mark.toFixed(2)}%`;
    finalGradeCell.style.color =
      mark >= 80 ? "#6aa84f" : mark >= 50 ? "#E65100" : "#cc0000";
  }

  calculateCurrentGPA();
}

export function calculateCurrentGPA() {
  const tables = document.querySelectorAll(".table-wrapper table");
  const courses = [];

  tables.forEach((table) => {
    const finalGradeCell = table.querySelector(".finalGrade");
    const unitsDropdown = table.querySelector(".courseUnitsDropdown");

    if (!finalGradeCell || !unitsDropdown) return;
    // A course with nothing graded yet is left out entirely rather than
    // counted as a zero.
    if (finalGradeCell.textContent === "Pending") return;

    courses.push({
      mark: parseNumber(finalGradeCell.textContent),
      units: parseNumber(unitsDropdown.value),
    });
  });

  const average = weightedAverage(courses);

  const gpaElement = document.getElementById("navGpa");
  if (gpaElement) {
    gpaElement.textContent = `GPA: ${(average ?? 0).toFixed(2)}`;
  }
}
