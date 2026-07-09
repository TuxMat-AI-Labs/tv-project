"use client";

import { useEffect, useRef } from "react";
import { type ScreensaverVariant, DEFAULT_SCREENSAVER_VARIANT } from "@/lib/screensaver";

/**
 * Full-screen pixel massager: an isometric voxel city that never holds still,
 * washed by a full-spectrum rainbow sweep. Every column of blocks is in
 * constant vertical motion — a per-column bob (unique phase/frequency) layered
 * on a slow "build-out" drift of its target height, plus a slow global sway of
 * the whole field — so no block, edge, or seam ever sits at a fixed pixel for
 * more than a frame. Combined with the rainbow multiply (every pixel cycles the
 * complete hue range every hueLoopSec), both the geometry AND the color of
 * every pixel are always changing: true burn-in prevention, not decoration.
 *
 * The `variant` prop only changes personality (block scale, density, height,
 * speed, hue-loop length) — the massage guarantee holds for all of them.
 *
 * Built for days of unattended runtime on Samsung Tizen TV browsers:
 * - ONE canvas rendered at a low internal resolution and CSS-scaled full-bleed
 *   with `image-rendering: pixelated` (the blocky look is free; fill cost is
 *   tiny and independent of panel size).
 * - The city redraws every frame (it's always moving), but at the low internal
 *   resolution that's only a few hundred small polygon fills per frame; the
 *   rainbow is a tiny quantized hue field composited with one `multiply`.
 * - All per-column state lives in fixed typed arrays; nothing is allocated per
 *   frame, so there is nothing to leak over a multi-day run.
 * - rAF capped at ~30 fps; motion is driven by a wall-clock delta (clamped) so
 *   a backgrounded tab can't spiral, and hue phase folds through its loop so
 *   float precision never degrades.
 *
 * Full-bleed rule: `absolute inset-0`, never `fixed` (see the c55b942
 * visual-vs-layout-viewport fix).
 */

type VariantConfig = {
  internalLong: number; // internal canvas px along the longer screen axis
  tile: number; // scale factor on the base tile/block size (blockiness)
  maxH: number; // tallest tower, in blocks
  hueLoopSec: number; // seconds for every pixel to sweep the full spectrum
  speed: number; // multiplier on bob + sway rates (build/motion tempo)
};

const VARIANTS: Record<ScreensaverVariant, VariantConfig> = {
  skyline: { internalLong: 384, tile: 1.0, maxH: 12, hueLoopSec: 40, speed: 1.0 },
  metropolis: { internalLong: 468, tile: 0.72, maxH: 16, hueLoopSec: 26, speed: 1.55 },
  horizon: { internalLong: 300, tile: 1.5, maxH: 9, hueLoopSec: 60, speed: 0.6 },
};

// --- Fixed tuning (variant-independent) --------------------------------
const RAINBOW_CELL = 4; // rainbow field resolution = internal / this (blocky color cells)
const HUE_BANDS = 20; // quantized hue steps (blockier rainbow)
const FRAME_MS = 33; // ~30 fps cap

// Base isometric geometry, in internal pixels (scaled by the variant's `tile`).
const BASE_TILE_W = 24;
const BASE_TILE_H = 12;
const BASE_BLOCK_H = 8;

// Grayscale luminance per surface (multiplied by the rainbow).
const LUM_TOP = 235;
const LUM_LEFT = 165;
const LUM_RIGHT = 118;
const LUM_SEAM = 48;

// Motion. Every column always bobs (BOB_AMP never zero) and its structural
// height eases toward a drifting target (the "building out"). MIN_BASE keeps
// even the bob's trough above ground so a column never flattens and stalls.
const EASE_RATE = 0.9; // per-second approach toward the structural target
const MIN_BASE = 1.1; // min structural height in blocks (before the bob)
const BOB_AMP_MIN = 0.5;
const BOB_AMP_MAX = 1.7; // bob amplitude in blocks
const BOB_FREQ_MIN = 0.12; // rad/s
const BOB_FREQ_MAX = 0.55;
const HOLD_MIN = 1.5; // seconds a settled column waits before re-targeting
const HOLD_MAX = 7;

