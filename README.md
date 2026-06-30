# To-Do (HTML/CSS/JS + Firebase)

Single-user todo app. Data lives in Firebase **Realtime Database**
(project `sw-todo-backend`, instance `asia-southeast1`).

## Run

This app uses ES modules, so it must be served over HTTP (not opened as `file://`):

```bash
npx serve -l 3000 .
```

Then open http://localhost:3000

## Tests

- **Pure logic:** open http://localhost:3000/tests/ — all assertions should report PASS.
- **Realtime Database end-to-end** (write → read → update → realtime → delete) is
  covered by a Node script run during development; it exercises the same
  `push` / `onValue` / `update` / `remove` operations the app uses.

## Realtime Database security rules

See `database.rules.json`. Access is time-limited and open (no login):
anyone with the web config can read/write under `/todos`. To make it private,
add Firebase Anonymous Auth and change the rules to require `auth != null`, e.g.

```json
{ "rules": { "todos": { ".read": "auth != null", ".write": "auth != null" } } }
```

Publish rules in the Firebase console: **Build → Realtime Database → Rules**.
The web `apiKey` and `databaseURL` in `firebase-config.js` are not secrets;
security is enforced by these rules.
