/**
 * TuxDisplay wordmark — "TUX" in white + "DISPLAY" in brand gold, matching the
 * TuxTrack dashboard treatment. Typographic (Poppins), so it stays crisp at any
 * size. `subtitle` renders the small tracked label beneath (e.g. "DISPLAY HUB").
 */
export function Wordmark({
  subtitle,
  size = "md",
}: {
  subtitle?: string;
  size?: "sm" | "md";
}) {
  const main = size === "sm" ? "text-base" : "text-xl";
  return (
    <span className="inline-flex flex-col leading-none">
      <span className={`${main} font-semibold tracking-[0.28em] text-white`}>
        TUX<span className="text-gold">DISPLAY</span>
      </span>
      {subtitle && (
        <span className="mt-1 text-[0.6rem] font-medium tracking-[0.34em] text-muted uppercase">{subtitle}</span>
      )}
    </span>
  );
}
