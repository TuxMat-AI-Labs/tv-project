/**
 * Samsung QM55C mounted portrait — a photographic render of the real hardware
 * (public/tv-frame.png, cropped tight to the bezel from the studio photo) used
 * as the frame. `children` render inside the glass region, whose offsets are
 * measured from the photo so a 9:16 content area lands exactly on the panel.
 * A soft diagonal glare streak is layered on top, echoing the natural reflection
 * in the render. The photo's own reflective black glass shows through until a
 * tile powers on, which is why the "off" state reads as a real dark screen.
 */
export function TVFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "824 / 1412" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tv-frame.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      {/* Glass region, aligned to the active panel in the render — content reaches
         the metal bezel's inner edge so no dark inner-border line shows at the top. */}
      <div
        className="absolute overflow-hidden rounded-[1px]"
        style={{ left: "4.7%", top: "0.9%", right: "3.16%", bottom: "1.56%" }}
      >
        {children}
        {/* Soft diagonal light-streak — a subtle reflection so the glass reads as glossy. */}
        <span
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(131deg, rgba(255,255,255,0) 34%, rgba(255,255,255,0.05) 44%, rgba(255,255,255,0.16) 49%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0) 63%)",
          }}
        />
      </div>
    </div>
  );
}
