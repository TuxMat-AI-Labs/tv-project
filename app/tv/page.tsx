import { TvClient } from "@/components/tv/TvClient";

export const metadata = {
  title: "TuxDisplay",
};

// Public TV entry point — set this as the Samsung browser's homepage. The TV is
// recognized by its httpOnly device cookie; unpaired screens show the pairing
// QR + code, paired screens auto-load their content.
export default function TvPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <TvClient />
    </div>
  );
}
