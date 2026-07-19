"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TEMPLATE = `trade,expected_start,expected_end,expected_workers,rate_payment_dkk,notes
Tømrer,2026-08-01,2026-08-10,2,35000,Rejsegilde
Maler,2026-08-11,2026-08-15,3,45000,2. rate`;

export function PlanUploadForm({ projectId }: { projectId: string }) {
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch(`/api/projects/${projectId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    if (res.ok) {
      setCsv("");
      setStatus("idle");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.error ?? "Ukendt fejl");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-muted text-sm">
        Indsæt projektets tidsplan som CSV. Genupload for at erstatte planen, når den ændrer
        sig — se skabelon:
      </p>
      <pre className="overflow-x-auto rounded-md border border-line bg-ink px-3 py-2 text-xs text-muted">
        {TEMPLATE}
      </pre>
      <textarea
        required
        rows={6}
        placeholder={TEMPLATE}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        className="focus-ring w-full rounded-md border border-line bg-ink px-3 py-2 font-mono text-xs placeholder:text-muted"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink hover:brightness-110 disabled:opacity-60"
        >
          {status === "saving" ? "Gemmer…" : "Gem tidsplan"}
        </button>
        {status === "error" && <span className="text-bad text-sm">{errorMsg}</span>}
      </div>
    </form>
  );
}
