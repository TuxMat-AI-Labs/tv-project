import { PairClient } from "@/components/hub/PairClient";

export default async function PairPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold tracking-wide text-foreground uppercase">Pair a screen</h1>
      <p className="mt-1 text-sm text-muted">
        Point a TV at <span className="text-foreground">/tv</span>, then scan its QR (or enter the code it shows) to
        assign it to a display. It&apos;s remembered from then on — no code or login on the TV again.
      </p>
      <div className="mt-8">
        <PairClient initialCode={code ?? ""} />
      </div>
    </div>
  );
}
