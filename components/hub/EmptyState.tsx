import Link from "next/link";

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/tuxmat-monogram.png" alt="" className="mb-6 h-12 w-auto opacity-40" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-6 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
