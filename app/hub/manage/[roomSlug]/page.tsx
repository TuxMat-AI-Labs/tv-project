import { auth } from "@/auth";
import { roomScopedMarketingRoster } from "@/lib/auth/roles";
import { RoomManager } from "@/components/hub/RoomManager";

export const dynamic = "force-dynamic";

/**
 * The simplified "change what's on the screens in this room" view.
 *
 * This is the whole hub for a room-scoped user (the marketing team on the
 * Showroom — see lib/auth/roles), and reached from the Marketing tab for an
 * admin. Deliberately a sibling of /hub/[roomSlug] rather than part of it: that
 * page is a read-only wall view, and folding an editor into it would put upload
 * controls in front of everyone who just wanted to look.
 *
 * A server component so it can read the session: an admin seeing this page is
 * previewing someone else's view and needs to be told so, along with exactly
 * who that someone is. A scoped user just gets the page.
 */
export default async function ManageRoomPage({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // Only the people scoped to THIS room — an admin previewing the Showroom
  // should not be shown a roster for somewhere else.
  const roster = isAdmin ? roomScopedMarketingRoster().filter((r) => r.roomSlug === roomSlug) : [];

  return <RoomManager roomSlug={roomSlug} isAdmin={isAdmin} marketingRoster={roster} />;
}
