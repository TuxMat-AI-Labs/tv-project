import { auth } from "@/auth";
import { allMarketingRoomSlugs, roomScopedMarketingRoster } from "@/lib/auth/roles";
import { RoomManager } from "@/components/hub/RoomManager";

export const dynamic = "force-dynamic";

/**
 * Every room this person can manage, stacked — the marketing team's landing
 * page, and what an admin sees from the Marketing tab.
 *
 * Which rooms appear depends on who is asking, and the two answers are
 * deliberately different:
 *
 *  - a scoped user sees exactly the rooms they hold, so the page IS their
 *    permissions rather than a view that merely reflects them;
 *  - an admin sees every room anyone is scoped to, because the point of the tab
 *    is previewing what the team can reach, not managing rooms they already
 *    reach from the dashboard.
 */
export default async function ManagePage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const scoped = session?.user?.scopedRoomSlugs ?? null;

  const roomSlugs = scoped ?? (isAdmin ? allMarketingRoomSlugs() : []);
  const roster = isAdmin ? roomScopedMarketingRoster() : [];

  return <RoomManager roomSlugs={roomSlugs} isAdmin={isAdmin} marketingRoster={roster} />;
}
