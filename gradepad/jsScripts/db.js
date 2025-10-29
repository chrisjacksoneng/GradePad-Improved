// Database functions - Uses Firestore for logged-in users, localStorage for guests
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';

// Helper function to get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Helper function to get user data document reference
function getUserDataRef(userId) {
  return doc(db, 'users', userId, 'data', 'gradepad');
}

// Helper function to get all data from Firestore (for logged-in users)
async function getAllDataFirestore(userId) {
  try {
    const userDataRef = getUserDataRef(userId);
    const docSnap = await getDoc(userDataRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return { semesters: [] };
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return { semesters: [] };
  }
}

// Helper function to save all data to Firestore (for logged-in users)
async function saveAllDataFirestore(userId, data) {
  try {
    const userDataRef = getUserDataRef(userId);
    await setDoc(userDataRef, data, { merge: true });
    console.log('✅ Data saved to Firestore');
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

// Helper function to get all data from localStorage (for guests)
function getAllDataLocal() {
  const data = localStorage.getItem('gradepad_data');
  return data ? JSON.parse(data) : { semesters: [] };
}

// Helper function to save all data to localStorage (for guests)
function saveAllDataLocal(data) {
  localStorage.setItem('gradepad_data', JSON.stringify(data));
}

// Helper function to get all data (checks auth state)
async function getAllData() {
  const user = getCurrentUser();
  console.log('🔍 getAllData - Current user:', user ? user.uid : 'No user (guest)');
  if (user) {
    console.log('📥 Loading from Firestore for user:', user.uid);
    const data = await getAllDataFirestore(user.uid);
    console.log('📥 Loaded data from Firestore:', data);
    return data;
  }
  console.log('📥 Loading from localStorage (guest)');
  const data = getAllDataLocal();
  console.log('📥 Loaded data from localStorage:', data);
  return data;
}

// Helper function to save all data (checks auth state)
async function saveAllData(data) {
  const user = getCurrentUser();
  console.log('💾 saveAllData - Current user:', user ? user.uid : 'No user (guest)');
  console.log('💾 Saving data:', data);
  if (user) {
    console.log('💾 Saving to Firestore for user:', user.uid);
    await saveAllDataFirestore(user.uid, data);
    console.log('✅ Data saved to Firestore successfully');
  } else {
    console.log('💾 Saving to localStorage (guest)');
    saveAllDataLocal(data);
    console.log('✅ Data saved to localStorage');
  }
}

// Helper function to generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Save Semester ---
export async function saveSemester({ name, startDate, endDate, semesterId = null }) {
  try {
    const data = await getAllData();
    
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
    
    await saveAllData(data);
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
    const data = await getAllData();
    console.log("✅ Loaded semesters:", data.semesters);
    return data.semesters;
  } catch (error) {
    console.error("❌ Failed to load semesters:", error);
    return [];
  }
}

// --- Save Course ---
export async function saveCourse({ semesterId, code, topic, units, courseId = null }) {
  try {
    const data = await getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    
    if (!semester) {
      console.error("❌ Semester not found:", semesterId);
      return null;
    }
    
    if (courseId) {
      // Update existing course
      const course = semester.courses.find(c => c.id === courseId);
      if (course) {
        course.code = code;
        course.topic = topic;
        course.units = units;
        course.updatedAt = new Date().toISOString();
        await saveAllData(data);
        console.log(`✅ Course "${code}" updated`);
        return courseId;
      }
    }
    
    // Create new course
    const newCourseId = generateId();
    const newCourse = {
      id: newCourseId,
      code,
      topic,
      units,
      createdAt: new Date().toISOString(),
      evaluations: []
    };
    
    semester.courses.push(newCourse);
    await saveAllData(data);
    
    console.log(`✅ Course "${code}" saved under semester ${semesterId}`);
    return newCourseId;
  } catch (err) {
    console.error("❌ Failed to save course:", err);
    return null;
  }
}

// --- Save Evaluation ---
export async function saveEvaluation({ semesterId, courseId, name, due, grade, weight, index }) {
  try {
    const data = await getAllData();
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
    await saveAllData(data);
    
    console.log("✅ Evaluation saved:", evaluation);
  } catch (error) {
    console.error("❌ Error saving evaluation:", error);
  }
}

// --- Load Courses ---
export async function loadCourses(semesterId) {
  try {
    const data = await getAllData();
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
    const data = await getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    
    if (!semester) return;
    
    semester.courses = semester.courses.filter(c => c.id !== courseId);
    await saveAllData(data);
    
    console.log("✅ Course deleted:", courseId);
  } catch (err) {
    console.error("❌ Failed to delete course:", err);
  }
}

// --- Delete Semester ---
export async function deleteSemester(semesterId) {
  try {
    const data = await getAllData();
    data.semesters = data.semesters.filter(s => s.id !== semesterId);
    await saveAllData(data);
    
    console.log(`🗑️ Deleted semester ${semesterId}`);
  } catch (err) {
    console.error("❌ Failed to delete semester:", err);
  }
}

// --- Clear Evaluations ---
export async function clearEvaluations(semesterId, courseId) {
  try {
    const data = await getAllData();
    const semester = data.semesters.find(s => s.id === semesterId);
    if (!semester) return;
    
    const course = semester.courses.find(c => c.id === courseId);
    if (!course) return;
    
    course.evaluations = [];
    await saveAllData(data);
    
    console.log("🧹 Cleared evaluations for course", courseId);
  } catch (error) {
    console.error("❌ Failed to clear evaluations:", error);
  }
}
