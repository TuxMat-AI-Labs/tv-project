/**
 * TuxDisplay wordmark — "TUX" + "DISPLAY" in brand gold, matching the TuxTrack
 * dashboard treatment. Typographic (Poppins), so it stays crisp at any size.
 * `subtitle` renders the small tracked label beneath (e.g. "DISPLAY HUB").
 * `tone` sets the "TUX" color: "dark" (default) for light surfaces like the Hub
 * header and sign-in; "light" for dark surfaces like the DisplayDetailView corner.
 */
export function Wordmark({
  subtitle,
  size = "md",
  tone = "dark",
}: {
  subtitle?: string;
  size?: "sm" | "md";
  tone?: "dark" | "light";
}) {
  const main = size === "sm" ? "text-base" : "text-xl";
  const tuxColor = tone === "light" ? "text-white" : "text-foreground";
  return (
    <span className="inline-flex flex-col leading-none">
      <span className={`${main} font-semibold tracking-[0.28em] ${tuxColor}`}>
        TUX<span className="text-gold">DISPLAY</span>
      </span>
      {subtitle && (
        <span className="mt-1 text-[0.6rem] font-medium tracking-[0.34em] text-muted uppercase">{subtitle}</span>
      )}
    </span>
  );
}
