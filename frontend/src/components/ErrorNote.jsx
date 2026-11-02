/**
 * @param {{ message: string | null }} props
 */
export default function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </p>
  );
}
