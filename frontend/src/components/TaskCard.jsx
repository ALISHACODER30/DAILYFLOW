import { useState } from "react";

/**
 * @param {{ task: {id: string, title: string, subtasks: string[], completed: boolean},
 *           onComplete: (id: string) => Promise<void> }} props
 */
export default function TaskCard({ task, onComplete }) {
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleComplete() {
    setBusy(true);
    setError(null);
    try {
      await onComplete(task.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <li
      className={`settle rounded-xl border border-l-4 border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm ${
        task.completed ? "border-l-indigo-200" : "border-l-indigo-500"
      }`}
    >
      <div className="flex items-start gap-3">
        {task.completed && (
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
            aria-label="Completed"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" />
            </svg>
          </span>
        )}
        <h3
          className={`font-semibold ${task.completed ? "text-slate-400 line-through" : "text-slate-900"}`}
        >
          {task.title}
        </h3>
      </div>

      {task.subtasks.length > 0 && (
        <ul className="mt-3 space-y-1.5 pl-1">
          {task.subtasks.map((s, i) => {
            const done = task.completed || checked[i];
            return (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!done}
                    disabled={task.completed}
                    onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={done ? "text-slate-400 line-through" : "text-slate-600"}>{s}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {!task.completed && (
        <button
          onClick={handleComplete}
          disabled={busy}
          className="mt-4 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white disabled:opacity-60"
        >
          {busy ? "Completing…" : "Complete Task"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </li>
  );
}
