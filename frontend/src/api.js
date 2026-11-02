const API_BASE = "http://localhost:8000";

/**
 * Calls the DailyPulse API and returns parsed JSON.
 * Throws an Error with a readable message on failure.
 * @param {string} path
 * @param {RequestInit} [options]
 */
async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error("Can't reach the server. Is the backend running on port 8000?");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      /* keep default message */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const getBriefing = (refresh = false) =>
  request(`/briefing${refresh ? "?refresh=true" : ""}`);
export const getTasks = () => request("/tasks");
export const addTask = (title) =>
  request("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
export const completeTask = (id) => request(`/tasks/${id}/complete`, { method: "PUT" });
export const getStandup = () => request("/standup");
export const getInsights = () => request("/insights");
export const getWebTip = (variant = 0) => request(`/web-tip?variant=${variant}`);
export const getAiNews = () => request("/ai-news");
