/**
 * Vector approximation of a Samsung QM55C mounted portrait — not licensed
 * Samsung product art. A slim near-black bezel around a 9:16 screen, matching
 * the real hardware's proportions so the Hub reads as an accurate mock-up of
 * the room. Swap point if licensed product art is ever supplied: this is just
 * a bezel wrapper around whatever `children` render.
 */
export function TVFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative aspect-[9/16] w-full">
      <div className="absolute inset-0 rounded-[4%] bg-gradient-to-b from-[#26292f] to-[#0b0d10] p-[2.5%] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)]">
        <div className="relative h-full w-full overflow-hidden rounded-[2.5%] bg-black ring-1 ring-black/60">
          {children}
          {/* Subtle top-edge screen sheen so a powered display reads as "on". */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/8 to-transparent" />
        </div>
      </div>
    </div>
  );
}
