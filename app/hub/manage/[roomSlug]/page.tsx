"use client";

import { use } from "react";
import { RoomManager } from "@/components/hub/RoomManager";

/**
 * The simplified "change what's on the screens in this room" view.
 *
 * This is the whole hub for a room-scoped user (the marketing team on the
 * Showroom — see lib/auth/roles), and a fast path for admins on any room.
 * Deliberately a sibling of /hub/[roomSlug] rather than part of it: that page
 * is a read-only wall view, and folding an editor into it would put upload
 * controls in front of everyone who just wanted to look.
 */
export default function ManageRoomPage({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = use(params);
  return <RoomManager roomSlug={roomSlug} />;
}
