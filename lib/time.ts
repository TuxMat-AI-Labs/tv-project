// Displays play content during these local hours on weekdays. Matches the
// office's actual shift hours — override per-venue via env, "HH:mm" 24-hour.
const CONTENT_START_TIME = process.env.CONTENT_START_TIME || "08:00"; // 8:00 AM
const CONTENT_END_TIME = process.env.CONTENT_END_TIME || "16:30"; // 4:30 PM

// The nightly pixel-care window. These are LCD panels, so permanent burn-in
// isn't really a risk — this short "massage" (the moving lava-lamp
// screensaver) just clears any temporary image retention the day's static
// ads left behind, then the panel goes black for the rest of the night.
// Weekdays only; weekends stay black around the clock (no daytime content
// ran, so there's nothing to clear). Override per-venue via env.
const PIXEL_CARE_START_TIME = process.env.PIXEL_CARE_START_TIME || "01:00"; // 1:00 AM
const PIXEL_CARE_END_TIME = process.env.PIXEL_CARE_END_TIME || "03:30"; // 3:30 AM

// The venue's local timezone. Hours are evaluated here, NOT in the server's
// timezone — otherwise a UTC server (e.g. Render) would flip displays to the
// screensaver in the middle of the actual business day.
const VENUE_TIMEZONE = process.env.VENUE_TIMEZONE || "America/Toronto";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The current weekday (0=Sun) and minutes-since-midnight in the venue timezone. */
function venueParts(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VENUE_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = WEEKDAY_INDEX[get("weekday")] ?? now.getDay();
  let hour = parseInt(get("hour"), 10);
  if (!Number.isFinite(hour) || hour === 24) hour = 0;
  const minute = parseInt(get("minute"), 10) || 0;
  return { day, minutes: hour * 60 + minute };
}

/** "HH:mm" -> minutes since midnight. */
function parseDaypart(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/**
 * True while displays should play content: Mon–Fri, within the shift window.
 * Outside this the panel is either in its overnight pixel-care window or
 * black — see `scheduledSurface`.
 */
export function isWithinBusinessHours(now: Date): boolean {
  const { day, minutes } = venueParts(now);
  if (day === 0 || day === 6) return false; // Sun / Sat
  return minutes >= parseDaypart(CONTENT_START_TIME) && minutes < parseDaypart(CONTENT_END_TIME);
}

/** True during the weekday overnight pixel-care window (weekends stay black). */
export function isWithinPixelCareWindow(now: Date): boolean {
  const { day, minutes } = venueParts(now);
  if (day === 0 || day === 6) return false; // Sun / Sat — black all weekend
  return minutes >= parseDaypart(PIXEL_CARE_START_TIME) && minutes < parseDaypart(PIXEL_CARE_END_TIME);
}

/** What the automatic schedule wants on screen, ignoring per-display overrides. */
export type ScheduledSurface = "content" | "screensaver" | "black";
export function scheduledSurface(now: Date): ScheduledSurface {
  if (isWithinBusinessHours(now)) return "content";
  if (isWithinPixelCareWindow(now)) return "screensaver";
  return "black";
}

export function isWithinDaypart(now: Date, daypartStart: string | null, daypartEnd: string | null): boolean {
  if (!daypartStart || !daypartEnd) return true;
  const { minutes } = venueParts(now);
  return minutes >= parseDaypart(daypartStart) && minutes < parseDaypart(daypartEnd);
}

export function isWithinDateRange(now: Date, startsAt: Date | null, endsAt: Date | null): boolean {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}
