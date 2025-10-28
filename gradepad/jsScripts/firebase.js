// Fresh Firebase setup (CDN ESM)
// 1) Replace placeholders below with your Firebase web app config
// 2) Ensure Google provider is enabled in Firebase Console

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBnI1jmsEnYLsZizowBBGUu0ZRpblM5bH8",
  authDomain: "gradepad-improved.firebaseapp.com",
  projectId: "gradepad-improved",
  storageBucket: "gradepad-improved.firebasestorage.app",
  messagingSenderId: "223375674663",
  appId: "1:223375674663:web:6a2c54d972034e1c21ed02",
  measurementId: "G-7T6TTG6XQL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}


