/** Renders **bold** inline. */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

/**
 * Lightweight renderer for the AI's plain/markdown-ish text.
 * @param {{ text: string }} props
 */
export default function FormattedText({ text }) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-700">
      {lines.map((raw, i) => {
        const line = raw.trim().replace(/^#+\s*/, "");
        const bullet = line.match(/^[-*•]\s+(.*)/);
        if (bullet) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="text-indigo-400">•</span>
              <span>{inline(bullet[1])}</span>
            </p>
          );
        }
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
