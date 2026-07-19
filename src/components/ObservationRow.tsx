"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Observation } from "@/lib/types";

export function ObservationRow({
  observation,
  imageUrl,
}: {
  observation: Observation;
  imageUrl: string | null;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function review(verdict: "confirmed" | "rejected") {
    setPending(true);
    await fetch(`/api/observations/${observation.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <li className="flex items-center gap-4 px-5 py-3">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-14 w-20 rounded-md border border-line object-cover"
        />
      ) : (
        <div className="h-14 w-20 rounded-md border border-line bg-ink" />
      )}

      <div className="flex-1">
        <p className="text-sm">
          {observation.person_count} person(er) ·{" "}
          {observation.trades_detected.join(", ") || "ukendt faggruppe"}
        </p>
        <p className="text-muted text-xs">
          {new Date(observation.created_at).toLocaleString("da-DK")} · konfidens{" "}
          {Math.round(observation.confidence * 100)}%
        </p>
      </div>

      {observation.reviewed ? (
        <span className="text-muted text-xs">
          {observation.reviewer_verdict === "confirmed" ? "Bekræftet" : "Afvist"} manuelt
        </span>
      ) : (
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => review("confirmed")}
            className="focus-ring rounded-md border border-good/40 px-2.5 py-1 text-xs text-good hover:bg-good/10 disabled:opacity-50"
          >
            Bekræft
          </button>
          <button
            disabled={pending}
            onClick={() => review("rejected")}
            className="focus-ring rounded-md border border-bad/40 px-2.5 py-1 text-xs text-bad hover:bg-bad/10 disabled:opacity-50"
          >
            Afvis
          </button>
        </div>
      )}
    </li>
  );
}
