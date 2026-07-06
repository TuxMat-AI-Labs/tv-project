import type { Assignment, ContentItem, Display } from "@prisma/client";
import { isWithinBusinessHours, isWithinDaypart, isWithinDateRange } from "@/lib/time";

type AssignmentWithContent = Assignment & { contentItem: ContentItem };
export type DisplayWithAssignments = Display & { assignments: AssignmentWithContent[] };

export type PlaylistItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  fileUrl: string;
  durationSec: number;
};

export type ResolvedContent =
  | { mode: "inactive" }
  | { mode: "screensaver" }
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

  if (display.screensaverOverride === true) return { mode: "screensaver" };

  if (display.screensaverOverride === false) {
    if (activeAssignments.length === 0) return { mode: "inactive" };
    return { mode: "playlist", playlist: toPlaylist(activeAssignments) };
  }

  const shouldShowScreensaver = !isWithinBusinessHours(now) || activeAssignments.length === 0;
  if (shouldShowScreensaver) return { mode: "screensaver" };

  return { mode: "playlist", playlist: toPlaylist(activeAssignments) };
}

function toPlaylist(assignments: AssignmentWithContent[]): PlaylistItem[] {
  return assignments.map((a) => ({
    id: a.contentItem.id,
    type: a.contentItem.type,
    fileUrl: a.contentItem.fileUrl,
    durationSec: a.contentItem.durationSec ?? DEFAULT_IMAGE_DURATION_SEC,
  }));
}
