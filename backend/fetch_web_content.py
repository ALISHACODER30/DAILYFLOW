"""Fetch the latest news and quotes from Tavily and print or save them.

Usage (from backend/):
    python fetch_web_content.py                  # news + quotes + tip, printed
    python fetch_web_content.py news quotes      # only the chosen topics
    python fetch_web_content.py --save           # also write data/web_content.json
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

TAVILY_URL = "https://api.tavily.com/search"
OUTPUT_FILE = BASE_DIR / "data" / "web_content.json"

TOPICS: dict[str, dict] = {
    "news": {
        "query": "latest technology and software development news",
        "topic": "news",
        "days": 2,
    },
    "quotes": {
        "query": "famous motivational quotes about productivity and focus",
        "topic": "general",
    },
    "tips": {
        "query": f"productivity tip for developers {date.today().isoformat()}",
        "topic": "general",
    },
}


def search(query: str, topic: str = "general", days: int | None = None) -> list[dict]:
    """Run one Tavily search and return a list of {title, url, content} dicts."""
    key = os.getenv("TAVILY_API_KEY")
    if not key:
        raise RuntimeError("TAVILY_API_KEY is not set in backend/.env")
    body = {"query": query, "topic": topic, "max_results": 5}
    if days is not None:
        body["days"] = days
    req = urllib.request.Request(
        TAVILY_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        results = json.loads(resp.read().decode("utf-8")).get("results", [])
    return [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "content": (r.get("content") or "").strip(),
        }
        for r in results
    ]


def main() -> int:
    """Fetch the requested topics, print them, and optionally save to JSON."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("topics", nargs="*", choices=list(TOPICS))
    parser.add_argument(
        "--save", action="store_true", help="write data/web_content.json"
    )
    args = parser.parse_args()

    chosen = args.topics or list(TOPICS)
    output: dict = {"date": date.today().isoformat()}
    failed = False
    for name in chosen:
        try:
            output[name] = search(**TOPICS[name])
        except (
            urllib.error.URLError,
            TimeoutError,
            json.JSONDecodeError,
            RuntimeError,
        ) as e:
            print(f"[{name}] failed: {e}", file=sys.stderr)
            output[name] = []
            failed = True
            continue
        print(f"\n=== {name.upper()} ===")
        for r in output[name]:
            print(f"\n- {r['title']}\n  {r['url']}\n  {r['content'][:300]}")

    if args.save:
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_FILE.write_text(json.dumps(output, indent=2), encoding="utf-8")
        print(f"\nSaved to {OUTPUT_FILE}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
