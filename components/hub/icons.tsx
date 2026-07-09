export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 20h9" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Two-way exchange arrows — reads as "swap/replace content", distinct from the
// circular RefreshIcon (reload the TV) so the two actions aren't confusable.
export function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 8h18" strokeLinecap="round" />
      <path d="M17 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 16H3" strokeLinecap="round" />
      <path d="M7 12l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

export function AdjustIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" strokeLinecap="round" />
    </svg>
  );
}

// A filled center slide flanked by two receding bracket outlines on each
// side — the classic "image carousel / slider" glyph. The brackets are
// static; only the center slide moves. `stripClassName` is applied to the
// scrolling filmstrip <g> so ActivateCarouselButton can drive the animation
// (running when active, on hover when idle). The center is a nested <svg>,
// which clips its contents to the frame, so slides slide in/out of that
// window without disturbing the brackets.
export function CarouselIcon({
  className = "h-4 w-4",
  stripClassName = "",
}: {
  className?: string;
  stripClassName?: string;
}) {
  return (
    <svg viewBox="0 0 32 20" fill="none" className={className}>
      <path d="M4 6H2V14H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4H8V16H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 4H24V16H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 6H30V14H28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Center frame: nested svg clips the filmstrip to x 13..19, y 2..18. */}
      <svg x="13" y="2" width="6" height="16" viewBox="0 0 6 16">
        <g className={stripClassName}>
          {/* Slides are 6 wide, spaced 8 apart (6 slide + 2 gap). The strip
              scrolls left by one period (8) — see carousel-slide-strip. */}
          <rect x="0" y="0" width="6" height="16" rx="0.6" fill="currentColor" />
          <rect x="8" y="0" width="6" height="16" rx="0.6" fill="currentColor" />
          <rect x="16" y="0" width="6" height="16" rx="0.6" fill="currentColor" />
        </g>
      </svg>
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
