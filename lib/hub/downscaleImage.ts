/**
 * Caps an image's pixel dimensions before it is uploaded.
 *
 * Why this exists: the office signage TVs' browser cannot decode an image past
 * its internal texture limit, and when it fails it does not fall back
 * gracefully — it renders the image ZOOMED and mispositioned on the panel, with
 * no error anywhere. This has now bitten twice: first with 2160x3840 (~8MP)
 * creatives, then again with a 1944x3449 (~6.7MP) phone photo assigned to a
 * display. Both times the visible symptom looked like a broken zoom setting,
 * which sent the diagnosis in the wrong direction entirely.
 *
 * Uploads go straight from the browser to R2 on a presigned URL, so the server
 * never sees the bytes and cannot resize them — the cap has to happen here,
 * client-side, before the PUT.
 *
 * The long edge is capped at the panels' native 1920. Anything at or under the
 * cap is returned untouched, so already-correct 1080x1920 creatives are never
 * re-encoded (no generational quality loss). Aspect ratio is always preserved:
 * this only ever scales, never crops — cropping is the display's `contentFit`
 * decision, not this function's.
 */

// The panels are 1080p. A long edge of 1920 is exactly native for both
// orientations and sits far below any smart-TV texture limit.
const MAX_LONG_EDGE = 1920;
// Re-encode quality. Only applied to images that actually needed downscaling.
const JPEG_QUALITY = 0.92;

export type DownscaleResult = {
  file: File;
  /** True when the image was actually resized (i.e. it exceeded the cap). */
  resized: boolean;
  from: { w: number; h: number };
  to: { w: number; h: number };
};

function loadBitmap(file: File): Promise<{ w: number; h: number; draw: CanvasImageSource; done: () => void }> {
  // createImageBitmap is both faster and avoids the object-URL lifecycle, but
  // is not universally available — fall back to an <img> decode.
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then((bmp) => ({
      w: bmp.width,
      h: bmp.height,
      draw: bmp,
      done: () => bmp.close(),
    }));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({ w: img.naturalWidth, h: img.naturalHeight, draw: img, done: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export async function downscaleImageForDisplay(file: File): Promise<DownscaleResult> {
  const { w, h, draw, done } = await loadBitmap(file);
  try {
    const longEdge = Math.max(w, h);
    if (longEdge <= MAX_LONG_EDGE) {
      return { file, resized: false, from: { w, h }, to: { w, h } };
    }

    const ratio = MAX_LONG_EDGE / longEdge;
    const tw = Math.max(1, Math.round(w * ratio));
    const th = Math.max(1, Math.round(h * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, resized: false, from: { w, h }, to: { w, h } };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(draw, 0, 0, tw, th);

    // PNG can carry transparency that JPEG would flatten to black, so keep PNGs
    // as PNG; everything else re-encodes as JPEG for a sane file size.
    const keepPng = file.type === "image/png";
    const outType = keepPng ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, outType, keepPng ? undefined : JPEG_QUALITY)
    );
    if (!blob) return { file, resized: false, from: { w, h }, to: { w, h } };

    const name = file.name.replace(/\.[^/.]+$/, "") + (keepPng ? ".png" : ".jpg");
    return {
      file: new File([blob], name, { type: outType }),
      resized: true,
      from: { w, h },
      to: { w: tw, h: th },
    };
  } finally {
    done();
  }
}
