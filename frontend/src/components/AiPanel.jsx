import { useState } from "react";
import ErrorNote from "./ErrorNote";
import FormattedText from "./FormattedText";

/**
 * Card with a button that fetches AI text and shows it.
 * @param {{ title: string, description: string, buttonLabel: string,
 *           fetcher: () => Promise<string>, copyable?: boolean, mono?: boolean,
 *           className?: string }} props
 */
export default function AiPanel({
  title,
  description,
  buttonLabel,
  fetcher,
  copyable = false,
  mono = false,
  className = "",
}) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setText(await fetcher());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy. Select the text and copy it manually.");
    }
  }

  return (
    <section className={`flex flex-col rounded-2xl bg-white p-6 shadow-md ${className}`}>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <button
        onClick={run}
        disabled={loading}
        className="mt-4 self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generating…" : text ? "Regenerate" : buttonLabel}
      </button>

      {loading && !text && (
        <div className="mt-4 animate-pulse space-y-2" aria-label="Generating">
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
        </div>
      )}
      <ErrorNote message={error} />

      {text && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div
            className={`max-h-80 flex-1 overflow-auto rounded-xl p-4 transition-opacity ${
              mono
                ? "border border-slate-200 border-l-4 border-l-indigo-300 bg-slate-50"
                : "bg-slate-50 ring-1 ring-slate-200"
            } ${loading ? "opacity-50" : ""}`}
          >
            {mono ? (
              <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-slate-700">
                {text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/^\*\s+/gm, "- ")}
              </pre>
            ) : (
              <FormattedText text={text} />
            )}
          </div>
          {copyable && (
            <button
              onClick={copy}
              className="mt-3 self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {copied ? "Copied" : "Copy to Clipboard"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
