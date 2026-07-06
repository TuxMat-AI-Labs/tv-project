import { ScreensaverPicker } from "@/components/hub/ScreensaverPicker";

export default function ScreensaverPage() {
  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold tracking-wide text-foreground uppercase">Screensaver</h1>
      <p className="mt-1 text-sm text-muted">
        Overnight pixel-care. Hover to preview, tap to activate — it plays on the schedule.
      </p>
      <div className="mt-8">
        <ScreensaverPicker />
      </div>
    </div>
  );
}
