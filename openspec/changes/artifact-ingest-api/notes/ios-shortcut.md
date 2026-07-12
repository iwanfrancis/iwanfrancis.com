# iOS "share to artifacts" Shortcut — setup note

Off-repo companion to the `artifact-ingest` capability. The endpoint
(`POST /api/ingest`) is the durable, tested part; the Shortcut is built on-device
in the Shortcuts app and configured once.

## What it does

From the Claude iOS app: open an artifact → **download HTML** → the system share
sheet appears → tap the Shortcut → the `.html` is uploaded to
`artifacts.iwans.space` and the public link is copied to the clipboard.

## Build it (Shortcuts app)

1. New Shortcut → in its settings enable **Show in Share Sheet**, and set
   **Accepted Types** to **Files** (untick the rest).
2. Add **Get Contents of URL**:
   - **URL**: `https://iwans.space/api/ingest`
   - **Method**: `POST`
   - **Headers**:
     - `Authorization` → `Bearer <ARTIFACTS_API_TOKEN>` (the value set in Railway)
     - `X-Artifact-Title` → (optional) an "Ask Each Time" text, or a fixed title
   - **Request Body**: **File** → set to **Shortcut Input** (the shared `.html`)
   - Content-Type is left as the file's own (`text/html`); the endpoint treats
     any non-multipart body as the HTML document.
3. Add **Get Dictionary Value** → key `url` from the **Contents of URL** result.
4. Add **Copy to Clipboard** (that `url`), then **Show Notification** (e.g. "Shared:
   " + url).

On success the endpoint returns `201` with `{ "slug", "url" }`. A `401` means the
token is wrong/missing; a `413` means the file is over the size cap.

## ⚠️ Local testing writes to the production bucket

There is no separate local/staging bucket — `POST /api/ingest` (and the whole
admin write path) writes to the **same shared Railway Bucket** that serves
`artifacts.iwans.space`. So a successful call against `localhost:3000` publishes a
real, live artifact. When smoke-testing locally either (a) assert only the auth
gate (expect `401` for a missing/wrong token — no write), or (b) use an obvious
throwaway title and delete it afterwards via `/artifacts`.

## Token

- Generate: `openssl rand -base64 32`.
- Store it in the Railway env of the **main app** service as `ARTIFACTS_API_TOKEN`
  — never on `artifact-server`.
- It grants create-only write access to the public artifact host. Treat it like
  the admin password; rotate by changing the env var and updating the Shortcut.

## macOS

No separate build needed. On a Mac the download lands in `~/Downloads`, so use
either the existing drag-drop UI at `/artifacts`, or a one-line alias against the
same endpoint:

```sh
artifact-upload() {
  curl -sS -X POST https://iwans.space/api/ingest \
    -H "Authorization: Bearer $ARTIFACTS_API_TOKEN" \
    -H "Content-Type: text/html" \
    -H "X-Artifact-Title: ${2:-}" \
    --data-binary @"$1"
}
```
