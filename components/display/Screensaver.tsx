"use client";

import { useEffect, useState } from "react";
import styles from "./Screensaver.module.css";

const VARIANTS = [styles.drift0, styles.drift1, styles.drift2, styles.drift3];

/**
 * Overnight pixel-care screensaver: the TuxMat gold monogram drifts slowly and
 * continuously across a rich-black canvas so no pixel holds a static image.
 * CSS-only animation (no JS loop) so it runs safely for days unattended.
 */
export function Screensaver() {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    // Client-only random drift path, deferred past hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
  }, []);

  return (
    <div className={styles.stage}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/tuxmat-monogram.png" alt="TuxMat" className={`${styles.mark} ${variant ?? ""}`} />
    </div>
  );
}
