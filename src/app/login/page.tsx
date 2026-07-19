"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl mb-1">Byggeplads-AI</h1>
        <p className="text-muted text-sm mb-8">Log ind for at se dine byggepladser.</p>

        {status === "sent" ? (
          <p className="rounded-md border border-good/40 bg-good/10 px-4 py-3 text-sm">
            Vi har sendt et login-link til <strong>{email}</strong>. Tjek din indbakke.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="din@virksomhed.dk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring w-full rounded-md border border-line bg-panel px-4 py-2.5 text-sm placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="focus-ring w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
            >
              {status === "sending" ? "Sender link…" : "Send login-link"}
            </button>
            {status === "error" && (
              <p className="text-bad text-sm">Noget gik galt — prøv igen.</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
