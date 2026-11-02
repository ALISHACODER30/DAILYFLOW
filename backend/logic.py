import json
import os
import re
import time
import urllib.request
import uuid
from datetime import datetime, date
from pathlib import Path

from dotenv import load_dotenv
import openai
from openai import OpenAI

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

TASKS_FILE = BASE_DIR / "data" / "tasks.json"
BRIEFING_FILE = BASE_DIR / "data" / "briefing.json"
MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/auto")


class LogicError(Exception):
    """Raised for failures; `status` maps to the HTTP status code."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


# ---------- AI ----------

_client = None
RETRY_CODES = {429, 500, 502, 503, 504}
MAX_ATTEMPTS = 4


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        key = next(
            (
                k
                for k in (
                    os.getenv("OPENROUTER_API_KEY"),
                    os.getenv("OPEN_ROUTER_API_KEY"),
                )
                if k and k != "your_key_here"
            ),
            None,
        )
        if not key:
            raise LogicError(500, "OPENROUTER_API_KEY is not set in backend/.env")
        _client = OpenAI(api_key=key, base_url="https://openrouter.ai/api/v1")
    return _client


def _parse_json(raw: str):
    """Parse JSON from a model reply, tolerating ```json fences."""
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
    return json.loads(raw)


def ask_ai(prompt: str, as_json: bool = False) -> str:
    """Call the model via OpenRouter, retrying temporary errors with backoff."""
    if as_json:
        prompt += "\n\nReply with valid JSON only, no markdown fences or extra text."
    client = _get_client()
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            resp = client.chat.completions.create(
                model=MODEL, messages=[{"role": "user", "content": prompt}]
            )
            return (resp.choices[0].message.content or "").strip()
        except openai.APIStatusError as e:
            retryable = e.status_code in RETRY_CODES
            if retryable and attempt < MAX_ATTEMPTS:
                time.sleep(2 ** (attempt - 1))  # 1s, 2s, 4s
                continue
            if retryable:
                raise LogicError(
                    503, "The AI model is busy right now. Please try again in a moment."
                )
            raise LogicError(502, f"AI request failed: {e}")
        except openai.APIConnectionError as e:
            if attempt < MAX_ATTEMPTS:
                time.sleep(2 ** (attempt - 1))
                continue
            raise LogicError(502, f"Can't reach OpenRouter: {e}")
        except Exception as e:
            raise LogicError(502, f"AI request failed: {e}")


# ---------- Storage ----------


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _today() -> str:
    return date.today().isoformat()


def _is_today(iso: str | None) -> bool:
    return bool(iso) and iso[:10] == _today()


# ---------- Tasks ----------


def get_tasks() -> list:
    return read_json(TASKS_FILE, [])


FALLBACK_SUBTASK = "Break this task down manually"


def breakdown_task(description: str) -> dict:
    """Return a detailed AI breakdown of a task, with a time estimate per subtask."""
    description = description.strip()
    if not description:
        raise LogicError(400, "task_description is required")
    raw = ask_ai(
        "Break this task into 3-8 detailed, concrete subtasks, in the order they "
        "would sensibly be done. For each subtask give a short title, a 1-2 sentence "
        "description of exactly what to do and what 'done' looks like, and a "
        "realistic time estimate in minutes. Respond with only a JSON array of "
        'objects with keys "title" (string), "description" (string) and '
        '"estimate_minutes" (integer).\n\n'
        f"Task: {description}",
        as_json=True,
    )
    try:
        items = _parse_json(raw)
        subtasks = [
            {
                "title": str(i["title"]),
                "description": str(i.get("description", "")),
                "estimate_minutes": int(i["estimate_minutes"]),
            }
            for i in items
        ]
    except (json.JSONDecodeError, TypeError, KeyError, ValueError):
        raise LogicError(502, "AI returned an invalid breakdown")
    if not subtasks:
        raise LogicError(502, "AI returned an empty breakdown")
    return {
        "task_description": description,
        "subtasks": subtasks,
        "total_estimate_minutes": sum(s["estimate_minutes"] for s in subtasks),
    }


def create_task(title: str) -> dict:
    title = title.strip()
    if not title:
        raise LogicError(400, "title is required")
    try:
        raw = ask_ai(
            f'Break this task into 3-5 concrete, actionable subtasks: "{title}". '
            "Respond with only a JSON array of short strings.",
            as_json=True,
        )
        subtasks = [str(s) for s in _parse_json(raw)][:5]
        if not subtasks:
            raise ValueError("empty subtask list")
    except Exception:
        # Any AI failure must not block adding the task.
        subtasks = [FALLBACK_SUBTASK]
    task = {
        "id": str(uuid.uuid4()),
        "title": title,
        "subtasks": subtasks,
        "completed": False,
        "completed_at": None,
        "created_at": datetime.now().isoformat(),
    }
    tasks = get_tasks()
    tasks.append(task)
    write_json(TASKS_FILE, tasks)
    return task


def complete_task(task_id: str) -> dict:
    tasks = get_tasks()
    for t in tasks:
        if t["id"] == task_id:
            t["completed"] = True
            t["completed_at"] = datetime.now().isoformat()
            write_json(TASKS_FILE, tasks)
            return t
    raise LogicError(404, "Task not found")


def delete_task(task_id: str) -> dict:
    tasks = get_tasks()
    remaining = [t for t in tasks if t["id"] != task_id]
    if len(remaining) == len(tasks):
        raise LogicError(404, "Task not found")
    write_json(TASKS_FILE, remaining)
    return {"deleted": task_id}


# ---------- Briefing / standup / insights ----------


TAVILY_URL = "https://api.tavily.com/search"


def _tavily_enabled() -> bool:
    return os.getenv("TAVILY_ENABLED", "").strip().lower() == "true"


def _tavily_search(body: dict) -> list[dict]:
    """POST a search to Tavily; raise OSError/ValueError on any failure."""
    key = os.getenv("TAVILY_API_KEY")
    if not key:
        raise ValueError("TAVILY_API_KEY is not set in backend/.env")
    req = urllib.request.Request(
        TAVILY_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8")).get("results", [])


def _clean_snippet(text: str, limit: int = 280) -> str:
    """Strip markdown/link noise from a web snippet and trim to a sentence-ish length."""
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"", text)
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    text = re.sub(r"\[\.\.\.\]|[*_`>|]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return cut[: end + 1] if end > 80 else cut.rstrip() + "…"


