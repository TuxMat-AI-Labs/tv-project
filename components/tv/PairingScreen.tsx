import { Wordmark } from "@/components/brand/Wordmark";
import { TvDiagnosticsFooter } from "@/components/tv/TvDiagnosticsFooter";

/**
 * Full-screen pairing state on an unpaired TV: a big one-time code and a QR
 * deep-linking the hub's pairing page with the code prefilled, so a screen is
 * approved from a phone that is already signed in and no password is ever typed
 * on a TV with a remote.
 *
 * Everything is sized in vh rather than px. These panels run their browser at
 * 125% zoom, which makes every px-sized element render smaller relative to the
 * glass — a code that is comfortable on a laptop ends up squinting-distance on
 * a wall. vh is measured against the panel, so it looks the same on every
 * screen whatever the browser is set to.
 */
export function PairingScreen({
  code,
  qrDataUrl,
  pairUrl,
  buildId,
}: {
  code: string;
  qrDataUrl: string;
  pairUrl: string;
  buildId?: string;
}) {
  let host = "the hub";
  try {
    host = new URL(pairUrl).host;
  } catch {
    /* keep default */
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black px-[4vh] text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 40%, rgba(185,151,91,0.16) 0%, rgba(0,0,0,0) 70%)" }}
      />

      <div className="absolute top-[4vh] left-1/2 -translate-x-1/2">
        <Wordmark tone="light" />
      </div>

      <div className="relative flex flex-col items-center">
        <p
          className="font-medium tracking-[0.4em] text-gold-light uppercase"
          style={{ fontSize: "1.6vh" }}
        >
          Pair this screen
        </p>
        <h1 className="mt-[1.5vh] font-semibold text-white/90" style={{ fontSize: "3.4vh" }}>
          Scan to connect this display
        </h1>

        <div className="mt-[4vh] flex flex-col items-center gap-[3vh]">
          {/* Bright card so it scans reliably off a glossy panel. */}
          <div className="rounded-[1.4vh] bg-white p-[1.6vh] shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Pairing QR code" style={{ width: "26vh", height: "26vh" }} />
          </div>

          <div className="flex flex-col items-center gap-[1.2vh]">
            <p
              className="font-medium tracking-[0.3em] text-white/40 uppercase"
              style={{ fontSize: "1.4vh" }}
            >
              Or enter this code
            </p>
            <div className="rounded-[1.2vh] border border-white/15 bg-white/5 px-[3.5vh] py-[2vh] backdrop-blur">
              <span
                className="font-mono font-semibold tracking-[0.18em] text-gold-light"
                style={{ fontSize: "6.5vh" }}
              >
                {code}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-[4vh] max-w-[62vh] leading-relaxed text-white/45" style={{ fontSize: "1.8vh" }}>
          On your phone, scan the code — or open{" "}
          <span className="text-white/70">{host}/hub/pair</span> — and approve this screen. It will
          start playing automatically.
        </p>
      </div>

      <TvDiagnosticsFooter buildId={buildId} />
    </div>
  );
}
