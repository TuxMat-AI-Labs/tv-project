"use client";

import { use, useEffect } from "react";
import { useDisplayContent } from "@/lib/display/useDisplayContent";
import { PlaylistPlayer } from "@/components/display/PlaylistPlayer";
import { Screensaver } from "@/components/display/Screensaver";
import { InactiveScreen } from "@/components/display/InactiveScreen";

export default function DisplayPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, reportHeartbeat } = useDisplayContent(slug);

  useEffect(() => {
    if (data && data.mode !== "playlist") reportHeartbeat(null);
  }, [data, reportHeartbeat]);

  if (!data) return null;

  if (data.mode === "playlist" && data.playlist?.length) {
    return (
      <PlaylistPlayer
        playlist={data.playlist}
        contentFit={data.contentFit ?? "COVER"}
        onCurrentItemChange={reportHeartbeat}
      />
    );
  }

  if (data.mode === "screensaver") {
    return <Screensaver />;
  }

  return <InactiveScreen />;
}
