/**
 * @param {{ briefing: {quote: string, focus_tip: string, message: string} | null,
 *           loading: boolean, error: string | null, onRetry: () => void }} props
 */
export default function BriefingCard({ briefing, loading, error, onRetry }) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-400 to-sky-400 p-[2px] shadow-md">
      <div className="rounded-[14px] bg-gradient-to-br from-white to-indigo-50/60 p-6 sm:p-8">
        {loading && (
          <div className="animate-pulse space-y-4" aria-label="Loading briefing">
            <div className="h-7 w-3/4 rounded bg-slate-200" />
            <div className="h-7 w-1/2 rounded bg-slate-200" />
            <div className="grid gap-4 pt-4 sm:grid-cols-2">
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100" />
            </div>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-rose-700">Couldn't load today's briefing. {error}</p>
            <button
              onClick={onRetry}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && briefing && (
          <>
            <blockquote className="text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
              “{briefing.quote.replace(/^["“]|["”]$/g, "")}”
            </blockquote>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 p-4 ring-1 ring-indigo-100">
                <h2 className="text-sm font-semibold text-indigo-600">Today's focus</h2>
                <p className="mt-1 text-slate-700">{briefing.focus_tip}</p>
              </div>
              <div className="rounded-xl bg-white/80 p-4 ring-1 ring-indigo-100">
                <h2 className="text-sm font-semibold text-indigo-600">A note for you</h2>
                <p className="mt-1 text-slate-700">{briefing.message}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
