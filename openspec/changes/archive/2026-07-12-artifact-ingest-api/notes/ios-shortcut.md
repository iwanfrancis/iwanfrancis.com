# Client setup — iOS Shortcut & macOS Quick Action

Off-repo companions to the `artifact-ingest` capability. The endpoint
(`POST /api/ingest`) is the durable, tested part; these clients are configured
once on-device. Both do the same thing: take a self-contained `.html` (Claude's
"download HTML"), POST it with the bearer token, and hand back the public link.

## Token

- Generate: `openssl rand -base64 32`.
- Store on the **main app** Railway service as `ARTIFACTS_API_TOKEN` — never on
  `artifact-server`.
- Create-only write access to the public host: a leak can add artifacts but not
  list, read, or delete them. Treat like the admin password; rotate via the env
  var.

## ⚠️ Any successful call writes to the production bucket

There is no local/staging bucket — a `201` (even from `localhost:3000`) publishes
a real, live artifact. When smoke-testing, either assert only the auth gate
(expect `401` for a missing/wrong token — no write) or use a throwaway title and
delete it afterwards via `/artifacts`.

## iOS — Share Sheet Shortcut

Flow: Claude app → open artifact → **download HTML** → Share → the Shortcut →
link on the clipboard, artifact opens.

1. New Shortcut → settings → **Show in Share Sheet**, **Accepted Types = Files**.
2. **Ask for Input** (Text, "Title?") **first** — so the token is never shown in a
   run-time prompt. (Collecting the title inside "Get Contents of URL" via "Ask
   Each Time" pops the request config, which reveals the `Authorization` header.)
3. **Get Contents of URL**:
   - URL `https://iwans.space/api/ingest`, Method `POST`
   - Headers: `Authorization` = `Bearer <token>` (static — **not** "Ask Each
     Time"); `X-Artifact-Title` = the *Provided Input* from step 2
   - Request Body: **File** = **Shortcut Input**
4. **Get Dictionary Value** `url` ← wire its input to **Contents of URL** (not
   Shortcut Input, or it tries to parse the file's Rich Text and fails).
5. **Copy to Clipboard** (`url`), then **Open URLs** (`url`).

Gotchas we hit: a **blank/empty header row** makes Cloudflare 400 the whole
request (malformed framing) — delete any empty header. Header values can't contain
newlines (a multi-line title breaks it); emoji and spaces are fine.

## macOS — Finder Quick Action

Flow: download the HTML (lands in `~/Downloads`) → right-click → **Quick Actions →
Upload Artifact** → title prompt → link copied, artifact opens.

**Token in Keychain** (more secure than embedding it in the workflow):

```sh
security add-generic-password -s artifacts-ingest-token -a "$USER" -w '<token>'
```

**Script** at `~/bin/artifact-ingest.sh` (`chmod +x`). Reads the token from
Keychain, prompts for a title per file, uploads, copies + opens the link, and logs
to `~/Library/Logs/artifact-ingest.log`:

```zsh
#!/bin/zsh
# Upload one or more .html files to artifacts.iwans.space via POST /api/ingest.
# Token is read from the login Keychain (never stored here).
# Debug log: ~/Library/Logs/artifact-ingest.log
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

endpoint="https://iwans.space/api/ingest"
prompt_title=true   # ask for a title per file; set false to use the filename
log="$HOME/Library/Logs/artifact-ingest.log"
echo "---- $(date) : $# file(s) ----" >>"$log"

token=$(security find-generic-password -s artifacts-ingest-token -w 2>>"$log")
if [ -z "$token" ]; then
  osascript -e 'display notification "No token in Keychain" with title "Artifact upload failed"'
  echo "ERROR: no token in Keychain" >>"$log"; exit 1
fi
if [ "$#" -eq 0 ]; then
  osascript -e 'display notification "No files received" with title "Artifact upload failed"'
  echo "ERROR: no files (check 'Pass input: as arguments')" >>"$log"; exit 1
fi

for f in "$@"; do
  name=$(basename "$f"); default_title="${name%.*}"
  if [ "$prompt_title" = true ]; then
    esc=$(printf '%s' "$default_title" | sed 's/\\/\\\\/g; s/"/\\"/g')
    title=$(osascript -e "text returned of (display dialog \"Title for this artifact:\" default answer \"$esc\" with title \"Upload to artifacts\")" 2>/dev/null) \
      || { echo "$f -> cancelled at title prompt" >>"$log"; continue; }
  else
    title="$default_title"
  fi
  body=$(mktemp)
  code=$(curl -sS -o "$body" -w '%{http_code}' -X POST "$endpoint" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: text/html" \
    -H "X-Artifact-Title: $title" \
    --data-binary @"$f" 2>>"$log")
  echo "$f -> HTTP $code : $(cat "$body")" >>"$log"
  if [ "$code" = "201" ]; then
    url=$(sed -n 's/.*"url":"\([^"]*\)".*/\1/p' "$body")   # no jq dependency
    printf '%s' "$url" | pbcopy
    open "$url"                                             # delete to stop auto-opening
    osascript -e "display notification \"$url\" with title \"Artifact uploaded\""
  else
    reason=$(sed -n 's/.*"error":"\([^"]*\)".*/\1/p' "$body")
    osascript -e "display notification \"HTTP $code: $reason\" with title \"Artifact upload failed\""
  fi
  rm -f "$body"
done
```

**Automator Quick Action**: New → **Quick Action** → receives **files or folders**
in **Finder** → **Run Shell Script** with **Pass input: as arguments** and body:

```
"$HOME/bin/artifact-ingest.sh" "$@"
```

It saves to `~/Library/Services/<name>.workflow`. Calling the standalone script
(rather than pasting an inline script) dodges Automator's minimal `PATH` and lets
you tweak behaviour by editing `~/bin/artifact-ingest.sh` without reopening
Automator.

Gotchas we hit: **Pass input must be "as arguments"** (stdin leaves `$@` empty, so
nothing runs); Homebrew tools (`jq`, …) aren't on Automator's `PATH`, so the script
avoids them and pins `PATH` itself; on any failure, `~/Library/Logs/artifact-ingest.log`
has the HTTP code and reason.
