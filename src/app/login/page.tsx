import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const isSignUp = params.mode === "signup";

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-mono text-xs tracking-wide text-paper-dim">
            No. 001
          </p>
          <h1 className="font-serif text-3xl font-semibold text-paper mt-2">
            Archive
          </h1>
          <p className="text-sm text-paper-dim mt-2">
            Your files, kept in one place, reachable from anywhere.
          </p>
        </div>

        <div className="border border-hairline bg-surface rounded-sm p-8 relative">
          <div
            aria-hidden
            className="absolute -top-3 left-8 h-6 w-6 rounded-full border border-hairline bg-ink"
          />
          <div
            aria-hidden
            className="absolute -top-3 right-8 h-6 w-6 rounded-full border border-hairline bg-ink"
          />

          <h2 className="font-serif text-lg text-paper mb-6">
            {isSignUp ? "Create your account" : "Sign in"}
          </h2>

          <form
            action={isSignUp ? signUp : signIn}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-paper-dim">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="bg-ink border border-hairline rounded-sm px-3 py-2 text-sm text-paper focus:outline-none focus:border-brass"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-paper-dim">Password</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="bg-ink border border-hairline rounded-sm px-3 py-2 text-sm text-paper focus:outline-none focus:border-brass"
              />
            </label>

            {params.error && (
              <p className="text-sm text-brick-bright">{params.error}</p>
            )}
            {params.notice && (
              <p className="text-sm text-brass-bright">{params.notice}</p>
            )}

            <button
              type="submit"
              className="mt-2 bg-brass text-ink text-sm font-medium rounded-sm py-2.5 hover:bg-brass-bright transition-colors"
            >
              {isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-paper-dim mt-6 text-center">
            {isSignUp ? "Already have an account? " : "New here? "}
            <a
              href={isSignUp ? "/login" : "/login?mode=signup"}
              className="text-brass hover:text-brass-bright underline underline-offset-2"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
