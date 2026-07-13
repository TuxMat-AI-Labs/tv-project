import type { MetadataRoute } from "next";

// Next's file-based manifest convention — this auto-generates
// /manifest.webmanifest and injects the <link rel="manifest"> tag, so
// "Add to Home Screen" / browser install prompts pick it up with no extra
// wiring in app/layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TuxDisplay",
    short_name: "TuxDisplay",
    description: "TuxMat's digital signage hub — manage displays and content on the go.",
    start_url: "/hub",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#faf9f6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
