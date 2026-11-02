import { useCallback, useEffect, useState } from "react";
import { getAiNews, getWebTip } from "../api";
import ErrorNote from "./ErrorNote";

/**
 * Loads a value on mount and exposes a refresh function with loading/error state.
 * @template T
 * @param {(attempt: number) => Promise<T>} fetcher
 */
function useFeed(fetcher) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(
    async (n) => {
      setLoading(true);
      setError(null);
      try {
        setData(await fetcher(n));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [fetcher]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  function refresh() {
    const next = attempt + 1;
    setAttempt(next);
    load(next);
  }

  return { data, loading, error, refresh };
}

/**
 * @param {{ title: string, loading: boolean, onRefresh: () => void, children: any }} props
 */
function FeedCard({ title, loading, onRefresh, children }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {children}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-2" aria-label="Loading">
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-5/6 rounded bg-slate-100" />
      <div className="h-4 w-2/3 rounded bg-slate-100" />
    </div>
  );
}

/** Productivity tip from the web, with a refresh that cycles to another result. */
export function WebTipCard() {
  const { data, loading, error, refresh } = useFeed(getWebTip);
  return (
    <FeedCard title="Tip from the web" loading={loading} onRefresh={refresh}>
      {loading && !data && <Skeleton />}
      <ErrorNote message={error} />
      {data && (
        <div className={`mt-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <p className="text-slate-700">{data.tip}</p>
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
          >
            {data.title || "Source"} ↗
          </a>
        </div>
      )}
    </FeedCard>
  );
}

/** Latest AI news headlines from the web. */
export function AiNewsCard() {
  const { data, loading, error, refresh } = useFeed(getAiNews);
  return (
    <FeedCard title="Latest AI news" loading={loading} onRefresh={refresh}>
      {loading && !data && <Skeleton />}
      <ErrorNote message={error} />
      {data && (
        <ul className={`mt-4 divide-y divide-slate-100 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {data.items.map((item) => (
            <li key={item.url} className="py-3 first:pt-0 last:pb-0">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-slate-900 hover:text-indigo-600"
              >
                {item.title} ↗
              </a>
              {item.summary && <p className="mt-1 text-sm text-slate-500">{item.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </FeedCard>
  );
}
