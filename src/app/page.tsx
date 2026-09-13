import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { VaultGate } from "./dashboard/VaultGate";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
      <header className="flex items-end justify-between border-b border-hairline pb-6 mb-8">
        <div>
          <p className="font-mono text-xs tracking-wide text-paper-dim">
            Signed in as
          </p>
          <h1 className="font-serif text-2xl font-semibold text-paper mt-1">
            {user.email}
          </h1>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-paper-dim hover:text-brick-bright transition-colors"
          >
            Sign out
          </button>
        </form>
      </header>

      <VaultGate userId={user.id} />
    </main>
  );
}
