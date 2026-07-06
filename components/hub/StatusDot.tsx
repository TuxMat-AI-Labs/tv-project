export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <StatusCircle online={online} />
      <span className={online ? "text-emerald-600" : "text-muted"}>{online ? "Online" : "Offline"}</span>
    </span>
  );
}

/** Bare status indicator — green when online, grey when offline. */
export function StatusCircle({ online, className = "" }: { online: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label={online ? "Online" : "Offline"}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        online ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-zinc-400"
      } ${className}`}
    />
  );
}
