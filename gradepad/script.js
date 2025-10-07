console.log("Script loaded");

// ========== GLOBAL STATE VARIABLES ==========
let editingSemesterCard = null;
let isDragging = false;
let draggedRow = null;
let initialY = 0;
let originalIndex = -1;

// ========== CORE FUNCTIONS USED EARLY ==========

function calculateFinalGrade(event) {
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
      finalGrade >= 80
        ? "#6aa84f"
        : finalGrade >= 50
        ? "#E65100"
        : "#cc0000";
  }

  calculateCurrentGPA();
}

function calculateCurrentGPA() {
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
  document.getElementById("current-gpa").textContent = `Term GPA: ${average}`;
}


function addRow(event) {
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

function removeRow(event) {
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

function toggleCollapse(event) {
  const collapseButton = event.target;
  const tableWrapper = collapseButton.closest(".table-wrapper");
  const table = tableWrapper?.querySelector("table");
  const deleteButton = table.querySelector(".deleteButton");
  const finalGradeRow = table.querySelector("#finalGradeRow");

  if (!table || !finalGradeRow) return;

  const finalMarkLabel = finalGradeRow.children[0];
  const finalMarkValue = finalGradeRow.children[1];
  const unitsCell = finalGradeRow.children[2];

  const isCollapsed = table.classList.toggle("collapsed");
  deleteButton.style.display = isCollapsed ? "none" : "inline-block";

  const syllabusButton = table.querySelector(".syllabusButton");
  if (syllabusButton) {
    syllabusButton.style.display = isCollapsed ? "none" : "inline-block";
  }

  const courseUnitsDropdown = table.querySelector(".courseUnitsDropdown");
  if (courseUnitsDropdown) {
    courseUnitsDropdown.style.display = isCollapsed ? "none" : "inline-block";
  }

  finalMarkLabel.setAttribute("colspan", isCollapsed ? "1" : "2");
  finalMarkValue.setAttribute("colspan", isCollapsed ? "1" : "2");
  if (unitsCell) unitsCell.style.display = isCollapsed ? "none" : "table-cell";

  collapseButton.innerText = isCollapsed ? "⛶" : "←";
}


function setupMoveRowButton(button) {
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

document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mouseup", handleMouseUp);

function setupDeleteButton(deleteButton) {
  deleteButton.addEventListener("click", function (event) {
    event.stopPropagation();

    const existingTooltip = document.querySelector(".delete-tooltip");
    if (existingTooltip) {
      existingTooltip.remove();
      return;
    }

    const tooltip = document.createElement("div");
    tooltip.classList.add("delete-tooltip");
    tooltip.innerHTML = `
      <span class="close-tooltip">&times;</span>
      <p>Are you sure you want to delete this table?</p>
      <div class="tooltip-buttons">
        <button class="confirm-delete">Yes</button>
        <button class="cancel-delete">No</button>
      </div>
    `;

    const rect = deleteButton.getBoundingClientRect();
    tooltip.style.position = "absolute";
    tooltip.style.top = rect.bottom + window.scrollY + "px";
    tooltip.style.left = rect.left + window.scrollX + "px";
    document.body.appendChild(tooltip);

    tooltip.querySelector(".confirm-delete").addEventListener("click", () => {
      const wrapper = deleteButton.closest(".table-wrapper");
      if (wrapper) wrapper.remove();
      tooltip.remove();
      calculateCurrentGPA();
    });

    tooltip.querySelector(".cancel-delete").addEventListener("click", () => tooltip.remove());
    tooltip.querySelector(".close-tooltip").addEventListener("click", () => tooltip.remove());
  });
}

function attachSyllabusButtonListeners(tableElement) {
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

  parseSyllabusButton.addEventListener("click", () => {
    const syllabusText = syllabusTextbox.value;
    const table = tableElement.querySelector("table");
    if (table) parseSyllabus(syllabusText, table);
    syllabusModal.style.display = "none";
  });
}

// ========== MAIN EVENT ATTACHER ==========

function attachEventListeners(wrapper) {
  const table = wrapper.querySelector("table");
  if (!table) return;

  table.querySelectorAll(".courseUnitsDropdown").forEach((dropdown) => {
    dropdown.removeEventListener("change", calculateCurrentGPA); // avoid duplicates
    dropdown.addEventListener("change", calculateCurrentGPA);
  });

  table.querySelectorAll(".gradeInput, .weightInput").forEach((input) => {
    input.removeEventListener("input", calculateFinalGrade);
    input.addEventListener("input", calculateFinalGrade);
  });

  table.querySelectorAll(".addRowBtn").forEach((btn) => {
    btn.removeEventListener("click", addRow);
    btn.addEventListener("click", addRow);
  });

  table.querySelectorAll(".removeRowBtn").forEach((btn) => {
    btn.removeEventListener("click", removeRow);
    btn.addEventListener("click", removeRow);
  });

  table.querySelectorAll(".moveRowBtn").forEach((btn) => {
    btn.removeEventListener("mousedown", setupMoveRowButton);
    setupMoveRowButton(btn);
  });

  const collapseBtn = wrapper.querySelector(".fullScreen");
  if (collapseBtn) {
    collapseBtn.removeEventListener("click", toggleCollapse);
    collapseBtn.addEventListener("click", toggleCollapse);
  }

  const deleteBtn = wrapper.querySelector(".deleteButton");
  if (deleteBtn) {
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    setupDeleteButton(newDeleteBtn);
  }

  attachSyllabusButtonListeners(wrapper);
}

// SINGLE DOMContentLoaded LISTENER
function calculateFinalGrade(event) {
  const table = event?.target?.closest?.("table") || event;
  if (!table) return;

  // Note: final grade row still uses an id ("finalGradeRow") for convenience
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
      finalGrade >= 80
        ? "#6aa84f"
        : finalGrade >= 50
        ? "#E65100"
        : "#cc0000";
  }
  calculateCurrentGPA();
}
document.addEventListener("DOMContentLoaded", function () {
    // =======================================================
    // 1. NEW SEMESTER MODAL CODE
    // =======================================================
    const semesterModal = document.getElementById("addSemesterModal");
    const semesterBtn = document.getElementById("addSemester");
    const semesterClose = semesterModal?.querySelector(".close");
    const saveBtn = document.getElementById("saveSemester");
    const semesterContainer = document.querySelector(".semester-container");
  
    if (semesterBtn && semesterModal && semesterClose) {
      // Open modal
      semesterBtn.addEventListener("click", () => {
        semesterModal.style.display = "block";
      });
  
      // Close modal
      semesterClose.addEventListener("click", () => {
        semesterModal.style.display = "none";
      });
  
      // Close when clicking outside
      window.addEventListener("click", (e) => {
        if (e.target === semesterModal) semesterModal.style.display = "none";
      });
  
      // Save functionality
// Save functionality with dates optional and card click opens grades.html
// Save functionality with dates optional, card creation/updating, and modal text change
if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const name = document.getElementById("semesterName").value.trim();
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
  
      // Use "N/A" if dates not provided.
      const displayStart = startDate ? new Date(startDate).toLocaleDateString() : "N/A";
      const displayEnd = endDate ? new Date(endDate).toLocaleDateString() : "N/A";
  
      // >>>>> Add these lines here to update modal text based on mode <<<<<
      if (editingSemesterCard) {
        document.querySelector("#addSemesterModal h3").textContent = "Edit Semester";
        document.getElementById("saveSemester").textContent = "Update Semester";
      } else {
        document.querySelector("#addSemesterModal h3").textContent = "Add Semester";
        document.getElementById("saveSemester").textContent = "Save Semester";
      }
      // >>>>> End addition <<<<<
  
      if (name) {
        const queryString = `?semesterName=${encodeURIComponent(name)}&startDate=${encodeURIComponent(displayStart)}&endDate=${encodeURIComponent(displayEnd)}`;
  
        if (editingSemesterCard) {
          // Update existing semester card
          editingSemesterCard.querySelector(".semester-name").textContent = name;
          editingSemesterCard.querySelector(".semester-dates").innerHTML = `
            <p>Start: ${displayStart}</p>
            <p>End: ${displayEnd}</p>
          `;
          const link = editingSemesterCard.querySelector(".semester-link");
          if (link) {
            link.href = "grades.html" + queryString;
          }
          editingSemesterCard = null; // Clear edit mode
        } else {
          // Create new semester card
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
              <a href="grades.html${queryString}" class="semester-link" style="display:none;"></a>
            </div>
            <div class="dropdown">
              <button class="dropbtn">...</button>
              <div class="dropdown-content">
                <button class="editSemester" title="Edit Semester">Edit Semester</button>
                <button class="deleteSemester" title="Delete Semester">Delete Semester</button>
              </div>
            </div>

          `;

          
          const dropBtn = semesterCard.querySelector(".dropbtn");
          const dropdownContent = semesterCard.querySelector(".dropdown-content");

          // Toggle dropdown and class
          dropBtn.addEventListener("click", (e) => {
            e.stopPropagation();
          
            const isOpen = dropdownContent.classList.contains("show");
          
            if (isOpen) {
              // Closing
              dropdownContent.classList.remove("show");
              dropdownContent.classList.add("fade-out");
              semesterCard.classList.remove("showing-dropdown");
              dropBtn.classList.remove("active");
            } else {
              // Opening
              dropdownContent.classList.remove("fade-out");
              dropdownContent.style.display = "block"; // <-- Ensure it's visible
              dropdownContent.classList.add("show");
              semesterCard.classList.add("showing-dropdown");
              dropBtn.classList.add("active");
            }
          });
          

          // Prevent hiding dropdown when clicking inside the semester card
          semesterCard.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevents dropdown from closing when clicking inside card
          });
          
          // Close dropdown only if clicking outside the semester card
          window.addEventListener("click", () => {
            document.querySelectorAll(".dropdown-content").forEach((menu) => {
              if (menu.classList.contains("show")) {
                menu.classList.remove("show");
                menu.classList.add("fade-out");
          
                // Remove fade-out and hide completely after animation
                setTimeout(() => {
                  menu.classList.remove("fade-out");
                  menu.style.display = "none";
                }, 300); // match the animation duration
              }
            });
          
            document.querySelectorAll(".semester-card").forEach((card) => {
              card.classList.remove("showing-dropdown");
            });
          
            document.querySelectorAll(".dropbtn").forEach((btn) => {
              btn.classList.remove("active");
            });
          });
          
  
          // Set card click to go to grades.html
          semesterCard.addEventListener("click", function (e) {
            const shouldIgnore =
              e.target.closest(".dropdown-content") ||
              e.target.classList.contains("editSemester") ||
              e.target.classList.contains("deleteSemester") ||
              e.target.classList.contains("dropbtn");
          
            if (shouldIgnore) return;
          
            const link = semesterCard.querySelector(".semester-link");
            if (link) {
              window.location.href = link.href;
            }
          });
          
          
          
          
  
          // When the edit pencil is clicked...
          semesterCard.querySelector(".editSemester").addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation(); // keep this to be safe
            editingSemesterCard = semesterCard;

            document.getElementById("semesterName").value = name;
            document.getElementById("startDate").value = startDate;
            document.getElementById("endDate").value = endDate;

            document.querySelector("#addSemesterModal h3").textContent = "Edit Semester";
            document.getElementById("saveSemester").textContent = "Update Semester";
            semesterModal.style.display = "block";

            // OPTIONAL: Close the dropdown
            dropdownContent.classList.remove("show");
            dropBtn.classList.remove("active");
            semesterCard.classList.remove("showing-dropdown");
          });

          // When the trash icon is clicked...
          semesterCard.querySelector(".deleteSemester").addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            const confirmDelete = confirm("Are you sure you want to delete this semester?");
            if (confirmDelete) {
              semesterCard.remove();
            }
          });

  
          semesterContainer.insertBefore(semesterCard, semesterBtn);
          // Handle Edit Semester click
          semesterCard.querySelector(".editSemester").addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            editingSemesterCard = semesterCard;

            document.getElementById("semesterName").value = name;
            document.getElementById("startDate").value = startDate;
            document.getElementById("endDate").value = endDate;

            document.querySelector("#addSemesterModal h3").textContent = "Edit Semester";
            document.getElementById("saveSemester").textContent = "Update Semester";

            semesterModal.style.display = "block";

            // OPTIONAL: Close the dropdown
            dropdownContent.classList.remove("show");
            dropBtn.classList.remove("active");
            semesterCard.classList.remove("showing-dropdown");
          });

        }
        semesterModal.style.display = "none";
        // Clear form fields
        document.getElementById("semesterName").value = "";
        document.getElementById("startDate").value = "";
        document.getElementById("endDate").value = "";
      } else {
        alert("Please enter a semester name.");
      }
    });
  }
  
   
    }
  
    // =======================================================
    // 2. SETTINGS MODAL CODE
    // =======================================================
// SETTINGS MODAL CODE
const settingsModal = document.getElementById("settingsModal");
const settingsBtn = document.getElementById("settingsIcon");
const settingsClose = settingsModal?.querySelector(".close");

if (settingsBtn && settingsModal && settingsClose) {
  settingsBtn.onclick = () => {
    settingsModal.style.display = "flex"; // Change to "flex"
  };

  settingsClose.onclick = () => {
    settingsModal.style.display = "none";
  };

  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = "none";
    }
  });
}

  
    // =======================================================
    // 3. GRADE CALCULATION
    // =======================================================

  
    // =======================================================
    // 4. TABLE OPERATIONS: ADD & REMOVE ROWS
    // =======================================================


  
    // Initialize event listeners on existing rows
    document.querySelectorAll(".gradeInput, .weightInput").forEach((input) => {
      input.addEventListener("input", calculateFinalGrade);
    });
    document.querySelectorAll(".addRowBtn").forEach((btn) => {
      btn.addEventListener("click", addRow);
    });
    document.querySelectorAll(".removeRowBtn").forEach((btn) => {
      btn.addEventListener("click", removeRow);
    });
  
    // =======================================================
    // 5. COLOR PICKERS & THEME SELECTOR
    // =======================================================
    const bgColorPicker = document.getElementById("userBgColour");
    const btnColorPicker = document.getElementById("userBtnColour");
  
    if (bgColorPicker) {
      bgColorPicker.addEventListener("input", function () {
        // Update these elements – if any selector still uses an ID (like #courseCode), update it to .courseCode if needed.
        document.querySelectorAll(
          ".titleBox, .courseCode, .columnTitles, td[colspan='6'], th"
        ).forEach((el) => {
          el.style.setProperty("background-color", this.value, "important");
        });
      });
    }
  
    if (btnColorPicker) {
      btnColorPicker.addEventListener("input", function () {
        document.querySelectorAll("button").forEach((btn) => {
          btn.style.backgroundColor = this.value;
        });
      });
    }
  
    const themes = {
      default: {
        "--bg-image": "url('../assets/backgrounds/default_background.png')",
        "--bg-color": "#ffffff",
        "--text-color": "#000000",
        "--button-bg-color": "#A3CEF1",
        "--table-header-bg": "#A3CEF1",
        "--table-row-alt-bg": "#f5f5f5",
        "--final-grade-bg": "#A3CEF1",
      },
      waterloo: {
        "--bg-image": "url('../assets/backgrounds/waterloo_background.png')",
        "--bg-color": "#ffffff",
        "--text-color": "#000000",
        "--button-bg-color": "#fed34c",
        "--table-header-bg": "#fed34c",
        "--table-row-alt-bg": "#e5e5e5",
        "--final-grade-bg": "#fff9c4",
      },
      pastel: {
        "--bg-image": "url('../assets/backgrounds/purple_background.png')",
        "--bg-color": "#fef6ff",
        "--text-color": "#3e3e3e",
        "--button-bg-color": "#ffc1cc",
        "--table-header-bg": "#d8bfd8",
        "--table-row-alt-bg": "#fdf1f9",
        "--final-grade-bg": "#e0bbff",
      },
      forest: {
        "--bg-image": "url('../assets/backgrounds/forest.png')",
        "--bg-color": "#f0f5f1",
        "--text-color": "#2e3d30",
        "--button-bg-color": "#81c784",
        "--table-header-bg": "#a5d6a7",
        "--table-row-alt-bg": "#e8f5e9",
        "--final-grade-bg": "#c8e6c9",
      },
      purple: {
        "--bg-image": "url('../assets/backgrounds/purple_background.png')",
        "--bg-color": "#ffffff",
        "--text-color": "#000000",
        "--button-bg-color": "#c77dff",
        "--table-header-bg": "#9d4edd",
        "--table-row-alt-bg": "#f2ebfb",
        "--final-grade-bg": "#9d4edd"
      }
    };
    
    
  
    document.getElementById("themeSelector")?.addEventListener("change", (e) => {
      const theme = themes[e.target.value];
      for (let variable in theme) {
        document.documentElement.style.setProperty(variable, theme[variable]);
      }
    });
  
    // =======================================================
    // 6. HELPER FUNCTIONS
    // =======================================================
    function calculateCurrentGPA() {
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
      document.getElementById("current-gpa").textContent = `Term GPA: ${average}`;
    }
    
  
  
    // Bind collapse event to every table instance
    function bindCollapseEvent() {
      document.querySelectorAll(".table-wrapper").forEach((tableWrapper) => {
        const collapseButton = tableWrapper.querySelector(".fullScreen");
        if (collapseButton) {
          collapseButton.removeEventListener("click", toggleCollapse); // Prevent duplicates
          collapseButton.addEventListener("click", toggleCollapse);
          console.log("Collapse button event attached to table:", tableWrapper);
        } else {
          console.warn("Collapse button not found in:", tableWrapper);
        }
      });
    }
  
    // Bind row events (add, remove)
    function bindRowEvents() {
      document.querySelectorAll(".addRowBtn").forEach((btn) => {
        btn.removeEventListener("click", addRow);
        btn.addEventListener("click", addRow);
      });
  
      document.querySelectorAll(".removeRowBtn").forEach((btn) => {
        btn.removeEventListener("click", removeRow);
        btn.addEventListener("click", removeRow);
      });
      console.log("Row event listeners bound to all tables.");
    }
      
  
    // Delete button setup for table removal with confirmation tooltip
    function setupDeleteButton(deleteButton) {
      deleteButton.addEventListener("click", function (event) {
        event.stopPropagation();
  
        const existingTooltip = document.querySelector(".delete-tooltip");
        if (existingTooltip) {
          existingTooltip.remove();
          return;
        }
  
        const tooltip = document.createElement("div");
        tooltip.classList.add("delete-tooltip");
  
        tooltip.innerHTML = `
            <span class="close-tooltip">&times;</span>
            <p>Are you sure you want to delete this table?</p>
            <div class="tooltip-buttons">
                <button class="confirm-delete">Yes</button>
                <button class="cancel-delete">No</button>
            </div>
        `;
        const rect = deleteButton.getBoundingClientRect();
        tooltip.style.position = "absolute";
        tooltip.style.top = rect.bottom + window.scrollY + "px";
        tooltip.style.left = rect.left + window.scrollX + "px";
  
        document.body.appendChild(tooltip);
  
        tooltip.querySelector(".confirm-delete").addEventListener("click", function () {
          const tableWrapper = deleteButton.closest(".table-wrapper");
          if (tableWrapper) {
            tableWrapper.remove();
            calculateCurrentGPA();
          }
          tooltip.remove();
        });
  
        tooltip.querySelector(".cancel-delete").addEventListener("click", function () {
          tooltip.remove();
        });
  
        tooltip.querySelector(".close-tooltip").addEventListener("click", function () {
          tooltip.remove();
        });
  
        document.addEventListener(
          "click",
          function handleOutsideClick(event) {
            if (!tooltip.contains(event.target) && event.target !== deleteButton) {
              tooltip.remove();
              document.removeEventListener("click", handleOutsideClick);
            }
          }
        );
      });
    }
  
    // =======================================================
    // 7. NEW TABLE FUNCTIONALITY
    // =======================================================
    // Function to generate default rows using class selectors
    function generateDefaultRows(numRows) {
      let rows = "";
      for (let i = 0; i < numRows; i++) {
        rows += `
            <tr>
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
            </tr>
        `;
      }
      return rows;
    }
  
    // Add new table when "+ Course" button is clicked
    document.getElementById("addTable").addEventListener("click", function () {
      const lastTable = document.querySelector(".table-wrapper:last-of-type");
      const newTable = document.createElement("div");
      newTable.classList.add("table-wrapper");
  
      // New table uses classes instead of duplicate IDs:
      newTable.innerHTML = `
          <table>
              <tr>
                  <td colspan="6" class="courseHeader">
                      <div class="courseContainer">
                          <div class="titleBox">
                              <input type="text" placeholder="Insert Course Code" class="courseCode">
                              <button class="deleteButton" title="Delete Table">🗑️</button>
                              <button class="fullScreen" title="Collapse Table">←</button>
                              <input type="text" placeholder="Insert Course Topic" class="courseTopic">
                              <button class="syllabusButton" title="Parse Syllabus">📄</button>
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
              ${generateDefaultRows(3)}
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
        document.querySelector(".table-container").appendChild(newTable);
      }

      newTable.querySelectorAll(".moveRowBtn").forEach((btn) => {
        setupMoveRowButton(btn);
      });
      // Hook up add/remove/inputs
      newTable.querySelectorAll(".addRowBtn").forEach((btn) => {
        btn.addEventListener("click", addRow);
      });
      newTable.querySelectorAll(".removeRowBtn").forEach((btn) => {
        btn.addEventListener("click", removeRow);
      });
      newTable.querySelectorAll(".gradeInput, .weightInput").forEach((input) => {
        input.addEventListener("input", calculateFinalGrade);
      });

      // Delete button
      const deleteBtn = newTable.querySelector(".deleteButton");
      if (deleteBtn) {
        setupDeleteButton(deleteBtn);
      }

      // Collapse button
      const collapseBtn = newTable.querySelector(".fullScreen");
      if (collapseBtn) {
        collapseBtn.addEventListener("click", toggleCollapse);
      }

      // Syllabus modal/parse
      attachSyllabusButtonListeners(newTable);

      
      // Move the "+ Course" button to always be after the last table
      const addTableButton = document.getElementById("addTable");
      document.querySelector(".table-container").appendChild(addTableButton);
  
      // Attach events to new table
      attachEventListeners(newTable);
      attachSyllabusButtonListeners(newTable);
      bindCollapseEvent();
      calculateCurrentGPA();
      console.log("New table added with 3 default rows.");
    });
  
    // Attach syllabus modal events using class selectors
    function attachSyllabusButtonListeners(tableElement) {
      const syllabusModal = tableElement.querySelector(".syllabusModal");
      const syllabusButton = tableElement.querySelector(".syllabusButton");
      const closeModal = tableElement.querySelector(".syllabusModal .close");
      const parseSyllabusButton = tableElement.querySelector(".parseSyllabusButton");
      const syllabusTextbox = tableElement.querySelector(".syllabusTextbox");
    
      if (syllabusButton && syllabusModal && closeModal && parseSyllabusButton && syllabusTextbox) {
        syllabusButton.addEventListener("click", function () {
          syllabusModal.style.display = "flex"; // Change to "flex"
        });
    
        closeModal.addEventListener("click", function () {
          syllabusModal.style.display = "none";
        });
    
        window.addEventListener("click", function (event) {
          if (event.target === syllabusModal) {
            syllabusModal.style.display = "none";
          }
        });
    
        parseSyllabusButton.addEventListener("click", function () {
          const syllabusText = syllabusTextbox.value;
          const table = tableElement.querySelector("table");
          if (table) {
            parseSyllabus(syllabusText, table);
          }
          syllabusModal.style.display = "none";
        });
      } else {
        console.error("Could not find syllabus modal elements in the new table.");
      }
    }
    
  
    // =======================================================
    // 8. DRAG AND DROP ROW FUNCTIONALITY
    // =======================================================
// Callback after a row has been successfully moved:
function rowMovedCallback(rowElement, oldIndex, newIndex) {
  console.log("Row moved from index", oldIndex, "to", newIndex);
  // Additional actions (e.g., AJAX updates) go here.
}

// Global state variables:
let isDragging = false;
let draggedRow = null;
let initialY = 0;
let originalIndex = -1;



// Helper: Get allowed sibling: if direction is "prev", return previous allowed sibling, else next allowed sibling.
function getAllowedSibling(row, direction) {
  let sibling = direction === "prev" ? row.previousElementSibling : row.nextElementSibling;
  while (sibling) {
    if (isAllowedRow(sibling)) {
      return sibling;
    }
    sibling = direction === "prev" ? sibling.previousElementSibling : sibling.nextElementSibling;
  }
  return null;
}



function handleMouseMove(e) {
  if (!isDragging || !draggedRow) return;

  // Apply visual offset:
  const deltaY = e.clientY - initialY;
  draggedRow.style.transform = `translateY(${deltaY}px)`;

  const tbody = draggedRow.parentNode;
  // Get immediate allowed neighbors:
  const prevRow = getAllowedSibling(draggedRow, "prev");
  const nextRow = getAllowedSibling(draggedRow, "next");

  // Check if we should swap with previous row:
  if (prevRow) {
    const rect = prevRow.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
      draggedRow.style.transform = ""; // Clear transform before insert
      requestAnimationFrame(() => {
        tbody.insertBefore(draggedRow, prevRow);
      });
      initialY = e.clientY;
      return; // Prevent double-swap
    }
  }
  
  if (nextRow) {
    const rect = nextRow.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY > midpoint) {
      draggedRow.style.transform = ""; // Clear transform before insert
      requestAnimationFrame(() => {
        tbody.insertBefore(draggedRow, nextRow.nextElementSibling);
      });
      initialY = e.clientY;
      return;
    }
  }
  
}

function handleMouseUp(e) {
  if (isDragging && draggedRow) {
    draggedRow.style.transform = "";
    draggedRow.classList.remove("dragging");

    // Calculate new index among allowed rows:
    const tbody = draggedRow.parentNode;
    const allowedRows = Array.from(tbody.querySelectorAll("tr")).filter(isAllowedRow);
    const newIndex = allowedRows.indexOf(draggedRow);
    if (newIndex !== originalIndex) {
      rowMovedCallback(draggedRow, originalIndex, newIndex);
    }
  }
  isDragging = false;
  draggedRow = null;
}

document.querySelectorAll(".moveRowBtn").forEach(button => {
  setupMoveRowButton(button);
});
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mouseup", handleMouseUp);




    // =======================================================
    // 9. APPEND FINAL GRADE ROW TO ORIGINAL TABLE
    // =======================================================
    const originalTable = document.querySelector("table");
    if (originalTable) {
      const finalGradeRow = document.createElement("tr");
      finalGradeRow.id = "finalGradeRow";
      finalGradeRow.innerHTML = `
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
      `;
      originalTable.appendChild(finalGradeRow);
    }

  
    // =======================================================
    // 10. PAGE TITLE RESIZING
    // =======================================================

    const pageTitle = document.getElementById("page-title");

    function resizeInput() {
      const span = document.createElement("span");
      span.style.visibility = "hidden";
      span.style.position = "absolute";
      span.style.font = getComputedStyle(pageTitle).font;
      span.style.padding = getComputedStyle(pageTitle).padding;
      span.textContent = pageTitle.value || pageTitle.placeholder || "";
      document.body.appendChild(span);
    
      const width = span.offsetWidth + 20; // add buffer
      pageTitle.style.width = width + "px";
    
      document.body.removeChild(span);
    }
    
    pageTitle.addEventListener("input", resizeInput);
    resizeInput(); // initial run
    

    
    
    // =======================================================
    // 11. INITIAL BINDINGS FOR ORIGINAL TABLE
    // =======================================================
    // Bind collapse button on the original table
    const originalCollapseButton = document.querySelector(".table-wrapper .fullScreen");
    if (originalCollapseButton) {
      originalCollapseButton.removeEventListener("click", toggleCollapse);
      originalCollapseButton.addEventListener("click", toggleCollapse);
      console.log("Collapse button attached to original table.");
    } else {
      console.warn("Original collapse button not found.");
    }
    bindCollapseEvent();
    bindRowEvents();

    // <--- Insert these lines here:
    const origTableWrapper = document.querySelector(".table-wrapper");
    if (origTableWrapper) {
      attachSyllabusButtonListeners(origTableWrapper);
    }
    
// <--- End insertion
    bindRowEvents();

    // =======================================================
    // 12. DELETE BUTTON BINDINGS ON PAGE LOAD
    // =======================================================
    document.querySelectorAll(".deleteButton").forEach((button) => {
      setupDeleteButton(button);
    });

    const origSyllabusModal = document.getElementById("syllabusModal");
    const origSyllabusButton = document.getElementById("syllabusButton");
    const origCloseModal = document.querySelector("#syllabusModal .close");
    const origParseSyllabusButton = document.getElementById("parseSyllabusButton");
    const origSyllabusTextbox = document.getElementById("syllabusTextbox");

    if (origSyllabusButton && origSyllabusModal && origCloseModal && origParseSyllabusButton && origSyllabusTextbox) {
      origSyllabusButton.addEventListener("click", function () {
        origSyllabusModal.style.display = "block";
      });
      origCloseModal.addEventListener("click", function () {
        origSyllabusModal.style.display = "none";
      });
      window.addEventListener("click", function (event) {
        if (event.target === origSyllabusModal) {
          origSyllabusModal.style.display = "none";
        }
      });
      origParseSyllabusButton.addEventListener("click", function () {
        const syllabusText = origSyllabusTextbox.value;
        const table = this.closest(".table-wrapper")?.querySelector("table");
        if (table) {
          parseSyllabus(syllabusText, table);
        }
        origSyllabusModal.style.display = "none";
      });
    }

  }); // end of domcontent loaded

  function toggleNav() {
    var sidenav = document.getElementById("mySidenav");
    var menuIcon = document.getElementById("menuIcon");
    // Use computed style to get the actual width
    const computedWidth = window.getComputedStyle(sidenav).width;
  
    if (computedWidth === "250px") {
      sidenav.style.width = "0px";
      menuIcon.innerHTML = "&#9776;";
      menuIcon.classList.remove("open");
    } else {
      sidenav.style.width = "250px";
      menuIcon.innerHTML = "&times;";
      menuIcon.classList.add("open");
    }
  }
  

  
  // =======================================================
  // 13. SYLLABUS PARSING FUNCTION
  // =======================================================
  function parseSyllabus(text, table) {
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);
    let courseCode = "";
    let courseTitle = "";
  
    const saveLocalCopyIndex = lines.findIndex((line) => line.includes("Save a Local Copy"));
    if (saveLocalCopyIndex !== -1) {
      courseCode = lines[saveLocalCopyIndex + 1] || "";
      courseTitle = lines[saveLocalCopyIndex + 3] || "";
    }
  
    const dataLines = lines.slice(2);
    const components = [];
    dataLines.forEach((line) => {
      const match = line.match(/^(.*?)\s+(\d+%)/);
      if (match) {
        const componentName = match[1].trim();
        const weight = match[2].trim();
        components.push({ name: componentName, weight: parseFloat(weight) });
      }
    });
  
    const oldWrapper = table.closest(".table-wrapper");
    const newWrapper = document.createElement("div");
    newWrapper.classList.add("table-wrapper");
  
    newWrapper.innerHTML = `
      <table>
        <tr>
          <td colspan="6" class="courseHeader">
            <div class="courseContainer">
              <div class="titleBox">
                <input type="text" placeholder="Insert Course Code" class="courseCode" value="${courseCode}">
                <button class="deleteButton" title="Delete Table">🗑️</button>
                <button class="fullScreen" title="Collapse Table">←</button>
                <input type="text" placeholder="Insert Course Topic" class="courseTopic" value="${courseTitle}">
                <button class="syllabusButton" title="Parse Syllabus">📄</button>
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
        ${components.map(component => `
          <tr>
            <td><input type="text" value="${component.name}"></td>
            <td><input type="text" class="dueInput"></td>
            <td><input type="number" class="gradeInput"></td>
            <td><input type="number" class="weightInput" value="${component.weight}"></td>
            <td><span class="lostOutput">—</span></td>
            <td class="actionsColumn">
              <button class="addRowBtn" title="Add row below">+</button>
              <button class="removeRowBtn" title="Remove selected row">-</button>
              <button class="moveRowBtn" title="Move selected row">&#9776;</button>
            </td>
          </tr>
        `).join("")}
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
  
    oldWrapper.replaceWith(newWrapper);
    console.log("New wrapper in DOM?", document.body.contains(newWrapper)); // should be true

    // Reattach full event handling
    attachEventListeners(newWrapper);
    attachSyllabusButtonListeners(newWrapper); // ✅ syllabus modal & parse button
    bindCollapseEvent();
    bindRowEvents();
    
    calculateFinalGrade({ target: newWrapper.querySelector("table") });
    
    requestAnimationFrame(() => {
      calculateCurrentGPA(); // ✅ make sure it's calculated after DOM update
    });
    
  }
  
  

