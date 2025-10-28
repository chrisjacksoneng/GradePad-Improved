export function calculateFinalGrade(event) {
    const table = event?.target?.closest?.("table") || event;
    if (!table) return;
  
    const rows = table.querySelectorAll("tr:not(:first-child, #finalGradeRow)");
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let validInput = false;
  
    rows.forEach((row) => {
      const gradeInput = row.querySelector(".gradeInput");
      const weightInput = row.querySelector(".weightInput");
      const lostOutput = row.querySelector(".lostOutput");
  
      if (!gradeInput || !weightInput || !lostOutput) return;
  
      let grade = parseFloat(gradeInput.value);
      let weight = parseFloat(weightInput.value);
  
      if (!isNaN(grade) && !isNaN(weight) && weight > 0) {
        totalWeightedScore += grade * weight;
        totalWeight += weight;
        validInput = true;
  
        let lostValue = ((grade - 100) / 100) * weight;
        lostOutput.innerText = `${lostValue > 0 ? "+" : ""}${lostValue.toFixed(2)}%`;
        lostOutput.style.color =
          lostValue > 0 ? "#6aa84f" : lostValue < 0 ? "#cc0000" : "black";
      } else {
        lostOutput.innerText = "—";
        lostOutput.style.color = "black";
      }
    });
  
    const finalGradeCell = table.querySelector(".finalGrade");
    if (!finalGradeCell) return;
  
    if (!validInput) {
      finalGradeCell.innerText = "Pending";
      finalGradeCell.style.color = "black";
    } else {
      let finalGrade = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
      finalGradeCell.innerText = `${finalGrade.toFixed(2)}%`;
      finalGradeCell.style.color =
        finalGrade >= 80 ? "#6aa84f" : finalGrade >= 50 ? "#E65100" : "#cc0000";
    }
  
    calculateCurrentGPA();
  }
  
  export function calculateCurrentGPA() {
    const tables = document.querySelectorAll(".table-wrapper table");
    let weightedGradeSum = 0;
    let totalUnits = 0;
  
    tables.forEach((table) => {
      const finalGradeCell = table.querySelector(".finalGrade");
      const unitsDropdown = table.querySelector(".courseUnitsDropdown");
  
      if (
        finalGradeCell &&
        finalGradeCell.textContent !== "Pending" &&
        unitsDropdown
      ) {
        const grade = parseFloat(finalGradeCell.textContent);
        const units = parseFloat(unitsDropdown.value);
  
        if (!isNaN(grade) && !isNaN(units)) {
          weightedGradeSum += grade * units;
          totalUnits += units;
        }
      }
    });
  
    const average =
      totalUnits > 0 ? (weightedGradeSum / totalUnits).toFixed(2) : "0.00";
    
    const gpaElement = document.getElementById("navGpa");
    if (gpaElement) {
      gpaElement.textContent = `GPA: ${average}`;
    }
  }
  