"use client";

import { use } from "react";
import { DisplayPlayer } from "@/components/display/DisplayPlayer";

export default function DisplayPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <DisplayPlayer slug={slug} />;
}
