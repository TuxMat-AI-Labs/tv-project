/**
 * Hub representation of a physical panel. `children` render inside the glass
 * region, upright, whatever the orientation. This frame is hub-only (the live
 * TV output is frameless full-bleed), so it's purely a visual stand-in.
 *
 * PORTRAIT (default): a photographic render of the real Samsung QM55C mounted
 * portrait (public/tv-frame.png, cropped tight to the bezel from the studio
 * photo). The glass offsets are measured from the photo so a 9:16 content area
 * lands exactly on the panel. The glass region has its own dark base so the
 * photo's screen reflection (which includes a person from the studio shot)
 * never shows through — an "off" screen reads as clean dark glass + glare.
 *
 * LANDSCAPE: the same panel rotated 90° would rotate the *content* with it, so
 * instead of reusing the portrait photo we draw a clean synthetic 16:9 bezel.
 * Content stays upright; a matching dark-glass base + diagonal glare keep it
 * consistent with the portrait frame.
 */

// Soft diagonal light-streak so the glass reads as glossy (shared by both).
const GLARE =
  "linear-gradient(131deg, rgba(255,255,255,0) 34%, rgba(255,255,255,0.05) 44%, rgba(255,255,255,0.16) 49%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0) 63%)";
// Dark glass base — hides any reflection behind the panel.
const GLASS = "linear-gradient(157deg, #17181c 0%, #0a0b0d 52%, #0f1013 100%)";

export function TVFrame({
  children,
  orientation = "PORTRAIT",
}: {
  children: React.ReactNode;
  orientation?: "PORTRAIT" | "LANDSCAPE";
}) {
  if (orientation === "LANDSCAPE") {
    return (
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        {/* Synthetic bezel: dark metallic border + inner shadow. */}
        <div
          className="absolute inset-0 rounded-[2.2%]"
          style={{
            background: "linear-gradient(155deg, #26282d 0%, #101114 46%, #04050a 100%)",
            boxShadow:
              "0 10px 26px -12px rgba(15,11,7,0.55), inset 0 1px 1px rgba(255,255,255,0.07), inset 0 0 0 1px rgba(0,0,0,0.6)",
            padding: "1.5%",
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden rounded-[1px]"
            style={{ background: GLASS }}
          >
            {children}
            <span className="pointer-events-none absolute inset-0 z-10" style={{ background: GLARE }} />
          </div>
        </div>
      </div>
    );
  }

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
        style={{ left: "4.7%", top: "0.9%", right: "3.16%", bottom: "1.56%", background: GLASS }}
      >
        {children}
        <span className="pointer-events-none absolute inset-0 z-10" style={{ background: GLARE }} />
      </div>
    </div>
  );
}
