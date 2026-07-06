"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TVFrame } from "@/components/hub/TVFrame";
import { StatusDot } from "@/components/hub/StatusDot";
import type { HubDisplayStatus } from "@/lib/hub/types";

const MODE_LABEL: Record<HubDisplayStatus["mode"], string> = {
  playlist: "Playing",
  screensaver: "Screensaver",
  inactive: "Inactive",
};

export function DisplayTile({ display, roomName }: { display: HubDisplayStatus; roomName: string }) {
  return (
    <Link href={`/hub/displays/${display.id}`} className="group block" scroll={false}>
      <motion.div layoutId={`display-frame-${display.id}`}>
        <TVFrame>
          {display.currentContent?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={display.currentContent.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover opacity-95 transition duration-300 group-hover:opacity-100"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#05070a] text-[10px] tracking-[0.25em] text-zinc-600 uppercase">
              {MODE_LABEL[display.mode]}
            </div>
          )}
          <span className="pointer-events-none absolute inset-0 rounded-[2%] ring-1 ring-inset ring-transparent transition group-hover:ring-gold/40" />
        </TVFrame>
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {roomName} <span className="text-gold-light">{display.number}</span>
            </p>
            <p className="text-xs text-muted">{MODE_LABEL[display.mode]}</p>
          </div>
          <StatusDot online={display.online} />
        </div>
      </motion.div>
    </Link>
  );
}
