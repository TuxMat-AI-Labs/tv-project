"use client";

/**
 * Registration markers at the four corners and edges of the TV output.
 *
 * The one fault nothing else here can see. Every measurement available to the
 * browser says the two Upstairs panels are identical — same viewport
 * (864x1536), same panel (1080x1920), same DPR, no browser chrome — and MDC
 * says their configuration matches too, bar sharpness. Yet one visibly crops
 * its content. That can only happen if the panel is scaling or overscanning
 * what it is given, which happens after the browser has finished and is
 * therefore invisible to it.
 *
 * A page cannot measure that. A person looking at the wall can: draw a marker
 * hard against each edge, and if the panel is cropping, the markers are
 * physically off the glass.
 *
 *   all four corners + all four edge ticks visible  -> the panel shows
 *                                                      everything it is given
 *   any missing or clipped                          -> the panel is cropping,
 *                                                      by roughly the amount
 *                                                      missing
 *
 * Sized in vw/vh so it is immune to the browser zoom these panels run at
 * (125%), which would otherwise make "1px from the edge" mean two different
 * things on two screens and wreck the comparison.
 */
export function CalibrationOverlay() {
  const edge = "rgba(255,255,255,0.95)";
  const accent = "#B9975B";

  return (
    <div className="pointer-events-none absolute inset-0 z-[9998]" aria-hidden="true">
      {/* Hairline right against all four edges. Any side that is not visible
          end-to-end is being cut off. */}
      <div className="absolute inset-0" style={{ border: `0.28vh solid ${edge}` }} />

      {/* Corner blocks — the coarse test, readable from across the room. */}
      {(
        [
          ["top-0 left-0", "TL"],
          ["top-0 right-0", "TR"],
          ["bottom-0 left-0", "BL"],
          ["bottom-0 right-0", "BR"],
        ] as const
      ).map(([pos, label]) => (
        <div
          key={label}
          className={`absolute ${pos} flex items-center justify-center`}
          style={{ width: "9vh", height: "9vh", background: accent, color: "#000" }}
        >
          <span style={{ fontSize: "2.6vh", fontWeight: 700, fontFamily: "system-ui, Arial, sans-serif" }}>
            {label}
          </span>
        </div>
      ))}

      {/* Edge ticks at the midpoints, each labelled with how far in it sits.
          If the 2% tick shows but the edge line does not, the panel is cropping
          between 0 and 2% on that side — which turns "it looks zoomed" into a
          number. */}
      {(
        [
          ["top", { top: 0, left: "50%", transform: "translateX(-50%)" }],
          ["bottom", { bottom: 0, left: "50%", transform: "translateX(-50%)" }],
          ["left", { left: 0, top: "50%", transform: "translateY(-50%)" }],
          ["right", { right: 0, top: "50%", transform: "translateY(-50%)" }],
        ] as const
      ).map(([side, style]) => (
        <div
          key={side}
          className="absolute flex items-center justify-center"
          style={{
            ...style,
            width: side === "left" || side === "right" ? "6vh" : "22vh",
            height: side === "left" || side === "right" ? "22vh" : "6vh",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: "1.9vh",
            fontFamily: "system-ui, Arial, sans-serif",
            letterSpacing: "0.08em",
          }}
        >
          {side.toUpperCase()} EDGE
        </div>
      ))}

      {/* Centre reference, so a panel that is shifted rather than scaled is
          also visible — the cross should sit dead centre of the glass. */}
      <div
        className="absolute"
        style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "14vh", height: "0.28vh", background: accent }}
      />
      <div
        className="absolute"
        style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "0.28vh", height: "14vh", background: accent }}
      />

      <div
        className="absolute"
        style={{
          top: "62%",
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fff",
          fontSize: "2vh",
          fontFamily: "system-ui, Arial, sans-serif",
          textAlign: "center",
          textShadow: "0 0.2vh 0.6vh rgba(0,0,0,0.9)",
        }}
      >
        CALIBRATION — all 4 corners and 4 edges
        <br />
        should be visible on the glass
      </div>
    </div>
  );
}
