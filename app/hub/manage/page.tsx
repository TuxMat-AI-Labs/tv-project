import { auth } from "@/auth";
import { adminRoster, allMarketingRoomSlugs } from "@/lib/auth/roles";
import { RoomManager } from "@/components/hub/RoomManager";

export const dynamic = "force-dynamic";

/**
 * Every room this person can manage, stacked. The marketing team's landing
 * page, and what an admin sees from the Marketing tab.
 */
export default async function ManagePage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const scoped = session?.user?.scopedRoomSlugs ?? null;

  const roomSlugs = scoped ?? (isAdmin ? allMarketingRoomSlugs() : []);
  return <RoomManager roomSlugs={roomSlugs} isAdmin={isAdmin} admins={isAdmin ? adminRoster() : []} />;
}
