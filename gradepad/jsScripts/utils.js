export function toggleNav() {
    const sidenav = document.getElementById("mySidenav");
    const menuIcon = document.getElementById("menuIcon");
  
    if (window.getComputedStyle(sidenav).width === "250px") {
      sidenav.style.width = "0px";
      menuIcon.innerHTML = "&#9776;";
      menuIcon.classList.remove("open");
    } else {
      sidenav.style.width = "250px";
      menuIcon.innerHTML = "&times;";
      menuIcon.classList.add("open");
    }
  }
  
  export function toggleCollapse(event) {
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
  