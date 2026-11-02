---
name: morning-briefing
description: Generates and displays the DailyPulse morning briefing. Use at the start of every work session.
trigger: /morning-briefing
effort: low
---

# Morning Briefing

Show the user today's DailyPulse briefing and a short task summary. Requires the backend running at http://localhost:8000. Keep the whole run under 30 seconds.

## Steps

1. **Fetch the briefing.** Run `curl -s --max-time 25 http://localhost:8000/briefing`.
   - `GET /briefing` returns today's saved briefing, or generates and saves one if none exists yet, so no separate generation call is needed.
   - If the response is slow, that is the AI generating it; wait for it.
   - If curl fails to connect, stop and tell the user the backend isn't running, with the start command: `cd backend && uvicorn main:app --reload`.
   - If the response has a `detail` field, show it as the error (for example a missing API key) and stop.

2. **Fetch the tasks.** Run `curl -s --max-time 10 http://localhost:8000/tasks`.

3. **Compute from the tasks JSON** (compare dates using the local date in `created_at` / `completed_at`, which are ISO strings):
   - **Pending:** tasks where `completed` is false.
   - **Completed yesterday:** tasks where `completed_at` starts with yesterday's date. Omit this line if there are none.
   - **Suggested focus:** pick one pending task (prefer the oldest, or the one with the most subtasks) and say in one sentence why. If nothing is pending, suggest planning the day by adding a task.

4. **Display** in this format (plain text, no tables):

```
DailyPulse · <Weekday, Month D>

"<quote>"

Focus tip: <focus_tip>
Note: <message>

Tasks
- Pending: <n>
- Completed yesterday: <n>      (only if > 0)

Suggested focus: <task title> - <one-sentence reason>
```

## Rules

- Do not modify any files or call endpoints other than `GET /briefing` and `GET /tasks`.
- Do not call `/standup` or `/insights`.
- Don't add commentary beyond the formatted output.
