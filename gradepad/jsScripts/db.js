// Database functions - Uses Firestore for logged-in users, localStorage for guests
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';

// ---------------------------------------------------------------------------
// Auth readiness
// Firebase restores the signed-in session asynchronously after page load, so
// reading auth.currentUser synchronously returns null for the first ~1s even
// for a signed-in user. That sent early edits into guest localStorage while the
// real data lived in Firestore. Instead, resolve the user by waiting for the
// first onAuthStateChanged emission, and keep tracking changes after that.
// ---------------------------------------------------------------------------
let authReady = false;
let currentUser = null;
let resolveAuthReady;
const authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; });

function userKey(user) {
  return user ? `user:${user.uid}` : 'guest';
}

onAuthStateChanged(
  auth,
  (user) => {
    const identityChanged = authReady && userKey(user) !== userKey(currentUser);
    currentUser = user;
    if (!authReady) {
      authReady = true;
      resolveAuthReady();
    }
    // A different identity means the cached document belongs to the wrong store;
    // drop it so the next operation reloads from the correct place.
    if (identityChanged) invalidateCache();
  },
  (error) => {
    // If Firebase auth errors out on init, degrade to guest instead of leaving
    // every read/write hung waiting for an emission that will never come.
    console.error('Auth state listener error; continuing as guest:', error);
    if (!authReady) {
      authReady = true;
      resolveAuthReady();
    }
  }
);

async function getUser() {
  if (!authReady) {
    // Never block persistence forever if auth fails to emit; fall back to
    // whatever auth.currentUser is (null = guest) after a short wait.
    await Promise.race([
      authReadyPromise,
      new Promise((resolve) => setTimeout(resolve, 5000))
    ]);
    // If the wait timed out without any emission, commit to guest once so
    // later calls return immediately instead of each re-waiting the timeout.
    if (!authReady) {
      authReady = true;
      resolveAuthReady();
    }
  }
  return currentUser;
}

// ---------------------------------------------------------------------------
// In-memory document cache + serialized operation queue
// Every read and write runs through a single promise chain, so overlapping
// saves can no longer read-modify-write over each other and drop edits within a
// tab. The whole gradepad document is cached in memory and reused instead of
// being re-read (and possibly re-read stale) on every mutation.
// ---------------------------------------------------------------------------
let cachedData = null;
let cachedKey = null;
let opQueue = Promise.resolve();

function invalidateCache() {
  cachedData = null;
  cachedKey = null;
}

// Drop the cache when the tab regains focus, so a returning session re-reads the
// current document (another tab or device may have written in the meantime)
// before its next read or write.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') invalidateCache();
  });
}

function enqueue(task) {
  const run = opQueue.then(() => task());
  // Keep the chain alive even if a task rejects, so one failure does not stall
  // every later operation.
  opQueue = run.then(() => {}, () => {});
  return run;
}

async function loadData() {
  const user = await getUser();
  const key = userKey(user);
  if (cachedData && cachedKey === key) {
    return { data: cachedData, user };
  }
  let data = user ? await getAllDataFirestore(user.uid) : getAllDataLocal();
  // Guarantee the shape every mutator relies on, even for partial/legacy docs.
  if (!data || typeof data !== 'object' || !Array.isArray(data.semesters)) {
    data = { semesters: [] };
  }
  cachedData = data;
  cachedKey = key;
  return { data, user };
}

async function persistFor(user, data) {
  if (user) {
    await saveAllDataFirestore(user.uid, data);
  } else {
    saveAllDataLocal(data);
  }
}

// Serialized read: ordered after all pending writes so it reflects them.
function readData() {
  return enqueue(() => loadData());
}

// Serialized read-modify-write. The mutator edits `data` in place and may
// return a value that is forwarded to the caller.
function mutate(mutator) {
  return enqueue(async () => {
    // Always write against a freshly read document rather than a possibly
    // session-stale cache, so a returning tab or a second device cannot silently
    // overwrite changes made elsewhere via the whole-document write. The
    // serialized queue still prevents same-tab overlapping writes from racing.
    invalidateCache();
    const { data, user } = await loadData();
    const result = await mutator(data);
    try {
      await persistFor(user, data);
    } catch (error) {
      // The mutator edited the cached document in place; if the write failed,
      // drop the cache so later reads reload from the store instead of serving
      // an unpersisted change as if it saved.
      invalidateCache();
      throw error;
    }
    return result;
  });
}

