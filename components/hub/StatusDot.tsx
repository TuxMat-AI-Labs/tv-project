export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-zinc-600"
        }`}
      />
      <span className={online ? "text-emerald-300/90" : "text-muted"}>{online ? "Online" : "Offline"}</span>
    </span>
  );
}
