/**
 * Hub representation of a physical panel. `children` render inside the glass
 * region, upright, whatever the orientation. This frame is hub-only (the live
 * TV output is frameless full-bleed), so it's purely a visual stand-in.
 *
 * Both orientations draw the same clean synthetic bezel — a dark metallic
 * border + inner shadow around a dark-glass region with a diagonal glare —
 * just at each orientation's own aspect ratio, so every tile across the hub
 * reads as one consistent panel family regardless of how it's mounted.
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
  // A portrait panel is the same physical panel as landscape, just rotated —
  // so its frame is landscape's aspect ratio inverted, not an independent photo.
  const aspectRatio = orientation === "LANDSCAPE" ? "16 / 9" : "9 / 16";

  return (
    <div className="relative w-full" style={{ aspectRatio }}>
      {/* Synthetic bezel: dark metallic border + inner shadow. CSS resolves
         percentage padding against the box's WIDTH on every side (including
         top/bottom), so this reads as one uniform physical bezel thickness
         regardless of aspect ratio — no separate tuning needed per orientation. */}
      <div
        className="absolute inset-0 rounded-[2.2%]"
        style={{
          background: "linear-gradient(155deg, #26282d 0%, #101114 46%, #04050a 100%)",
          boxShadow:
            "0 10px 26px -12px rgba(15,11,7,0.55), inset 0 1px 1px rgba(255,255,255,0.07), inset 0 0 0 1px rgba(0,0,0,0.6)",
          padding: "1.5%",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[1px]" style={{ background: GLASS }}>
          {children}
          <span className="pointer-events-none absolute inset-0 z-10" style={{ background: GLARE }} />
        </div>
      </div>
    </div>
  );
}
