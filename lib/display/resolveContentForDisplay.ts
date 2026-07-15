import type { Assignment, ContentItem, Display } from "@prisma/client";
import { scheduledSurface, isWithinDaypart, isWithinDateRange } from "@/lib/time";

type AssignmentWithContent = Assignment & { contentItem: ContentItem };
export type DisplayWithAssignments = Display & { assignments: AssignmentWithContent[] };

export type PlaylistItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  fileUrl: string;
  thumbnailUrl: string | null;
  durationSec: number;
};

export type ResolvedContent =
  | { mode: "inactive" }
  | { mode: "screensaver" }
  | { mode: "black" }
  | { mode: "playlist"; playlist: PlaylistItem[] };

const DEFAULT_IMAGE_DURATION_SEC = 10;

/**
 * The single source of truth for "what should this display show right now."
 * Runs server-side only — the player never evaluates business hours/schedule
 * itself, it just renders whatever mode this returns. Keeps every display's
 * on-screen decision independent of that TV's own (untrustworthy) clock.
 */
export function resolveContentForDisplay(display: DisplayWithAssignments, now: Date): ResolvedContent {
  if (!display.active) return { mode: "inactive" };

  const activeAssignments = display.assignments
    .filter(
      (a) => isWithinDateRange(now, a.startsAt, a.endsAt) && isWithinDaypart(now, a.daypartStart, a.daypartEnd)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Manual overrides win over the schedule: forced-on always screensavers;
  // forced-off never blanks (shows its content, or "inactive" if it has none).
  if (display.screensaverOverride === true) return { mode: "screensaver" };
  if (display.screensaverOverride === false) {
    if (activeAssignments.length === 0) return { mode: "inactive" };
    return { mode: "playlist", playlist: toPlaylist(activeAssignments) };
  }

  // Auto: follow the day's schedule — black overnight/weekends, the pixel-care
  // screensaver in the massage window, content during shift hours.
  const surface = scheduledSurface(now);
  if (surface === "black") return { mode: "black" };
  if (surface === "screensaver") return { mode: "screensaver" };

  // Content hours: play the assignments, or fall back to the screensaver if
  // this display has nothing scheduled to show right now.
  if (activeAssignments.length === 0) return { mode: "screensaver" };
  return { mode: "playlist", playlist: toPlaylist(activeAssignments) };
}

function toPlaylist(assignments: AssignmentWithContent[]): PlaylistItem[] {
  return assignments.map((a) => ({
    id: a.contentItem.id,
    type: a.contentItem.type,
    fileUrl: a.contentItem.fileUrl,
    thumbnailUrl: a.contentItem.thumbnailUrl,
    durationSec: a.contentItem.durationSec ?? DEFAULT_IMAGE_DURATION_SEC,
  }));
}
