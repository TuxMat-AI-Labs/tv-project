import { Wordmark } from "@/components/brand/Wordmark";
import { TvDiagnosticsFooter } from "@/components/tv/TvDiagnosticsFooter";

/**
 * What a TV shows before it has anything else to show.
 *
 * This replaces a plain black screen, and that is the entire point. The old
 * behaviour rendered `null` until the first successful request, so a screen
 * whose request hung or failed sat black indefinitely, indistinguishable from
 * a powered-off panel, a wrong URL, a dead network or a broken app. It was
 * reported as "the pairing screen does not load properly" and could not be
 * diagnosed, because a black screen carries no information.
 *
 * Anything on the glass beats nothing: whoever is standing there learns
 * whether the TV reached the server, what went wrong if not, and when it will
 * try again — without a laptop or a network trace.
 */
export function TvStatusScreen({
  state,
  detail,
  attempts,
}: {
  state: "connecting" | "error";
  detail?: string;
  attempts?: number;
}) {
  const connecting = state === "connecting";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black px-[4vh] text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 40%, rgba(185,151,91,0.12) 0%, rgba(0,0,0,0) 70%)" }}
      />

      <div className="absolute top-[4vh] left-1/2 -translate-x-1/2">
        <Wordmark tone="light" />
      </div>

      <div className="relative flex flex-col items-center">
        <div
          className="rounded-full"
          style={{
            width: "7vh",
            height: "7vh",
            border: `0.5vh solid ${connecting ? "rgba(185,151,91,0.5)" : "rgba(200,60,60,0.7)"}`,
            borderTopColor: connecting ? "#B9975B" : "transparent",
            animation: connecting ? "tvspin 1.1s linear infinite" : undefined,
          }}
        />
        <style>{"@keyframes tvspin{to{transform:rotate(360deg)}}"}</style>

        <p
          className="mt-[3vh] font-medium tracking-[0.3em] uppercase"
          style={{ fontSize: "1.8vh", color: connecting ? "#DFBA7C" : "#e88" }}
        >
          {connecting ? "Connecting" : "Cannot reach TuxDisplay"}
        </p>

        <p className="mt-[1.5vh] max-w-[70vh] leading-relaxed text-white/50" style={{ fontSize: "1.9vh" }}>
          {connecting
            ? "Contacting the hub to see which display this screen is."
            : "This screen loaded, but the server did not answer. It keeps retrying — nothing needs doing at the TV unless this stays up."}
        </p>

        {detail && (
          <p className="mt-[2vh] max-w-[70vh] font-mono break-all text-white/35" style={{ fontSize: "1.5vh" }}>
            {detail}
          </p>
        )}

        {attempts !== undefined && attempts > 1 && (
          <p className="mt-[1vh] text-white/30" style={{ fontSize: "1.5vh" }}>
            {attempts} attempts
          </p>
        )}
      </div>

      <TvDiagnosticsFooter />
    </div>
  );
}
