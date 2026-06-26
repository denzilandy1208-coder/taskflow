/**
 * auth.js — Firebase Authentication Module for TaskFlow
 * ─────────────────────────────────────────────────────────────────
 * Uses Firebase Web SDK v10+ Modular API imported directly from the
 * Firebase CDN — no bundler or npm install required.
 *
 * Exported functions are consumed by a <script type="module"> block
 * inside index.html, which bridges them to the global classic-script
 * scope via window.FB.
 *
 * Supported flows:
 *   • Email + Password Sign-Up (with email verification)
 *   • Email + Password Sign-In
 *   • Google Sign-In (popup, always shows account chooser)
 *   • Sign-Out
 *   • Password Reset (sends email link)
 *   • Re-send verification email
 *   • Auth-state persistence across page refreshes (onAuthStateChanged)
 */

// ── Firebase SDK (v10+ modular) from the official CDN ─────────────
// Static imports must use string literals — template literals are not
// allowed in ES module import statements.
// To upgrade: update the version string in both import URLs below.
// Latest versions: https://firebase.google.com/docs/web/learn-more#libraries-cdn
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  reload,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

// ── Module-level singleton references ─────────────────────────────
let _auth = null;

// ══════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════════════════════

/**
 * initFirebase — Initialize the Firebase app and Auth service.
 * Must be called before any other function in this module.
 *
 * @param {Object} config  Firebase project config object
 * @returns {Auth}         The Firebase Auth instance
 */
export function initFirebase(config) {
  const app = initializeApp(config);
  _auth = getAuth(app);
  return app;
}

// ══════════════════════════════════════════════════════════════════
//  AUTH STATE LISTENER
// ══════════════════════════════════════════════════════════════════

/**
 * watchAuthState — Subscribe to Firebase auth state changes.
 *
 * Fires immediately on page load with either the cached user (if a
 * session exists) or null.  Re-fires whenever the user signs in or
 * out.  This replaces the old localStorage session check.
 *
 * @param {Function} callback  (user: FirebaseUser | null) => void
 * @returns {Function}         Call to unsubscribe
 */
export function watchAuthState(callback) {
  if (!_auth) throw new Error('[TaskFlow/auth] Firebase not initialised — call initFirebase() first.');
  return onAuthStateChanged(_auth, callback);
}

// ══════════════════════════════════════════════════════════════════
//  SIGN-UP
// ══════════════════════════════════════════════════════════════════

/**
 * signUp — Create a new account with email + password.
 *
 * Steps:
 *  1. createUserWithEmailAndPassword
 *  2. updateProfile  → sets displayName so it appears immediately
 *  3. sendEmailVerification → user gets a verification link
 *
 * @param {string} email
 * @param {string} password   Must be ≥ 6 characters (Firebase minimum)
 * @param {string} displayName
 * @returns {Promise<FirebaseUser>}
 */
export async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(_auth, email, password);

  // Attach display name so it's available immediately on cred.user
  await updateProfile(cred.user, { displayName: displayName.trim() });

  // Ask Firebase to send a verification email before the user enters the app
  await sendEmailVerification(cred.user);

  return cred.user;
}

// ══════════════════════════════════════════════════════════════════
//  SIGN-IN
// ══════════════════════════════════════════════════════════════════

/**
 * signIn — Sign in with email + password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<FirebaseUser>}
 */
export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(_auth, email, password);
  return cred.user;
}

/**
 * signInGoogle — Sign in with Google using a popup window.
 *
 * Uses `prompt: 'select_account'` so the account chooser always
 * appears, even if the user is already signed in to Google.
 *
 * @returns {Promise<FirebaseUser>}
 */
export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  // Always show the account chooser — important for shared devices
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(_auth, provider);
  return cred.user;
}

// ══════════════════════════════════════════════════════════════════
//  SIGN-OUT
// ══════════════════════════════════════════════════════════════════

/**
 * logOut — Sign the current user out.
 * onAuthStateChanged fires with null after this completes.
 */
export async function logOut() {
  await signOut(_auth);
}

// ══════════════════════════════════════════════════════════════════
//  PASSWORD RESET
// ══════════════════════════════════════════════════════════════════

/**
 * resetPassword — Send a password-reset email.
 *
 * Firebase sends the link; the user clicks it and is taken to
 * Firebase's hosted reset page (no extra backend needed).
 *
 * @param {string} email
 */
export async function resetPassword(email) {
  await sendPasswordResetEmail(_auth, email);
}

// ══════════════════════════════════════════════════════════════════
//  EMAIL VERIFICATION
// ══════════════════════════════════════════════════════════════════

/**
 * resendVerification — Re-send the email verification link.
 * Only sends if the current user's email is still unverified.
 */
export async function resendVerification() {
  const user = _auth?.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
}

/**
 * refreshUser — Re-fetches the user profile from Firebase servers.
 *
 * Call this after the user clicks the verification link and returns
 * to the app; it picks up the updated emailVerified = true flag.
 *
 * @returns {Promise<FirebaseUser | null>}
 */
export async function refreshUser() {
  if (_auth?.currentUser) {
    await reload(_auth.currentUser);
    return _auth.currentUser;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
//  ERROR MESSAGES
// ══════════════════════════════════════════════════════════════════

/**
 * getFirebaseErrorMessage — Convert Firebase error codes to plain English.
 *
 * Firebase error codes are documented at:
 * https://firebase.google.com/docs/reference/js/auth#autherrorcodes
 *
 * @param {Error} err  A Firebase error with a `.code` property
 * @returns {string}   Human-readable message
 */
export function getFirebaseErrorMessage(err) {
  const MAP = {
    'auth/email-already-in-use':    'That email is already registered.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with that email.',
    'auth/wrong-password':          'Incorrect password — please try again.',
    'auth/invalid-credential':      'Invalid email or password.',
    'auth/too-many-requests':       'Too many attempts. Wait a moment and try again.',
    'auth/user-disabled':           'This account has been disabled.',
    'auth/popup-closed-by-user':    'Sign-in window was closed.',
    'auth/popup-blocked':           'Pop-up blocked — allow pop-ups for this site and retry.',
    'auth/network-request-failed':  'Network error — check your connection.',
    'auth/requires-recent-login':   'Please sign in again to continue.',
    'auth/missing-email':           'Please enter your email address.',
    'auth/cancelled-popup-request': 'Another sign-in is already in progress.',
    'auth/account-exists-with-different-credential':
      'An account already exists with this email. Sign in with your original method.',
  };
  return MAP[err?.code] ?? (err?.message ?? 'An unexpected error occurred.');
}
