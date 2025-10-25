import { db } from "./firebase.js";
import { auth } from "./firebase.js";
import {
  collection as firestoreCollection,
  addDoc,
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";



// --- Save Semester (with generated ID you can use later) ---
export async function saveSemester({ name, startDate, endDate, semesterId = null }) {
  const user = auth.currentUser;
  if (!user) {
    console.error("❌ No user is logged in.");
    return null;
  }

  try {
    const semesterRef = semesterId
      ? doc(db, "users", user.uid, "semesters", semesterId)
      : doc(collection(db, "users", user.uid, "semesters"));

    await setDoc(semesterRef, {
      name,
      startDate,
      endDate,
      createdAt: new Date()
    });

    console.log(semesterId ? "✏️ Semester updated:" : "✅ Semester saved:", semesterRef.id);
    return semesterRef.id;
  } catch (error) {
    console.error("❌ Failed to save/update semester:", error);
    return null;
  }
}



// --- Load Semesters ---
export async function loadSemesters() {
  const user = auth.currentUser;

  if (!user) {
    console.error("❌ No user is logged in.");
    return [];
  }

  try {
    const querySnapshot = await getDocs(
      firestoreCollection(db, "users", user.uid, "semesters")
    );
    const semesters = [];
    querySnapshot.forEach((doc) => {
      semesters.push({ id: doc.id, ...doc.data() });
    });
    console.log("✅ Loaded semesters:", semesters);
    return semesters;
  } catch (error) {
    console.error("❌ Failed to load semesters:", error);
    return [];
  }
}

export async function saveCourse({ semesterId, code, topic, units }) {
  const user = auth.currentUser;
  if (!user || !semesterId) return;

  try {
    const courseRef = await addDoc(
      collection(db, "users", user.uid, "semesters", semesterId, "courses"),
      {
        code,
        topic,
        units,
        createdAt: new Date()
      }
    );
    console.log(`✅ Course "${code}" saved under semester ${semesterId}`);
    return courseRef.id;
  } catch (err) {
    console.error("❌ Failed to save course:", err);
  }
}

export async function saveEvaluation({ semesterId, courseId, name, due, grade, weight, index }) {
  try {
    const evaluationRef = collection(db, "users", auth.currentUser.uid, "semesters", semesterId, "courses", courseId, "evaluations");

    const evaluationData = {
      name: name ?? "",
      due: due ?? "",
      grade: grade ?? "",
      weight: weight ?? "",
      index: index ?? 0, // ✅ fallback index
      createdAt: serverTimestamp(),
    };

    await addDoc(evaluationRef, evaluationData);
    console.log("✅ Evaluation saved:", evaluationData);
  } catch (error) {
    console.error("❌ Error saving evaluation:", error);
  }
}



export async function loadCourses(semesterId) {
  const user = auth.currentUser;
  if (!user || !semesterId) return [];

  const courses = [];
  const courseSnap = await getDocs(
    collection(db, "users", user.uid, "semesters", semesterId, "courses")
  );

  for (const courseDoc of courseSnap.docs) {
    const courseId = courseDoc.id;
    const courseData = courseDoc.data();

    const evalSnap = await getDocs(
      collection(db, "users", user.uid, "semesters", semesterId, "courses", courseId, "evaluations")
    );

    const seen = new Set();
    const evaluations = evalSnap.docs
      .map((d) => d.data())
      .filter((e) => {
        const key = `${e.index}-${e.name}-${e.due}-${e.grade}-${e.weight}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));


    courses.push({
      id: courseId,
      ...courseData,
      evaluations
    });
  }

  return courses;
}


export async function deleteCourse(semesterId, courseId) {
  const user = auth.currentUser;
  if (!user || !semesterId || !courseId) {
    console.warn("⚠️ Missing user, semesterId, or courseId", { user, semesterId, courseId });
    return;
  }

  console.log("🗑️ Attempting to delete course:", courseId, "from semester:", semesterId);

  try {
    await deleteDoc(doc(db, "users", user.uid, "semesters", semesterId, "courses", courseId));
    console.log("✅ Course deleted from Firestore:", courseId);
  } catch (err) {
    console.error("❌ Failed to delete course:", err);
  }
}


export async function deleteSemester(semesterId) {
  const user = auth.currentUser;
  console.log("🧠 Deleting semester:", semesterId);

  if (!user || !semesterId) {
    console.warn("⚠️ Missing user or semesterId", { user, semesterId });
    return;
  }

  try {
    const coursesRef = collection(db, "users", user.uid, "semesters", semesterId, "courses");
    const courseSnapshot = await getDocs(coursesRef);

    for (const courseDoc of courseSnapshot.docs) {
      const courseId = courseDoc.id;

      // Delete evaluations under the course
      const evalsRef = collection(db, "users", user.uid, "semesters", semesterId, "courses", courseId, "evaluations");
      const evalSnapshot = await getDocs(evalsRef);

      for (const evalDoc of evalSnapshot.docs) {
        await deleteDoc(evalDoc.ref);
        console.log(`🗑️ Deleted evaluation ${evalDoc.id}`);
      }

      // Delete the course itself
      await deleteDoc(courseDoc.ref);
      console.log(`🗑️ Deleted course ${courseId}`);
    }

    // Finally delete the semester
    await deleteDoc(doc(db, "users", user.uid, "semesters", semesterId));
    console.log(`🗑️ Deleted semester ${semesterId} from Firestore`);
  } catch (err) {
    console.error("❌ Failed to fully delete semester and contents:", err);
  }
}


export async function clearEvaluations(semesterId, courseId) {
  const user = auth.currentUser;
  if (!user) return;

  const evalsRef = collection(db, "users", user.uid, "semesters", semesterId, "courses", courseId, "evaluations");
  const snapshot = await getDocs(evalsRef);
  const deletions = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletions);
  console.log("🧹 Cleared evaluations for course", courseId);
}

