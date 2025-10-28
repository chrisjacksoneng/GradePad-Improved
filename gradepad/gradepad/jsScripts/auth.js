// Placeholder auth module (Firebase removed; will be re-added fresh)
export function loginWithGoogle() {
  console.warn("Firebase not configured yet. Add new Firebase setup and call signInWithPopup here.");
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  loginBtn?.addEventListener("click", loginWithGoogle);
});
