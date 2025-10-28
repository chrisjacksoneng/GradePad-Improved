// Fresh Firebase setup (CDN ESM)
// 1) Replace placeholders below with your Firebase web app config
// 2) Ensure Google provider is enabled in Firebase Console

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

// moved to gitignored firebase-config.js (see firebase-config.example.js)

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signOutUser() {
  await signOut(auth);
}