// Helper function to get user data document reference
function getUserDataRef(userId) {
  // Store data directly under the users collection as a document: users/{userId}
  return doc(db, 'users', userId);
}

// Load the whole gradepad document from Firestore. A genuinely missing document
// returns an empty shape; real errors (network/permissions) propagate so a
// failed read never causes an empty document to be written back over real data.
async function getAllDataFirestore(userId) {
  const userDataRef = getUserDataRef(userId);
  const docSnap = await getDoc(userDataRef);

  if (docSnap.exists()) {
    const docData = docSnap.data();
    // Data is stored in the gradepad field
    if (docData.gradepad) return docData.gradepad;
    // Fallback: legacy root-level format
    if (docData.semesters) return docData;
  }
  return { semesters: [] };
}

// Save the whole gradepad document to Firestore.
async function saveAllDataFirestore(userId, data) {
  try {
    const userDataRef = getUserDataRef(userId);
    await setDoc(userDataRef, { gradepad: data }, { merge: true });
    return true;
  } catch (error) {
    console.error('❌ Error saving to Firestore:', error);
    if (error.code === 'permission-denied') {
      if (typeof alert === 'function') {
        alert('Permission denied. Please check Firestore security rules allow writes for authenticated users.');
      }
    }
    throw error;
  }
}

// Read guest data from localStorage. Corrupt JSON is backed up and treated as
// empty instead of throwing, which previously bricked every later read and
// write for that guest.
function getAllDataLocal() {
  const raw = localStorage.getItem('gradepad_data');
  if (!raw) return { semesters: [] };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (!Array.isArray(parsed.semesters)) parsed.semesters = [];
      return parsed;
    }
    return { semesters: [] };
  } catch (error) {
    console.error('❌ Corrupt gradepad_data in localStorage; backing it up and starting fresh:', error);
    try { localStorage.setItem('gradepad_data_corrupt', raw); } catch (_) {}
    return { semesters: [] };
  }
}

// Save guest data to localStorage.
function saveAllDataLocal(data) {
  localStorage.setItem('gradepad_data', JSON.stringify(data));
}

// Helper function to generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Save Semester ---
export async function saveSemester({ name, startDate, endDate, semesterId = null }) {
  try {
    return await mutate((data) => {
      if (semesterId) {
        // Update existing semester. Only overwrite startDate/endDate when a real
        // value is provided, so callers that omit them (e.g. the semester-name
        // auto-save passing null) do not wipe stored dates.
        const index = data.semesters.findIndex(s => s.id === semesterId);
        if (index !== -1) {
          data.semesters[index] = {
            ...data.semesters[index],
            name,
            ...(startDate != null ? { startDate } : {}),
            ...(endDate != null ? { endDate } : {}),
            updatedAt: new Date().toISOString()
          };
        }
        return semesterId;
      }

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
      return newSemester.id;
    });
  } catch (error) {
    console.error('❌ Failed to save/update semester:', error);
    return null;
  }
}

// --- Load Semesters ---
export async function loadSemesters() {
  try {
    const { data } = await readData();
    return data.semesters || [];
  } catch (error) {
    console.error('❌ Failed to load semesters:', error);
    return [];
  }
}

// --- Save Course ---
export async function saveCourse({ semesterId, code, topic, units, courseId = null }) {
  try {
    return await mutate((data) => {
      const semester = data.semesters.find(s => s.id === semesterId);
      if (!semester) {
        console.error('❌ Semester not found:', semesterId);
        return null;
      }
      if (!Array.isArray(semester.courses)) semester.courses = [];

      if (courseId) {
        // Update existing course
        const course = semester.courses.find(c => c.id === courseId);
        if (course) {
          course.code = code;
          course.topic = topic;
          course.units = units;
          course.updatedAt = new Date().toISOString();
          return courseId;
        }
      }

      // Create new course
      const newCourseId = generateId();
      semester.courses.push({
        id: newCourseId,
        code,
        topic,
        units,
        createdAt: new Date().toISOString(),
        evaluations: []
      });
      return newCourseId;
    });
  } catch (err) {
    console.error('❌ Failed to save course:', err);
    return null;
  }
}

