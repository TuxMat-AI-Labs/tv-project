import type { CSSProperties } from "react";

export type LavaMotion = "drift" | "pulse" | "bounce";

// Soft colour blobs that continuously drift, scale, and blend over black — a
// flowing "lava lamp". Nothing is static: every pixel cycles through colour and
// darkness over the loop, so it works as an overnight pixel-care screen massage.
// CSS-only (no JS loop) so it can run safely for days unattended.
const BLOBS = [
  { x: 16, y: 18, s: 62 },
  { x: 70, y: 26, s: 54 },
  { x: 38, y: 66, s: 70 },
  { x: 80, y: 74, s: 48 },
  { x: 8, y: 54, s: 58 },
  { x: 54, y: 8, s: 46 },
];

export function LavaLamp({
  motion = "drift",
  colors,
  blur = 40,
}: {
  motion?: LavaMotion;
  colors: string[];
  blur?: number;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#050505" }}>
      {BLOBS.map((b, i) => {
        const color = colors[i % colors.length];
        const wander = `ss-lava-${(i % 3) + 1}`;
        // Motion character: drift = slow, pulse = medium + breathing, bounce = fast.
        const duration = motion === "bounce" ? 13 + i * 1.6 : motion === "pulse" ? 22 + i * 2 : 32 + i * 3;
        const breathe = motion === "pulse" ? `, ss-breathe ${5 + i * 0.6}s ease-in-out infinite` : "";
        return (
          <span
            key={i}
            aria-hidden
            className="ss-lava-blob"
            style={
              {
                position: "absolute",
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.s}%`,
                aspectRatio: "1 / 1",
                background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${color}00 70%)`,
                filter: `blur(${blur}px)`,
                mixBlendMode: "screen",
                willChange: "transform, opacity",
                animation: `${wander} ${duration}s ease-in-out ${-i * 4}s infinite alternate${breathe}`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
