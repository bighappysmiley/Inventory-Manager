# Inventory Manager

A full-stack, multi-user inventory management web app — barcode scanning, a
searchable/bulk-editable item table, 2D and first-person-3D warehouse maps,
shelf/storage setup, per-user settings, and an admin-only support/role
panel. Built as a single-file static site (`index.html` + `app.js`) using
React 18 (UMD), Babel Standalone (in-browser JSX), and the Firebase compat
SDK — no build step, no bundler.

## 1. Create / connect a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com/) and create a project (or use an existing one).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create a database (production mode is fine; the rules below lock it down).
4. **Project settings** → General → "Your apps" → add a **Web app** → copy the `firebaseConfig` object it gives you.

## 2. Wire up your config

Open `app.js` and replace the placeholder values near the top of the file:

```js
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};
```

with the real values from step 1.4.

### Admin bootstrap

The app auto-grants admin access on first sign-in to:
- the exact email `hf@bighappysmiley.com`, or
- any email ending in `@bighappysmiley.com`

Update `SUPER_ADMIN_EMAIL` / `ADMIN_DOMAIN` near the top of `app.js` (and the
matching `isAutoBootstrapEligible()` check in `firestore.rules`) if you want
different bootstrap rules. Everyone else signs up as a regular user; an
existing admin can promote them later from the Admin Panel.

## 3. Deploy Firestore security rules

This repo includes `firestore.rules`, matching the app's data model
(per-user inventory isolation, admin-only support tickets, role management
via a separate `admins` collection). Deploy it with the
[Firebase CLI](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point it at this project; keep the default firestore.rules path, or point it at this file
firebase deploy --only firestore:rules
```

(Alternatively, paste the contents of `firestore.rules` directly into
Firestore → Rules in the console and click **Publish**.)

## 4. Run locally

No build step — just serve the static files:

```bash
npx serve .
# or: python3 -m http.server 8080
```

Then open the printed local URL.

## 5. Deploy (Netlify)

This repo includes `netlify.toml` (`publish = "."`, SPA-style redirect to
`index.html`). Connect the repo in Netlify, or deploy the folder directly —
no build command is required since there's no bundler.

## Notes

- All Firebase calls use the **compat** SDK (script-tag style), loaded via
  `<script>` tags in `index.html` — not the modern modular SDK.
- Inventory, shelves, and map layout are stored per-user under
  `users/{uid}/...` and are never visible to other users, including admins.
  The Admin Panel only manages identity/role data (`users_meta`, `admins`).
