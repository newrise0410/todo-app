# To-Do (HTML/CSS/JS + Firebase)

Single-user todo app. Data lives in Firebase Firestore (project `sw-todo-backend`).

## Run

This app uses ES modules, so it must be served over HTTP (not opened as `file://`):

```bash
npx serve -l 3000 .
```

Then open http://localhost:3000

## Tests (pure logic)

Open http://localhost:3000/tests/ — all assertions should report PASS.

## Firestore security rules

See `firestore.rules`. Access is time-limited and open (no login).
Anyone with the web config can read/write. To make it private, add Firebase
Anonymous Auth and change the rule to `allow read, write: if request.auth != null;`.
The web `apiKey` in `firebase-config.js` is not a secret; security is enforced by these rules.
