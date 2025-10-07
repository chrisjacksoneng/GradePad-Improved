import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import { auth } from "./firebase.js";
import { initializeSavedSemesters } from "./main.js"; // ✅ Load semesters after login

const provider = new GoogleAuthProvider();

// --- Google Sign-In ---
export function loginWithGoogle() {
  setPersistence(auth, browserLocalPersistence)
    .then(() => signInWithPopup(auth, provider))
    .then((result) => {
      const user = result.user;
      console.log("✅ Logged in as:", user.displayName, user.uid, user.email);

      const loginBtn = document.getElementById("loginBtn");
      const userDropdownContainer = document.getElementById("userDropdownContainer");
      const userNameDisplay = document.getElementById("userNameDisplay");

      if (loginBtn) loginBtn.classList.add("hidden");
      if (userDropdownContainer && userNameDisplay) {
        userNameDisplay.textContent = (user.displayName || "Account") + " ▼";
        userDropdownContainer.classList.remove("hidden");
      }

      // ✅ Load saved semesters into the UI
      if (window.location.pathname.includes("index.html")) {
        initializeSavedSemesters();
      }
          })
    .catch((error) => {
      console.error("❌ Login error:", error.message);
    });
}

// --- Auth & UI Events ---
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const userDropdownContainer = document.getElementById("userDropdownContainer");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const signOutBtn = document.getElementById("signOutBtn");

  if (loginBtn) loginBtn.addEventListener("click", loginWithGoogle);
  userNameDisplay?.addEventListener("click", () => dropdownMenu?.classList.toggle("hidden"));

  signOutBtn?.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        console.log("✅ Logged out");
        userDropdownContainer.classList.add("hidden");
        dropdownMenu.classList.add("hidden");
        if (loginBtn) loginBtn.classList.remove("hidden");
      })
      .catch((error) => {
        console.error("❌ Logout error:", error.message);
      });
  });

  // --- Persist Auth State UI ---
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ User still logged in:", user.displayName);
      if (userNameDisplay) userNameDisplay.textContent = (user.displayName || "Account") + " ▼";
      if (userDropdownContainer) userDropdownContainer.classList.remove("hidden");
      if (loginBtn) loginBtn.style.display = "none";
      if (window.location.pathname.includes("index.html")) {
        initializeSavedSemesters();
      }
          } else {
      console.log("❌ User not logged in");
      if (loginBtn) loginBtn.style.display = "flex";
      if (userDropdownContainer) userDropdownContainer.classList.add("hidden");
    }
  });
});

// Optional global
window.loginWithGoogle = loginWithGoogle;
