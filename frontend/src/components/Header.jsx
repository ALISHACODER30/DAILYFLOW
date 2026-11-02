/**
 * @param {{ onRefresh: () => void, refreshing: boolean }} props
 */
export default function Header({ onRefresh, refreshing }) {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const date = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          DailyPulse
        </h1>
        <p className="mt-1 text-slate-500">
          <span className="font-semibold text-slate-700">{day}</span>, {date}
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
      >
        {refreshing ? "Refreshing…" : "Refresh Briefing"}
      </button>
    </header>
  );
}
