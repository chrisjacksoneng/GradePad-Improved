// Simplified auth.js - no Firebase authentication needed
// Just provides a mock user for local development

const mockUser = {
  uid: 'local_user',
  displayName: 'Local User',
  email: 'local@gradepad.com'
};

// Mock auth state - always logged in
export function getCurrentUser() {
  return mockUser;
}

// Mock auth state changed callback
export function onAuthStateChanged(callback) {
  // Immediately call with mock user
  callback(mockUser);
  return () => {}; // Return unsubscribe function
}

// Mock login function
export function loginWithGoogle() {
  console.log("✅ Logged in as:", mockUser.displayName);
  
  const loginBtn = document.getElementById("loginBtn");
  const userDropdownContainer = document.getElementById("userDropdownContainer");
  const userNameDisplay = document.getElementById("userNameDisplay");

  if (loginBtn) loginBtn.classList.add("hidden");
  if (userDropdownContainer && userNameDisplay) {
    userNameDisplay.textContent = (mockUser.displayName || "Account") + " ▼";
    userDropdownContainer.classList.remove("hidden");
  }
}

// Mock sign out function
export function signOut() {
  console.log("✅ Logged out");
  
  const loginBtn = document.getElementById("loginBtn");
  const userDropdownContainer = document.getElementById("userDropdownContainer");
  const dropdownMenu = document.getElementById("dropdownMenu");

  if (userDropdownContainer) userDropdownContainer.classList.add("hidden");
  if (dropdownMenu) dropdownMenu.classList.add("hidden");
  if (loginBtn) loginBtn.classList.remove("hidden");
}

// Initialize auth state on page load
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const userDropdownContainer = document.getElementById("userDropdownContainer");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const signOutBtn = document.getElementById("signOutBtn");

  // Auto-login on page load
  if (loginBtn) loginBtn.classList.add("hidden");
  if (userDropdownContainer && userNameDisplay) {
    userNameDisplay.textContent = (mockUser.displayName || "Account") + " ▼";
    userDropdownContainer.classList.remove("hidden");
  }

  // Login button handler
  if (loginBtn) loginBtn.addEventListener("click", loginWithGoogle);

  // User dropdown toggle
  userNameDisplay?.addEventListener("click", () => dropdownMenu?.classList.toggle("hidden"));

  // Sign out button handler
  signOutBtn?.addEventListener("click", () => {
    signOut();
  });
});

// Export mock user for other modules
export { mockUser };