// --- Save Evaluation ---
// Upserts by a stable evaluation id. Callers pass evalId (from the row's
// dataset) when the row already exists so it is updated in place; otherwise a
// new id is generated. `index` is stored only for display ordering, never used
// as an identity key, so reordering or deleting rows can no longer clobber a
// different evaluation. Returns the evaluation's id so callers can remember it
// on the row for subsequent edits.
export async function saveEvaluation({ semesterId, courseId, evalId = null, name, due, grade, weight, index }) {
  try {
    return await mutate((data) => {
      const semester = data.semesters.find(s => s.id === semesterId);
      if (!semester) return null;

      const course = (semester.courses || []).find(c => c.id === courseId);
      if (!course) return null;
      if (!Array.isArray(course.evaluations)) course.evaluations = [];

      const existing = evalId ? course.evaluations.find(e => e.id === evalId) : null;

      if (existing) {
        existing.name = name ?? '';
        existing.due = due ?? '';
        existing.grade = grade ?? '';
        existing.weight = weight ?? '';
        if (index != null) existing.index = index;
        existing.updatedAt = new Date().toISOString();
        return existing.id;
      }

      const evaluation = {
        id: evalId || generateId(),
        name: name ?? '',
        due: due ?? '',
        grade: grade ?? '',
        weight: weight ?? '',
        index: index != null ? index : course.evaluations.length,
        createdAt: new Date().toISOString()
      };
      course.evaluations.push(evaluation);
      return evaluation.id;
    });
  } catch (error) {
    console.error('❌ Error saving evaluation:', error);
    return null;
  }
}

// --- Delete Evaluation ---
export async function deleteEvaluation(semesterId, courseId, evalId) {
  if (!evalId) return;
  try {
    await mutate((data) => {
      const semester = data.semesters.find(s => s.id === semesterId);
      if (!semester) return;
      const course = (semester.courses || []).find(c => c.id === courseId);
      if (!course || !Array.isArray(course.evaluations)) return;
      course.evaluations = course.evaluations.filter(e => e.id !== evalId);
    });
  } catch (error) {
    console.error('❌ Failed to delete evaluation:', error);
  }
}

// --- Reorder Evaluations ---
// Persists a new display order by rewriting each evaluation's index to its
// position in orderedIds. Evaluations not named in orderedIds keep their index.
export async function reorderEvaluations(semesterId, courseId, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  try {
    await mutate((data) => {
      const semester = data.semesters.find(s => s.id === semesterId);
      if (!semester) return;
      const course = (semester.courses || []).find(c => c.id === courseId);
      if (!course || !Array.isArray(course.evaluations)) return;
      const position = new Map(orderedIds.map((id, i) => [id, i]));
      course.evaluations.forEach(e => {
        if (position.has(e.id)) e.index = position.get(e.id);
      });
    });
  } catch (error) {
    console.error('❌ Failed to reorder evaluations:', error);
  }
}

// --- Load Courses ---
export async function loadCourses(semesterId) {
  try {
    const { data } = await readData();
    const semester = data.semesters.find(s => s.id === semesterId);
    if (!semester) return [];

    return (semester.courses || []).map(course => ({
      id: course.id,
      code: course.code,
      topic: course.topic,
      units: course.units,
      evaluations: (course.evaluations || [])
        .slice()
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    }));
  } catch (error) {
    console.error('❌ Failed to load courses:', error);
    return [];
  }
}

// --- Delete Course ---
export async function deleteCourse(semesterId, courseId) {
  try {
    await mutate((data) => {
      const semester = data.semesters.find(s => s.id === semesterId);
      if (!semester) return;
      semester.courses = (semester.courses || []).filter(c => c.id !== courseId);
    });
    console.log('✅ Course deleted:', courseId);
  } catch (err) {
    console.error('❌ Failed to delete course:', err);
  }
}

// --- Delete Semester ---
export async function deleteSemester(semesterId) {
  try {
    await mutate((data) => {
      data.semesters = data.semesters.filter(s => s.id !== semesterId);
    });
    console.log(`🗑️ Deleted semester ${semesterId}`);
  } catch (err) {
    console.error('❌ Failed to delete semester:', err);
  }
}

// --- Clear Evaluations ---
export async function clearEvaluations(semesterId, courseId) {
  try {
    await mutate((data) => {
      const semester = data.semesters.find(s => s.id === semesterId);
      if (!semester) return;
      const course = (semester.courses || []).find(c => c.id === courseId);
      if (!course) return;
      course.evaluations = [];
    });
    console.log('🧹 Cleared evaluations for course', courseId);
  } catch (error) {
    console.error('❌ Failed to clear evaluations:', error);
  }
}
