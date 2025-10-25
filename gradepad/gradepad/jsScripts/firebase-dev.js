// Development version of Firebase config - uses hardcoded values for local testing
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Development Firebase config - replace with your actual values
const firebaseConfig = {
  apiKey: "AIzaSyCNTwgxZ5oxejzFTSVFxIPGMG45oMuOLVI",
  authDomain: "gradepad-53c3e.firebaseapp.com",
  projectId: "gradepad-53c3e",
  storageBucket: "gradepad-53c3e.firebasestorage.app",
  messagingSenderId: "692353563501",
  appId: "1:692353563501:web:03d0f683e2d3302901f864",
  measurementId: "G-J0MRZ4RHW0"
};

let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('✅ Firebase initialized successfully (DEV MODE)');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  // Don't throw error in development, just log it
  console.log('🔄 Continuing without Firebase...');
}

export { auth, db };