def fetch_web_tip() -> str | None:
    """Search Tavily for a productivity tip; return None on any failure."""
    try:
        results = _tavily_search(
            {"query": f"productivity tip for developers {_today()}", "max_results": 3}
        )
    except (OSError, ValueError):
        # Network errors, HTTP errors and bad JSON all just mean "no tip".
        return None
    for r in results:
        content = _clean_snippet(r.get("content") or "")
        if content:
            return content
    return None


def get_web_tip(variant: int = 0) -> dict:
    """Return a cleaned web tip with its source; `variant` picks a different result."""
    try:
        results = _tavily_search(
            {
                "query": f"productivity tip for developers {_today()}",
                "max_results": 8,
            }
        )
    except (OSError, ValueError) as e:
        raise LogicError(502, f"Couldn't fetch a web tip: {e}")
    tips = [
        {
            "tip": _clean_snippet(r.get("content") or ""),
            "title": r.get("title", ""),
            "url": r.get("url", ""),
        }
        for r in results
    ]
    tips = [t for t in tips if len(t["tip"]) > 40]
    if not tips:
        raise LogicError(502, "No web tips found right now")
    return tips[variant % len(tips)]


def get_ai_news() -> dict:
    """Return the latest AI news headlines from Tavily."""
    try:
        results = _tavily_search(
            {
                "query": "latest artificial intelligence AI news",
                "topic": "news",
                "days": 3,
                "max_results": 6,
            }
        )
    except (OSError, ValueError) as e:
        raise LogicError(502, f"Couldn't fetch AI news: {e}")
    items = [
        {
            "title": re.sub(r"\s+", " ", r.get("title", "")).strip(),
            "summary": _clean_snippet(r.get("content") or "", 200),
            "url": r.get("url", ""),
            "published": r.get("published_date", ""),
        }
        for r in results
        if r.get("title") and r.get("url")
    ]
    if not items:
        raise LogicError(502, "No AI news found right now")
    return {"fetched_at": datetime.now().isoformat(), "items": items}


def get_briefing(force: bool = False) -> dict:
    saved = read_json(BRIEFING_FILE, {})
    if not force and _today() in saved:
        return saved[_today()]
    raw = ask_ai(
        "Generate a daily briefing as JSON with keys: "
        '"quote" (a motivational quote with author), '
        '"focus_tip" (one focus tip for the day), '
        '"message" (an encouraging message under 50 words).',
        as_json=True,
    )
    try:
        data = _parse_json(raw)
    except json.JSONDecodeError:
        raise LogicError(502, "AI returned invalid briefing")
    result = {
        "date": _today(),
        "quote": data.get("quote", ""),
        "focus_tip": data.get("focus_tip", ""),
        "message": data.get("message", ""),
    }
    if _tavily_enabled():
        web_tip = fetch_web_tip()
        if web_tip:
            result["web_tip"] = web_tip
    saved[_today()] = result
    write_json(BRIEFING_FILE, saved)
    return result


def get_standup() -> dict:
    tasks = get_tasks()
    done = [t for t in tasks if t["completed"] and _is_today(t["completed_at"])]
    pending = [t["title"] for t in tasks if not t["completed"]]
    if not done:
        return {"standup": "No tasks completed today yet."}
    completed = [{"task": t["title"], "steps": t["subtasks"]} for t in done]
    text = ask_ai(
        "Write a daily standup update in PLAIN TEXT only: no markdown, no asterisks, "
        "no headings symbols. Use exactly this layout, with a blank line between "
        "sections:\n\n"
        "Done:\n- <one short line per completed task, saying what was achieved>\n\n"
        "Next:\n- <one short line per pending task>\n\n"
        "Blockers:\n- None (or a brief note if the data suggests one)\n\n"
        "Keep each line under 90 characters and specific enough that a teammate "
        "understands the work. Use the steps only as context for what was achieved.\n\n"
        f"Completed today: {json.dumps(completed)}\n"
        f"Still pending: {json.dumps(pending)}"
    )
    return {"standup": text}


def get_insights() -> dict:
    tasks = [
        t
        for t in get_tasks()
        if _is_today(t["created_at"]) or _is_today(t["completed_at"])
    ]
    if not tasks:
        return {"insights": "No task activity today yet."}
    summary = [
        {
            "title": t["title"],
            "created_at": t["created_at"],
            "completed_at": t["completed_at"],
        }
        for t in tasks
    ]
    text = ask_ai(
        "Analyze today's tasks. Identify peak productivity time, the task "
        "completion rate, and give suggestions for improvement. Be concise.\n"
        f"{json.dumps(summary)}"
    )
    return {"insights": text}
