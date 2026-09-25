import { auth } from "@/auth";
import { roomScopedMarketingRoster } from "@/lib/auth/roles";
import { RoomManager } from "@/components/hub/RoomManager";

export const dynamic = "force-dynamic";

/**
 * One room's manage view.
 *
 * The multi-room page at /hub/manage is the normal landing spot; this exists so
 * a single room can be linked to directly and focused on, which is what the
 * per-room links in the header do.
 */
export default async function ManageRoomPage({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // Only people who hold THIS room — an admin focused on one room should not be
  // shown a roster for somewhere else.
  const roster = isAdmin
    ? roomScopedMarketingRoster().filter((r) => r.roomSlugs.includes(roomSlug))
    : [];

  return <RoomManager roomSlugs={[roomSlug]} isAdmin={isAdmin} marketingRoster={roster} />;
}
