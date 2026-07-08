import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Full-screen, on-brand pairing state shown on an unpaired TV. Displays a big
 * one-time code and a QR that deep-links the hub pairing page (code prefilled),
 * so an admin can approve the screen from their own signed-in phone or laptop —
 * no password is ever typed on the TV.
 */
export function PairingScreen({
  code,
  qrDataUrl,
  pairUrl,
}: {
  code: string;
  qrDataUrl: string;
  pairUrl: string;
}) {
  // The hub host, shown as the manual fallback ("go to <host> and enter the code").
  let host = "the hub";
  try {
    host = new URL(pairUrl).host;
  } catch {
    /* keep default */
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black px-8 text-center text-white">
      {/* Soft ambient gold glow so the screen reads as premium, not a bare form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 40%, rgba(185,151,91,0.16) 0%, rgba(0,0,0,0) 70%)" }}
      />

      <div className="absolute top-10 left-1/2 -translate-x-1/2">
        <Wordmark tone="light" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/tuxmat-monogram.png" alt="TuxMat" className="mb-10 w-20 opacity-90" />

        <p className="text-xs font-medium tracking-[0.4em] text-gold-light uppercase">Pair this screen</p>
        <h1 className="mt-4 max-w-xl text-3xl font-semibold text-white/90">
          Scan to connect this display
        </h1>

        <div className="mt-10 flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-12">
          {/* QR in a bright card so it scans reliably off a glossy panel. */}
          <div className="rounded-2xl bg-white p-4 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Pairing QR code" className="h-52 w-52" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-medium tracking-[0.3em] text-white/40 uppercase">Or enter code</p>
            <div className="rounded-xl border border-white/15 bg-white/5 px-8 py-5 backdrop-blur">
              <span className="font-mono text-5xl font-semibold tracking-[0.18em] text-gold-light tabular">
                {code}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-12 max-w-md text-sm leading-relaxed text-white/45">
          On your phone, scan the code — or open{" "}
          <span className="text-white/70">{host}/hub/pair</span> — and approve this screen.
          It will start playing automatically.
        </p>
      </div>
    </div>
  );
}
