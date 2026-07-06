"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { DisplayDetailView } from "@/components/hub/DisplayDetailView";

export default function InterceptedDisplayModal({ params }: { params: Promise<{ displayId: string }> }) {
  const { displayId } = use(params);
  const router = useRouter();
  return <DisplayDetailView displayId={displayId} isModal onClose={() => router.back()} />;
}
