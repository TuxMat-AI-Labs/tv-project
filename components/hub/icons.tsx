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

// A fairground carousel/merry-go-round — tent roof, center pole, flared
// support struts down to the platform — reads as "carousel" literally rather
// than as a generic "cycle through items" glyph.
export function CarouselIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="12" cy="2.4" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 3.3V6" strokeLinecap="round" />
      <path d="M3 9c1.5-3.2 6-4.7 9-4.7S19.5 5.8 21 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6v13" strokeLinecap="round" />
      <path d="M6 9l1 10" strokeLinecap="round" />
      <path d="M18 9l-1 10" strokeLinecap="round" />
      <ellipse cx="12" cy="20" rx="9" ry="1.6" />
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
