// Shown while a workspace page loads its data, so a slow connection never looks like a blank screen.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="animate-pulse space-y-6 motion-reduce:animate-none">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-plum-100" />
        <div className="h-10 w-2/3 max-w-md rounded-xl bg-plum-100" />
        <div className="h-4 w-full max-w-xl rounded-full bg-plum-100/70" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-48" />
        <div className="card h-48" />
      </div>
      <div className="card h-64" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
