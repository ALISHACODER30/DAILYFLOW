import { useState } from "react";
import { addTask } from "../api";
import ErrorNote from "./ErrorNote";
import TaskCard from "./TaskCard";

/** Local date as YYYY-MM-DD (the backend stores local-time ISO strings). */
const localToday = () => new Date().toLocaleDateString("sv-SE");

/**
 * @param {{ tasks: object[], loading: boolean, error: string | null,
 *           onAdded: (task: object) => void, onComplete: (id: string) => Promise<void>,
 *           onRetry: () => void }} props
 */
export default function TaskManager({ tasks, loading, error, onAdded, onComplete, onRetry }) {
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const inProgress = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed && t.completed_at?.slice(0, 10) === localToday());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      onAdded(await addTask(title.trim()));
      setTitle("");
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to get done?"
          aria-label="New task"
          disabled={adding}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? "Planning…" : "Add Task"}
        </button>
      </form>
      <ErrorNote message={addError} />

      {loading && (
        <div className="mt-6 animate-pulse space-y-3" aria-label="Loading tasks">
          <div className="h-24 rounded-xl bg-slate-100" />
          <div className="h-24 rounded-xl bg-slate-100" />
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          <span>Couldn't load tasks. {error}</span>
          <button onClick={onRetry} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-500">In Progress ({inProgress.length})</h3>
            {inProgress.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Nothing in progress. Add a task above and it'll be split into subtasks for you.
              </p>
            ) : (
              <ul className="space-y-3">
                {inProgress.map((t) => (
                  <TaskCard key={t.id} task={t} onComplete={onComplete} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <button
              onClick={() => setShowCompleted((v) => !v)}
              aria-expanded={showCompleted}
              className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <svg
                viewBox="0 0 20 20"
                className={`h-4 w-4 transition-transform ${showCompleted ? "rotate-90" : ""}`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7.2 4.8a1 1 0 011.4 0l4.5 4.5a1 1 0 010 1.4l-4.5 4.5a1 1 0 01-1.4-1.4L11 10 7.2 6.2a1 1 0 010-1.4z" />
              </svg>
              Completed Today ({completed.length})
            </button>
            {!showCompleted ? null : completed.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Finished tasks will show up here.
              </p>
            ) : (
              <ul className="space-y-3">
                {completed.map((t) => (
                  <TaskCard key={t.id} task={t} onComplete={onComplete} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
