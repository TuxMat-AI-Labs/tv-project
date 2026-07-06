export function InactiveScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/tuxmat-monogram.png" alt="TuxMat" className="w-[14vmin] opacity-30" />
      <p className="text-xs tracking-[0.35em] text-zinc-600 uppercase">Display not configured</p>
    </div>
  );
}
