"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  decryptText,
  encryptText,
  VAULT_CHECK_PATH_SUFFIX,
  VAULT_CHECK_PLAINTEXT,
} from "@/lib/crypto";
import { Lock } from "lucide-react";
import { Dashboard } from "./Dashboard";

const BUCKET = "files";

function sessionKey(userId: string) {
  return `archive-vault-passphrase:${userId}`;
}

export function VaultGate({ userId }: { userId: string }) {
  const supabase = createClient();
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  // On load, see if this tab already has a remembered passphrase and
  // silently verify it still works before trusting it.
  useEffect(() => {
    const remembered = sessionStorage.getItem(sessionKey(userId));
    if (!remembered) {
      setRestoring(false);
      return;
    }
    verify(remembered, false).finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function verify(candidate: string, remember: boolean) {
    setChecking(true);
    setError(null);

    const checkPath = `${userId}/${VAULT_CHECK_PATH_SUFFIX}`;
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .download(checkPath);

    try {
      if (existing) {
        const plaintext = await decryptText(existing, candidate);
        if (plaintext !== VAULT_CHECK_PLAINTEXT) {
          throw new Error("Wrong passphrase.");
        }
      } else {
        // First time setting up encryption for this account.
        const marker = await encryptText(VAULT_CHECK_PLAINTEXT, candidate);
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(checkPath, marker, { upsert: true });
        if (uploadError) throw uploadError;
      }

      if (remember) sessionStorage.setItem(sessionKey(userId), candidate);
      setPassphrase(candidate);
    } catch {
      sessionStorage.removeItem(sessionKey(userId));
      setError("That passphrase doesn't match this vault. Try again.");
    } finally {
      setChecking(false);
    }
  }

  function handleLock() {
    sessionStorage.removeItem(sessionKey(userId));
    setPassphrase(null);
    setInput("");
  }

  if (restoring) {
    return <p className="text-sm text-paper-dim">Checking your vault…</p>;
  }

  if (passphrase) {
    return (
      <Dashboard userId={userId} passphrase={passphrase} onLock={handleLock} />
    );
  }

  return (
    <div className="border border-hairline bg-surface rounded-sm p-8 max-w-md">
      <Lock className="text-brass mb-4" size={20} />
      <h2 className="font-serif text-lg text-paper mb-2">Unlock your vault</h2>
      <p className="text-sm text-paper-dim mb-6">
        Files are encrypted in your browser before they're uploaded. Enter
        your vault passphrase to continue — this is separate from your login
        password, and it's never sent anywhere.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify(input, true);
        }}
        className="flex flex-col gap-4"
      >
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          required
          minLength={8}
          autoFocus
          placeholder="Vault passphrase"
          className="bg-ink border border-hairline rounded-sm px-3 py-2 text-sm text-paper focus:outline-none focus:border-brass"
        />

        {error && <p className="text-sm text-brick-bright">{error}</p>}

        <button
          type="submit"
          disabled={checking}
          className="bg-brass text-ink text-sm font-medium rounded-sm py-2.5 hover:bg-brass-bright transition-colors disabled:opacity-60"
        >
          {checking ? "Checking…" : "Unlock"}
        </button>
      </form>

      <p className="text-xs text-paper-dim mt-6">
        First time here? Whatever you type above becomes your vault
        passphrase — there is no reset. If you lose it, your encrypted files
        can't be recovered by anyone, including us.
      </p>
    </div>
  );
}
