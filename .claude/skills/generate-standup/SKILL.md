---
name: generate-standup
description: Generates a professional standup from today's DailyPulse tasks. Use before your daily standup meeting.
trigger: /generate-standup
effort: low
---

# Generate Standup

Turn today's completed DailyPulse tasks into a standup the user can paste into a meeting or chat. Requires the backend running at http://localhost:8000.

## Steps

1. **Fetch the standup draft.** Run `curl -s --max-time 30 http://localhost:8000/standup`.
   - The response is `{"standup": "<plain text>"}` with `Done:`, `Next:` and `Blockers:` sections. The AI may take a few seconds.
   - If curl fails to connect, stop and tell the user the backend isn't running: `cd backend && uvicorn main:app --reload`.
   - If the response has a `detail` field, show it as the error and stop.
   - If the standup says no tasks were completed today, tell the user and stop. There is nothing to copy.

2. **Ask about blockers.** Ask: "Any blockers?" and wait for the user's reply before printing anything. Treat "no", "none" or an empty answer as no blockers. Do not guess blockers.

3. **Format and print** the standup using the draft's content and the user's blocker answer:

```
Done:
- <each line from "Done">

Next:
- <each line from "Next">

Blockers:
- <user's answer, or "None">
```

   This matches the backend's format: plain text only, no emoji, markdown or heading symbols, `- ` bullets, and a blank line between sections. Keep the draft's lines as they are (under 90 characters each) and don't invent work that isn't in the draft. Only the Blockers section changes, using the user's answer.

4. **Ask:** "Copy this to clipboard? (y/n)" and wait.
   - On `y`, copy the exact printed standup text using the clipboard tool for the platform:
     - Windows: `clip`
     - macOS: `pbcopy`
     - Linux: `xclip -selection clipboard`
   - Pipe the text through stdin from a heredoc, for example `cat <<'EOF' | clip`. Then confirm with "Copied."
   - If the tool isn't installed (commonly `xclip` on Linux), say so and leave the printed text for the user to copy by hand.
   - On `n`, finish without copying.

## Rules

- Only call `GET /standup`. Don't modify any files or call other endpoints.
- Never print the standup before the user has answered the blockers question.
