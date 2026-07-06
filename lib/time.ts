const BUSINESS_START = { hour: 8, minute: 30 };
const BUSINESS_END = { hour: 16, minute: 30 };

/** Mon-Fri only — weekends always fall outside business hours regardless of time. */
export function isWithinBusinessHours(now: Date): boolean {
  const day = now.getDay();
  if (day === 0 || day === 6) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
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
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= parseDaypart(daypartStart) && minutes < parseDaypart(daypartEnd);
}

export function isWithinDateRange(now: Date, startsAt: Date | null, endsAt: Date | null): boolean {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}
