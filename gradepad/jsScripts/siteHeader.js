// Shared header behaviour for the content pages (index, about, features,
// support). Each page used to carry its own copy of this script, so any change
// to the sign-in flow had to be made four times and the copies had already
// started to drift.
import { signInWithGoogle, onAuthChange, signOutUser } from './firebase.js';

const GOOGLE_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.64,6.053,29.084,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.64,6.053,29.084,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.191-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.49,5.005C9.51,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-4.094,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.191,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>`;

export function setupSiteHeader() {
  let btn = document.getElementById('googleSignInButton');
  // Only the landing page has this one.
  const getStarted = document.getElementById('getStartedButton');
  const headerRight = document.querySelector('.header-right');
  let guestBtn = headerRight?.querySelector('.cta-button');
  let isSigningIn = false;
  let confirmVisible = false;

  const doSignIn = async () => {
    if (isSigningIn) return;
    isSigningIn = true;
    if (btn) { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.7'; }
    try {
      await signInWithGoogle();
      // Stay on the current page after signing in.
    } catch (err) {
      if (!err || err.code !== 'auth/cancelled-popup-request') {
        console.error('Sign-in failed:', err);
        alert('Sign-in failed. Please try again.');
      }
    } finally {
      isSigningIn = false;
      if (btn) { btn.style.pointerEvents = ''; btn.style.opacity = ''; }
    }
  };

  // Named handlers, so they can be swapped when the auth state changes.
  const signInClickHandler = (e) => { e.preventDefault(); doSignIn(); };

  // Lightweight confirm: the first click reveals a small menu, the button in it
  // signs out.
  const ensureConfirmMenu = () => {
    let confirmEl = document.getElementById('gpSignOutConfirm');
    if (!confirmEl && btn) {
      confirmEl = document.createElement('div');
      confirmEl.id = 'gpSignOutConfirm';
      confirmEl.style.cssText = 'position:absolute;top:100%;right:0;background:#0b0b0b;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px;min-width:160px;z-index:1000;display:none;';
      const cta = document.createElement('button');
      cta.textContent = 'Sign out';
      cta.style.cssText = 'width:100%;background:#ffffff;border:1px solid rgba(0,0,0,0.08);color:#1f2937;padding:10px 14px;border-radius:6px;cursor:pointer;font-weight:600;';
      cta.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await doSignOut();
      });
      confirmEl.appendChild(cta);
      btn.style.position = 'relative';
      btn.appendChild(confirmEl);
    }
    return confirmEl;
  };

  const toggleConfirmHandler = (e) => {
    e.preventDefault();
    const menu = ensureConfirmMenu();
    if (!menu) return;
    confirmVisible = !confirmVisible;
    menu.style.display = confirmVisible ? 'block' : 'none';
  };

  const doSignOut = async () => {
    try { await signOutUser(); } finally {
      confirmVisible = false;
      const menu = document.getElementById('gpSignOutConfirm');
      if (menu) menu.style.display = 'none';
      if (btn) {
        btn.innerHTML = `${GOOGLE_SVG}<span>Sign in</span>`;
        btn.href = '#';
        btn.removeEventListener('click', toggleConfirmHandler);
        btn.addEventListener('click', signInClickHandler);
      }
      addGuestButtonIfMissing();
    }
  };

  const addGuestButtonIfMissing = () => {
    if (!headerRight) return;
    guestBtn = headerRight.querySelector('.cta-button');
    if (!guestBtn) {
      const a = document.createElement('a');
      a.href = '/gradepad/grades.html';
      a.className = 'cta-button';
      a.textContent = '→ Continue as guest';
      headerRight.appendChild(a);
      guestBtn = a;
    }
  };

  btn?.addEventListener('click', signInClickHandler);
  getStarted?.addEventListener('click', signInClickHandler);

  onAuthChange((user) => {
    if (user) {
      if (btn) {
        // Replace the button node so every old listener goes with it.
        const newBtn = btn.cloneNode(true);
        newBtn.innerHTML = `<span>${user.displayName || 'Account'} ▼</span>`;
        newBtn.href = '#';
        newBtn.addEventListener('click', toggleConfirmHandler);
        btn.parentNode.replaceChild(newBtn, btn);
        btn = newBtn;
      }
      if (getStarted) {
        getStarted.textContent = '→ Go to Grades';
        getStarted.href = '/gradepad/grades.html';
        getStarted.removeEventListener('click', signInClickHandler);
      }
      if (guestBtn && guestBtn.parentNode === headerRight) {
        headerRight.removeChild(guestBtn);
        guestBtn = null;
      }
    } else {
      if (btn) {
        btn.innerHTML = `${GOOGLE_SVG}<span>Sign in</span>`;
        btn.href = '#';
        btn.removeEventListener('click', toggleConfirmHandler);
        btn.removeEventListener('click', signInClickHandler);
        btn.addEventListener('click', signInClickHandler);
      }
      if (getStarted) {
        getStarted.textContent = '→ Get Started';
        getStarted.href = '#';
        getStarted.removeEventListener('click', signInClickHandler);
        getStarted.addEventListener('click', signInClickHandler);
      }
      addGuestButtonIfMissing();
    }
  });
}
