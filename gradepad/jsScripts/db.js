// LocalStorage-based database functions
// Replaces Firestore with browser localStorage

// Helper function to get all data
function getAllData() {
  const data = localStorage.getItem('gradepad_data');
  return data ? JSON.parse(data) : { semesters: [] };
}

// Helper function to save all data
function saveAllData(data) {
  localStorage.setItem('gradepad_data', JSON.stringify(data));
}

// Helper function to generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Save Semester ---
export async function saveSemester({ name, startDate, endDate, semesterId = null }) {
  try {
    const data = getAllData();
    
    if (semesterId) {
      // Update existing semester
      const index = data.semesters.findIndex(s => s.id === semesterId);
      if (index !== -1) {
        data.semesters[index] = {
          ...data.semesters[index],
          name,
          startDate,
          endDate,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      // Create new semester
      const newSemester = {
        id: generateId(),
        name,
        startDate,
        endDate,
        createdAt: new Date().toISOString(),
        courses: []
      };
      data.semesters.push(newSemester);
      semesterId = newSemester.id;
    }
    
    saveAllData(data);
    console.log(semesterId ? "✏️ Semester updated:" : "✅ Semester saved:", semesterId);
    return semesterId;
  } catch (error) {
    console.error("❌ Failed to save/update semester:", error);
    return null;
  }
}

// --- Load Semesters ---
export async function loadSemesters() {
  try {
    const data = getAllData();
    console.log("✅ Loaded semesters:", data.semesters);
    return data.semesters;
  } catch (error) {
    console.error("❌ Failed to load semesters:", error);
    return [];
  }
}

// --- Save Course ---
export async function saveCourse({ semesterId, code, topic, units }) {
  try {
    const data = getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    
    if (!semester) {
      console.error("❌ Semester not found:", semesterId);
      return null;
    }
    
    const courseId = generateId();
    const newCourse = {
      id: courseId,
      code,
      topic,
      units,
      createdAt: new Date().toISOString(),
      evaluations: []
    };
    
    semester.courses.push(newCourse);
    saveAllData(data);
    
    console.log(`✅ Course "${code}" saved under semester ${semesterId}`);
    return courseId;
  } catch (err) {
    console.error("❌ Failed to save course:", err);
    return null;
  }
}

// --- Save Evaluation ---
export async function saveEvaluation({ semesterId, courseId, name, due, grade, weight, index }) {
  try {
    const data = getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    if (!semester) return;
    
    const course = semester.courses.find(c => c.id === courseId);
    if (!course) return;
    
    // Remove existing evaluation at this index if it exists
    course.evaluations = course.evaluations.filter(e => e.index !== index);
    
    // Add new evaluation
    const evaluation = {
      id: generateId(),
      name: name ?? "",
      due: due ?? "",
      grade: grade ?? "",
      weight: weight ?? "",
      index: index ?? 0,
      createdAt: new Date().toISOString()
    };
    
    course.evaluations.push(evaluation);
    saveAllData(data);
    
    console.log("✅ Evaluation saved:", evaluation);
  } catch (error) {
    console.error("❌ Error saving evaluation:", error);
  }
}

// --- Load Courses ---
export async function loadCourses(semesterId) {
  try {
    const data = getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    
    if (!semester) return [];
    
    return semester.courses.map(course => ({
      id: course.id,
      code: course.code,
      topic: course.topic,
      units: course.units,
      evaluations: course.evaluations.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    }));
  } catch (error) {
    console.error("❌ Failed to load courses:", error);
    return [];
  }
}

// --- Delete Course ---
export async function deleteCourse(semesterId, courseId) {
  try {
    const data = getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    
    if (!semester) return;
    
    semester.courses = semester.courses.filter(c => c.id !== courseId);
    saveAllData(data);
    
    console.log("✅ Course deleted:", courseId);
  } catch (err) {
    console.error("❌ Failed to delete course:", err);
  }
}

// --- Delete Semester ---
export async function deleteSemester(semesterId) {
  try {
    const data = getAllData();
    data.semesters = data.semesters.filter(s => s.id !== semesterId);
    saveAllData(data);
    
    console.log(`🗑️ Deleted semester ${semesterId}`);
  } catch (err) {
    console.error("❌ Failed to delete semester:", err);
  }
}

// --- Clear Evaluations ---
export async function clearEvaluations(semesterId, courseId) {
  try {
    const data = getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    if (!semester) return;
    
    const course = semester.courses.find(c => c.id === courseId);
    if (!course) return;
    
    course.evaluations = [];
    saveAllData(data);
    
    console.log("🧹 Cleared evaluations for course", courseId);
  } catch (error) {
    console.error("❌ Failed to clear evaluations:", error);
  }
}
