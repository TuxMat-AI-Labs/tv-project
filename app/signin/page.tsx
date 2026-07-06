import { signIn, entraConfigured } from "@/auth";
import { Wordmark } from "@/components/brand/Wordmark";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl ?? "/hub";

  async function doSignIn() {
    "use server";
    await signIn(entraConfigured ? "microsoft-entra-id" : "dev-bypass", { redirectTo });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="brand-card w-full max-w-sm px-8 py-10 text-center">
        <div className="mb-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/tuxmat-monogram.png" alt="TuxMat" className="h-14 w-auto" />
        </div>
        <div className="mb-2 flex justify-center">
          <Wordmark />
        </div>
        <p className="mb-8 text-sm text-muted">Digital signage hub</p>

        <form action={doSignIn}>
          <button
            type="submit"
            className="w-full rounded-md bg-gold py-2.5 text-sm font-semibold text-black transition hover:bg-gold-light"
          >
            {entraConfigured ? "Sign in with Microsoft" : "Sign in (development)"}
          </button>
        </form>

        {!entraConfigured && (
          <p className="mt-4 text-xs text-muted">
            Entra SSO isn&apos;t configured — using the local development sign-in.
          </p>
        )}
      </div>
    </div>
  );
}
