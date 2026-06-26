/**
 * firebase-config.example.js
 * ─────────────────────────────────────────────────────────────────
 * TEMPLATE — copy this file to firebase-config.js and fill in your
 * real values.  firebase-config.js is gitignored and must NEVER be
 * committed to version control.
 *
 * How to get these values
 * ───────────────────────
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project (or open an existing one)
 * 3. Project Settings (⚙) → General → "Your apps" → Web (</>)
 * 4. Register a new web app (or select an existing one)
 * 5. Copy the firebaseConfig object shown in the snippet
 *
 * Why is it safe to put these in client-side code?
 * ─────────────────────────────────────────────────
 * These are *client* credentials, not server secrets.  Firebase
 * security is enforced through Firebase Security Rules, not by
 * keeping the config hidden.  The Firebase docs confirm this.
 *
 * For CI/CD (GitHub Actions)
 * ──────────────────────────
 * Store each value as a GitHub repository secret, then add a step
 * to your workflow that runs envsubst (or a small Node.js script)
 * to generate firebase-config.js from this template before building.
 */

export const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",       // e.g. my-app.firebaseapp.com
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",    // e.g. my-app.appspot.com
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID",
};
