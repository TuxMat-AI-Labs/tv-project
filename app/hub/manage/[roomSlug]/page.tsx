import { auth } from "@/auth";
import { adminRoster } from "@/lib/auth/roles";
import { RoomManager } from "@/components/hub/RoomManager";

export const dynamic = "force-dynamic";

/**
 * One room's manage view. /hub/manage is the normal landing spot; this exists so
 * a single room can be linked to and focused on.
 */
export default async function ManageRoomPage({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  return <RoomManager roomSlugs={[roomSlug]} isAdmin={isAdmin} admins={isAdmin ? adminRoster() : []} />;
}
