const BUSINESS_START = { hour: 8, minute: 30 };
const BUSINESS_END = { hour: 16, minute: 30 };

// The venue's local timezone. Business-hours / daypart decisions are made here,
// NOT in the server's timezone — otherwise a UTC server (e.g. Render) would flip
// displays to the screensaver in the middle of the actual business day.
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

/** Mon-Fri only — weekends always fall outside business hours regardless of time. */
export function isWithinBusinessHours(now: Date): boolean {
  const { day, minutes } = venueParts(now);
  if (day === 0 || day === 6) return false;

  const start = BUSINESS_START.hour * 60 + BUSINESS_START.minute;
  const end = BUSINESS_END.hour * 60 + BUSINESS_END.minute;
  return minutes >= start && minutes < end;
}

/** "HH:mm" -> minutes since midnight. */
function parseDaypart(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
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