// Slow global sway: the entire city also drifts as a whole (both axes, long
// non-harmonic periods) so not even the ground grid is anchored — every
// structural point travels, on top of each column's own bob. Amplitudes are in
// internal px; setup() draws the field oversized by more than this on every
// side so the sway never exposes a black edge.
const SWAY_X = 10;
const SWAY_Y = 7;
const SWAY_FREQ_X = 0.045; // rad/s (~140 s period)
const SWAY_FREQ_Y = 0.031; // rad/s (~200 s period)

const TAU = Math.PI * 2;

// Deterministic per-column noise (no Math.random, so behavior is reproducible
// while soaking and columns never accidentally synchronize).
function hash(a: number, b: number, c: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

function pickTarget(u: number, v: number, epoch: number, maxH: number): number {
  const district = hash(u >> 2, v >> 2, epoch); // low-freq: downtown vs. low-rise
  const jitter = hash(u, v, epoch * 7 + 1);
  const span = maxH - MIN_BASE - BOB_AMP_MAX;
  return MIN_BASE + BOB_AMP_MAX + span * district * district * (0.35 + jitter * 0.9);
}

export function PixelMassager({ variant = DEFAULT_SCREENSAVER_VARIANT }: { variant?: ScreensaverVariant }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const rainbowCanvas = document.createElement("canvas");
    const rainbowCtx = rainbowCanvas.getContext("2d", { alpha: false });
    if (!rainbowCtx) return;

    // Per-variant geometry/tempo.
    const cfg = VARIANTS[variant] ?? VARIANTS[DEFAULT_SCREENSAVER_VARIANT];
    const INTERNAL_LONG = cfg.internalLong;
    const TILE_W = BASE_TILE_W * cfg.tile;
    const TILE_H = BASE_TILE_H * cfg.tile;
    const BLOCK_H = BASE_BLOCK_H * cfg.tile;
    const MAX_H = cfg.maxH;
    const HUE_LOOP_SEC = cfg.hueLoopSec;
    const SPEED = cfg.speed;

    // Quantized hue band → RGB lookup (full saturation; multiply darkens).
    const hueLut = new Uint8Array(HUE_BANDS * 3);
    for (let b = 0; b < HUE_BANDS; b++) {
      const h = (b / HUE_BANDS) * 6; // hue in [0,6)
      const f = (n: number) => {
        const k = (n + h) % 6;
        return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)) * 0.9));
      };
      hueLut[b * 3] = f(0);
      hueLut[b * 3 + 1] = f(4);
      hueLut[b * 3 + 2] = f(2);
    }

    // --- Grid + sim state, rebuilt on (re)size --------------------------
    let iw = 0;
    let ih = 0;
    let rw = 0;
    let rh = 0;
    let rainbowImage: ImageData | null = null;
    let vRows = 0;
    let uCols = 0;
    let uMin = 0;
    // Per-column state (index = v * uCols + k).
    let baseCur: Float32Array = new Float32Array(0); // eased structural height
    let baseTarget: Float32Array = new Float32Array(0);
    let hold: Float32Array = new Float32Array(0); // seconds until re-target
    let bobAmp: Float32Array = new Float32Array(0);
    let bobFreq: Float32Array = new Float32Array(0);
    let bobPhase: Float32Array = new Float32Array(0);
    let epochs: Uint16Array = new Uint16Array(0);

    function setup() {
      const cw = container!.clientWidth;
      const ch = container!.clientHeight;
      if (cw === 0 || ch === 0) return;

      const scale = INTERNAL_LONG / Math.max(cw, ch);
      iw = Math.max(2, Math.round(cw * scale));
      ih = Math.max(2, Math.round(ch * scale));
      canvas!.width = iw;
      canvas!.height = ih;
      rw = Math.ceil(iw / RAINBOW_CELL);
      rh = Math.ceil(ih / RAINBOW_CELL);
      rainbowCanvas.width = rw;
      rainbowCanvas.height = rh;
      rainbowImage = rainbowCtx!.createImageData(rw, rh);

      // Columns are keyed by iso coords (u = i-j, v = i+j); valid columns have
      // u+v even. v ascending is exactly painter's back-to-front order.
      const HW = TILE_W / 2;
      const HH = TILE_H / 2;
      // Draw the field oversized on every side (TILE margin + the sway
      // amplitude) so neither the global sway nor tall/short towers ever leave
      // a black edge at full-bleed.
      uMin = Math.floor((-iw / 2 - TILE_W - SWAY_X) / HW);
      const uMax = Math.ceil((iw / 2 + TILE_W + SWAY_X) / HW);
      uCols = Math.floor((uMax - uMin) / 2) + 1;
      vRows = Math.ceil((ih + TILE_H * 4 + SWAY_Y) / HH) + 4;

      const n = vRows * uCols;
      baseCur = new Float32Array(n);
      baseTarget = new Float32Array(n);
      hold = new Float32Array(n);
      bobAmp = new Float32Array(n);
      bobFreq = new Float32Array(n);
      bobPhase = new Float32Array(n);
      epochs = new Uint16Array(n);
      for (let v = 0; v < vRows; v++) {
        for (let k = 0; k < uCols; k++) {
          const u = uOf(v, k);
          const idx = v * uCols + k;
          epochs[idx] = Math.floor(hash(u, v, 0) * 8);
          baseTarget[idx] = pickTarget(u, v, epochs[idx], MAX_H);
          baseCur[idx] = MIN_BASE * hash(u, v, 3); // rise into place from the ground on load
          hold[idx] = HOLD_MIN + hash(u, v, 99) * (HOLD_MAX - HOLD_MIN);
          bobAmp[idx] = BOB_AMP_MIN + hash(u, v, 5) * (BOB_AMP_MAX - BOB_AMP_MIN);
          bobFreq[idx] = (BOB_FREQ_MIN + hash(u, v, 7) * (BOB_FREQ_MAX - BOB_FREQ_MIN)) * SPEED;
          bobPhase[idx] = hash(u, v, 11) * TAU;
        }
      }
    }

    // First valid u for row v (parity: u+v must be even), plus column step of 2.
    function uOf(v: number, k: number): number {
      const start = uMin + ((((uMin + v) % 2) + 2) % 2);
      return start + k * 2;
    }

    // Advance the structural (build-out) layer. The bob is evaluated per frame
    // in draw, so it moves continuously regardless of this cadence.
    function update(dtSec: number) {
      const ease = Math.min(1, dtSec * EASE_RATE * SPEED);
      for (let v = 0; v < vRows; v++) {
        for (let k = 0; k < uCols; k++) {
          const idx = v * uCols + k;
          baseCur[idx] += (baseTarget[idx] - baseCur[idx]) * ease;
          if (Math.abs(baseTarget[idx] - baseCur[idx]) < 0.12) {
            hold[idx] -= dtSec;
            if (hold[idx] <= 0) {
              const u = uOf(v, k);
              epochs[idx]++;
              baseTarget[idx] = pickTarget(u, v, epochs[idx], MAX_H);
              hold[idx] = HOLD_MIN + hash(u, v, epochs[idx] * 13 + 5) * (HOLD_MAX - HOLD_MIN);
            }
          }
        }
      }
    }

    // Draw the grayscale city (every column, back-to-front) straight to the
    // main canvas. Height = eased structural base + continuous per-column bob,
    // so every column moves every frame.
    function drawCity(tSec: number) {
      const HW = TILE_W / 2;
      const HH = TILE_H / 2;
      // Global sway drifts the whole field; the extra margin from setup() keeps
      // it full-bleed. Start rows well above the top so towers always cover it.
      const ox = iw / 2 + SWAY_X * Math.sin(tSec * SWAY_FREQ_X * SPEED);
      const oy = -TILE_H * 2 + SWAY_Y * Math.sin(tSec * SWAY_FREQ_Y * SPEED);
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, iw, ih);

      for (let v = 0; v < vRows; v++) {
        const baseY = oy + v * HH;
        for (let k = 0; k < uCols; k++) {
          const idx = v * uCols + k;
          const u = uOf(v, k);
          const cx = ox + u * HW;
          const h = Math.max(
            0.3,
            baseCur[idx] + bobAmp[idx] * Math.sin(tSec * bobFreq[idx] + bobPhase[idx])
          );
          const drop = h * BLOCK_H;
          const y = baseY - drop; // top face position

          // Top face.
          ctx!.fillStyle = `rgb(${LUM_TOP},${LUM_TOP},${LUM_TOP})`;
          ctx!.beginPath();
          ctx!.moveTo(cx, y);
          ctx!.lineTo(cx + HW, y + HH);
          ctx!.lineTo(cx, y + TILE_H);
          ctx!.lineTo(cx - HW, y + HH);
          ctx!.closePath();
          ctx!.fill();

          // Left + right faces (single extruded parallelograms down to base).
          ctx!.fillStyle = `rgb(${LUM_LEFT},${LUM_LEFT},${LUM_LEFT})`;
          ctx!.beginPath();
          ctx!.moveTo(cx - HW, y + HH);
          ctx!.lineTo(cx, y + TILE_H);
          ctx!.lineTo(cx, y + TILE_H + drop);
          ctx!.lineTo(cx - HW, y + HH + drop);
          ctx!.closePath();
          ctx!.fill();

          ctx!.fillStyle = `rgb(${LUM_RIGHT},${LUM_RIGHT},${LUM_RIGHT})`;
          ctx!.beginPath();
          ctx!.moveTo(cx + HW, y + HH);
          ctx!.lineTo(cx, y + TILE_H);
          ctx!.lineTo(cx, y + TILE_H + drop);
          ctx!.lineTo(cx + HW, y + HH + drop);
          ctx!.closePath();
          ctx!.fill();

          // Block seams: a chevron at every whole-block boundary + the front
          // vertical edge — this is what makes it read as stacked cubes.
          ctx!.strokeStyle = `rgb(${LUM_SEAM},${LUM_SEAM},${LUM_SEAM})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          const whole = Math.floor(h);
          for (let b = 1; b <= whole; b++) {
            const sy = y + b * BLOCK_H;
            ctx!.moveTo(cx - HW, sy + HH);
            ctx!.lineTo(cx, sy + TILE_H);
            ctx!.lineTo(cx + HW, sy + HH);
          }
          ctx!.moveTo(cx, y + TILE_H);
          ctx!.lineTo(cx, y + TILE_H + drop);
          ctx!.stroke();
        }
      }
    }

    // The moving hue field: diagonal quantized bands with a slow secondary
    // wave. For any fixed pixel, phase falls linearly with time, so every pixel
    // crosses all HUE_BANDS every HUE_LOOP_SEC — the color half of the massage.
    function drawRainbow(tSec: number) {
      const data = rainbowImage!.data;
      const period = Math.max(rw, rh) * 1.1; // ~one full spectrum across screen
      const tPhase = (tSec % HUE_LOOP_SEC) / HUE_LOOP_SEC;
      let p = 0;
      for (let y = 0; y < rh; y++) {
        const rowPhase = (y * 0.6) / period + 0.12 * Math.sin((y / rh) * TAU + tSec * 0.07);
        for (let x = 0; x < rw; x++) {
          let phase = (x / period + rowPhase - tPhase) % 1;
          if (phase < 0) phase += 1;
          const b = (phase * HUE_BANDS) | 0;
          data[p++] = hueLut[b * 3];
          data[p++] = hueLut[b * 3 + 1];
          data[p++] = hueLut[b * 3 + 2];
          data[p++] = 255;
        }
      }
      rainbowCtx!.putImageData(rainbowImage!, 0, 0);
    }

    // --- Main loop -------------------------------------------------------
    let raf = 0;
    let lastFrame = 0;
    let lastTime = 0;
    let running = true;

    function frame(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      if (iw === 0) return;

      if (lastTime === 0) lastTime = now;
      const dt = Math.min(0.1, (now - lastTime) / 1000); // clamp so a hidden tab can't jump
      lastTime = now;
      const tSec = now / 1000;

      update(dt);
      drawCity(tSec);

      drawRainbow(tSec);
      ctx!.imageSmoothingEnabled = false;
      ctx!.globalCompositeOperation = "multiply";
      ctx!.drawImage(rainbowCanvas, 0, 0, iw, ih);
      ctx!.globalCompositeOperation = "source-over";
    }

    setup();
    const resizeObserver = new ResizeObserver(() => setup());
    resizeObserver.observe(container);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [variant]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
